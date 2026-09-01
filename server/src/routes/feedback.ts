import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const router = Router();
const prisma = new PrismaClient();

router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { userId, category, message } = req.body;
    
    await prisma.feedback.create({
      data: { userId, category, message }
    });

    // Send email to admin
    const subject = `New Feedback Received: ${category.toUpperCase()}`;
    const text = `User ID: ${userId}\nCategory: ${category}\nMessage: ${message}`;
    const { sendEmail } = await import('../utils/mailer');
    await sendEmail('kmk.kmk0789@gmail.com', subject, text);

    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
