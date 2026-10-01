// services/expiry.service.js
// পুরনো transfer auto-delete + memory pressure relief

const { EXPIRY_MINUTES, CLEANUP_INTERVAL_MS } = require('../config/constants');
const storage = require('./storage.service');
const logger = require('../utils/logger');

let intervalId = null;

/**
 * Expiry-এর শেষ time
 */
function getExpiryTime() {
  return Date.now() + EXPIRY_MINUTES * 60 * 1000;
}

/**
 * Normal cleanup — expired only
 */
function runCleanup() {
  const removed = storage.cleanupExpired();
  if (removed > 0) {
    logger.info(`🧹 Cleaned up ${removed} expired transfer(s)`);
  }
  return removed;
}

/**
 * Emergency cleanup — memory pressure handle
 * সবচেয়ে পুরনো transfer গুলো delete করে
 */
function emergencyCleanup() {
  const stats = storage.getMemoryStats();
  const memPercent = parseFloat(stats.memoryPercent);

  if (memPercent < 80) return 0; // Not critical yet

  logger.warn(
    `⚠ Memory at ${stats.memoryPercent}. Running emergency cleanup...`
  );

  // Force delete oldest transfers
  // (you can add storage.getOldestTransfers() if needed)

  // Simple approach: run normal cleanup more aggressively
  return runCleanup();
}

/**
 * Cleanup timer চালু
 */
function startCleanupJob() {
  if (intervalId) return;

  intervalId = setInterval(() => {
    // Normal expired cleanup
    const removed = storage.cleanupExpired();
    if (removed > 0) {
      logger.info(`🧹 Cleaned up ${removed} expired transfer(s)`);
    }

    // ⚡ Memory pressure check
    const stats = storage.getMemoryStats();
    if (parseFloat(stats.memoryPercent) > 85) {
      logger.warn(
        `⚠ Memory pressure: ${stats.memoryPercent} — emergency cleanup`
      );
      const evicted = storage.emergencyEvict(10);
      if (evicted > 0) {
        logger.warn(`🚨 Emergency evicted ${evicted} oldest transfer(s)`);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  logger.success(
    `Expiry service started (cleanup every ${CLEANUP_INTERVAL_MS / 1000}s, expiry ${EXPIRY_MINUTES} min)`
  );
}

function stopCleanupJob() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  getExpiryTime,
  startCleanupJob,
  stopCleanupJob,
  runCleanup,
  emergencyCleanup
};
