// utils/mimeHelper.js
// File-এর MIME type দেখে ধরন বোঝে

function getFileCategory(mimetype) {
  if (!mimetype) return 'other';

  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype === 'application/pdf') return 'pdf';
  if (
    mimetype.includes('zip') ||
    mimetype.includes('rar') ||
    mimetype.includes('7z')
  )
    return 'archive';
  if (mimetype.includes('word') || mimetype.includes('document'))
    return 'document';
  if (mimetype.includes('sheet') || mimetype.includes('excel'))
    return 'spreadsheet';
  if (mimetype.includes('presentation') || mimetype.includes('powerpoint'))
    return 'presentation';
  if (mimetype.startsWith('text/')) return 'text';

  return 'other';
}

function isPreviewable(mimetype) {
  if (!mimetype) return false;
  return (
    mimetype.startsWith('image/') ||
    mimetype.startsWith('video/') ||
    mimetype.startsWith('audio/') ||
    mimetype === 'application/pdf'
  );
}

// Browser-এ safe ভাবে file name encode করে
function sanitizeFilename(filename) {
  if (!filename) return 'file';
  // Path traversal prevent
  return filename
    .replace(/[\/\\]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[<>:"|?*\x00-\x1f]/g, '_')
    .substring(0, 200);
}

module.exports = { getFileCategory, isPreviewable, sanitizeFilename };
