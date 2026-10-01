// middlewares/rateLimit.middleware.js
// Spam prevent — এক IP থেকে বেশি request আটকায়

const rateLimit = require('express-rate-limit');
const { RATE_LIMIT_WINDOW, RATE_LIMIT_MAX } = require('../config/constants');

// Upload-এর জন্য কড়া limit
const uploadLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW * 60 * 1000, // 15 min
  max: 30, // প্রতি 15 min-এ max 30 upload
  message: {
    success: false,
    error: 'Too many uploads. Please try again later.',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Receive-এর জন্য নরম limit (বেশি bar access হয়)
const receiveLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW * 60 * 1000,
  max: RATE_LIMIT_MAX, // 100 per 15 min
  message: {
    success: false,
    error: 'Too many requests. Please slow down.',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { uploadLimiter, receiveLimiter };
