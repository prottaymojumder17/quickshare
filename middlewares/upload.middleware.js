// middlewares/upload.middleware.js
// Multer setup — file receive করার জন্য

const multer = require('multer');
const { MAX_FILE_SIZE } = require('../config/constants');
const { formatSize } = require('../utils/formatSize');

// Memory-তে file রাখি (RAM), পরে storage.service-এ পাঠাব
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // একবারে ১টা file (future-এ multi করব)
  },
  fileFilter: (req, file, cb) => {
    // সব file allow — কিন্তু খালি file reject
    if (!file.originalname) {
      return cb(new Error('Invalid file'));
    }
    cb(null, true);
  }
});

// Single file upload middleware
const uploadSingle = upload.single('file');

// Error wrapper (Multer error গুলো সুন্দরভাবে handle করে)
function uploadMiddleware(req, res, next) {
  uploadSingle(req, res, err => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          error: `File too large. Maximum size: ${formatSize(MAX_FILE_SIZE)}`,
          code: 'FILE_TOO_LARGE'
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
  });
}

module.exports = { uploadMiddleware };
