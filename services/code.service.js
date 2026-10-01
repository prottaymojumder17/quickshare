// services/code.service.js
// Unique 6-digit code generate করে

const { CODE_LENGTH, CODE_MIN, CODE_MAX } = require('../config/constants');

/**
 * 6-digit unique code generate করে
 * @param {Function} isCodeTaken - (code) => boolean, code আগে থেকে আছে কিনা
 * @returns {string} 6-digit code
 */
function generateCode(isCodeTaken) {
  const maxAttempts = 100;

  for (let i = 0; i < maxAttempts; i++) {
    const code = Math.floor(
      CODE_MIN + Math.random() * (CODE_MAX - CODE_MIN + 1)
    ).toString();
    if (!isCodeTaken(code)) return code;
  }

  // Fallback: timestamp-ভিত্তিক (collision হলে)
  return Date.now().toString().slice(-CODE_LENGTH);
}

/**
 * Code format validate করে (6 digit number)
 */
function isValidCode(code) {
  if (!code || typeof code !== 'string') return false;
  return /^\d{6}$/.test(code);
}

module.exports = { generateCode, isValidCode };
