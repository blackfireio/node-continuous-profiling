# Experimental Blackfire Continuous Profiler for Node.js

Blackfire Continuous Profiler continuously collects and uploads profiling data to the Blackfire servers. Once enabled, the profiler collects the relevant profiling information in configurable intervals and periodically uploads it to the Blackfire Agent. Blackfire Agent then forwards this information to the backend.

# How to use
## Prerequisites

* Node.js >= 16.0.0
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
It collects profiling information in the background and periodically uploads it to the Agent until `stop`` is called.

An example using default configuration (`Blackfire.defaultConfig`) that can be used with `start`:

```js
const Blackfire = require('@blackfire/nodejs');
Blackfire.start({
   /** time in milliseconds for which to collect profile. */
   durationMillis: 60000,
   /** average sampling frequency in Hz. */
   cpuProfileRate: 100,
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

2. Create `index.js` with the following code

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
BLACKFIRE_SOCKET="tcp://127.0.0.1:8307" blackfire agent --log-level=4
```

4. Run NodeJs server. (`node index.js`)
5. Profiler will send data to the Agent, and Agent will forward it to the Blackfire
   backend. Data then can be visualized at https://blackfire.io

# Contributing

Use `make help` to display an overview of useful commands for your dev environment.
