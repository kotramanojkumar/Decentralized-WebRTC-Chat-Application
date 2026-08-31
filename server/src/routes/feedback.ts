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
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: 'kmk.kmk0789@gmail.com', pass: 'junspghhslbbgbwy' }
    });
    
    await transporter.sendMail({
      from: '"Decentralized Chat System" <kmk.kmk0789@gmail.com>',
      to: 'kmk.kmk0789@gmail.com',
      subject: `New Feedback Received: ${category.toUpperCase()}`,
      text: `User ID: ${userId}\nCategory: ${category}\nMessage: ${message}`,
      html: `<h3>New Feedback Submission</h3><p><strong>Category:</strong> ${category}</p><p><strong>User ID:</strong> ${userId}</p><p><strong>Message:</strong><br/>${message}</p>`
    });

    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
