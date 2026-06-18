const fs = require('fs');
const util = require('util');

const DEFAULT_LOG_LEVEL = 1;
const LOG_LEVELS = {
  4: 'debug',
  3: 'info',
  2: 'warn',
  1: 'error',
};

function createLogger(env = process.env) {
  const requested = Number(env.BLACKFIRE_LOG_LEVEL);
  // Clamp to a known level so the gate and the `level` string always agree, even for '0'/'5'/'foo'.
  const numericLevel = requested in LOG_LEVELS ? requested : DEFAULT_LOG_LEVEL;
  const level = LOG_LEVELS[numericLevel];

  const logFile = env.BLACKFIRE_LOG_FILE;

  let stream = null;
  if (logFile && logFile !== 'stderr') {
    // A bad BLACKFIRE_LOG_FILE must never crash the host app: warn once, then fall back to stderr.
    const degradeToStderr = (err) => {
      stream = null;
      process.stderr.write(`blackfire: cannot write log file ${logFile}, falling back to stderr: ${err.message}\n`);
    };
    try {
      // Open synchronously so a bad path fails fast and loses no early lines; writes stay non-blocking.
      stream = fs.createWriteStream(logFile, { fd: fs.openSync(logFile, 'a') });
      stream.on('error', degradeToStderr);
    } catch (err) {
      degradeToStderr(err);
    }
  }

  const write = (line) => {
    if (stream) {
      stream.write(`${line}\n`);
    } else {
      process.stderr.write(`${line}\n`);
    }
  };

  const log = (severity, name, message, args) => {
    if (severity > numericLevel) return;
    write(`${new Date().toISOString()} ${name}: ${util.format(message, ...args)}`);
  };

  return {
    level,
    error: (message, ...args) => log(1, 'error', message, args),
    warn: (message, ...args) => log(2, 'warn', message, args),
    info: (message, ...args) => log(3, 'info', message, args),
    debug: (message, ...args) => log(4, 'debug', message, args),
  };
}

module.exports = { createLogger };
