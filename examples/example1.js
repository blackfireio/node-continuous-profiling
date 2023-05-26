const Blackfire = require('@blackfire/nodejs');
const express = require('express')
const crypto = require("crypto");
const app = express()
const port = 3000

app.get('/', (req, res) => {
   const salt = crypto.randomBytes(128).toString("base64");
   const hash = crypto.pbkdf2Sync("this is my password", salt, 10000, 512, "sha512");

   res.send('Hello World!');

   Blackfire.stop();
})


app.listen(port, () => {
   console.log(`Example app listening on port ${port}`)
   Blackfire.start({agentSocket: 'tcp://127.0.0.1:8307', labels: {"service": "my-nodejs-app"}});
})
