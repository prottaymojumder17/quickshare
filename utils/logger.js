// utils/logger.js
// সুন্দর colored console log এর জন্য

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

const logger = {
  info: msg => {
    console.log(
      `${colors.gray}[${timestamp()}]${colors.reset} ${colors.cyan}ℹ INFO${colors.reset}  ${msg}`
    );
  },
  success: msg => {
    console.log(
      `${colors.gray}[${timestamp()}]${colors.reset} ${colors.green}✓ OK${colors.reset}    ${msg}`
    );
  },
  warn: msg => {
    console.log(
      `${colors.gray}[${timestamp()}]${colors.reset} ${colors.yellow}⚠ WARN${colors.reset}  ${msg}`
    );
  },
  error: msg => {
    console.error(
      `${colors.gray}[${timestamp()}]${colors.reset} ${colors.red}✗ ERROR${colors.reset} ${msg}`
    );
  },
  upload: msg => {
    console.log(
      `${colors.gray}[${timestamp()}]${colors.reset} ${colors.magenta}⬆ UPLOAD${colors.reset} ${msg}`
    );
  },
  download: msg => {
    console.log(
      `${colors.gray}[${timestamp()}]${colors.reset} ${colors.blue}⬇ DOWN${colors.reset}  ${msg}`
    );
  }
};

module.exports = logger;
