const pprof = require('pprof');
const FormData = require('form-data');
const axios = require('axios');
const debug = require('debug');

const log = debug('blackfire');

let isProfilerRunning = false;

const defaultConfig = {
    /** time in milliseconds for which to collect profile. */
    durationMillis: 1000,
    /** average time in microseconds between samples */
    intervalMicros: 100,
    /** socket to the Blackfire agent */
    agentSocket: 'http://0.0.0.0:9998',
}

function start(config) {
    if (isProfilerRunning) {
        log('Profiler is already running');
        return;
    }

    const mergedConfig = {...defaultConfig, ...config};

    log('Starting profiler');
    isProfilerRunning = true;

    const doProfiling = () => {
        log('Collecting new profile')
        pprof.time
            .profile({
                lineNumbers: true,
                durationMillis: mergedConfig.durationMillis,
                intervalMicros: mergedConfig.intervalMicros,
            })
            .then((profile) => {
                if (isProfilerRunning) {
                    setImmediate(doProfiling)
                }

                return sendProfileToBlackfireAgent(mergedConfig, profile);
            })
            .then((d) => {
                log('Profile has been uploaded')
            })
            .catch((e) => {
                log(e)
            })
    };

    doProfiling();
}

function stop() {
    if (!isProfilerRunning) {
        log('Profiler is already stopped');
        return;
    }

    log('Stopping profiler');
    isProfilerRunning = false;
}

async function sendProfileToBlackfireAgent(config, profile) {
    log('Sending profile to Agent');

    const buf = await pprof.encode(profile);

    const formData = new FormData();
    formData.append('profile', buf, {
        knownLength: buf.byteLength,
        contentType: 'text/json',
        filename: 'profile.pprof',
    });

    const url = `${config.agentSocket}/profiling/v1/input`;
    log(`Sending data to ${url}`)
    // send data to the server
    return axios(url, {
        method: 'POST',
        headers: formData.getHeaders(),
        data: formData,
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

module.exports = {
    start,
    stop,
    defaultConfig
};
