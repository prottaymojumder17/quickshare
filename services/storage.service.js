// services/storage.service.js
// সব transfer এখানে store হয় (in-memory Map)
// Multi-file support + backward compatible with single-file

const { generateFileId, dedupeFilename } = require('../utils/fileId');

/**
 * Storage structure:
 *
 * Map key: code (e.g., "483921")
 * Map value: transfer object
 *
 * Transfer object (multi-file):
 * {
 *   code: "483921",
 *   type: "files",                     // ← multi-file
 *   files: [
 *     {
 *       id: "f_abc123",
 *       data: Buffer,
 *       filename: "photo.jpg",
 *       mimetype: "image/jpeg",
 *       size: 1234567,
 *       order: 0
 *     },
 *     ...
 *   ],
 *   totalSize: 2345678,
 *   fileCount: 2,
 *   downloads: 0,
 *   createdAt: timestamp,
 *   expiresAt: timestamp,
 * }
 *
 * Transfer object (text — unchanged):
 * {
 *   code: "123456",
 *   type: "text",
 *   text: "...",
 *   size: 123,
 *   downloads: 0,
 *   createdAt,
 *   expiresAt,
 * }
 *
 * Legacy transfer (single-file — v1):
 * {
 *   code: "111111",
 *   type: "file",                      // ← singular
 *   data: Buffer,
 *   filename, mimetype, size,
 *   downloads: 0,
 *   createdAt,
 *   expiresAt,
 * }
 */

const transfers = new Map();

// ═══════════════════════════════════════════════
//  SAVE — Multi-file
// ═══════════════════════════════════════════════

/**
 * Multiple files save করে
 * @param {Object} params
 * @param {string} params.code
 * @param {Array} params.files — [{ buffer, filename, mimetype, size }, ...]
 * @param {number} params.expiresAt
 */
function saveFiles({ code, files, expiresAt }) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('saveFiles: files array is required');
  }

  const existingNames = [];
  const processedFiles = files.map((file, index) => {
    const safeName = dedupeFilename(
      file.filename || `file_${index + 1}`,
      existingNames
    );
    existingNames.push(safeName);

    return {
      id: generateFileId(),
      data: file.buffer,
      filename: safeName,
      mimetype: file.mimetype || 'application/octet-stream',
      size: file.size,
      order: index
    };
  });

  const totalSize = processedFiles.reduce((sum, f) => sum + f.size, 0);

  transfers.set(code, {
    code,
    type: 'files',
    files: processedFiles,
    totalSize,
    fileCount: processedFiles.length,
    downloads: 0,
    createdAt: Date.now(),
    expiresAt
  });
}

// ═══════════════════════════════════════════════
//  SAVE — Legacy single file (backward compat)
// ═══════════════════════════════════════════════

/**
 * Single file save করে (পুরনো API-র জন্য)
 * @deprecated — new code-এ saveFiles() ব্যবহার করুন
 */
function saveFile({ code, buffer, filename, mimetype, size, expiresAt }) {
  transfers.set(code, {
    code,
    type: 'file', // singular — legacy
    data: buffer,
    filename,
    mimetype,
    size,
    downloads: 0,
    createdAt: Date.now(),
    expiresAt
  });
}

// ═══════════════════════════════════════════════
//  SAVE — Text
// ═══════════════════════════════════════════════

function saveText({ code, text, expiresAt }) {
  transfers.set(code, {
    code,
    type: 'text',
    text,
    size: Buffer.byteLength(text, 'utf8'),
    downloads: 0,
    createdAt: Date.now(),
    expiresAt
  });
}

// ═══════════════════════════════════════════════
//  GET
// ═══════════════════════════════════════════════

/**
 * Code দিয়ে transfer বের করে
 */
function getTransfer(code) {
  return transfers.get(code) || null;
}

/**
 * Multi-file transfer থেকে specific file বের করে (id দিয়ে)
 */
function getFileById(code, fileId) {
  const transfer = transfers.get(code);
  if (!transfer) return null;
  if (transfer.type !== 'files') return null;

  return transfer.files.find(f => f.id === fileId) || null;
}

