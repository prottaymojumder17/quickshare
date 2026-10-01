// routes/receive.routes.js
// Receive endpoints — info, download, preview, stats, ZIP

const express = require('express');
const router = express.Router();

const {
  getInfo,
  downloadFile,
  downloadZip,
  previewFile,
  getStats
} = require('../controllers/receive.controller');
const { validateCode } = require('../middlewares/validate.middleware');
const { receiveLimiter } = require('../middlewares/rateLimit.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

/* ── Stats ── */
router.get('/stats', asyncHandler(getStats));

/* ── Info ── */
router.get('/info/:code', receiveLimiter, validateCode, asyncHandler(getInfo));

/* ── Download single file ──
   /api/download/:code           → default
   /api/download/:code/:fileId   → specific
*/
router.get(
  '/download/:code/:fileId?',
  receiveLimiter,
  validateCode,
  asyncHandler(downloadFile)
);

/* ── Download All as ZIP ── */
router.get(
  '/download-zip/:code',
  receiveLimiter,
  validateCode,
  asyncHandler(downloadZip)
);

/* ── Preview ── */
router.get(
  '/preview/:code/:fileId?',
  receiveLimiter,
  validateCode,
  asyncHandler(previewFile)
);

module.exports = router;
