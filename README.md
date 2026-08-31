# 🌐 Decentralized Real-Time Chat Application

A highly secure, decentralized, peer-to-peer (P2P) communication platform built with React, Node.js, and WebRTC. 

This application features end-to-end encrypted messaging, decentralized peer-to-peer WebRTC connections, audio/video calling, and local AI-powered chat processing—ensuring maximum privacy and security.

---

## ✨ Key Features

*   **Decentralized P2P Networking:** WebRTC handles connections directly between users (no central server relays your video or audio).
*   **End-to-End Encryption:** All messages are encrypted locally on the device before transmission.
*   **Local AI Processing:** Chat summarization and action-item extraction are processed locally in your browser using an ONNX-runtime model. Data never leaves your device!
*   **Voice & Video Calling:** Seamless, high-quality P2P media streams.
*   **Secure Authentication:** JWT-based authentication with Two-Step Verification (OTP).
*   **Self-Destructing Messages:** Set a Time-to-Live (TTL) for messages to automatically delete themselves.
*   **Responsive UI:** A beautiful, modern interface with Light and Dark mode support.

## 🚀 Tech Stack

### Frontend (Client)
*   **React 18** with **Vite**
*   **TypeScript**
*   **TailwindCSS** for styling
*   **WebRTC** (via `simple-peer`) for P2P connections
*   **ONNX Runtime Web** for local AI processing

### Backend (Server)
*   **Node.js** & **Express**
*   **Socket.io** (Used *only* for the initial WebRTC signaling handshake)
*   **Prisma ORM** with **SQLite** (Easily swappable to PostgreSQL)
*   **Nodemailer** for OTP and system emails
*   **Bcrypt** & **JWT** for security

---

## 🛠️ Local Development Setup

### 1. Prerequisites
*   Node.js (v18+)
*   npm or yarn

### 2. Clone the Repository
\`\`\`bash
git clone https://github.com/kotramanojkumar/Decentralized-WebRTC-Chat-Application.git
cd Decentralized-WebRTC-Chat-Application
\`\`\`

### 3. Backend Setup
\`\`\`bash
cd server
npm install

# Push the database schema
npx prisma db push

# Start the development server
npm run dev
\`\`\`
*The backend will run on `http://localhost:5000`*

### 4. Frontend Setup
Open a new terminal window:
\`\`\`bash
cd client
npm install

# Start the Vite development server
npm run dev
\`\`\`
*The frontend will run on `http://localhost:5173`*

---

## 🔒 Security Architecture

1.  **Signaling Phase:** Socket.io is used to exchange connection data (SDP and ICE candidates) between peers. This is the *only* time data passes through the server.
2.  **P2P Phase:** Once the WebRTC connection is established, the Socket.io connection is dropped for chat traffic. All messages, files, and video streams go directly from Peer A to Peer B.
3.  **Local AI:** To prevent data leaks, the AI summarization features download a lightweight LLM model to your browser's cache and execute entirely on your local GPU/CPU.

## 📄 License
MIT License
