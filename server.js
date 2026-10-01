// server.js
// QuickShare — Main Entry Point

require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

const { PORT, NODE_ENV } = require('./config/constants');
const logger = require('./utils/logger');
const expiryService = require('./services/expiry.service');
const { errorHandler } = require('./middlewares/error.middleware');

// Routes
const uploadRoutes = require('./routes/upload.routes');
const receiveRoutes = require('./routes/receive.routes');

// ============ Express App ============
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e8, // 100MB
  cors: { origin: '*' }
});

// ============ Middleware ============
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// ============ Static Files ============
app.use(express.static(path.join(__dirname, 'public')));

// ============ Socket.io ============
io.on('connection', socket => {
  logger.info(`🔌 Socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`🔌 Socket disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// ============ API Routes ============
app.use('/api', uploadRoutes); // POST /api/upload, /api/text
app.use('/api', receiveRoutes); // GET /api/info/:code, /download, /preview, /stats

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      uptime: process.uptime(),
      env: NODE_ENV,
      timestamp: new Date().toISOString()
    }
  });
});

// ============ Shareable Link Redirect ============
// /r/123456 → public/index.html?code=123456
app.get('/r/:code', (req, res) => {
  const { code } = req.params;
  res.redirect(`/?code=${code}&tab=receive`);
});

// ============ 404 Handler ============
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res
      .status(404)
      .json({
        success: false,
        error: 'API route not found',
        code: 'NOT_FOUND'
      });
  }
  // Frontend 404 page
  const notFoundPath = path.join(__dirname, 'public', '404.html');
  res.status(404).sendFile(notFoundPath, err => {
    if (err) res.status(404).send('404 — Page not found');
  });
});

// ============ Global Error Handler ============
app.use(errorHandler);

// ============ Start Server ============
server.listen(PORT, () => {
  console.log('');
  logger.success(`🚀 QuickShare server running`);
  logger.info(`🌐 URL: http://localhost:${PORT}`);
  logger.info(`🌍 Mode: ${NODE_ENV}`);
  logger.info(`📡 API: http://localhost:${PORT}/api/health`);
  console.log('');

  expiryService.startCleanupJob();
});

// ============ Graceful Shutdown ============
process.on('SIGINT', () => {
  logger.warn('\n🛑 Shutting down server...');
  expiryService.stopCleanupJob();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', err => {
  logger.error(`Unhandled Rejection: ${err.message}`);
});

process.on('uncaughtException', err => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});
