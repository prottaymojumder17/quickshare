// public/js/config.js
// Frontend constants + global namespace

window.QS = window.QS || {};

QS.config = {
  // API base (empty = same origin)
  API_BASE: '',

  // Routes
  ROUTES: {
    upload: '/api/upload',
    text: '/api/text',
    info: '/api/info',
    download: '/api/download',
    preview: '/api/preview',
    stats: '/api/stats',
    health: '/api/health'
  },

  // Limits
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100 MB
  MAX_TEXT_LENGTH: 500000, // 500k chars
  CODE_LENGTH: 6,

  // Timeouts (ms)
  TOAST_DURATION: 4000,
  COPY_FEEDBACK_MS: 1500,
  UPLOAD_TIMEOUT: 5 * 60 * 1000, // 5 min

  // Theme
  THEME_KEY: 'qs-theme',
  DEFAULT_THEME: 'dark'
};

// Small helper — API URL builder
QS.api = path => `${QS.config.API_BASE}${path}`;
