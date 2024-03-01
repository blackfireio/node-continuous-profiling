process.env.DD_PROFILING_UPLOAD_PERIOD = "1";
process.env.DD_PROFILING_UPLOAD_TIMEOUT = "1000";
process.env.DD_INSTRUMENTATION_TELEMETRY_ENABLED = "False";
process.env.DD_PROFILING_EXPERIMENTAL_CPU_ENABLED = 1;

const tracer = require('dd-trace').init({
    profiling: true,
    env: 'prod',
    service: 'my-app1',
    version: '1.0.3',
    // unix:///opt/homebrew/var/run/blackfire-agent.sock/
    url: 'http://127.0.0.1:8307/',
})

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
};
  
const foo = async () => {
    console.log('Function foo called. Sleeping for 5 seconds...');
    await sleep(5000);
    console.log('Exiting...');
    process.exit(0);
};
  
// Start the application
console.log('Starting application...');
foo();


  