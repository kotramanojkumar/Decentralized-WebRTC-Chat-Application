import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import roomRoutes from './routes/rooms';
import contactRoutes from './routes/contacts';
import taskRoutes, { processTaskEmails } from './routes/tasks';
import userRoutes from './routes/user';
import feedbackRoutes from './routes/feedback';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});
const prisma = new PrismaClient();

app.set('io', io);
app.use(cors());
app.use(express.json());

import adminRoutes from './routes/admin';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/user', userRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Serve built React frontend
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
// All non-API routes → React SPA (Express 5 compatible)
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Socket.IO Signaling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', async (data: any) => {
    // Check if data is object or string to support both formats
    const roomId = typeof data === 'string' ? data : data.roomId;
    
    // We previously had a hard 2-user limit for P2P rooms here, but the user requested it to be removed.
    // So all rooms can now hold multiple users regardless of type.

    socket.join(roomId);
    socket.to(roomId).emit('user-connected', socket.id);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('close-room', (roomId: string) => {
    // Notify everyone to leave
    io.in(roomId).emit('room-closed');
    // Disconnect all sockets in that room
    io.in(roomId).disconnectSockets(true);
  });

  socket.on('offer', (data: { offer: any, to: string }) => {
    socket.to(data.to).emit('offer', { offer: data.offer, from: socket.id });
  });

  socket.on('answer', (data: { answer: any, to: string }) => {
    socket.to(data.to).emit('answer', { answer: data.answer, from: socket.id });
  });

  socket.on('public-key', (data: { publicKey: string, to: string }) => {
    socket.to(data.to).emit('public-key', { publicKey: data.publicKey, from: socket.id });
  });

  socket.on('ice-candidate', (data: { candidate: any, to: string }) => {
    socket.to(data.to).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Real implementation will need to broadcast disconnect to specific rooms
    socket.broadcast.emit('user-disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// Auto-close inactive rooms every minute
setInterval(async () => {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeRooms = await prisma.room.findMany({
      where: {
        isActive: true,
        lastActivityAt: { lt: oneHourAgo }
      }
    });

    for (const room of activeRooms) {
      // Double check if anyone is currently in the socket room
      const sockets = await io.in(room.secureInviteCode).fetchSockets();
      if (sockets.length === 0) {
        await prisma.room.update({
          where: { id: room.id },
          data: { isActive: false }
        });
        console.log(`Auto-closed inactive room: ${room.secureInviteCode}`);
      } else {
        // Someone is still here, update lastActivityAt to prevent closing
        await prisma.room.update({
          where: { id: room.id },
          data: { lastActivityAt: new Date() }
        });
      }
    }

    // Also process any pending email tasks
    await processTaskEmails();
  } catch (e) {
    console.error('Failed to run background jobs', e);
  }
}, 60 * 1000);
