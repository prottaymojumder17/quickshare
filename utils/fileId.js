// utils/fileId.js
// Unique file ID generate করে (প্রতিটা file-এর জন্য)

const crypto = require('crypto');

/**
 * Short unique file ID তৈরি করে
 * উদাহরণ: "f_3a8b2c9d"
 */
function generateFileId() {
  const random = crypto.randomBytes(4).toString('hex');
  return `f_${random}`;
}

/**
 * Duplicate filename হ্যান্ডেল করে
 * "photo.jpg" already আছে → "photo(1).jpg"
 */
function dedupeFilename(filename, existingNames = []) {
  if (!existingNames.includes(filename)) return filename;

  const dotIndex = filename.lastIndexOf('.');
  let base, ext;
  if (dotIndex > 0) {
    base = filename.substring(0, dotIndex);
    ext = filename.substring(dotIndex);
  } else {
    base = filename;
    ext = '';
  }

  let counter = 1;
  let newName = `${base}(${counter})${ext}`;
  while (existingNames.includes(newName)) {
    counter++;
    newName = `${base}(${counter})${ext}`;
  }
  return newName;
}

module.exports = { generateFileId, dedupeFilename };
