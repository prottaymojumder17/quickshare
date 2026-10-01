// services/storage.service.js
// সব transfer এখানে store হয় (in-memory Map)

// Map structure:
// transfers.get('123456') = {
//   code, type: 'file' | 'text',
//   data: Buffer | string,
//   filename, mimetype, size,
//   downloads, createdAt, expiresAt
// }

const transfers = new Map();

/**
 * File transfer save করে
 */
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

/**
 * Text transfer save করে
 */
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

/**
 * Code দিয়ে transfer বের করে
 */
function getTransfer(code) {
  return transfers.get(code) || null;
}

/**
 * Transfer delete করে
 */
function deleteTransfer(code) {
  return transfers.delete(code);
}

/**
 * সব expired transfer delete করে
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

/**
 * Code আগে থেকে আছে কিনা check করে
 */
function hasCode(code) {
  return transfers.has(code);
}

/**
 * Stats: মোট কত transfer আছে
 */
function getStats() {
  let files = 0;
  let texts = 0;

  for (const t of transfers.values()) {
    if (t.type === 'file') files++;
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

module.exports = {
  saveFile,
  saveText,
  getTransfer,
  deleteTransfer,
  cleanupExpired,
  hasCode,
  getStats,
  incrementDownload
};
