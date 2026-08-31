import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Search users by name, email, or ID
router.get('/search', async (req: Request, res: Response) => {
  try {
    const q = req.query.q as string;
    const requesterId = req.query.requesterId as string;
    if (!q) {
      return res.status(400).json({ error: 'Query required' });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          ...(requesterId ? [{ id: { not: requesterId } }] : []),
          {
            OR: [
              { displayName: { contains: q } },
              { email: { contains: q } },
              { id: { contains: q } },
            ]
          }
        ]
      },
      select: { id: true, displayName: true, email: true, about: true, avatarUrl: true, createdAt: true },
      take: 20
    });

    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all contacts for a user
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    const contacts = await prisma.contact.findMany({
      where: { ownerId: userId },
      include: {
        target: { select: { id: true, displayName: true, email: true, about: true, avatarUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const pending = await prisma.contactRequest.findMany({
      where: {
        OR: [{ requesterId: userId }, { requestedId: userId }],
        status: 'pending'
      },
      include: {
        requester: { select: { id: true, displayName: true, email: true, about: true } },
        requested: { select: { id: true, displayName: true, email: true, about: true } }
      }
    });

    res.json({ contacts, pendingRequests: pending });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send contact request
router.post('/request', async (req: Request, res: Response) => {
  try {
    const { requesterId, requestedId } = req.body;

    if (requesterId === requestedId) {
      return res.status(400).json({ error: 'You cannot add yourself' });
    }

    // Check if already contacts
    const existing = await prisma.contact.findUnique({
      where: { ownerId_targetId: { ownerId: requesterId, targetId: requestedId } }
    });
    if (existing) return res.status(400).json({ error: 'Already in contacts' });

    // Check if request already sent
    const existingReq = await prisma.contactRequest.findUnique({
      where: { requesterId_requestedId: { requesterId, requestedId } }
    });
    if (existingReq) return res.status(400).json({ error: 'Request already sent' });

    const request = await prisma.contactRequest.create({
      data: { requesterId, requestedId }
    });

    res.json({ request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept / decline contact request
router.post('/request/:id/respond', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const action = req.body.action as string;
    const userId = req.body.userId as string;

    const request = await prisma.contactRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.requestedId !== userId) return res.status(403).json({ error: 'Not authorized' });

    await prisma.contactRequest.update({ where: { id }, data: { status: action === 'accept' ? 'accepted' : 'declined' } });

    if (action === 'accept') {
      // Add both directions using upsert to avoid duplicates
      await prisma.contact.upsert({
        where: { ownerId_targetId: { ownerId: request.requestedId, targetId: request.requesterId } },
        create: { ownerId: request.requestedId, targetId: request.requesterId },
        update: {}
      });
      await prisma.contact.upsert({
        where: { ownerId_targetId: { ownerId: request.requesterId, targetId: request.requestedId } },
        create: { ownerId: request.requesterId, targetId: request.requestedId },
        update: {}
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove contact
router.delete('/remove', async (req: Request, res: Response) => {
  try {
    const { ownerId, targetId } = req.body;

    await prisma.contact.deleteMany({
      where: { OR: [{ ownerId, targetId }, { ownerId: targetId, targetId: ownerId }] }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
