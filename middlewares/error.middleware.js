// middlewares/error.middleware.js
// Custom error class + async wrapper

const logger = require('../utils/logger');
const { NODE_ENV } = require('../config/constants');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

// Async function-এর error catch করার wrapper
// ব্যবহার: router.get('/', asyncHandler(async (req, res) => {...}))
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Global error handler (server.js-এ last middleware হিসেবে বসবে)
function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  const code = err.code || 'SERVER_ERROR';
  const message = err.message || 'Internal server error';

  logger.error(`${status} ${code} — ${message}`);

  if (NODE_ENV === 'development' && !err.isOperational) {
    console.error(err.stack);
  }

  res.status(status).json({
    success: false,
    error: message,
    code
  });
}

module.exports = { AppError, asyncHandler, errorHandler };
