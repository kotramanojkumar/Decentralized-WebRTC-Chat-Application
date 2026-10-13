import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import {
  sendEmailChangeOtpCurrent,
  sendEmailChangeOtpNew,
  sendEmailChangeNotification,
  sendUsernameChangeOtp,
} from '../utils/mailer';

const router = Router();
const prisma = new PrismaClient();

// In-Memory Trackers for Email & Username Change OTP Workflows
interface EmailChangeState {
  userId: string;
  currentEmail: string;
  newEmail: string;
  currentOtp: string;
  currentExpiresAt: number;
  currentVerified: boolean;
  newOtp?: string;
  newExpiresAt?: number;
  attempts: number;
  lastSentAt: number;
}
const emailChangeTrackers = new Map<string, EmailChangeState>();

interface UsernameChangeState {
  userId: string;
  currentEmail: string;
  newUsername: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}
const usernameChangeTrackers = new Map<string, UsernameChangeState>();

// Get Profile (including 2FA status)
router.get('/:userId/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        about: true,
        avatarUrl: true,
        twoFactorEnabled: true,
        privacySettings: true
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (error) {
    console.error('Fetch Profile Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

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
    if (about !== undefined) updateData.about = about;
    if (req.body.avatarUrl !== undefined) updateData.avatarUrl = req.body.avatarUrl;

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    res.json({ 
      success: true, 
      user: { 
        username: user.username, 
        displayName: user.displayName, 
        about: user.about,
        avatarUrl: user.avatarUrl 
      } 
    });
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

// ==========================================
// SECURE EMAIL CHANGE WORKFLOW (2-STEP OTP)
// ==========================================

// Step 1: Request Email Change -> sends OTP to CURRENT email
router.post('/request-email-change', async (req: Request, res: Response) => {
  try {
    const { userId, newEmail } = req.body;
    if (!userId || !newEmail) {
      return res.status(400).json({ error: 'User ID and new email address are required.' });
    }

    const cleanNewEmail = newEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanNewEmail)) {
      return res.status(400).json({ error: 'Invalid email format. Please enter a valid email.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    if (user.email.toLowerCase() === cleanNewEmail) {
      return res.status(400).json({ error: 'New email cannot be the same as your current email.' });
    }

    // Check if new email is already claimed
    const existing = await prisma.user.findUnique({ where: { email: cleanNewEmail } });
    if (existing) {
      return res.status(400).json({ error: 'This email address is already registered to another account.' });
    }

    // Rate-limit: prevent spam requests within 45s
    const existingTracker = emailChangeTrackers.get(userId);
    const now = Date.now();
    if (existingTracker && now - existingTracker.lastSentAt < 45000) {
      const waitSeconds = Math.ceil((45000 - (now - existingTracker.lastSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting a new authorization code.` });
    }

    const currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
    emailChangeTrackers.set(userId, {
      userId,
      currentEmail: user.email,
      newEmail: cleanNewEmail,
      currentOtp,
      currentExpiresAt: now + 10 * 60 * 1000,
      currentVerified: false,
      attempts: 0,
      lastSentAt: now
    });

    await sendEmailChangeOtpCurrent(user.email, currentOtp);
    res.json({
      success: true,
      currentEmail: user.email,
      newEmail: cleanNewEmail,
      message: 'Authorization code has been sent to your current email address.'
    });
  } catch (error) {
    console.error('Request Email Change Error:', error);
    res.status(500).json({ error: 'Failed to initiate email change.' });
  }
});

// Step 2: Verify Current Email OTP -> generates & sends OTP to NEW email
router.post('/verify-email-change-current', async (req: Request, res: Response) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ error: 'User ID and verification code are required.' });
    }

    const tracker = emailChangeTrackers.get(userId);
    if (!tracker) {
      return res.status(400).json({ error: 'No active email change request. Please initiate a new request.' });
    }

    if (Date.now() > tracker.currentExpiresAt) {
      emailChangeTrackers.delete(userId);
      return res.status(400).json({ error: 'Authorization code has expired. Please initiate a new request.' });
    }

    if (tracker.attempts >= 5) {
      emailChangeTrackers.delete(userId);
      return res.status(429).json({ error: 'Too many incorrect attempts. Request has been cancelled for security.' });
    }

    if (tracker.currentOtp !== otp.trim()) {
      tracker.attempts += 1;
      const remaining = 5 - tracker.attempts;
      return res.status(400).json({ error: `Invalid code. ${remaining} attempts remaining.` });
    }

    // Step 1 Success: Mark current as verified, issue Step 2 OTP to new email
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = Date.now();
    tracker.currentVerified = true;
    tracker.newOtp = newOtp;
    tracker.newExpiresAt = now + 10 * 60 * 1000;
    tracker.attempts = 0;
    tracker.lastSentAt = now;
    emailChangeTrackers.set(userId, tracker);

    await sendEmailChangeOtpNew(tracker.newEmail, newOtp);
    res.json({
      success: true,
      newEmail: tracker.newEmail,
      message: 'Current email authorized! A confirmation code has now been sent to your new email.'
    });
  } catch (error) {
    console.error('Verify Current Email Error:', error);
    res.status(500).json({ error: 'Failed to verify authorization code.' });
  }
});

// Step 3: Confirm New Email OTP -> commits email update to database atomically
router.post('/confirm-email-change-new', async (req: Request, res: Response) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ error: 'User ID and confirmation code are required.' });
    }

    const tracker = emailChangeTrackers.get(userId);
    if (!tracker || !tracker.currentVerified || !tracker.newOtp) {
      return res.status(400).json({ error: 'Invalid or incomplete email change workflow. Please start over.' });
    }

    if (!tracker.newExpiresAt || Date.now() > tracker.newExpiresAt) {
      emailChangeTrackers.delete(userId);
      return res.status(400).json({ error: 'Confirmation code for new email has expired. Please start over.' });
    }

    if (tracker.attempts >= 5) {
      emailChangeTrackers.delete(userId);
      return res.status(429).json({ error: 'Too many incorrect attempts. Request cancelled.' });
    }

    if (tracker.newOtp !== otp.trim()) {
      tracker.attempts += 1;
      const remaining = 5 - tracker.attempts;
      return res.status(400).json({ error: `Invalid code. ${remaining} attempts remaining.` });
    }

    // Double-check uniqueness immediately before atomic commit
    const duplicateCheck = await prisma.user.findUnique({ where: { email: tracker.newEmail } });
    if (duplicateCheck && duplicateCheck.id !== userId) {
      emailChangeTrackers.delete(userId);
      return res.status(400).json({ error: 'This email was claimed by another user.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { email: tracker.newEmail }
    });

    // Send security notification to previous email address
    await sendEmailChangeNotification(tracker.currentEmail, tracker.newEmail);

    // Invalidate tracker
    emailChangeTrackers.delete(userId);

    res.json({
      success: true,
      newEmail: updatedUser.email,
      message: 'Your email address has been updated successfully! ✨'
    });
  } catch (error) {
    console.error('Confirm New Email Error:', error);
    res.status(500).json({ error: 'Failed to complete email change.' });
  }
});

// ==========================================
// SECURE USERNAME CHANGE WORKFLOW (OTP)
// ==========================================

// Step 1: Request Username Change -> sends OTP to registered email
router.post('/request-username-change', async (req: Request, res: Response) => {
  try {
    const { userId, newUsername } = req.body;
    if (!userId || !newUsername) {
      return res.status(400).json({ error: 'User ID and new username are required.' });
    }

    let clean = newUsername.trim().toLowerCase();
    if (clean.startsWith('@')) clean = clean.substring(1);

    const usernameRegex = /^[a-z0-9_]{3,30}$/;
    if (!usernameRegex.test(clean)) {
      return res.status(400).json({
        error: 'Username must be 3-30 characters long and contain only letters, numbers, and underscores.'
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    if (user.username && user.username.toLowerCase() === clean) {
      return res.status(400).json({ error: 'New username cannot be identical to your current username.' });
    }

    // Check availability
    const existing = await prisma.user.findFirst({ where: { username: clean } });
    if (existing && existing.id !== userId) {
      return res.status(400).json({ error: 'This username is already taken. Please choose another.' });
    }

    // Rate-limit: 45s between OTP requests
    const existingTracker = usernameChangeTrackers.get(userId);
    const now = Date.now();
    if (existingTracker && now - existingTracker.lastSentAt < 45000) {
      const waitSeconds = Math.ceil((45000 - (now - existingTracker.lastSentAt)) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSeconds}s before requesting a new code.` });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    usernameChangeTrackers.set(userId, {
      userId,
      currentEmail: user.email,
      newUsername: clean,
      otp,
      expiresAt: now + 10 * 60 * 1000,
      attempts: 0,
      lastSentAt: now
    });

    await sendUsernameChangeOtp(user.email, clean, otp);
    res.json({
      success: true,
      newUsername: clean,
      maskedEmail: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
      message: 'Authorization code has been sent to your registered email address.'
    });
  } catch (error) {
    console.error('Request Username Change Error:', error);
    res.status(500).json({ error: 'Failed to request username change.' });
  }
});

// Step 2: Confirm Username Change with OTP -> commits atomic update
router.post('/confirm-username-change', async (req: Request, res: Response) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ error: 'User ID and authorization code are required.' });
    }

    const tracker = usernameChangeTrackers.get(userId);
    if (!tracker) {
      return res.status(400).json({ error: 'No active username change request. Please initiate a new request.' });
    }

    if (Date.now() > tracker.expiresAt) {
      usernameChangeTrackers.delete(userId);
      return res.status(400).json({ error: 'Authorization code has expired. Please initiate a new request.' });
    }

    if (tracker.attempts >= 5) {
      usernameChangeTrackers.delete(userId);
      return res.status(429).json({ error: 'Too many incorrect attempts. Request cancelled for security.' });
    }

    if (tracker.otp !== otp.trim()) {
      tracker.attempts += 1;
      const remaining = 5 - tracker.attempts;
      return res.status(400).json({ error: `Invalid code. ${remaining} attempts remaining.` });
    }

    // Atomic availability check immediately before update
    const conflict = await prisma.user.findFirst({
      where: { username: tracker.newUsername, id: { not: userId } }
    });
    if (conflict) {
      usernameChangeTrackers.delete(userId);
      return res.status(400).json({ error: 'This username was claimed by another user.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { username: tracker.newUsername }
    });

    usernameChangeTrackers.delete(userId);

    res.json({
      success: true,
      newUsername: updatedUser.username,
      message: `Username updated to @${updatedUser.username} successfully! ✨`
    });
  } catch (error) {
    console.error('Confirm Username Change Error:', error);
    res.status(500).json({ error: 'Failed to complete username update.' });
  }
});

export default router;
