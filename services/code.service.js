// services/code.service.js
// Unique 6-character Mixed code generate করে
// (A-Z, a-z, 0-9, Special Characters) — Example: "aB#9!X"

const { CODE_LENGTH } = require('../config/constants');

// ⚠️ নিরাপত্তার জন্য এবং কনফিউশন এড়াতে কিছু ক্যারেক্টার বাদ দেওয়া হয়েছে
// (যেমন: 0, O, 1, l, I, এবং কিছু ডাবল কোট বা ব্যাকস্ল্যাশ)
const ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZ' + // বড় হাতের অক্ষর (I, O বাদ)
  'abcdefghijkmnopqrstuvwxyz' + // ছোট হাতের অক্ষর (l বাদ)
  '23456789' + // সংখ্যা (0, 1 বাদ)
  '!@#$%^&*_+-=?'; // Special Characters

/**
 * ৬ অক্ষরের ইউনিক কোড জেনারেট করে
 * @param {Function} isCodeTaken - (code) => boolean, কোড আগে থেকে আছে কিনা
 * @returns {string} 6-character code
 */
function generateCode(isCodeTaken) {
  const maxAttempts = 100;

  for (let i = 0; i < maxAttempts; i++) {
    let code = '';
    for (let j = 0; j < CODE_LENGTH; j++) {
      const randomIndex = Math.floor(Math.random() * ALPHABET.length);
      code += ALPHABET[randomIndex];
    }

    if (!isCodeTaken(code)) {
      return code;
    }
  }

  // Fallback (যদি ১০০ বার চেষ্টা করেও ফাঁকা স্লট না পাওয়া যায়)
  const randomStr = Math.random()
    .toString(36)
    .substring(2, 2 + CODE_LENGTH);
  return randomStr;
}

/**
 * Code format validate করে (৬ অক্ষরের A-Z, a-z, 0-9, special char)
 */
function isValidCode(code) {
  if (!code || typeof code !== 'string') return false;
  // চেক করছি কোডে শুধু আলফানিউমেরিক এবং বিশেষ চিহ্ন আছে কিনা, এবং লেংথ ৬ কিনা
  return /^[A-Za-z0-9!@#$%^&*_+\-=?]{6}$/.test(code);
}

module.exports = { generateCode, isValidCode };
