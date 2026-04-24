const fs = require('fs');
const path = require('path');
const util = require('util');

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const combinedStream = fs.createWriteStream(path.join(logsDir, 'combined.log'), { flags: 'a' });
const errorStream = fs.createWriteStream(path.join(logsDir, 'error.log'), { flags: 'a' });

const COLORS = { info: '\x1b[36m', warn: '\x1b[33m', error: '\x1b[31m', debug: '\x1b[90m' };
const RESET = '\x1b[0m';

const LEVEL_NUM = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function log(level, message, meta) {
  if (LEVEL_NUM[level] < LEVEL_NUM[minLevel]) return;

  const ts = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  const line = `${ts} [${level.toUpperCase()}]: ${message}${metaStr}\n`;

  // Console with color
  process.stdout.write(`${COLORS[level] || ''}${line}${RESET}`);

  // File (plain)
  combinedStream.write(line);
  if (level === 'error') errorStream.write(line);
}

const logger = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => {
    // Support Error objects in meta
    if (meta instanceof Error) meta = { stack: meta.stack, message: meta.message };
    log('error', msg, meta);
  },
};

module.exports = logger;
