const fs = require('fs');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const { createLogger } = require('../src/logger');

let stderr;

beforeEach(() => {
  stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('level resolution and gating', () => {
  test('defaults to error when BLACKFIRE_LOG_LEVEL is unset', () => {
    const logger = createLogger({});
    expect(logger.level).toBe('error');

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    expect(stderr).not.toHaveBeenCalled();

    logger.error('e');
    expect(stderr).toHaveBeenCalledTimes(1);
  });

  test('level 4 yields debug and emits every level', () => {
    const logger = createLogger({ BLACKFIRE_LOG_LEVEL: '4' });
    expect(logger.level).toBe('debug');

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    expect(stderr).toHaveBeenCalledTimes(4);
  });

  // Invalid/out-of-range values clamp to error so the gate and the `level` string stay consistent.
  test.each(['0', '5', 'foo'])('level %s clamps to error and emits only error', (value) => {
    const logger = createLogger({ BLACKFIRE_LOG_LEVEL: value });
    expect(logger.level).toBe('error');

    logger.debug('d');
    logger.warn('w');
    expect(stderr).not.toHaveBeenCalled();

    logger.error('e');
    expect(stderr).toHaveBeenCalledTimes(1);
  });
});

test('interpolates printf-style placeholders', () => {
  const logger = createLogger({});
  logger.error('hi %s', 'there');

  const line = stderr.mock.calls[0][0];
  expect(line).toContain('error: hi there');
});

describe('sink selection', () => {
  test('writes to stderr when BLACKFIRE_LOG_FILE is "stderr"', () => {
    const logger = createLogger({ BLACKFIRE_LOG_FILE: 'stderr' });
    logger.error('e');
    expect(stderr).toHaveBeenCalledTimes(1);
  });

  test('writes formatted lines to the configured log file with a timestamp', (done) => {
    const logFile = path.join(os.tmpdir(), `blackfire-logger-${process.pid}-${process.hrtime.bigint()}.log`);
    const realCreate = fs.createWriteStream;
    let stream;
    jest.spyOn(fs, 'createWriteStream').mockImplementation((file, opts) => {
      stream = realCreate(file, opts);
      return stream;
    });

    const logger = createLogger({ BLACKFIRE_LOG_FILE: logFile });
    logger.error('to file %s', 'here');

    // end() flushes the buffered write before we read the file back.
    stream.end(() => {
      const contents = fs.readFileSync(logFile, 'utf8');
      expect(contents).toContain('error: to file here');
      expect(contents).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(stderr).not.toHaveBeenCalled();
      fs.rmSync(logFile, { force: true });
      done();
    });
  });

  test('falls back to stderr and warns once when the log file cannot be opened', () => {
    // openSync throws synchronously on a bad path, so no early lines are buffered into a dead stream.
    jest.spyOn(fs, 'openSync').mockImplementation(() => {
      throw new Error('EACCES');
    });

    const logger = createLogger({ BLACKFIRE_LOG_FILE: '/nope/blackfire.log' });
    expect(stderr).toHaveBeenCalledTimes(1);
    expect(stderr.mock.calls[0][0]).toContain('cannot write log file /nope/blackfire.log');

    // Subsequent logs route to stderr instead of the dead stream.
    logger.error('after failure');
    expect(stderr).toHaveBeenCalledTimes(2);
    expect(stderr.mock.calls[1][0]).toContain('error: after failure');
  });

  test('falls back to stderr if the stream errors after opening', () => {
    jest.spyOn(fs, 'openSync').mockReturnValue(123);
    const stream = new EventEmitter();
    stream.write = jest.fn();
    jest.spyOn(fs, 'createWriteStream').mockReturnValue(stream);

    const logger = createLogger({ BLACKFIRE_LOG_FILE: '/some/blackfire.log' });
    stream.emit('error', new Error('ENOSPC'));

    expect(stderr).toHaveBeenCalledTimes(1);
    expect(stderr.mock.calls[0][0]).toContain('cannot write log file /some/blackfire.log');

    logger.error('after failure');
    expect(stderr).toHaveBeenCalledTimes(2);
    expect(stderr.mock.calls[1][0]).toContain('error: after failure');
  });
});
