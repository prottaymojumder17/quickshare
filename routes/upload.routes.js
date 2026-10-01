// routes/upload.routes.js
// Upload endpoints — single + multi + text

const express = require('express');
const router = express.Router();

const {
  uploadFile,
  uploadMultipleFiles,
  uploadText
} = require('../controllers/upload.controller');

const {
  uploadMiddleware, // single file
  uploadMultipleMiddleware // multiple files
} = require('../middlewares/upload.middleware');

const { uploadLimiter } = require('../middlewares/rateLimit.middleware');
const { validateText } = require('../middlewares/validate.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

/* ═══════════════════════════════════════════════
   POST /api/upload
   Single file upload (backward compatible)
   Field: "file"
   ═══════════════════════════════════════════════ */
router.post(
  '/upload',
  uploadLimiter,
  uploadMiddleware,
  asyncHandler(uploadFile)
);

/* ═══════════════════════════════════════════════
   POST /api/upload-multiple
   Multiple files upload (max 5)
   Field: "files"
   Optional field: "fileOrder" (e.g., "0,2,1")
   ═══════════════════════════════════════════════ */
router.post(
  '/upload-multiple',
  uploadLimiter,
  uploadMultipleMiddleware,
  asyncHandler(uploadMultipleFiles)
);

/* ═══════════════════════════════════════════════
   POST /api/text
   Text upload
   ═══════════════════════════════════════════════ */
router.post('/text', uploadLimiter, validateText, asyncHandler(uploadText));

module.exports = router;
