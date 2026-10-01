# ⚡ QuickShare

> Share files instantly with a code. No signup. No limits. Just a code.

🌐 **Live Demo:** [quickshare-bayp.onrender.com](https://quickshare-bayp.onrender.com)
📦 **Source Code:** [github.com/prottaymojumder17/quickshare](https://github.com/prottaymojumder17/quickshare)
🐛 **Report Bug:** [GitHub Issues](https://github.com/prottaymojumder17/quickshare/issues)
💡 **Feature Request:** [GitHub Issues](https://github.com/prottaymojumder17/quickshare/issues)

---

## ✨ Features

### Core
- 📁 **Any file type** — Audio, video, documents, images, archives, PDFs
- 📝 **Text sharing** — Copy-paste text transfer with 1-click copy
- 🔑 **6-digit code** — Unique, easy to share
- 📱 **QR code** — Scan with phone camera
- 🔗 **Shareable link** — `quickshare.app/r/123456`
- ⏱️ **Auto expiry** — Files auto-delete after 10 minutes
- 🔒 **No signup** — Anonymous, no tracking, no ads

### Multi-File Support
- 📦 **Up to 5 files** per transfer
- 🗂️ **File list UI** — Delete, preview, reorder
- 🔀 **Drag & drop reorder** — Mouse, touch, keyboard
- 📊 **Per-file progress** — See each file upload in real-time
- 📦 **Download All as ZIP** — One click, all files

### Preview
- 👁️ **Inline preview** — Image, video, audio, PDF, text
- 🎠 **Arrow navigation** — Browse multiple files
- ⌨️ **Keyboard support** — Arrow keys, ESC, Enter

### UX
- 🎨 **Dark / Light theme** — Persists across sessions
- 📱 **Responsive** — Mobile, tablet, desktop
- 🍞 **Toast notifications** — Clean feedback
- ⬆️ **Back-to-top button** — Smooth scroll
- 🚀 **Socket.io** — Real-time receive notification
- ⚡ **Performance-optimized** — Memory limits, concurrent upload control

---

## 🎬 How It Works

**Sender:**
1. Upload files or paste text
2. Get a 6-digit code
3. Share code with receiver

**Receiver:**
1. Enter the code
2. Preview files inline
3. Download individually or as ZIP

**Auto-cleanup:** Files auto-delete after 10 minutes for privacy.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express |
| **Realtime** | Socket.io |
| **Upload** | Multer (in-memory) |
| **ZIP** | Archiver |
| **Security** | Helmet, CORS, Express-rate-limit |
| **Deployment** | Render.com |

**No frameworks, no build tools — pure vanilla JS for maximum performance.**

---

## 🚀 Features Breakdown

### File Upload
- Drag & drop support
- Click to browse
- Paste files (Ctrl+V)
- Multi-select (up to 5 files)
- Individual file delete
- Clear all

### File Management
- File list with icons
- Per-file size display
- Total size + count
- Drag-reorder (mouse + touch + keyboard)
- Duplicate detection
- Size validation (per-file + total)

### Preview Modal
- Image (jpg, png, gif, webp, svg)
- Video (mp4, webm)
- Audio (mp3, wav, ogg)
- PDF (embedded viewer)
- Text (txt, md, json, xml, csv)
- Unknown files (fallback message)

### Receiver
- Multi-file list
- Individual preview (modal)
- Individual download
- **Download All as ZIP**
- Inline preview (legacy single file)
- Copy code / link
- Expiry countdown

### Performance
- Memory limit: 400 MB
- Max transfers: 100
- Concurrent uploads: 20
- Request timeout: 55 sec
- Emergency eviction (memory pressure)
- Health monitoring endpoint

---

## 📋 Requirements

- Node.js v18 or higher
- npm or yarn

---

## 🚀 Installation

### 1. Clone the repo

```bash
git clone https://github.com/prottaymojumder17/quickshare.git
cd quickshare
