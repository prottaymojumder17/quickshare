// config/constants.js
// সব configuration value এখানে একসাথে

require('dotenv').config();

module.exports = {
  // Server
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',

  // Multi-file limits
  MAX_FILES_PER_TRANSFER: 5,
  MAX_TOTAL_SIZE: 200 * 1024 * 1024, // 200MB total per transfer // 100MB

  // Transfer expiry (minutes)
  EXPIRY_MINUTES: parseInt(process.env.EXPIRY_MINUTES) || 10,

  // Rate limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 100,

  // Code generation
  CODE_LENGTH: 6,
  CODE_MIN: 100000,
  CODE_MAX: 999999,

  // Cleanup interval (check every 1 minute)
  CLEANUP_INTERVAL_MS: 60 * 1000
};
