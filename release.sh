#!/bin/bash

set -eu

# get internal version
VERSION=`node -p "require('./package.json').version"`

if [ "$TAG" != "v$VERSION" ]; then
    echo "ERROR: tag ${TAG} does not match package version ${VERSION}"
    exit 255
fi

npm publish --access public --provenance
