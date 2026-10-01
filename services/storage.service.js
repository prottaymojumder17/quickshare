// services/storage.service.js
// সব transfer এখানে store হয় (in-memory Map)
// Multi-file + single-file + text support

const { generateFileId, dedupeFilename } = require('../utils/fileId');

/**
 * Storage structure:
 *
 * Map key: code (e.g., "483921")
 * Map value: transfer object
 *
 * ── Multi-file (v2) ──
 * {
 *   code: "483921",
 *   type: "files",
 *   files: [
 *     { id, data: Buffer, filename, mimetype, size, order, downloads },
 *     ...
 *   ],
 *   totalSize,
 *   fileCount,
 *   downloads: 0,
 *   createdAt,
 *   expiresAt,
 * }
 *
 * ── Single file (v1 legacy) ──
 * {
 *   code: "111111",
 *   type: "file",
 *   data: Buffer,
 *   filename, mimetype, size,
 *   downloads: 0,
 *   createdAt,
 *   expiresAt,
 * }
 *
 * ── Text ──
 * {
 *   code: "123456",
 *   type: "text",
 *   text: "...",
 *   size,
 *   downloads: 0,
 *   createdAt,
 *   expiresAt,
 * }
 */

const transfers = new Map();

/* ═══════════════════════════════════════════════
   SAVE — Multi-file
   ═══════════════════════════════════════════════ */
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
      order: file.order !== undefined ? file.order : index,
      downloads: 0
    };
  });

  // Order অনুযায়ী sort করে order index reset
  processedFiles.sort((a, b) => a.order - b.order);
  processedFiles.forEach((f, i) => (f.order = i));

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

/* ═══════════════════════════════════════════════
   SAVE — Single file (legacy)
   ═══════════════════════════════════════════════ */
function saveFile({ code, buffer, filename, mimetype, size, expiresAt }) {
  transfers.set(code, {
    code,
    type: 'file',
    data: buffer,
    filename,
    mimetype,
    size,
    downloads: 0,
    createdAt: Date.now(),
    expiresAt
  });
}

/* ═══════════════════════════════════════════════
   SAVE — Text
   ═══════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════
   GET
   ═══════════════════════════════════════════════ */

/**
 * Code দিয়ে transfer বের করে
 */
function getTransfer(code) {
  return transfers.get(code) || null;
}

/**
 * ⭐ NEW: Transfer থেকে specific file বের করে
 * Supports:
 *   - Multi-file (type: 'files') — id দিয়ে
 *   - Single-file (type: 'file') — 'default' id
 *
 * @param {string} code
 * @param {string} fileId — file id OR 'default'
 * @returns {Object|null} — { id, data, filename, mimetype, size }
 */
function getFileFromTransfer(code, fileId = 'default') {
  const transfer = transfers.get(code);
  if (!transfer) return null;

  // ── Multi-file ──
  if (transfer.type === 'files') {
    // 'default' হলে প্রথম file দিই
    if (fileId === 'default') {
      const sorted = [...transfer.files].sort((a, b) => a.order - b.order);
      return sorted[0] || null;
    }
    return transfer.files.find(f => f.id === fileId) || null;
  }

  // ── Single file (legacy) ──
  if (transfer.type === 'file') {
    return {
      id: 'default',
      data: transfer.data,
      filename: transfer.filename,
      mimetype: transfer.mimetype,
      size: transfer.size
    };
  }

  return null;
}

/* ═══════════════════════════════════════════════
   DOWNLOAD COUNT
   ═══════════════════════════════════════════════ */

/**
 * Transfer-এর overall download count বাড়ায়
 */
function incrementDownload(code) {
  const t = transfers.get(code);
  if (t) {
    t.downloads = (t.downloads || 0) + 1;
    return t.downloads;
  }
  return 0;
}

/**
 * ⭐ NEW: Multi-file transfer-এ specific file-এর download count বাড়ায়
 */
function incrementFileDownload(code, fileId) {
  const t = transfers.get(code);
  if (!t || t.type !== 'files') return 0;

  const file = t.files.find(f => f.id === fileId);
  if (file) {
    file.downloads = (file.downloads || 0) + 1;
    // Overall download count-ও বাড়াই
    t.downloads = (t.downloads || 0) + 1;
    return file.downloads;
  }
  return 0;
}

/* ═══════════════════════════════════════════════
   DELETE
   ═══════════════════════════════════════════════ */

function deleteTransfer(code) {
  return transfers.delete(code);
}

function deleteFileFromTransfer(code, fileId) {
  const transfer = transfers.get(code);
  if (!transfer || transfer.type !== 'files') return false;

  const before = transfer.files.length;
  transfer.files = transfer.files.filter(f => f.id !== fileId);
  transfer.files.forEach((f, i) => (f.order = i));
  transfer.totalSize = transfer.files.reduce((sum, f) => sum + f.size, 0);
  transfer.fileCount = transfer.files.length;

  if (transfer.files.length === 0) {
    transfers.delete(code);
    return true;
  }

  return transfer.files.length < before;
}

/* ═══════════════════════════════════════════════
   REORDER
   ═══════════════════════════════════════════════ */
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

  for (const file of idToFile.values()) {
    file.order = newFiles.length;
    newFiles.push(file);
  }

  transfer.files = newFiles;
  return true;
}

/* ═══════════════════════════════════════════════
   CLEANUP
   ═══════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════ */
function hasCode(code) {
  return transfers.has(code);
}

function getStats() {
  let files = 0;
  let texts = 0;

  for (const t of transfers.values()) {
    if (t.type === 'files') files += t.fileCount || 0;
    else if (t.type === 'file') files += 1;
    else if (t.type === 'text') texts++;
  }

  return {
    activeTransfers: transfers.size,
    files,
    texts
  };
}

/* ═══════════════════════════════════════════════
   EXPORTS
   ═══════════════════════════════════════════════ */
module.exports = {
  // Save
  saveFiles,
  saveFile,
  saveText,

  // Get
  getTransfer,
  getFileFromTransfer, // ⭐ NEW — supports 'default' for legacy

  // Download count
  incrementDownload,
  incrementFileDownload, // ⭐ NEW

  // Delete
  deleteTransfer,
  deleteFileFromTransfer,

  // Reorder
  reorderFiles,

  // Utils
  cleanupExpired,
  hasCode,
  getStats
};
