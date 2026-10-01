// services/storage.service.js
// সব transfer এখানে store হয় (in-memory Map)
// Multi-file + single-file + text support
// ⚠️ Memory limits — server crash protect

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

// ═══════════════════════════════════════════════
//  MEMORY LIMITS
// ═══════════════════════════════════════════════

const MAX_TOTAL_MEMORY = 400 * 1024 * 1024; // 400 MB max RAM usage
const MAX_TRANSFERS = 100; // Max 100 active transfers

// ═══════════════════════════════════════════════
//  MEMORY TRACKING
// ═══════════════════════════════════════════════

function getCurrentMemoryUsage() {
  let total = 0;
  for (const transfer of transfers.values()) {
    if (transfer.type === 'files') {
      total += transfer.totalSize || 0;
    } else if (transfer.type === 'file') {
      total += transfer.size || 0;
    } else if (transfer.type === 'text') {
      total += transfer.size || 0;
    }
  }
  return total;
}

function getTransferCount() {
  return transfers.size;
}

function canAcceptNewTransfer(incomingSize) {
  const currentMemory = getCurrentMemoryUsage();
  const currentCount = getTransferCount();

  if (currentCount >= MAX_TRANSFERS) {
    return {
      ok: false,
      reason: 'MAX_TRANSFERS',
      message: `Server at capacity (${MAX_TRANSFERS} transfers). Please try again in a few minutes.`
    };
  }

  if (currentMemory + incomingSize > MAX_TOTAL_MEMORY) {
    return {
      ok: false,
      reason: 'MEMORY_LIMIT',
      message: 'Server memory full. Please try again in a few minutes.'
    };
  }

  return { ok: true };
}

function getMemoryStats() {
  const used = getCurrentMemoryUsage();
  return {
    totalMemoryUsed: used,
    totalMemoryUsedFormatted: `${(used / 1024 / 1024).toFixed(2)} MB`,
    maxMemory: MAX_TOTAL_MEMORY,
    maxMemoryFormatted: `${(MAX_TOTAL_MEMORY / 1024 / 1024).toFixed(0)} MB`,
    transferCount: getTransferCount(),
    maxTransfers: MAX_TRANSFERS,
    memoryPercent: ((used / MAX_TOTAL_MEMORY) * 100).toFixed(1) + '%',
    transferPercent:
      ((getTransferCount() / MAX_TRANSFERS) * 100).toFixed(1) + '%'
  };
}

// ═══════════════════════════════════════════════
//  SAVE — Multi-file
// ═══════════════════════════════════════════════
function saveFiles({ code, files, expiresAt }) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('saveFiles: files array is required');
  }

  // ⚡ Memory limit check
  const totalIncoming = files.reduce(
    (sum, f) => sum + (f.buffer?.length || 0),
    0
  );
  const check = canAcceptNewTransfer(totalIncoming);

  if (!check.ok) {
    const err = new Error(check.message);
    err.code = check.reason;
    err.statusCode = 503;
    throw err;
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

// ═══════════════════════════════════════════════
//  SAVE — Single file (legacy)
// ═══════════════════════════════════════════════
function saveFile({ code, buffer, filename, mimetype, size, expiresAt }) {
  // ⚡ Memory limit check
  const check = canAcceptNewTransfer(size || buffer?.length || 0);
  if (!check.ok) {
    const err = new Error(check.message);
    err.code = check.reason;
    err.statusCode = 503;
    throw err;
  }

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

// ═══════════════════════════════════════════════
//  SAVE — Text
// ═══════════════════════════════════════════════
function saveText({ code, text, expiresAt }) {
  const size = Buffer.byteLength(text, 'utf8');

  // ⚡ Memory limit check (text is small but still)
  const check = canAcceptNewTransfer(size);
  if (!check.ok) {
    const err = new Error(check.message);
    err.code = check.reason;
    err.statusCode = 503;
    throw err;
  }

  transfers.set(code, {
    code,
    type: 'text',
    text,
    size,
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
 * Transfer থেকে specific file বের করে
 * Supports:
 *   - Multi-file (type: 'files') — id দিয়ে
 *   - Single-file (type: 'file') — 'default' id
 */
function getFileFromTransfer(code, fileId = 'default') {
  const transfer = transfers.get(code);
  if (!transfer) return null;

  // ── Multi-file ──
  if (transfer.type === 'files') {
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

// ═══════════════════════════════════════════════
//  DOWNLOAD COUNT
// ═══════════════════════════════════════════════

function incrementDownload(code) {
  const t = transfers.get(code);
  if (t) {
    t.downloads = (t.downloads || 0) + 1;
    return t.downloads;
  }
  return 0;
}

function incrementFileDownload(code, fileId) {
  const t = transfers.get(code);
  if (!t || t.type !== 'files') return 0;

  const file = t.files.find(f => f.id === fileId);
  if (file) {
    file.downloads = (file.downloads || 0) + 1;
    t.downloads = (t.downloads || 0) + 1;
    return file.downloads;
  }
  return 0;
}

// ═══════════════════════════════════════════════
//  DELETE
// ═══════════════════════════════════════════════

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

// ═══════════════════════════════════════════════
//  REORDER
// ═══════════════════════════════════════════════
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

// ═══════════════════════════════════════════════
//  CLEANUP
// ═══════════════════════════════════════════════
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

/**
 * ⚡ EMERGENCY: Oldest transfers delete (memory pressure)
 * @param {number} count — how many to remove
 */
function emergencyEvict(count = 10) {
  // Sort by createdAt (oldest first)
  const sorted = [...transfers.entries()].sort(
    (a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0)
  );

  let removed = 0;
  for (let i = 0; i < Math.min(count, sorted.length); i++) {
    transfers.delete(sorted[i][0]);
    removed++;
  }

  return removed;
}

// ═══════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════
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

// ═══════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════
module.exports = {
  // Save
  saveFiles,
  saveFile,
  saveText,

  // Get
  getTransfer,
  getFileFromTransfer,

  // Download count
  incrementDownload,
  incrementFileDownload,

  // Delete
  deleteTransfer,
  deleteFileFromTransfer,

  // Reorder
  reorderFiles,

  // Cleanup
  cleanupExpired,
  emergencyEvict,

  // Utils
  hasCode,
  getStats,

  // Memory stats
  getMemoryStats,
  getCurrentMemoryUsage,
  canAcceptNewTransfer
};
