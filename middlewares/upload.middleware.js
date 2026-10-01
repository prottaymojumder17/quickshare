// middlewares/upload.middleware.js
// Multer setup — single + multi-file receive

const multer = require('multer');
const {
  MAX_FILE_SIZE,
  MAX_FILES_PER_TRANSFER
} = require('../config/constants');
const { formatSize } = require('../utils/formatSize');

// Memory storage (RAM)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE, // per-file limit (100MB)
    files: MAX_FILES_PER_TRANSFER // max 5 files
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname) {
      return cb(new Error('Invalid file'));
    }
    cb(null, true);
  }
});

/**
 * Single file upload (backward compatible)
 * Field name: "file"
 */
const uploadSingle = upload.single('file');

/**
 * Multiple files upload (new)
 * Field name: "files"
 * Max: MAX_FILES_PER_TRANSFER (5)
 */
const uploadMultiple = upload.array('files', MAX_FILES_PER_TRANSFER);

/**
 * Single file middleware with error handling
 */
function uploadMiddleware(req, res, next) {
  uploadSingle(req, res, err => {
    handleMulterError(err, res, next);
  });
}

/**
 * Multiple files middleware with error handling
 */
function uploadMultipleMiddleware(req, res, next) {
  uploadMultiple(req, res, err => {
    handleMulterError(err, res, next);
  });
}

/**
 * Multer error handler
 */
function handleMulterError(err, res, next) {
  if (err instanceof multer.MulterError) {
    // File too large
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: `File too large. Maximum size: ${formatSize(MAX_FILE_SIZE)}`,
        code: 'FILE_TOO_LARGE'
      });
    }

    // Too many files
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        success: false,
        error: `Too many files. Maximum: ${MAX_FILES_PER_TRANSFER}`,
        code: 'TOO_MANY_FILES'
      });
    }

    // Unexpected field
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field',
        code: 'UNEXPECTED_FIELD'
      });
    }

    return res.status(400).json({
      success: false,
      error: err.message,
      code: err.code
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message,
      code: 'UPLOAD_ERROR'
    });
  }

  next();
}

module.exports = {
  uploadMiddleware, // single
  uploadMultipleMiddleware // multiple (new)
};
