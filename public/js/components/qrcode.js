// public/js/components/qrcode.js
// QR code generator wrapper (uses QRCode.js library)

(function () {
  'use strict';
  const QS = window.QS;
  const { $ } = QS.utils;

  let instance = null;

  const qrcode = {
    /**
     * Generate QR in #qrcode container
     */
    render(text, size = 200) {
      const container = $('#qrcode');
      if (!container) return;

      // Clear
      container.innerHTML = '';

      // Try QRCode library
      if (typeof window.QRCode !== 'undefined') {
        try {
          instance = new window.QRCode(container, {
            text,
            width: size,
            height: size,
            colorDark: '#0a0a0f',
            colorLight: '#ffffff',
            correctLevel: window.QRCode.CorrectLevel.M
          });
          return true;
        } catch (err) {
          console.warn('[QR] library failed:', err);
        }
      }

      // Fallback: use external API (only if online)
      const img = document.createElement('img');
      img.alt = 'QR Code';
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
      img.onerror = () => {
        container.innerHTML = '';
        const msg = document.createElement('p');
        msg.textContent = 'QR not available offline';
        msg.style.color = '#64748b';
        msg.style.fontSize = '12px';
        container.appendChild(msg);
      };
      container.appendChild(img);
      return true;
    },

    clear() {
      const container = $('#qrcode');
      if (container) container.innerHTML = '';
      instance = null;
    }
  };

  QS.qrcode = qrcode;
})();
