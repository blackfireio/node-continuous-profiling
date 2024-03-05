const { gunzipSync } = require('zlib');
const express = require('express');
const fileUpload = require('express-fileupload');
const { Profile } = require('pprof-format');
const Blackfire = require('../src/index');

jest.setTimeout(2000);

test('Blackfire imports', () => {
  expect(Blackfire.start).toBeInstanceOf(Function);
  expect(Blackfire.stop).toBeInstanceOf(Function);

  expect(Blackfire.defaultConfig).toHaveProperty('appName');
  expect(Blackfire.defaultConfig).toHaveProperty('agentSocket');
  expect(Blackfire.defaultConfig).toHaveProperty('serverId');
  expect(Blackfire.defaultConfig).toHaveProperty('serverToken');
  expect(Blackfire.defaultConfig).toHaveProperty('uploadTimeoutMillis');
  expect(Blackfire.defaultConfig).toHaveProperty('labels');
  expect(Object.keys(Blackfire.defaultConfig)).toHaveLength(6);
});
