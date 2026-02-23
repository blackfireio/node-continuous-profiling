import { expectType, expectError } from 'tsd';
import { start, stop, defaultConfig, BlackfireConfiguration } from '.';

// start() accepts a valid configuration and returns boolean
expectType<boolean>(start({ appName: 'my-app' }));

// start() accepts all configuration options
expectType<boolean>(start({
  appName: 'my-app',
  agentSocket: 'tcp://127.0.0.1:8307',
  serverId: 'server-id',
  serverToken: 'server-token',
  labels: { env: 'production' },
  uploadTimeoutMillis: 5000,
}));

// start() accepts empty config (all fields optional)
expectType<boolean>(start({}));

// stop() returns boolean
expectType<boolean>(stop());

// defaultConfig has required fields
expectType<string>(defaultConfig.appName);
expectType<string>(defaultConfig.agentSocket);
expectType<number>(defaultConfig.uploadTimeoutMillis);

// defaultConfig.labels is always defined (not optional)
expectType<Record<string, string>>(defaultConfig.labels);

// start() rejects invalid types
expectError(start({ appName: 123 }));
expectError(start({ uploadTimeoutMillis: 'not-a-number' }));
expectError(start({ labels: 'not-an-object' }));

// start() rejects unknown properties
expectError(start({ unknownProp: true }));
