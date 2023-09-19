# Blackfire Continuous Profiler for Node.js

Blackfire Continuous Profiler continuously collects and uploads profiling data to the Blackfire servers. Once enabled, the profiler collects the relevant profiling information in configurable intervals and periodically uploads it to the Blackfire Agent. Blackfire Agent then forwards this information to the backend.

# How to use
## Prerequisites

* Node.js >= 16.0.0
* Blackfire Agent >= 2.13.0

## Installation
```shell
npm install @blackfireio/node-tracing
```
```js
const Blackfire = require('@blackfireio/node-tracing');
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
const Blackfire = require('@blackfireio/node-tracing');
Blackfire.start({
   appName: 'my-app'
   // socket to the Blackfire agent.
   // agentSocket: 'unix:///var/run/blackfire/agent.sock'
});
// your application...
// If needed, you can stop profiling before cpuDuration
// Blackfire.stop();
```

## Example

1. Install dependencies

```shell
npm install express @blackfireio/node-tracing
```

2. Create `index.js` with the following code

```js
const Blackfire = require('@blackfireio/node-tracing');
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
   Blackfire.start({appName: 'blackfire-example', agentSocket: 'tcp://127.0.0.1:8307'});
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
