// services/expiry.service.js
// পুরনো transfer auto-delete করে

const { EXPIRY_MINUTES, CLEANUP_INTERVAL_MS } = require('../config/constants');
const storage = require('./storage.service');
const logger = require('../utils/logger');

let intervalId = null;

/**
 * Expiry-এর শেষ time বের করে
 */
function getExpiryTime() {
  return Date.now() + EXPIRY_MINUTES * 60 * 1000;
}

/**
 * Cleanup timer চালু করে
 */
function startCleanupJob() {
  if (intervalId) return;

  intervalId = setInterval(() => {
    const removed = storage.cleanupExpired();
    if (removed > 0) {
      logger.info(`🧹 Cleaned up ${removed} expired transfer(s)`);
    }
  }, CLEANUP_INTERVAL_MS);

  logger.success(
    `Expiry service started (cleanup every ${CLEANUP_INTERVAL_MS / 1000}s, expiry ${EXPIRY_MINUTES} min)`
  );
}

/**
 * Cleanup timer বন্ধ করে
 */
function stopCleanupJob() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  getExpiryTime,
  startCleanupJob,
  stopCleanupJob
};
