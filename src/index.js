const pprof = require('pprof');
const FormData = require('form-data');
const axios = require('axios');
const winston = require('winston');

const DEFAULT_LOG_LEVEL = 1;
const logLevels = {
  4: 'debug',
  3: 'info',
  2: 'warn',
  1: 'error',
};

// initialize logger
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.splat(),
    winston.format.simple(),
  ),
  level: logLevels[process.env.BLACKFIRE_LOG_LEVEL || DEFAULT_LOG_LEVEL],
});
if (process.env.BLACKFIRE_LOG_FILE) {
  logger.add(new winston.transports.File({ filename: process.env.BLACKFIRE_LOG_FILE }));
} else {
  logger.add(new winston.transports.Console());
}

const currentProfilingSession = {
  stop: undefined,

  // active is true when the profiling session started
  active: false,

  // profiling indicates if the underlying profiler is running. It is highly
  // probable that the profiler is NOT running(period ends) but the profiling
  // session is still active.
  profiling: false,
};

function defaultAgentSocket() {
  switch (process.platform) {
    case 'win32':
      return 'tcp://127.0.0.1:8307';
    case 'darwin':
      if (process.arch === 'arm64') {
        return 'unix:///opt/homebrew/var/run/blackfire-agent.sock';
      }
      return 'unix:///usr/local/var/run/blackfire-agent.sock';
    default:
      return 'unix:///var/run/blackfire/agent.sock';
  }
}

const periodMillis = 1000;

const defaultConfig = {
  /** time in milliseconds for which to collect profile. */
  durationMillis: 1000,
  /** average sampling frequency in Hz. (times per second) */
  cpuProfileRate: 100,
  /** socket to the Blackfire agent. */
  agentSocket: process.env.BLACKFIRE_AGENT_SOCKET || defaultAgentSocket(),
  /** Blackfire Server ID (should be defined with serverToken). */
  serverId: undefined,
  /** Blackfire Server Token (should be defined with serverId). */
  serverToken: undefined,
  /** Labels to add to the profile. */
  labels: {},
  /** Timeout in milliseconds for the upload request. */
  uploadTimeoutMillis: 10000,
};

async function sendProfileToBlackfireAgent(axiosConfig, config, profile) {
  logger.debug('Sending profile to Agent');

  const buf = await pprof.encode(profile);

  const formData = new FormData();

  // add labels to the form data
  if (config.labels) {
    Object.keys(config.labels).forEach((key) => {
      formData.append(key, config.labels[key]);
    });
  }

  formData.append('profile', buf, {
    knownLength: buf.byteLength,
    contentType: 'text/json',
    filename: 'profile.pprof',
  });

  const url = '/profiling/v1/input';
  logger.debug(`Sending data to ${axiosConfig.baseURL}${url}`);

  // send data to the server
  await axios(url, {
    ...axiosConfig,
    ...{
      headers: {
        ...axiosConfig.headers,
        ...formData.getHeaders(),
      },
      data: formData,
    },
  })
    .then(() => {
      logger.debug('Profile sent to the agent');
    })
    .catch((error) => {
      if (error.response) {
        logger.error(`Blackfire agent returned an error: ${error.response.data}`);
      } else if (error.request) {
        logger.error(`No response from Blackfire agent: ${error.message}`);
      } else {
        logger.error(`Failed to send profile to Blackfire agent: ${error.message}`);
      }
    });
}

function getAxiosConfig(blackfireConfig) {
  const uri = new URL(blackfireConfig.agentSocket);
  const isSocket = uri.protocol === 'unix:';

  return {
    method: 'POST',
    headers: blackfireConfig.serverId && blackfireConfig.serverToken ? {
      Authorization: `Basic ${Buffer.from(`${blackfireConfig.serverId}:${blackfireConfig.serverToken}`).toString('base64')}`,
    } : {},
    baseURL: isSocket ? 'http://unix/' : uri.href,
    socketPath: isSocket ? uri.pathname : undefined,
    timeout: blackfireConfig.uploadTimeoutMillis,
  };
}

function start(config) {
  if (currentProfilingSession.active) {
    logger.error('Profiler is already running');
    return false;
  }

  currentProfilingSession.active = true;

  const mergedConfig = { ...defaultConfig, ...config };
  const axiosConfig = getAxiosConfig(mergedConfig);

  logger.debug('Starting profiler');
  let stopAndUploadTimeout;
  let profileNextTimeout;

  // profiling duration should be less than the period
  if (mergedConfig.durationMillis > periodMillis) {
    mergedConfig.durationMillis = periodMillis;
  }

  function doProfile() {
    logger.debug('Collecting new profile');

    const pprofStop = pprof.time.start(
      1_000_000 / mergedConfig.cpuProfileRate, // 1s divided by rate
      undefined,
      undefined,
      true,
    );
    currentProfilingSession.profiling = true;

    const stopProfiling = () => {
      if (!currentProfilingSession.profiling) {
        return {};
      }
      const profile = pprofStop();
      currentProfilingSession.profiling = false;
      return profile;
    };

    const stopProfilingAndUpload = () => {
      logger.debug('stopProfilingAndUpload');
      const profile = stopProfiling();
      if (profile) {
        sendProfileToBlackfireAgent(axiosConfig, config, profile);
      }
    };

    // setup next profiling cycle
    stopAndUploadTimeout = setTimeout(() => {
      stopProfilingAndUpload();

      // restart profiling after period elapsed
      profileNextTimeout = setTimeout(() => {
        doProfile();
      }, periodMillis - mergedConfig.durationMillis);
    }, mergedConfig.durationMillis);

    currentProfilingSession.stop = () => {
      clearTimeout(stopAndUploadTimeout);
      clearTimeout(profileNextTimeout);

      stopProfiling();
    };
  }

  doProfile();
  return true;
}

function stop() {
  if (!currentProfilingSession.active) {
    return false;
  }

  logger.debug('Stopping profiler');
  currentProfilingSession.stop();

  currentProfilingSession.active = false;

  return true;
}

module.exports = {
  start,
  stop,
  defaultConfig,
};
