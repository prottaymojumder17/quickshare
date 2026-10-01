// middlewares/validate.middleware.js
// Input validation

const { isValidCode } = require('../services/code.service');
const { AppError } = require('./error.middleware');

// Code param validate করে (:code)
function validateCode(req, res, next) {
  const { code } = req.params;

  if (!isValidCode(code)) {
    return next(
      new AppError(
        'Invalid code format. Must be 6 digits.',
        400,
        'INVALID_CODE'
      )
    );
  }
  next();
}

// Text body validate করে
function validateText(req, res, next) {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return next(new AppError('Text is required', 400, 'TEXT_REQUIRED'));
  }
  if (text.trim().length === 0) {
    return next(new AppError('Text cannot be empty', 400, 'TEXT_EMPTY'));
  }
  if (text.length > 500000) {
    // 500,000 characters ~ 500KB
    return next(
      new AppError(
        'Text too long (max 500,000 characters)',
        413,
        'TEXT_TOO_LONG'
      )
    );
  }
  next();
}

module.exports = { validateCode, validateText };
