// routes/receive.routes.js
// Receive endpoints — info, download, preview, stats

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

/* ── Stats ── */
router.get('/stats', asyncHandler(getStats));

/* ── Info ── */
router.get('/info/:code', receiveLimiter, validateCode, asyncHandler(getInfo));

/* ── Download ──
   Supports:
     /api/download/:code           → single file (default)
     /api/download/:code/default   → single file explicit
     /api/download/:code/:fileId   → multi-file specific
*/
router.get(
  '/download/:code/:fileId?',
  receiveLimiter,
  validateCode,
  asyncHandler(downloadFile)
);

/* ── Preview ── (same pattern) */
router.get(
  '/preview/:code/:fileId?',
  receiveLimiter,
  validateCode,
  asyncHandler(previewFile)
);

module.exports = router;
