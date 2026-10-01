// controllers/upload.controller.js
// Multi-file + single-file + text upload

const storage = require('../services/storage.service');
const { generateCode } = require('../services/code.service');
const { getExpiryTime } = require('../services/expiry.service');
const { sanitizeFilename } = require('../utils/mimeHelper');
const { formatSize } = require('../utils/formatSize');
const { AppError } = require('../middlewares/error.middleware');
const {
  BASE_URL,
  MAX_FILES_PER_TRANSFER,
  MAX_TOTAL_SIZE
} = require('../config/constants');
const logger = require('../utils/logger');

/* ═══════════════════════════════════════════════
   SINGLE FILE UPLOAD (Backward compatible — v1)
   POST /api/upload
   Field: "file"
   ═══════════════════════════════════════════════ */
async function uploadFile(req, res) {
  const file = req.file;

  if (!file) {
    throw new AppError('No file provided', 400, 'NO_FILE');
  }

  const code = generateCode(c => storage.hasCode(c));
  const expiresAt = getExpiryTime();
  const filename = sanitizeFilename(file.originalname);

  storage.saveFile({
    code,
    buffer: file.buffer,
    filename,
    mimetype: file.mimetype,
    size: file.size,
    expiresAt
  });

  logger.upload(`${code} — ${filename} (${formatSize(file.size)})`);

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

/* ═══════════════════════════════════════════════
   MULTIPLE FILES UPLOAD (v2)
   POST /api/upload-multiple
   Field: "files"
   ═══════════════════════════════════════════════ */
async function uploadMultipleFiles(req, res) {
  const files = req.files;

  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new AppError('No files provided', 400, 'NO_FILES');
  }

  // File count limit
  if (files.length > MAX_FILES_PER_TRANSFER) {
    throw new AppError(
      `Too many files. Maximum: ${MAX_FILES_PER_TRANSFER}`,
      413,
      'TOO_MANY_FILES'
    );
  }

  // Total size limit
  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    throw new AppError(
      `Total size exceeds limit (${formatSize(MAX_TOTAL_SIZE)})`,
      413,
      'TOTAL_SIZE_EXCEEDED'
    );
  }

  // Client-এর order (optional) — multipart field "order" এলে সেটা respect করব
  // (Frontend থেকে order array pathabo: "0,2,1" format-এ)
  let orderMap = null;
  if (req.body?.fileOrder) {
    try {
      orderMap = req.body.fileOrder.split(',').map(n => parseInt(n, 10));
    } catch (e) {
      orderMap = null;
    }
  }

  // File processing
  const processedFiles = files.map((f, index) => ({
    buffer: f.buffer,
    filename: sanitizeFilename(f.originalname),
    mimetype: f.mimetype,
    size: f.size,
    order: orderMap && orderMap[index] !== undefined ? orderMap[index] : index
  }));

  // Code + expiry
  const code = generateCode(c => storage.hasCode(c));
  const expiresAt = getExpiryTime();

  // Save
  storage.saveFiles({
    code,
    files: processedFiles,
    expiresAt
  });

  logger.upload(`${code} — ${files.length} files (${formatSize(totalSize)})`);

  const io = req.app.get('io');
  if (io) io.emit(`receive-${code}`, { ready: true });

  // Response
  const savedTransfer = storage.getTransfer(code);

  res.status(201).json({
    success: true,
    data: {
      code,
      type: 'files',
      fileCount: files.length,
      totalSize,
      totalSizeFormatted: formatSize(totalSize),
      files: savedTransfer.files.map(f => ({
        id: f.id,
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size,
        sizeFormatted: formatSize(f.size),
        order: f.order
      })),
      expiresAt,
      expiresInMinutes: Math.round((expiresAt - Date.now()) / 60000),
      shareUrl: `${BASE_URL}/r/${code}`
    }
  });
}

/* ═══════════════════════════════════════════════
   TEXT UPLOAD
   POST /api/text
   ═══════════════════════════════════════════════ */
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

module.exports = {
  uploadFile,
  uploadMultipleFiles,
  uploadText
};
