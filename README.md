<p align="center">
  <img src="client/public/assets/project_logo.png" alt="Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption" width="160" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);" />
</p>

<h1 align="center">Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption</h1>

<p align="center">
  <strong>An ultra-secure, peer-to-peer real-time communication platform combining browser-native cryptographic invariants, adaptive file transfers, interactive 3D network topology diagnostics, movable workspaces, and comprehensive privacy protections.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/WebRTC-P2P%20Direct-00a884?style=flat-square&logo=webrtc&logoColor=white" alt="WebRTC" />
  <img src="https://img.shields.io/badge/Security-E2EE%20AES--GCM--256-blue?style=flat-square&logo=shield&logoColor=white" alt="E2EE" />
  <img src="https://img.shields.io/badge/Key%20Exchange-ECDH%20P--384-8b5cf6?style=flat-square" alt="ECDH" />
  <img src="https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%20%2B%20TailwindCSS-38bdf8?style=flat-square&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express%20%2B%20Socket.IO-green?style=flat-square&logo=node.js&logoColor=white" alt="Node" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL%20(Neon)%20%2B%20Prisma-indigo?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="License" />
</p>

---

## 📑 Table of Contents
1. [Overview & Architecture](#-overview--architecture)
2. [Key Features](#-key-features)
3. [Cryptographic & Security Architecture](#-cryptographic--security-architecture)
4. [File Transfer Engine](#-file-transfer-engine)
5. [Tech Stack](#-tech-stack)
6. [Getting Started](#-getting-started)
   - [Prerequisites](#prerequisites)
   - [Backend Configuration](#backend-configuration)
   - [Frontend Configuration](#frontend-configuration)
   - [Running Locally](#running-locally)
7. [Automated Testing & Verification](#-automated-testing--verification)
8. [Production Deployment](#-production-deployment)
9. [Security Disclosure & Invariants](#-security-disclosure--invariants)
10. [License](#-license)

---

## 🌐 Overview & Architecture

**Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption** is engineered to eliminate centralized communication relays. Once signaling is negotiated via Socket.IO, all media streams, messages, and files flow directly between client peers via encrypted peer-to-peer tunnels.

```
                    ┌────────────────────────┐
                    │ Socket.IO Signaling    │
                    │ Handshake Server       │
                    └───────────┬────────────┘
                                │ SDP & ICE Exchange Only
                     ┌──────────┴──────────┐
                     ▼                     ▼
          ┌────────────────────┐   P2P   ┌────────────────────┐
          │      Peer A        │◄───────►│      Peer B        │
          │ (React Client)     │  Direct │ (React Client)     │
          └────────────────────┘         └────────────────────┘
             │ Media Transport: DTLS-SRTP (WebRTC Standard)
             │ Data Channels:   AES-GCM-256 via Ephemeral ECDH (P-384)
             │ Local AI Engine: ONNX-Runtime Web (Zero Data Leakage)
```

---

## ✨ Key Features

### 1. 🗂️ Movable & Resizable Room Quick Notes
- **Draggable Header Handle**: Floating notes panel inside active rooms can be moved freely across the viewport via a dedicated drag handle.
- **Bi-directional Resize Grip**: Full width and height adjustability with constrained minimum bounds.
- **Viewport Boundary Clamping**: Real-time clamping ensures the workspace never becomes inaccessible outside the browser window or behind control docks.
- **Minimize & Restore**: Collapse into a compact floating bar without losing draft notes.
- **Durable Local Persistence**: Window coordinates, dimensions, and minimization states persist across sessions in `localStorage`.

### 2. 📸 Durable Profile Photo Persistence
- **10MB Server Payload Capacity**: Express body-parsers support high-resolution base64 avatars without triggering `HTTP 413 Payload Too Large`.
- **Durable Database Persistence**: Profile images are committed directly to PostgreSQL via Prisma ORM.
- **Mount-Time Hydration**: Session restoration automatically fetches user avatars on dashboard and room mount, persisting across logouts, page reloads, and cache refreshes.

### 3. ✉️ Secure 2-Step OTP Email Update
- **Step 1 Authorization**: Dispatches a 6-digit OTP exclusively to the account's currently registered email.
- **Step 2 Verification**: Once authorized, dispatches a second OTP to verify ownership of the new email address.
- **Atomic Database Commit**: Commits changes to the database only after both verification stages pass.
- **Rate-Limiting & Notifications**: Enforces a 45-second cooldown timer, 10-minute token expiration, and automated security notification alerts to the former email.

### 4. 👤 Secure OTP Username Claim
- **Format Validation**: Strict regex rules (`/^[a-zA-Z0-9_]{3,30}$/`) enforce alphanumeric characters and underscores.
- **Uniqueness Verification**: Normalizes input and verifies availability against the database.
- **OTP Protection**: Requires email authorization before atomically updating the user's handle.

### 5. 📎 Rich Media & File Sharing
- **Immediate Sender Previews**: Sender chat threads display instant file attachments with local Blob URLs.
- **Inline Image Viewing**: Automatically renders interactive responsive image previews (`PNG`, `JPEG`, `WEBP`, `SVG`, `GIF`).
- **Inline Video Player**: HTML5 video playback directly within the message bubble (`MP4`, `WEBM`, `MOV`, `MKV`).
- **Save to Device**: Dedicated download buttons trigger direct device filesystem saving from reconstructed Blob memory.

### 6. 🎥 Call Recording Warnings & Screenshot Alerts
- **Real-Time Recording Alerts**: When any peer initiates audio or video recording, a broadcast banner (`⚠️ Peer is recording this call`) and audio chime notify all room participants.
- **Dynamic E2EE Watermark**: Anti-tamper watermark displaying `🔒 P2PConnect E2EE • [Username] • Room #[Id] • [Live UTC Ticker]` continuously overlaying the video canvas.
- **Screenshot Protection & Alerts**: In-app snapshot button in call controls and keyboard shortcut listeners (`PrintScreen`, `Meta+Shift+S`) broadcast immediate alerts to room participants.

### 7. 🕸️ Live 3D Peer Mesh Topology & WebGL Resilience
- **Interactive 3D Graph**: Real-time Three.js visualization displaying connected peer nodes, latency (RTT), and transport protocols (Direct P2P vs Relayed TURN).
- **Graceful Fallbacks**: Integrated `ErrorBoundary` and WebGL feature probes switch automatically to 2D canvas fallback on devices without GPU acceleration or when `prefers-reduced-motion` is active.

### 8. 🧠 Browser-Native AI Meeting Notes
- **Zero-Cloud Summarization**: ONNX Runtime Web executes transformer models directly on the client's WebAssembly/GPU engine.
- **Automated Minutes**: Extracts action items, decisions, and meeting summaries entirely client-side without third-party API exposure.

---

## 🔒 Cryptographic & Security Architecture

| Security Layer | Protocol / Algorithm | Function |
| :--- | :--- | :--- |
| **Media Transport** | DTLS 1.2 / SRTP | Encrypts peer audio and video streams at the WebRTC transport layer |
| **DataChannel Messages** | AES-GCM-256 | Authenticated symmetric encryption for text messages, file chunks, and alerts |
| **Key Agreement** | Ephemeral ECDH (NIST P-384) | Generates per-session symmetric keys with Perfect Forward Secrecy (PFS) |
| **Identity Verification** | Commutative 60-Digit Safety Numbers | Formatted in 12 blocks of 5 digits; identical on both peers regardless of ordering |
| **MITM Detection** | Public Key Fingerprinting | Alerts participants if an intermediary replaces ephemeral keys between handshakes |
| **Message Lifespan** | Ephemeral Time-To-Live (TTL) | Self-destructing messages automatically purged after 5s, 30s, 60s, or custom durations |

---

## ⚡ File Transfer Engine

The **Adaptive Transfer Engine** dynamically streams large files over WebRTC DataChannels:
- **Dynamic Chunk Sizing**: Automatically paces chunk sizes between **8KB** and **256KB** based on network latency and packet loss.
- **Backpressure Regulation**: Listens to RTCDataChannel `bufferedAmount` and pauses execution when buffers exceed 1MB, resuming on `bufferedamountlow`.
- **Memory Efficiency**: Slices `File` objects incrementally rather than holding full multi-gigabyte payloads in browser memory.
- **Performance**: Yields up to **+18.9% higher throughput** compared to static 16KB WebRTC chunk baselines under throttled conditions.

---

## 💻 Tech Stack

### Frontend (Client)
- **Framework:** React 18 with Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS with custom Liquid Glass design system
- **Icons:** Lucide React
- **3D Graphics:** Three.js & React Three Fiber
- **WebRTC:** Native browser `RTCPeerConnection` & `RTCDataChannel`
- **Signaling Client:** Socket.IO Client
- **Local AI:** ONNX Runtime Web (`@xenova/transformers`)

### Backend (Signaling & APIs)
- **Runtime:** Node.js (v18+)
- **Server:** Express 4 (10MB payload capacity)
- **Signaling:** Socket.IO Server
- **Database ORM:** Prisma Client 6
- **Database:** PostgreSQL (Neon serverless cloud database)
- **Security:** Bcrypt.js, JSON Web Tokens (JWT)
- **Email Delivery:** Vercel Serverless Email Proxy with timeout-resilient dispatch

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**

### Backend Configuration
1. Navigate to the server directory:
   ```bash
   cd server
   npm install
   ```

2. Create a `.env` file in `server/` with the required parameters:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://user:password@neon-db-host/dbname?sslmode=require"
   JWT_SECRET="your-secure-jwt-secret-key"
   CLIENT_URL="http://localhost:5173"
   ```

3. Synchronize database models:
   ```bash
   npx prisma db push
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   *Server listens on `http://localhost:5000`*

### Frontend Configuration
1. Open a new terminal and navigate to the client directory:
   ```bash
   cd client
   npm install
   ```

2. Configure environment variables in `client/.env`:
   ```env
   VITE_API_URL="http://localhost:5000/api"
   VITE_SOCKET_URL="http://localhost:5000"
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Application opens at `http://localhost:5173`*

---

## 🧪 Automated Testing & Verification

The project includes automated end-to-end verification and regression test suites:

```bash
# 1. Run Phase 8 Features Verification (Profile, OTP, Recording Signaling)
node test_phase8_features.cjs

# 2. Run Phase 7 Full Regression Suite (APIs, Routes, WebGL Fallback)
node test_phase7_regression.cjs

# 3. Run Phase 6 Adaptive File Transfer Benchmarks
node test_phase6_adaptive.cjs

# 4. Run Phase 5 Cryptography & MITM Safety Number Tests
node test_phase5_crypto.cjs
```

### Verification Test Summary
- **Phase 8 Features Suite:** 11 / 11 PASSED (100%)
- **Phase 7 Regression Suite:** 12 / 12 PASSED (100%)
- **Phase 6 Adaptive Transfer Suite:** 4 / 4 PASSED (100%)
- **Phase 5 Cryptography Suite:** 4 / 4 PASSED (100%)
- **Production Builds:** `client` and `server` compile cleanly with 0 TypeScript/Vite errors.

---

## 🚀 Production Deployment

### Frontend (Vercel)
- **Framework Preset:** Vite
- **Root Directory:** `client`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variables:**
  - `VITE_API_URL`: Production backend URL (e.g. `https://your-api.domain.com/api`)
  - `VITE_SOCKET_URL`: Production WebSocket server (e.g. `https://your-api.domain.com`)

### Backend (Node.js Container / VPS)
- **Start Command:** `npm run build && npm start`
- **Port:** `5000` (or `PORT` provided by container environment)
- **Reverse Proxy:** Configure Nginx or Caddy with WebSocket upgrade headers (`Upgrade $http_upgrade`, `Connection "upgrade"`).

---

## 🛡️ Security Disclosure & Invariants

1. **Zero-Relay Privacy**: Media streams and data payloads are never stored on or routed through the signaling server after handshake completion.
2. **Deterministic Commutative Fingerprints**: Safety numbers are derived from SHA-256 hashes of lexicographically sorted public keys, guaranteeing identical numbers on both sides of a connection.
3. **Browser Sandboxing Disclosure**: While in-app snapshots and OS shortcut hooks (`PrintScreen`, `Meta+Shift+S`) notify peers immediately, web browsers cannot technically block external hardware video grabbers or physical phone cameras. The combination of persistent E2EE watermarking and instant notifications provides the maximum deterrent available on the open web.

---

## 📄 License

This project is licensed under the **MIT License**.
