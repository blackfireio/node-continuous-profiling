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
   Blackfire.start({labels: {"application_name": "my-nodejs-app"}});
})
