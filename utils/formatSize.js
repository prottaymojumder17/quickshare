// utils/formatSize.js
// Bytes কে human-readable format-এ convert করে

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  if (!bytes || bytes < 0) return 'Unknown';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${units[i]}`;
}

module.exports = { formatSize };
