// routes/upload.routes.js
// Upload endpoints

const express = require('express');
const router = express.Router();

const { uploadFile, uploadText } = require('../controllers/upload.controller');
const { uploadMiddleware } = require('../middlewares/upload.middleware');
const { uploadLimiter } = require('../middlewares/rateLimit.middleware');
const { validateText } = require('../middlewares/validate.middleware');
const { asyncHandler } = require('../middlewares/error.middleware');

// POST /api/upload — File upload
router.post(
  '/upload',
  uploadLimiter,
  uploadMiddleware,
  asyncHandler(uploadFile)
);

// POST /api/text — Text upload
router.post('/text', uploadLimiter, validateText, asyncHandler(uploadText));

module.exports = router;
