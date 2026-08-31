import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { sendOtpEmail, sendPasswordResetEmail } from '../utils/mailer';

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';

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
    res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName, username: user.username, sessionId: session.id } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown IP';

    // email variable might contain username or email
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

    if (user.twoFactorEnabled) {
      // Check if it's a new device (naive check for demo: if they don't have a session with this exact device string)
      const existingSession = await prisma.deviceSession.findFirst({
        where: { userId: user.id, deviceInfo }
      });

      if (!existingSession) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
        await prisma.user.update({
          where: { id: user.id },
          data: {
            currentOtp: otp,
            otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 mins
          }
        });
        
        // Import mailer dynamically or normally. Since we can't easily add imports to top via this tool without wiping, we require it:
        const { sendOtpEmail } = require('../utils/mailer');
        await sendOtpEmail(user.email, otp);

        return res.json({ requires2FA: true, email: user.email, message: 'OTP sent to email.' });
      }
    }

    const session = await prisma.deviceSession.create({
      data: { userId: user.id, deviceInfo }
    });

    await prisma.loginHistory.create({
      data: { userId: user.id, device: deviceInfo, ipAddress, status: 'SUCCESS' }
    });

    const token = jwt.sign({ id: user.id, sessionId: session.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName, username: user.username, sessionId: session.id, photo: user.avatarUrl, twoFactorEnabled: user.twoFactorEnabled } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
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
    res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName, username: user.username, sessionId: session.id, photo: user.avatarUrl, twoFactorEnabled: user.twoFactorEnabled } });
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Server error during Google auth' });
  }
});

router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.socket.remoteAddress || 'Unknown IP';

    // Same lookup as login
    const cleanIdentifier = email.trim().toLowerCase().replace(/^@/, '');
    const user = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { email: cleanIdentifier },
          { username: cleanIdentifier }
        ]
      } 
    });

    if (!user || user.currentOtp !== otp || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: { currentOtp: null, otpExpiresAt: null }
    });

    const session = await prisma.deviceSession.create({
      data: { userId: user.id, deviceInfo }
    });

    await prisma.loginHistory.create({
      data: { userId: user.id, device: deviceInfo, ipAddress, status: 'SUCCESS' }
    });

    const token = jwt.sign({ id: user.id, sessionId: session.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, displayName: user.displayName, username: user.username, sessionId: session.id, photo: user.avatarUrl, twoFactorEnabled: user.twoFactorEnabled } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during OTP verification' });
  }
});

router.post('/delete-account', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    // Ensure user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Execute transactional deletion to handle all foreign keys
    await prisma.$transaction([
      prisma.task.deleteMany({ where: { userId } }),
      prisma.contact.deleteMany({ where: { OR: [{ ownerId: userId }, { targetId: userId }] } }),
      prisma.contactRequest.deleteMany({ where: { OR: [{ requesterId: userId }, { requestedId: userId }] } }),
      prisma.securityEvent.deleteMany({ where: { userId } }),
      prisma.deviceSession.deleteMany({ where: { userId } }),
      prisma.roomMember.deleteMany({ where: { userId } }),
      // For rooms, if they created it, delete the room itself
      prisma.room.deleteMany({ where: { createdById: userId } }),
      // Finally, delete the user
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
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't leak user existence
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiresAt }
    });

    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
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
