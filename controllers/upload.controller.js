// controllers/upload.controller.js
// File + Text upload logic

const storage = require('../services/storage.service');
const { generateCode } = require('../services/code.service');
const { getExpiryTime } = require('../services/expiry.service');
const { sanitizeFilename } = require('../utils/mimeHelper');
const { formatSize } = require('../utils/formatSize');
const { AppError } = require('../middlewares/error.middleware');
const { BASE_URL } = require('../config/constants');
const logger = require('../utils/logger');

/**
 * POST /api/upload
 * File upload করে, code return করে
 */
async function uploadFile(req, res) {
  const file = req.file;

  if (!file) {
    throw new AppError('No file provided', 400, 'NO_FILE');
  }

  // Unique code generate
  const code = generateCode(c => storage.hasCode(c));
  const expiresAt = getExpiryTime();
  const filename = sanitizeFilename(file.originalname);

  // Storage-এ save
  storage.saveFile({
    code,
    buffer: file.buffer,
    filename,
    mimetype: file.mimetype,
    size: file.size,
    expiresAt
  });

  logger.upload(`${code} — ${filename} (${formatSize(file.size)})`);

  // Socket.io দিয়ে notify (যদি কেউ এই code-এ listen করছে)
  const io = req.app.get('io');
  if (io) io.emit(`receive-${code}`, { ready: true });

  res.status(201).json({
    success: true,
    data: {
      code,
      type: 'file',
      filename,
      mimetype: file.mimetype,
      size: file.size,
      sizeFormatted: formatSize(file.size),
      expiresAt,
      expiresInMinutes: Math.round((expiresAt - Date.now()) / 60000),
      shareUrl: `${BASE_URL}/r/${code}`
    }
  });
}

/**
 * POST /api/text
 * Text upload করে, code return করে
 */
async function uploadText(req, res) {
  const { text } = req.body;

  const code = generateCode(c => storage.hasCode(c));
  const expiresAt = getExpiryTime();

  storage.saveText({ code, text, expiresAt });

  logger.upload(`${code} — [Text] (${formatSize(Buffer.byteLength(text))})`);

  const io = req.app.get('io');
  if (io) io.emit(`receive-${code}`, { ready: true });

  res.status(201).json({
    success: true,
    data: {
      code,
      type: 'text',
      size: Buffer.byteLength(text, 'utf8'),
      sizeFormatted: formatSize(Buffer.byteLength(text, 'utf8')),
      expiresAt,
      expiresInMinutes: Math.round((expiresAt - Date.now()) / 60000),
      shareUrl: `${BASE_URL}/r/${code}`
    }
  });
}

module.exports = { uploadFile, uploadText };
