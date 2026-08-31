import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const router = Router();
const prisma = new PrismaClient();

// Setup Gmail SMTP for real emails
let transporter: nodemailer.Transporter | null = null;
async function setupEmail() {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'kmk.kmk0789@gmail.com', 
      pass: 'junspghhslbbgbwy', // User's app password (spaces removed)
    },
  });
  console.log('Real Gmail SMTP ready for sending Tasks!');
}
setupEmail().catch(console.error);

// Send Email logic
async function sendTaskEmail(userEmail: string, heading: string, note?: string) {
  if (!transporter) return;
  try {
    const info = await transporter.sendMail({
      from: '"Decentralized Chat Reminder" <kmk.kmk0789@gmail.com>',
      to: userEmail,
      subject: `Reminder: ${heading}`,
      text: `Hello,\n\nThis is a reminder for your task: ${heading}\n\nNote: ${note || 'No additional notes'}\n\nStay secure!`,
      html: `<h3>Hello,</h3><p>This is a reminder for your task: <strong>${heading}</strong></p><p>Note: ${note || 'No additional notes'}</p><p>Stay secure!</p>`,
    });
    console.log(`Task Reminder Email successfully sent to ${userEmail}! (Message ID: ${info.messageId})`);
  } catch (error) {
    console.error('Failed to send task email:', error);
  }
}

// Get tasks for user
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { targetDate: 'asc' }
    });
    res.json({ tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create task
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { userId, heading, note, targetDate } = req.body;
    
    // Ensure mock user if needed (for google auth demo)
    if (userId) {
      const existingUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!existingUser) {
        await prisma.user.create({
          data: {
            id: userId,
            email: `mock-${userId}@test.com`,
            passwordHash: 'mock',
            displayName: 'Mock User'
          }
        });
      }
    }

    const task = await prisma.task.create({
      data: {
        userId,
        heading,
        note,
        targetDate: new Date(targetDate)
      }
    });

    res.json({ task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.task.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check and send pending emails
export async function processTaskEmails() {
  try {
    const now = new Date();
    const pendingTasks = await prisma.task.findMany({
      where: {
        emailSent: false,
        isCompleted: false,
        targetDate: { lte: now }
      },
      include: { user: true }
    });

    for (const task of pendingTasks) {
      await sendTaskEmail(task.user.email, task.heading, task.note || undefined);
      await prisma.task.update({
        where: { id: task.id },
        data: { emailSent: true }
      });
    }
  } catch (error) {
    console.error('Error processing task emails:', error);
  }
}

export default router;
