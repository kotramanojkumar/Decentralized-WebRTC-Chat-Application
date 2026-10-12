import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { sendOtpEmail, sendPasswordResetEmail } from '../utils/mailer';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

// In-Memory Rate Limiting for OTP generation & verification
interface OtpTracker {
  lastSentAt: number;
  attempts: number;
}
const otpTracking = new Map<string, OtpTracker>();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
      }
    });

    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown IP';

    const session = await prisma.deviceSession.create({
      data: { userId: user.id, deviceInfo }
    });

    await prisma.loginHistory.create({
      data: { userId: user.id, device: deviceInfo, ipAddress, status: 'SUCCESS' }
    });

    const token = jwt.sign({ id: user.id, sessionId: session.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        sessionId: session.id,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown IP';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanIdentifier = email.trim().toLowerCase().replace(/^@/, '');

    const user = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { email: cleanIdentifier },
          { username: cleanIdentifier }
        ]
      } 
    });
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await prisma.loginHistory.create({
        data: { userId: user.id, device: deviceInfo, ipAddress, status: 'FAILED' }
      });
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Two-Step Verification is controlled exclusively by the user's database setting
    if (user.twoFactorEnabled) {
      const now = Date.now();
      const existingTracker = otpTracking.get(user.email);
      
      // Allow sending initial login OTP, update tracker
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit cryptographic OTP
      await prisma.user.update({
        where: { id: user.id },
        data: {
          currentOtp: otp,
          otpExpiresAt: new Date(now + 10 * 60 * 1000) // 10 minutes expiry
        }
      });

      otpTracking.set(user.email, {
        lastSentAt: now,
        attempts: 0
      });
      
      await sendOtpEmail(user.email, otp);
      return res.json({
        requires2FA: true,
        email: user.email,
        displayName: user.displayName,
        message: 'Two-Step Verification required. OTP sent to your registered email.'
      });
    }

    // Normal login flow when Two-Step Verification is DISABLED
    const session = await prisma.deviceSession.create({
      data: { userId: user.id, deviceInfo }
    });

    await prisma.loginHistory.create({
      data: { userId: user.id, device: deviceInfo, ipAddress, status: 'SUCCESS' }
    });

    const token = jwt.sign({ id: user.id, sessionId: session.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        sessionId: session.id,
        photo: user.avatarUrl,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email or username is required' });
    }

    const cleanIdentifier = email.trim().toLowerCase().replace(/^@/, '');
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanIdentifier }, { username: cleanIdentifier }]
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const now = Date.now();
    const tracker = otpTracking.get(user.email);

    // Enforce 45s cooldown timer to prevent excessive requests / email flooding
    if (tracker && now - tracker.lastSentAt < 45 * 1000) {
      const remainingSeconds = Math.ceil((45 * 1000 - (now - tracker.lastSentAt)) / 1000);
      return res.status(429).json({
        error: `Please wait ${remainingSeconds} seconds before requesting a new code.`,
        retryAfter: remainingSeconds
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        currentOtp: otp,
        otpExpiresAt: new Date(now + 10 * 60 * 1000) // 10 minutes
      }
    });

    otpTracking.set(user.email, {
      lastSentAt: now,
      attempts: 0
    });

    await sendOtpEmail(user.email, otp);
    return res.json({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.'
    });
  } catch (error) {
    console.error('Resend OTP Error:', error);
    res.status(500).json({ error: 'Failed to resend verification code' });
  }
});

router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown IP';

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP code are required' });
    }

    const cleanIdentifier = email.trim().toLowerCase().replace(/^@/, '');
    const user = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { email: cleanIdentifier },
          { username: cleanIdentifier }
        ]
      } 
    });

    if (!user) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const tracker = otpTracking.get(user.email) || { lastSentAt: 0, attempts: 0 };

    // Max 5 attempts rate-limit before invalidating code
    if (tracker.attempts >= 5) {
      await prisma.user.update({
        where: { id: user.id },
        data: { currentOtp: null, otpExpiresAt: null }
      });
      otpTracking.delete(user.email);
      return res.status(429).json({
        error: 'Too many failed verification attempts. This code has been invalidated. Please request a new OTP.'
      });
    }

    // Check code expiry
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({
        error: 'Verification code has expired. Please request a new code.'
      });
    }

    // Validate code
    if (user.currentOtp !== otp.trim()) {
      tracker.attempts += 1;
      otpTracking.set(user.email, tracker);
      const remainingAttempts = 5 - tracker.attempts;
      return res.status(400).json({
        error: `Invalid verification code. ${remainingAttempts} attempts remaining.`
      });
    }

    // Success: Invalidate used OTP immediately
    await prisma.user.update({
      where: { id: user.id },
      data: { currentOtp: null, otpExpiresAt: null }
    });
    otpTracking.delete(user.email);

    // Create authenticated session
    const session = await prisma.deviceSession.create({
      data: { userId: user.id, deviceInfo }
    });

    await prisma.loginHistory.create({
      data: { userId: user.id, device: deviceInfo, ipAddress, status: 'SUCCESS' }
    });

    const token = jwt.sign({ id: user.id, sessionId: session.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        sessionId: session.id,
        photo: user.avatarUrl,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('OTP Verification Error:', error);
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
});

router.post('/google', async (req: Request, res: Response) => {
  try {
    const { email, displayName, photoUrl } = req.body;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown IP';

    let user = await prisma.user.findUnique({ where: { email } });
    
    // Auto-create account if it doesn't exist
    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          displayName,
          username: email.split('@')[0] + Math.floor(Math.random() * 1000)
        }
      });
    }

    const session = await prisma.deviceSession.create({
      data: { userId: user.id, deviceInfo }
    });

    await prisma.loginHistory.create({
      data: { userId: user.id, device: deviceInfo, ipAddress, status: 'SUCCESS' }
    });

    const token = jwt.sign({ id: user.id, sessionId: session.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        sessionId: session.id,
        photo: user.avatarUrl,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Server error during Google auth' });
  }
});

router.post('/delete-account', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await prisma.$transaction([
      prisma.task.deleteMany({ where: { userId } }),
      prisma.contact.deleteMany({ where: { OR: [{ ownerId: userId }, { targetId: userId }] } }),
      prisma.contactRequest.deleteMany({ where: { OR: [{ requesterId: userId }, { requestedId: userId }] } }),
      prisma.securityEvent.deleteMany({ where: { userId } }),
      prisma.deviceSession.deleteMany({ where: { userId } }),
      prisma.roomMember.deleteMany({ where: { userId } }),
      prisma.room.deleteMany({ where: { createdById: userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);

    res.json({ success: true, message: 'Account permanently deleted' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Server error during deletion' });
  }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });
    
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiresAt }
    });

    const clientUrl = process.env.CLIENT_URL || 'https://decentralized-web-rtc-chat-applicat.vercel.app';
    const resetLink = `${clientUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(cleanEmail)}`;
    
    await sendPasswordResetEmail(user.email, resetLink);
    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.resetToken !== token || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null
      }
    });

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
