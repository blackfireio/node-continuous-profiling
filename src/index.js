const os = require('os');
const winston = require('winston');
const { version } = require('../package.json');

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

function defaultLabels() {
  const labels = {
    language: 'javascript',
    runtime: 'nodejs',
    runtime_os: process.platform,
    runtime_arch: process.arch,
    runtime_version: process.version,
    host: os.hostname(),
    probe_version: version,
  };

  // Collect more labels from environment variables. Priority matters for the same label name.
  const lookup = [
    { labelName: 'application_name', envVar: 'BLACKFIRE_CONPROF_APP_NAME' },
    { labelName: 'application_name', envVar: 'PLATFORM_APPLICATION_NAME' },

    { labelName: 'project_id', envVar: 'PLATFORM_PROJECT' },
  ];

  lookup.forEach((entry) => {
    if (entry.labelName in labels) {
      return;
    }

    if (entry.envVar in process.env) {
      labels[entry.labelName] = process.env[entry.envVar];
    }
  });

  return labels;
}

/** time in milliseconds for which to send the collected profile. */
global.periodMillis = 1_000; // TODO: 45_000

const defaultConfig = {
  /** name of the application */
  appName: 'my-node-app',
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

function start(config) {
  if (currentProfilingSession.active) {
    logger.error('Profiler is already running');
    return false;
  }

  currentProfilingSession.active = true;

  const mergedConfig = { ...defaultConfig, ...config };

  // Merge the labels
  if (config.appName) {
    mergedConfig.labels = {
      ...defaultLabels(),
      ...{ application_name: config.appName },
      ...mergedConfig.labels,
    };
  } else {
    mergedConfig.labels = {
      ...{ application_name: mergedConfig.appName },
      ...defaultLabels(),
      ...mergedConfig.labels,
    };
  }

  logger.debug('Starting profiler');

  process.env.DD_PROFILING_UPLOAD_PERIOD = global.periodMillis / 1000;
  process.env.DD_PROFILING_UPLOAD_TIMEOUT = mergedConfig.uploadTimeoutMillis;
  process.env.DD_INSTRUMENTATION_TELEMETRY_ENABLED = "False";
  process.env.DD_PROFILING_EXPERIMENTAL_CPU_ENABLED = 1;
  process.env.DD_TRACE_AGENT_URL = mergedConfig.agentSocket;

  // enable trace debug if loglevel is set to debug
  if (logger.level == "debug") {
    process.env.DD_TRACE_DEBUG = true;
  }

  const tracer = require('dd-trace').init({
    profiling: true,
    service: mergedConfig.appName,
    tags: mergedConfig.labels,
    logger: {
      error: err => logger.error(err),
      warn: message => logger.warn(message),
      info: message => logger.info(message),
      debug: message => logger.debug(message),
    },
  })

  return true;
}

// stop is currently not possible, see https://github.com/DataDog/dd-trace-js/issues/1258#issuecomment-1716788888 and
// https://github.com/DataDog/dd-trace-js/issues/1800 for more details
function stop() {
  return true;
}

module.exports = {
  start,
  stop,
  defaultConfig,
};
