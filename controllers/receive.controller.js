// controllers/receive.controller.js
// Receive + download + preview logic

const storage = require('../services/storage.service');
const { formatSize } = require('../utils/formatSize');
const { getFileCategory, isPreviewable } = require('../utils/mimeHelper');
const { AppError } = require('../middlewares/error.middleware');
const { BASE_URL } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * GET /api/info/:code
 * Transfer-এর metadata দেয় (download/preview ছাড়া)
 */
async function getInfo(req, res) {
  const { code } = req.params;
  const transfer = storage.getTransfer(code);

  if (!transfer) {
    throw new AppError('Code not found or expired', 404, 'NOT_FOUND');
  }

  const base = {
    code: transfer.code,
    type: transfer.type,
    size: transfer.size,
    sizeFormatted: formatSize(transfer.size),
    downloads: transfer.downloads || 0,
    expiresAt: transfer.expiresAt,
    expiresInSeconds: Math.max(
      0,
      Math.round((transfer.expiresAt - Date.now()) / 1000)
    ),
    shareUrl: `${BASE_URL}/r/${code}`
  };

  if (transfer.type === 'text') {
    return res.json({
      success: true,
      data: { ...base, text: transfer.text }
    });
  }

  // File
  res.json({
    success: true,
    data: {
      ...base,
      filename: transfer.filename,
      mimetype: transfer.mimetype,
      category: getFileCategory(transfer.mimetype),
      previewable: isPreviewable(transfer.mimetype),
      previewUrl: `${BASE_URL}/api/preview/${code}`,
      downloadUrl: `${BASE_URL}/api/download/${code}`
    }
  });
}

/**
 * GET /api/download/:code
 * File download করে
 */
async function downloadFile(req, res) {
  const { code } = req.params;
  const transfer = storage.getTransfer(code);

  if (!transfer) {
    throw new AppError('Code not found or expired', 404, 'NOT_FOUND');
  }
  if (transfer.type !== 'file') {
    throw new AppError('This code is for text, not file', 400, 'NOT_A_FILE');
  }

  storage.incrementDownload(code);
  logger.download(
    `${code} — ${transfer.filename} (${formatSize(transfer.size)})`
  );

  // Safe filename encoding (special char handle)
  const encodedName = encodeURIComponent(transfer.filename);

  res.setHeader(
    'Content-Type',
    transfer.mimetype || 'application/octet-stream'
  );
  res.setHeader('Content-Length', transfer.size);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${transfer.filename}"; filename*=UTF-8''${encodedName}`
  );

  res.send(transfer.data);
}

/**
 * GET /api/preview/:code
 * File browser-এ inline দেখা যায় (image/video/audio/pdf)
 */
async function previewFile(req, res) {
  const { code } = req.params;
  const transfer = storage.getTransfer(code);

  if (!transfer) {
    throw new AppError('Code not found or expired', 404, 'NOT_FOUND');
  }
  if (transfer.type !== 'file') {
    throw new AppError('Not a file', 400, 'NOT_A_FILE');
  }

  res.setHeader(
    'Content-Type',
    transfer.mimetype || 'application/octet-stream'
  );
  res.setHeader('Content-Length', transfer.size);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${transfer.filename}"`
  );
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min cache

  res.send(transfer.data);
}

/**
 * GET /api/stats
 * Public stats (কত transfer active)
 */
async function getStats(req, res) {
  const stats = storage.getStats();
  res.json({
    success: true,
    data: stats
  });
}

module.exports = { getInfo, downloadFile, previewFile, getStats };
