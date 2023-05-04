# Blackfire Continuous Profiler for NodeJs

Blackfire Continuous Profiler continuously collects and uploads profiling data to the Blackfire servers.

Once the profiler is enabled, it collects the relevant profiling information in configurable intervals and uploads this information periodically to the Blackfire Agent.
Blackfire Agent then forwards this information to the backend.
The heavy lifting of the profiler collection is all done by PProf library: e.g: See https://github.com/google/pprof-nodejs for more details

## Questions&Feedback

You can ask any questions or provide feedback on the `#blackfire` channel for Continuous Profiling.
You can also ask for help on how to set up your environment for Continuous Profiling.

# How to use
## Prerequisites

* NodeJs >= 16.0.0
* Blackfire Agent >= 2.13.0

## Installation
```shell
npm install @blackfire/nodejs
```
```js
const Blackfire = require('@blackfire/nodejs');
```

## API

Here is the profiler's API:

```js
function start(config) {}
function stop() {}
```

`start` starts the continuous profiler probe.
It collects profiling information in background and uploads it to the Agent periodically, until `stop` is called.

An example using default configuration (`Blackfire.defaultConfig`) that can be used with `start`:

```js
const Blackfire = require('@blackfire/nodejs');
Blackfire.start({
   /** time in milliseconds for which to collect profile. */
   cpuDuration: 60000,
   /** average sampling frequency in Hz. */
   cpuProfileRate: 100,
   /** Period of time (in seconds) to buffer profiling data before to send them to the agent. */
   period: 60,
   /** socket to the Blackfire agent. */
   agentSocket: 'unix:///var/run/blackfire/agent.sock'
});
// your application...
// If needed, you can stop profiling before cpuDuration
// Blackfire.stop();
```

## Example

1. Install dependencies

```shell
npm install express @blackfire/nodejs
```

2. Create `index.js` with following code

```js
const Blackfire = require('@blackfire/nodejs');
const express = require('express')
const crypto = require("crypto");
const app = express()
const port = 3000

app.get('/', (req, res) => {
   const salt = crypto.randomBytes(128).toString("base64");
   const hash = crypto.pbkdf2Sync("this is my password", salt, 10000, 512, "sha512");

   res.send('Hello World!');
})


app.listen(port, () => {
   console.log(`Example app listening on port ${port}`)
   Blackfire.start({agentSocket: 'tcp://127.0.0.1:8307'});
})
```

3. Run Blackfire Agent (version 2.13.0 and up)

```
BLACKFIRE_SOCKET="tcp://127.0.0.1:8307" blackfire agent --log-level=5
```

4. Run NodeJs server. (`node index.js`)
5. Profiler will send data to the Agent and Agent will forward it to the Blackfire
   backend. Data then can be visualized at https://blackfire.io

# Contributing

Use `make help` to display an overview of useful commands for your dev environment.
