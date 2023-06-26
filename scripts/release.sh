#!/bin/bash

set -eu

echo "release called!"

ls -al /etc/secret

cd /opt


npm set //packagecloud.io/blackfire-io/development-parkway3118/npm/:_authToken ${PACKAGECLOUD_TOKEN}
npm config list
npm install @sumerc/my-npm-pkg@1.0.0 --registry https://packagecloud.io/blackfire-io/development-parkway3118/npm
