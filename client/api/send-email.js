import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Add CORS headers so the backend can call it safely
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, text } = req.body;
  if (!to || !subject) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'kmk.kmk0789@gmail.com',
        pass: 'junspghhslbbgbwy'
      }
    });

    const info = await transporter.sendMail({
      from: 'kmk.kmk0789@gmail.com',
      to,
      subject,
      text: text || '',
      html: html || ''
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Vercel SMTP Error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
