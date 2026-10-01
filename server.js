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
const storageService = require('./services/storage.service');
const { errorHandler } = require('./middlewares/error.middleware');

// Routes
const uploadRoutes = require('./routes/upload.routes');
const receiveRoutes = require('./routes/receive.routes');

// ═══════════════════════════════════════════════
//  EXPRESS APP
// ═══════════════════════════════════════════════
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e8, // 100MB
  cors: { origin: '*' }
});

// ═══════════════════════════════════════════════
//  CONCURRENT UPLOAD LIMITER
// ═══════════════════════════════════════════════
const activeUploads = new Set();
const MAX_CONCURRENT_UPLOADS = 20;

app.use((req, res, next) => {
  // Only limit upload endpoints
  if (!req.path.startsWith('/api/upload')) {
    return next();
  }

  if (activeUploads.size >= MAX_CONCURRENT_UPLOADS) {
    return res.status(503).json({
      success: false,
      error: 'Server busy. Please try again in a moment.',
      code: 'SERVER_BUSY',
      retryAfter: 5
    });
  }

  const id = Date.now() + '-' + Math.random().toString(36).slice(2);
  activeUploads.add(id);

  res.on('finish', () => activeUploads.delete(id));
  res.on('close', () => activeUploads.delete(id));

  next();
});

// ═══════════════════════════════════════════════
//  GLOBAL REQUEST TIMEOUT
// ═══════════════════════════════════════════════
app.use((req, res, next) => {
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        error: 'Request timeout',
        code: 'TIMEOUT'
      });
    }
  }, 55000); // 55 sec

  res.on('finish', () => clearTimeout(timeout));
  res.on('close', () => clearTimeout(timeout));

  next();
});

// ═══════════════════════════════════════════════
//  SECURITY + UTILITY MIDDLEWARE
// ═══════════════════════════════════════════════
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

// ═══════════════════════════════════════════════
//  STATIC FILES
// ═══════════════════════════════════════════════
app.use(express.static(path.join(__dirname, 'public')));

// ═══════════════════════════════════════════════
//  SOCKET.IO
// ═══════════════════════════════════════════════
io.on('connection', socket => {
  logger.info(`🔌 Socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`🔌 Socket disconnected: ${socket.id}`);
  });
});

app.set('io', io);

// ═══════════════════════════════════════════════
//  API ROUTES
// ═══════════════════════════════════════════════
app.use('/api', uploadRoutes);
app.use('/api', receiveRoutes);

// ═══════════════════════════════════════════════
//  HEALTH CHECK — monitoring + load balancer
// ═══════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  const mem = process.memoryUsage();
  const storageStats = storageService.getMemoryStats();

  const memUsageMB = mem.heapUsed / 1024 / 1024;
  const memLimitMB = 512; // Render free tier
  const memPercent = (memUsageMB / memLimitMB) * 100;

  const storageMemPercent = parseFloat(storageStats.memoryPercent);

  const isHealthy =
    memPercent < 90 &&
    storageMemPercent < 90 &&
    activeUploads.size < MAX_CONCURRENT_UPLOADS;

  res.status(isHealthy ? 200 : 503).json({
    success: true,
    data: {
      status: isHealthy ? 'ok' : 'degraded',
      uptime: Math.round(process.uptime()),
      env: NODE_ENV,
      timestamp: new Date().toISOString(),

      // Process memory
      processMemory: {
        heapUsed: `${memUsageMB.toFixed(2)} MB`,
        heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
        percentUsed: `${memPercent.toFixed(1)}%`
      },

      // Storage stats
      storage: storageStats,

      // Concurrent uploads
      concurrentUploads: {
        active: activeUploads.size,
        max: MAX_CONCURRENT_UPLOADS,
        percent:
          ((activeUploads.size / MAX_CONCURRENT_UPLOADS) * 100).toFixed(1) + '%'
      }
    }
  });
});

// ═══════════════════════════════════════════════
//  SHAREABLE LINK REDIRECT
// ═══════════════════════════════════════════════
app.get('/r/:code', (req, res) => {
  const { code } = req.params;
  res.redirect(`/?code=${code}&tab=receive`);
});

// ═══════════════════════════════════════════════
//  404 HANDLER
// ═══════════════════════════════════════════════
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'API route not found',
      code: 'NOT_FOUND'
    });
  }
  const notFoundPath = path.join(__dirname, 'public', '404.html');
  res.status(404).sendFile(notFoundPath, err => {
    if (err) res.status(404).send('404 — Page not found');
  });
});

// ═══════════════════════════════════════════════
//  GLOBAL ERROR HANDLER
// ═══════════════════════════════════════════════
app.use(errorHandler);

// ═══════════════════════════════════════════════
//  SERVER PERFORMANCE
// ═══════════════════════════════════════════════
server.requestTimeout = 60000; // 60 sec per request
server.headersTimeout = 65000; // 65 sec
server.keepAliveTimeout = 65000; // 65 sec
server.maxConnections = 500;

// ═══════════════════════════════════════════════
//  START SERVER
// ═══════════════════════════════════════════════
server.listen(PORT, () => {
  console.log('');
  logger.success(`🚀 QuickShare server running`);
  logger.info(`🌐 URL: http://localhost:${PORT}`);
  logger.info(`🌍 Mode: ${NODE_ENV}`);
  logger.info(`📡 API: http://localhost:${PORT}/api/health`);
  console.log('');

  expiryService.startCleanupJob();

  // ⚡ Memory monitoring — log every 5 minutes
  setInterval(
    () => {
      const stats = storageService.getMemoryStats();
      const mem = process.memoryUsage();
      const heapMB = (mem.heapUsed / 1024 / 1024).toFixed(1);

      logger.info(
        `📊 Memory: ${heapMB} MB heap | Storage: ${stats.totalMemoryUsedFormatted} | Transfers: ${stats.transferCount}/${stats.maxTransfers} | Uploads: ${activeUploads.size}/${MAX_CONCURRENT_UPLOADS}`
      );

      // Auto emergency-evict if memory too high
      if (parseFloat(stats.memoryPercent) > 85) {
        logger.warn(
          `⚠ Storage memory ${stats.memoryPercent} — evicting oldest transfers`
        );
        const removed = storageService.emergencyEvict(10);
        logger.warn(`🧹 Emergency evicted ${removed} transfer(s)`);
      }
    },
    5 * 60 * 1000
  ); // 5 min
});

// ═══════════════════════════════════════════════
//  GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════
process.on('SIGINT', () => {
  logger.warn('\n🛑 Shutting down server...');
  expiryService.stopCleanupJob();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.warn('\n🛑 SIGTERM received, shutting down...');
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
  logger.error(err.stack);
  process.exit(1);
});
