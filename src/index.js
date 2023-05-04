const pprof = require('pprof');
const FormData = require('form-data');
const axios = require('axios');
const debug = require('debug');

const log = debug('blackfire');

let _currentProfilingSession = {
    // The function to stop current profiling (if any) and retrieve profile
    stopAndCollect: undefined,
    // Since properties above can be reset periodically, this variable holds the status actually exposed
    isRunning: false,
};

const defaultConfig = {
    /** time in milliseconds for which to collect profile. */
    cpuDuration: 60000,
    /** average sampling frequency in Hz. */
    cpuProfileRate: 100,
    /** Period of time (in seconds) to buffer profiling data before to send them to the agent. */
    period: 60,
    /** socket to the Blackfire agent. */
    agentSocket: defaultAgentSocket(),
    /** Blackfire Server ID (should be defined with serverToken). */
    serverId: undefined,
    /** Blackfire Server Token (should be defined with serverId). */
    serverToken: undefined
}

function defaultAgentSocket() {
    switch(process.platform) {
        case 'win32':
            return 'tcp://127.0.0.1:8307';
        case 'darwin':
            return 'unix:///usr/local/var/run/blackfire-agent.sock';
        default:
            return 'unix:///var/run/blackfire/agent.sock';
    }
}

function start(config) {
    if (_currentProfilingSession.isRunning) {
        log('Profiler is already running');
        return false;
    }

    const mergedConfig = {...defaultConfig, ...config};
    const axiosConfig = _axiosConfig(mergedConfig);
    const endDate = Date.now() + mergedConfig.cpuDuration;

    log('Starting profiler');
    _currentProfilingSession.isRunning = true;
    // Handle to cancel current profiling
    let timeout = undefined;

    function doProfiling() {
        const remainingTimeMillis = endDate - Date.now();
        if (remainingTimeMillis <= 0) {
            log('Duration expired');
            _currentProfilingSession.isRunning = false;
            return;
        }

        log('Collecting new profile');

        const pprofStopFunction = pprof.time.start(
            1000000 / mergedConfig.cpuProfileRate,
            undefined,
            undefined,
            true
        );
        _currentProfilingSession.stopAndCollect = () => {
            log('pprof.stop');
            const profile = pprofStopFunction();

            _currentProfilingSession.stopAndCollect = undefined;
            clearTimeout(timeout);
            timeout = undefined;

            _sendProfileToBlackfireAgent(axiosConfig, profile);
        };

        timeout = setTimeout(() => {
            _currentProfilingSession.stopAndCollect();
            doProfiling();
        }, Math.min(remainingTimeMillis, mergedConfig.period * 1000));
    };

    doProfiling();
    return true;
}

function stop() {
    if (!_currentProfilingSession.isRunning) {
        log('Profiler is already stopped');
        return false;
    }

    log('Stopping profiler');
    _currentProfilingSession.stopAndCollect();
    _currentProfilingSession.isRunning = false;
    return true;
}

async function _sendProfileToBlackfireAgent(axiosConfig, profile) {
    log('Sending profile to Agent');

    const buf = await pprof.encode(profile);

    const formData = new FormData();
    formData.append('profile', buf, {
        knownLength: buf.byteLength,
        contentType: 'text/json',
        filename: 'profile.pprof',
    });

    const url = '/profiling/v1/input';
    log(`Sending data to ${axiosConfig.baseURL}${url}`);

    // send data to the server
    await axios(url, {
        ...axiosConfig,
        ...{
            headers: {
                ...axiosConfig.headers,
                ...formData.getHeaders(),
            },
            data: formData,
        }
    })
        .then(() => {
            log('Profile sent to the agent');
        })
        .catch((error) => {
            if (error.response) {
                log('Blackfire agent returned an error');
                log(error.response.data);
            } else if (error.request) {
                log('No response from Blackfire agent:', error.message);
            } else {
                log('Failed to send profile to Blackfire agent:', error.message);
            }
        });
}

function _axiosConfig(blackfireConfig) {
    const uri = new URL(blackfireConfig.agentSocket);
    const isSocket = uri.protocol === 'unix:';

    return {
        method: 'POST',
        headers: blackfireConfig.serverId && blackfireConfig.serverToken ? {
            Authorization: "Basic " + Buffer.from(`${blackfireConfig.serverId}:${blackfireConfig.serverToken}`).toString('base64'),
        } : {},
        baseURL: isSocket ? 'http://unix/' : uri.href,
        socketPath: isSocket ? uri.pathname : undefined,
    };
}

module.exports = {
    start,
    stop,
    defaultConfig
};
