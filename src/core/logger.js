const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',
  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m'
  },
  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    yellow: '\x1b[43m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m'
  }
};

class Logger {
  constructor(level = 'info') {
    this.level = level;
    this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
  }

  log(level, ...args) {
    if (this.levels[level] < this.levels[this.level]) return;
    const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const style = colors.fg.gray;
    const levelStyle = level === 'error' ? colors.fg.red : level === 'warn' ? colors.fg.yellow : level === 'info' ? colors.fg.green : colors.fg.blue;
    const arrowMsg = args.map(a => {
      if (typeof a === 'object') return JSON.stringify(a);
      return String(a);
    });
    const replaced = arrowMsg.reduce((acc, cur, i) => {
      const prev = arrowMsg[i - 1];
      if (i === 0) return cur.replace(/\n/g, '\n    ');
      // join with spaces, preserve newline handling
      return acc + ' ' + cur.replace(/\n/g, '\n    ');
    });
    const msg = `[${ts}] ${levelStyle}[${level.toUpperCase()}${colors.reset}] ${replaced}${style}\n`;
    console.log(msg);
  }

  debug(...args) { this.log('debug', ...args); }
  info(...args) { this.log('info', ...args); }
  warn(...args) { this.log('warn', ...args); }
  error(...args) { this.log('error', ...args); }
}

module.exports = Logger;