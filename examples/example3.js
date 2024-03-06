const Blackfire = require('@blackfireio/node-tracing');

Blackfire.start({labels: {"application_name": "my-example3-nodejs"}});

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


  