// controllers/receive.controller.js
// Multi-file + single-file receive/download/preview

const storage = require('../services/storage.service');
const { formatSize } = require('../utils/formatSize');
const { getFileCategory, isPreviewable } = require('../utils/mimeHelper');
const { AppError } = require('../middlewares/error.middleware');
const { BASE_URL } = require('../config/constants');
const logger = require('../utils/logger');

/* ═══════════════════════════════════════════════
   INFO — GET /api/info/:code
   ═══════════════════════════════════════════════ */
async function getInfo(req, res) {
  const { code } = req.params;
  const transfer = storage.getTransfer(code);

  if (!transfer) {
    throw new AppError('Code not found or expired', 404, 'NOT_FOUND');
  }

  const base = {
    code: transfer.code,
    type: transfer.type,
    size: transfer.size || transfer.totalSize,
    sizeFormatted: formatSize(transfer.size || transfer.totalSize),
    downloads: transfer.downloads || 0,
    expiresAt: transfer.expiresAt,
    expiresInSeconds: Math.max(
      0,
      Math.round((transfer.expiresAt - Date.now()) / 1000)
    ),
    shareUrl: `${BASE_URL}/r/${code}`
  };

  /* ── Text ── */
  if (transfer.type === 'text') {
    return res.json({
      success: true,
      data: { ...base, text: transfer.text }
    });
  }

  /* ── Single file (legacy) ── */
  if (transfer.type === 'file') {
    return res.json({
      success: true,
      data: {
        ...base,
        type: 'file',
        filename: transfer.filename,
        mimetype: transfer.mimetype,
        category: getFileCategory(transfer.mimetype),
        previewable: isPreviewable(transfer.mimetype),
        previewUrl: `${BASE_URL}/api/preview/${code}/default`,
        downloadUrl: `${BASE_URL}/api/download/${code}/default`
      }
    });
  }

  /* ── Multiple files (v2) ── */
  if (transfer.type === 'files') {
    return res.json({
      success: true,
      data: {
        ...base,
        type: 'files',
        fileCount: transfer.fileCount,
        totalSize: transfer.totalSize,
        totalSizeFormatted: formatSize(transfer.totalSize),
        files: transfer.files.map(f => ({
          id: f.id,
          filename: f.filename,
          mimetype: f.mimetype,
          size: f.size,
          sizeFormatted: formatSize(f.size),
          category: getFileCategory(f.mimetype),
          previewable: isPreviewable(f.mimetype),
          order: f.order,
          previewUrl: `${BASE_URL}/api/preview/${code}/${f.id}`,
          downloadUrl: `${BASE_URL}/api/download/${code}/${f.id}`
        })),
        zipUrl: `${BASE_URL}/api/download-zip/${code}`
      }
    });
  }

  throw new AppError('Unknown transfer type', 500, 'UNKNOWN_TYPE');
}

/* ═══════════════════════════════════════════════
   DOWNLOAD — GET /api/download/:code/:fileId?
   Single file: /api/download/:code/default
   Multi-file:  /api/download/:code/:fileId
   Legacy:      /api/download/:code (auto default)
   ═══════════════════════════════════════════════ */
async function downloadFile(req, res) {
  const { code } = req.params;
  const fileId = req.params.fileId || 'default';

  const transfer = storage.getTransfer(code);
  if (!transfer) {
    throw new AppError('Code not found or expired', 404, 'NOT_FOUND');
  }

  // Text cannot be "downloaded" as file
  if (transfer.type === 'text') {
    throw new AppError('This code is for text, not file', 400, 'NOT_A_FILE');
  }

  // Find the file
  const file = storage.getFileFromTransfer(code, fileId);
  if (!file) {
    throw new AppError(
      'File not found in this transfer',
      404,
      'FILE_NOT_FOUND'
    );
  }

  // Download counters
  if (transfer.type === 'files') {
    storage.incrementFileDownload(code, fileId);
  } else {
    storage.incrementDownload(code);
  }

  logger.download(`${code} — ${file.filename} (${formatSize(file.size)})`);

  const encodedName = encodeURIComponent(file.filename);

  res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
  res.setHeader('Content-Length', file.size);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${file.filename}"; filename*=UTF-8''${encodedName}`
  );

  res.send(file.data);
}

/* ═══════════════════════════════════════════════
   PREVIEW — GET /api/preview/:code/:fileId?
   ═══════════════════════════════════════════════ */
async function previewFile(req, res) {
  const { code } = req.params;
  const fileId = req.params.fileId || 'default';

  const transfer = storage.getTransfer(code);
  if (!transfer) {
    throw new AppError('Code not found or expired', 404, 'NOT_FOUND');
  }

  if (transfer.type === 'text') {
    throw new AppError('Not a file', 400, 'NOT_A_FILE');
  }

  const file = storage.getFileFromTransfer(code, fileId);
  if (!file) {
    throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
  }

  res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
  res.setHeader('Content-Length', file.size);
  res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
  res.setHeader('Cache-Control', 'public, max-age=300');

  res.send(file.data);
}

/* ═══════════════════════════════════════════════
   STATS — GET /api/stats
   ═══════════════════════════════════════════════ */
async function getStats(req, res) {
  const stats = storage.getStats();
  res.json({
    success: true,
    data: stats
  });
}

module.exports = {
  getInfo,
  downloadFile,
  previewFile,
  getStats
};
