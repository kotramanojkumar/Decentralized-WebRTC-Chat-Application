import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const router = Router();
const prisma = new PrismaClient();

// Setup Gmail SMTP for real emails
let transporter: nodemailer.Transporter | null = null;
import { sendEmail } from '../utils/mailer';

// Send Email logic
async function sendTaskEmail(userEmail: string, heading: string, note?: string) {
  try {
    const subject = `Reminder: ${heading}`;
    const text = `Hello,\n\nThis is a reminder for your task: ${heading}\n\nNote: ${note || 'No additional notes'}\n\nStay secure!`;
    await sendEmail(userEmail, subject, text);
    console.log(`Task Reminder Email scheduled for proxy to ${userEmail}!`);
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

// Update task
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { heading, note, targetDate, isCompleted } = req.body;
    
    const updateData: any = {};
    if (heading !== undefined) updateData.heading = heading;
    if (note !== undefined) updateData.note = note;
    if (targetDate !== undefined) updateData.targetDate = new Date(targetDate);
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;

    const task = await prisma.task.update({
      where: { id },
      data: updateData
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
