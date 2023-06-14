const express = require('express');
const fileUpload = require('express-fileupload');
const { Profile } = require('pprof-format');
const { gunzipSync } = require('zlib');
const Blackfire = require('../src/index');

jest.setTimeout(2000);

test('Blackfire imports', () => {
  expect(Blackfire.start).toBeInstanceOf(Function);
  expect(Blackfire.stop).toBeInstanceOf(Function);

  expect(Blackfire.defaultConfig).toHaveProperty('durationMillis');
  expect(Blackfire.defaultConfig).toHaveProperty('cpuProfileRate');
  expect(Blackfire.defaultConfig).toHaveProperty('periodMillis');
  expect(Blackfire.defaultConfig).toHaveProperty('agentSocket');
  expect(Blackfire.defaultConfig).toHaveProperty('serverId');
  expect(Blackfire.defaultConfig).toHaveProperty('serverToken');
  expect(Object.keys(Blackfire.defaultConfig)).toHaveLength(8);
});

test.each([
  { listenTo: 4141, agentSocket: 'http://localhost:4141' },
  { listenTo: 4242, agentSocket: 'tcp://127.0.0.1:4242' },
  { listenTo: '/tmp/blackfire_nodejs_test.sock', agentSocket: 'unix:///tmp/blackfire_nodejs_test.sock' },
])('Profile is sent ($agentSocket)', ({ listenTo, agentSocket }, done) => {
  const app = express();
  app.use(fileUpload());
  const server = app.listen(listenTo, () => {
    expect(Blackfire.start({
      agentSocket,
      durationMillis: 10, // ms
    })).toBeTruthy();
  });

  expect.hasAssertions();
  app.post('/profiling/v1/input', (req, res) => {
    res.sendStatus(200);

    setImmediate(() => {
      server.close();
      Blackfire.stop();

      expect(req.files).toBeDefined();
      expect(Object.keys(req.files)).toHaveLength(1);
      expect(req.files).toHaveProperty('profile');
      expect(req.files.profile.name).toBe('profile.pprof');
      expect(req.files.profile.mimetype).toBe('text/json');
      expect(req.files.profile.size).toBeGreaterThan(0);

      Profile.decode(gunzipSync(req.files.profile.data));
      done();
    });
  });
});

test.each([
  { serverId: undefined, serverToken: undefined, expected: undefined },
  { serverId: 'ServerId', serverToken: undefined, expected: undefined },
  { serverId: undefined, serverToken: 'ServerToken', expected: undefined },
  { serverId: 'ServerId', serverToken: 'ServerToken', expected: 'Basic U2VydmVySWQ6U2VydmVyVG9rZW4=' },
])('Blackfire credentials {$serverId, $serverToken}', ({ serverId, serverToken, expected }, done) => {
  const app = express();
  const server = app.listen(4242, () => {
    expect(Blackfire.start({
      agentSocket: 'http://localhost:4242',
      durationMillis: 15, // ms
      serverId,
      serverToken,
    })).toBeTruthy();
  });

  expect.hasAssertions();
  app.post('/profiling/v1/input', (req, res) => {
    res.sendStatus(200);

    setImmediate(() => {
      server.close();
      Blackfire.stop();

      expect(req.get('Authorization')).toBe(expected);
      done();
    });
  });
});

test('Sampling parameters', (done) => {
  const app = express();
  app.use(fileUpload());
  const server = app.listen(4242, () => {
    expect(Blackfire.start({
      agentSocket: 'http://localhost:4242',
      durationMillis: 500, // ms
      cpuProfileRate: 100, // Hz
      periodMillis: 400, // ms
    })).toBeTruthy();
  });

  let requestCount = 0;
  expect.hasAssertions();
  app.post('/profiling/v1/input', (req, res) => {
    res.sendStatus(200);

    requestCount += 1;
    setImmediate((requestId) => {
      const profile = Profile.decode(gunzipSync(req.files.profile.data));
      switch (requestId) {
        case 1:
          expect(profile.function.length).toBeGreaterThanOrEqual(1);
          break;
        case 2:
          server.close();
          Blackfire.stop();

          expect(profile.function.length).toBeGreaterThanOrEqual(1);
          done();
          break;
        default:
          // Should never happen
          expect(true).toBeFalsy();
      }
    }, requestCount);
  });
});

test('Stop function', (done) => {
  const app = express();
  const server = app.listen(4242, () => {
    expect(Blackfire.start({
      agentSocket: 'http://localhost:4242',
      durationMillis: 5000, // ms
      periodMillis: 300, // ms
    })).toBeTruthy();
  });

  expect.hasAssertions();
  app.post('/profiling/v1/input', (req, res) => {
    res.sendStatus(200);

    setImmediate(() => {
      expect(Blackfire.stop()).toBeTruthy();
      server.close();
      expect(Blackfire.stop()).toBeFalsy();
      done();
    });
  });
});
