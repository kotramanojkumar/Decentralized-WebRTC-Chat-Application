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
    if (!user || user.role !== 'ADMIN') {
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
    const { id } = req.params;
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
    const { id } = req.params;
    
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

export default router;