/**
 * Multi-file transfer থেকে specific file বের করে (order index দিয়ে)
 */
function getFileByIndex(code, index) {
  const transfer = transfers.get(code);
  if (!transfer) return null;
  if (transfer.type !== 'files') return null;

  const sorted = [...transfer.files].sort((a, b) => a.order - b.order);
  return sorted[index] || null;
}

// ═══════════════════════════════════════════════
//  DELETE
// ═══════════════════════════════════════════════

function deleteTransfer(code) {
  return transfers.delete(code);
}

/**
 * Multi-file transfer থেকে একটা specific file delete করে (sender side)
 */
function deleteFileFromTransfer(code, fileId) {
  const transfer = transfers.get(code);
  if (!transfer || transfer.type !== 'files') return false;

  const before = transfer.files.length;
  transfer.files = transfer.files.filter(f => f.id !== fileId);

  // Re-order
  transfer.files.forEach((f, i) => (f.order = i));

  // Recalculate
  transfer.totalSize = transfer.files.reduce((sum, f) => sum + f.size, 0);
  transfer.fileCount = transfer.files.length;

  // যদি সব file delete হয়ে যায়, পুরো transfer মুছে দিই
  if (transfer.files.length === 0) {
    transfers.delete(code);
    return true;
  }

  return transfer.files.length < before;
}

// ═══════════════════════════════════════════════
//  REORDER (future phase-এর জন্য প্রস্তুত)
// ═══════════════════════════════════════════════

/**
 * Files-এর order update করে
 * @param {string} code
 * @param {Array<string>} orderedIds — file IDs new order-এ
 */
function reorderFiles(code, orderedIds) {
  const transfer = transfers.get(code);
  if (!transfer || transfer.type !== 'files') return false;

  const idToFile = new Map(transfer.files.map(f => [f.id, f]));
  const newFiles = [];

  for (let i = 0; i < orderedIds.length; i++) {
    const file = idToFile.get(orderedIds[i]);
    if (file) {
      file.order = i;
      newFiles.push(file);
      idToFile.delete(orderedIds[i]);
    }
  }

  // কোনো file বাদ পড়লে সেগুলো শেষে যোগ করি
  for (const file of idToFile.values()) {
    file.order = newFiles.length;
    newFiles.push(file);
  }

  transfer.files = newFiles;
  return true;
}

// ═══════════════════════════════════════════════
//  CLEANUP (expiry)
// ═══════════════════════════════════════════════

/**
 * Expired সব transfer delete করে
 */
function cleanupExpired() {
  const now = Date.now();
  let removed = 0;

  for (const [code, transfer] of transfers.entries()) {
    if (transfer.expiresAt && transfer.expiresAt < now) {
      transfers.delete(code);
      removed++;
    }
  }

  return removed;
}

// ═══════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════

/**
 * Code আগে থেকে আছে কিনা
 */
function hasCode(code) {
  return transfers.has(code);
}

/**
 * Public stats
 */
function getStats() {
  let files = 0;
  let texts = 0;

  for (const t of transfers.values()) {
    if (t.type === 'files') files += t.fileCount || 0;
    else if (t.type === 'file')
      files += 1; // legacy
    else if (t.type === 'text') texts++;
  }

  return {
    activeTransfers: transfers.size,
    files,
    texts
  };
}

/**
 * Download counter বাড়ায়
 */
function incrementDownload(code) {
  const t = transfers.get(code);
  if (t) {
    t.downloads = (t.downloads || 0) + 1;
    return t.downloads;
  }
  return 0;
}

// ═══════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════

module.exports = {
  // Save
  saveFiles, // ⭐ new — multi-file
  saveFile, // legacy — single file
  saveText,

  // Get
  getTransfer,
  getFileById, // ⭐ new
  getFileByIndex, // ⭐ new

  // Delete
  deleteTransfer,
  deleteFileFromTransfer, // ⭐ new

  // Reorder
  reorderFiles, // ⭐ new (future)

  // Utils
  cleanupExpired,
  hasCode,
  getStats,
  incrementDownload
};
