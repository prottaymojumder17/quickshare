// public/js/socket.js
// Socket.io client wrapper

(function () {
  'use strict';

  const QS = window.QS;

  const socket = {
    io: null,
    connected: false,
    listeners: new Map(), // event -> Set(callbacks)

    /**
     * Init socket connection
     */
    init() {
      if (typeof window.io === 'undefined') {
        console.warn('[Socket] socket.io client not loaded');
        return;
      }

      this.io = window.io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.io.on('connect', () => {
        this.connected = true;
        console.log('[Socket] connected:', this.io.id);
      });

      this.io.on('disconnect', reason => {
        this.connected = false;
        console.log('[Socket] disconnected:', reason);
      });

      this.io.on('connect_error', err => {
        console.warn('[Socket] connect error:', err.message);
      });

      // Re-attach pending listeners
      for (const [event, callbacks] of this.listeners.entries()) {
        for (const cb of callbacks) {
          this.io.on(event, cb);
        }
      }
    },

    /**
     * Listen event
     */
    on(event, cb) {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event).add(cb);
      if (this.io) this.io.on(event, cb);
    },

    /**
     * Remove listener
     */
    off(event, cb) {
      if (this.listeners.has(event)) {
        this.listeners.get(event).delete(cb);
      }
      if (this.io) this.io.off(event, cb);
    },

    /**
     * Wait until code is available (with timeout)
     * Used on receive side — real-time "ready" notification
     */
    waitForCode(code, timeoutMs = 60000) {
      return new Promise(resolve => {
        const event = `receive-${code}`;
        let done = false;

        const handler = () => {
          if (done) return;
          done = true;
          this.off(event, handler);
          clearTimeout(timer);
          resolve(true);
        };

        this.on(event, handler);

        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          this.off(event, handler);
          resolve(false);
        }, timeoutMs);
      });
    }
  };

  QS.socket = socket;

  // Auto init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => socket.init());
  } else {
    socket.init();
  }
})();
