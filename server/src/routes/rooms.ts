import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

// Middleware to check auth would go here in production
// For now, we assume user ID is passed in headers or body for simplicity
// In a real scenario, use JWT verification middleware

import bcrypt from 'bcryptjs';

router.post('/create', async (req: Request, res: Response) => {
  try {
    let { userId, customRoomId, password, scheduledFor, roomType } = req.body;
    
    // For development/demo: ensure userId exists in DB
    if (userId) {
      const existingUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!existingUser) {
        // Create mock user to satisfy foreign key
        await prisma.user.create({
          data: {
            id: userId,
            email: `mock-${userId}@test.com`,
            passwordHash: 'mock',
            displayName: 'Mock User'
          }
        });
      }
    } else {
      let dummyUser = await prisma.user.findFirst({ where: { email: 'dummy@test.com' }});
      if (!dummyUser) {
        dummyUser = await prisma.user.create({
          data: {
            email: 'dummy@test.com',
            passwordHash: 'dummy',
            displayName: 'Dummy User'
          }
        });
      }
      userId = dummyUser.id;
    }

    const secureInviteCode = (customRoomId && customRoomId.trim().length > 0) ? customRoomId.trim() : crypto.randomUUID();

    let passwordHash = null;
    if (password && password.trim().length > 0) {
      passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const room = await prisma.room.create({
      data: {
        secureInviteCode,
        createdById: userId,
        passwordHash,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        type: roomType || 'group',
      }
    });

    res.json({ room });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This custom room code is already taken. Please choose another one.' });
    }
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const { inviteCode, password } = req.body;

    const room = await prisma.room.findUnique({
      where: { secureInviteCode: inviteCode as string }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isActive) {
      return res.status(403).json({ error: 'Room is no longer active' });
    }

    if (room.scheduledFor && new Date() < new Date(room.scheduledFor)) {
      return res.status(403).json({ error: `Room is scheduled for ${new Date(room.scheduledFor).toLocaleString()} and is not open yet.` });
    }

    if (room.passwordHash) {
      if (!password) {
         return res.status(401).json({ error: 'Password required', requirePassword: true });
      }
      const isMatch = await bcrypt.compare(password, room.passwordHash);
      if (!isMatch) {
         return res.status(401).json({ error: 'Invalid password' });
      }
    }

    res.json({ room: { id: room.id, secureInviteCode: room.secureInviteCode, type: room.type, createdById: room.createdById }, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:inviteCode', async (req: Request, res: Response) => {
  try {
    const { inviteCode } = req.params;

    const room = await prisma.room.findUnique({
      where: { secureInviteCode: inviteCode as string }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (!room.isActive) {
      return res.status(403).json({ error: 'Room is no longer active' });
    }

    // We only return whether it requires a password here, we don't return the full access
    res.json({ room: { id: room.id, secureInviteCode: room.secureInviteCode, type: room.type, hasPassword: !!room.passwordHash, scheduledFor: room.scheduledFor } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/close', async (req: Request, res: Response) => {
  try {
    const { inviteCode, userId } = req.body;

    const room = await prisma.room.findUnique({
      where: { secureInviteCode: inviteCode as string }
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.createdById !== userId) {
      return res.status(403).json({ error: 'Only the room creator can close this room.' });
    }

    await prisma.room.update({
      where: { id: room.id },
      data: { isActive: false }
    });

    res.json({ success: true, message: 'Room has been closed.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
