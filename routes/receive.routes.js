// routes/receive.routes.js
// Receive endpoints

const express = require('express');
const router = express.Router();

const {
  getInfo,
  downloadFile,
  previewFile,
  getStats
} = require('../controllers/receive.controller');
const { validateCode } = require('../middlewares/validate.middleware');
const { receiveLimiter } = require('../middlewares/rateLimit.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

// GET /api/stats — Public stats
router.get('/stats', asyncHandler(getStats));

// GET /api/info/:code — Transfer info
router.get('/info/:code', receiveLimiter, validateCode, asyncHandler(getInfo));

// GET /api/download/:code — Download file
router.get(
  '/download/:code',
  receiveLimiter,
  validateCode,
  asyncHandler(downloadFile)
);

// GET /api/preview/:code — Inline preview
router.get(
  '/preview/:code',
  receiveLimiter,
  validateCode,
  asyncHandler(previewFile)
);

module.exports = router;
