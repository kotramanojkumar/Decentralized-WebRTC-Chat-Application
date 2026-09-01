import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// Middleware to verify admin token
const verifyAdmin = async (req: Request, res: Response, next: Function) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(403).json({ error: 'User not found' });
    
    // Explicitly allow this specific email or anyone with the ADMIN role
    if (user.email !== 'kmk.kmk0789@gmail.com' && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get all users
router.get('/users', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
        twoFactorEnabled: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a user
router.put('/users/:id', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { displayName, username, role } = req.body;
    
    // Clean username (remove leading @ if present)
    let cleanUsername = username ? username.trim().toLowerCase().replace(/^@/, '') : null;

    const user = await prisma.user.update({
      where: { id },
      data: { displayName, username: cleanUsername, role },
      select: { id: true, email: true, displayName: true, username: true, role: true }
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating user' });
  }
});

// Delete a user
router.delete('/users/:id', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    await prisma.$transaction([
      prisma.task.deleteMany({ where: { userId: id } }),
      prisma.contact.deleteMany({ where: { OR: [{ ownerId: id }, { targetId: id }] } }),
      prisma.contactRequest.deleteMany({ where: { OR: [{ requesterId: id }, { requestedId: id }] } }),
      prisma.securityEvent.deleteMany({ where: { userId: id } }),
      prisma.deviceSession.deleteMany({ where: { userId: id } }),
      prisma.roomMember.deleteMany({ where: { userId: id } }),
      prisma.room.deleteMany({ where: { createdById: id } }),
      prisma.user.delete({ where: { id } }),
    ]);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting user' });
  }
});

// Check if current user is admin
router.get('/check', verifyAdmin, (req, res) => {
  res.json({ isAdmin: true });
});

// Broadcast Global Email
router.post('/broadcast', verifyAdmin, async (req: Request, res: Response) => {
  try {
    const { subject, message, targetEmail } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required' });

    let users;
    if (targetEmail && targetEmail !== 'ALL') {
      users = await prisma.user.findMany({ where: { email: targetEmail }, select: { email: true } });
    } else {
      users = await prisma.user.findMany({ select: { email: true } });
    }
    
    const { sendEmail } = require('../utils/mailer');
    
    // Send in background to not block response
    setTimeout(async () => {
      for (const user of users) {
        try {
          await sendEmail(user.email, subject, message);
        } catch (e) {
          console.error(`Failed to send email to ${user.email}`);
        }
      }
    }, 100);

    res.json({ success: true, count: users.length });
  } catch (error) {
    res.status(500).json({ error: 'Server error sending broadcast' });
  }
});

export default router;
