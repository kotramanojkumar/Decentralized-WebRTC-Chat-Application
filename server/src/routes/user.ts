import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Update Profile
router.post('/update-profile', async (req: Request, res: Response) => {
  try {
    const { userId, username, displayName, about } = req.body;
    
    let cleanUsername = null;
    if (username) {
      let rawUsername = username.trim();
      if (rawUsername.startsWith('@')) rawUsername = rawUsername.substring(1);
      
      if (rawUsername.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
      }
      cleanUsername = rawUsername.toLowerCase();
      // Check if taken
      const existing = await prisma.user.findFirst({ where: { username: cleanUsername } });
      console.log(`[DEBUG] Attempting update for cleanUsername: ${cleanUsername}`);
      console.log(`[DEBUG] Request userId: ${userId}`);
      console.log(`[DEBUG] Existing user id: ${existing?.id}`);
      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
    }

    const updateData: any = {};
    if (cleanUsername) updateData.username = cleanUsername;
    if (displayName) updateData.displayName = displayName;
    // Note: We don't have 'about' field in DB yet, but we will save displayName and username

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    res.json({ success: true, user: { username: user.username, displayName: user.displayName } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Password
router.post('/update-password', async (req: Request, res: Response) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Privacy
router.post('/update-privacy', async (req: Request, res: Response) => {
  try {
    const { userId, privacySettings } = req.body;
    
    await prisma.user.update({
      where: { id: userId },
      data: { privacySettings: JSON.stringify(privacySettings) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Sessions
router.get('/:userId/sessions', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const activeSessions = await prisma.deviceSession.findMany({
      where: { userId, isActive: true },
      orderBy: { lastSeen: 'desc' }
    });
    const history = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 20
    });
    res.json({ activeSessions, history });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Revoke Session
router.post('/revoke-session', async (req: Request, res: Response) => {
  try {
    const { userId, sessionId } = req.body;
    await prisma.deviceSession.update({
      where: { id: sessionId },
      data: { isActive: false }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle 2FA
router.post('/update-2fa', async (req: Request, res: Response) => {
  try {
    const { userId, enabled } = req.body;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: enabled }
    });
    res.json({ success: true, twoFactorEnabled: user.twoFactorEnabled });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
