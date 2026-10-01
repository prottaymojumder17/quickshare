// controllers/receive.controller.js
// Multi-file + single-file receive/download/preview + ZIP

const archiver = require('archiver');
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
   ═══════════════════════════════════════════════ */
async function downloadFile(req, res) {
  const { code } = req.params;
  const fileId = req.params.fileId || 'default';

  const transfer = storage.getTransfer(code);
  if (!transfer) {
    throw new AppError('Code not found or expired', 404, 'NOT_FOUND');
  }

  if (transfer.type === 'text') {
    throw new AppError('This code is for text, not file', 400, 'NOT_A_FILE');
  }

  const file = storage.getFileFromTransfer(code, fileId);
  if (!file) {
    throw new AppError(
      'File not found in this transfer',
      404,
      'FILE_NOT_FOUND'
    );
  }

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
   DOWNLOAD ALL AS ZIP
   ⚠️ NON-ASYNC — streaming must be synchronous
   ═══════════════════════════════════════════════ */
function downloadZip(req, res, next) {
  const { code } = req.params;

  console.log('\n═══════════════════════════════');
  console.log('[ZIP] ▶ Request received for code:', code);

  // ── Get transfer ──
  let transfer;
  try {
    transfer = storage.getTransfer(code);
  } catch (err) {
    console.error('[ZIP] ✗ storage.getTransfer() threw:', err);
    return next(err);
  }

  console.log('[ZIP] ✓ Transfer found:', !!transfer);

  if (!transfer) {
    console.log('[ZIP] ✗ Not found → 404');
    return res.status(404).json({
      success: false,
      error: 'Code not found or expired',
      code: 'NOT_FOUND'
    });
  }

  console.log('[ZIP]   type:', transfer.type);

  if (transfer.type === 'text') {
    console.log('[ZIP] ✗ Text transfer → 400');
    return res.status(400).json({
      success: false,
      error: 'Cannot create ZIP for text transfer',
      code: 'NOT_A_FILE'
    });
  }

  if (transfer.type === 'file') {
    console.log('[ZIP] → Redirecting legacy single file');
    return res.redirect(`/api/download/${code}/default`);
  }

  if (transfer.type !== 'files') {
    console.log('[ZIP] ✗ Unsupported type:', transfer.type);
    return res.status(400).json({
      success: false,
      error: 'Unsupported transfer type',
      code: 'UNSUPPORTED'
    });
  }

  console.log('[ZIP]   fileCount:', transfer.fileCount);
  console.log('[ZIP]   totalSize:', transfer.totalSize);

  // ── Set headers ──
  const zipName = `QuickShare_${code}.zip`;

  try {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Accel-Buffering', 'no');
    console.log('[ZIP] ✓ Headers set');
  } catch (err) {
    console.error('[ZIP] ✗ setHeader threw:', err);
    return next(err);
  }

  // ── Create archiver ──
  let archive;
  try {
    archive = archiver('zip', { zlib: { level: 1 } });
    console.log('[ZIP] ✓ Archiver created');
  } catch (err) {
    console.error('[ZIP] ✗ archiver() threw:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize archiver',
      code: 'ARCHIVER_INIT_ERROR'
    });
  }

  // ── Error handlers ──
  archive.on('error', err => {
    console.error('[ZIP] ✗ ARCHIVE ERROR:', err.message, err);
    logger.error(`ZIP error for ${code}: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to create ZIP',
        code: 'ZIP_ERROR'
      });
    } else {
      try {
        res.destroy();
      } catch (e) {}
    }
  });

  archive.on('warning', err => {
    console.warn('[ZIP] ⚠ WARNING:', err.message);
    logger.warn(`ZIP warning for ${code}: ${err.message}`);
  });

  archive.on('progress', data => {
    console.log(
      `[ZIP]   progress: ${data.entries.processed}/${data.entries.total} entries`
    );
  });

  archive.on('end', () => {
    console.log('[ZIP] ✓ Archive stream ENDED');
  });

  archive.on('close', () => {
    console.log('[ZIP] ✓ Archive stream CLOSED');
  });

  // ── Client abort ──
  req.on('close', () => {
    if (!res.writableEnded) {
      console.log('[ZIP] ⚠ Client closed — aborting');
      try {
        archive.abort();
      } catch (e) {}
    }
  });

  // ── Pipe ──
  try {
    archive.pipe(res);
    console.log('[ZIP] ✓ Piped to response');
  } catch (err) {
    console.error('[ZIP] ✗ pipe() threw:', err);
    return next(err);
  }

  // ── Append files ──
  const sorted = [...transfer.files].sort((a, b) => a.order - b.order);
  const usedNames = new Set();

  console.log('[ZIP] Appending files...');

  for (const file of sorted) {
    let filename = file.filename;

    // Duplicate name handling
    let counter = 1;
    const original = filename;
    while (usedNames.has(filename)) {
      const dotIdx = original.lastIndexOf('.');
      if (dotIdx > 0) {
        filename = `${original.substring(0, dotIdx)}(${counter})${original.substring(dotIdx)}`;
      } else {
        filename = `${original}(${counter})`;
      }
      counter++;
    }
    usedNames.add(filename);

    try {
      if (!file.data) {
        console.warn('[ZIP] ⚠ Skipping — no data:', filename);
        continue;
      }
      if (!Buffer.isBuffer(file.data)) {
        console.warn('[ZIP] ⚠ Not a buffer:', filename, typeof file.data);
      }

      archive.append(file.data, { name: filename });
      console.log(`[ZIP]   ✓ Added: ${filename} (${file.size} bytes)`);
    } catch (err) {
      console.error(`[ZIP] ✗ Failed to append ${filename}:`, err.message);
    }
  }

  // ── Finalize ──
  console.log('[ZIP] Finalizing...');
  try {
    archive.finalize();
    console.log('[ZIP] ✓ finalize() called');
  } catch (err) {
    console.error('[ZIP] ✗ finalize() threw:', err);
  }

  // ── Count + log ──
  try {
    storage.incrementDownload(code);
  } catch (e) {}

  logger.download(
    `${code} — ZIP (${transfer.fileCount} files, ${formatSize(transfer.totalSize)})`
  );

  console.log('[ZIP] ◀ Handler returned\n═══════════════════════════════\n');
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
  downloadZip,
  previewFile,
  getStats
};
