// We proxy emails through the Vercel Frontend API to bypass Render's SMTP block on Free Tier.
const VERCEL_API_URL = process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/api/send-email` : 'https://decentralized-web-rtc-chat-applicat.vercel.app/api/send-email';

const sendViaProxy = async (payload: any) => {
  try {
    const res = await fetch(VERCEL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.error('Vercel proxy failed:', await res.text());
    }
  } catch (error) {
    console.error('Proxy Error:', error);
  }
};

export const sendOtpEmail = async (to: string, otp: string) => {
  const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
             <h2 style="color: #4f46e5;">Secure Chat Login</h2>
             <p>You requested to log in. Here is your One-Time Password:</p>
             <h1 style="background: #f3f4f6; padding: 10px; text-align: center; letter-spacing: 5px; color: #111827; border-radius: 5px;">${otp}</h1>
             <p style="color: #6b7280; font-size: 12px;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
           </div>`;
  await sendViaProxy({ to, subject: 'Your Login OTP - Secure Chat', text: `Your OTP is: ${otp}`, html });
};

export const sendPasswordResetEmail = async (to: string, resetLink: string) => {
  const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
             <h2 style="color: #4f46e5;">Password Reset</h2>
             <p>You requested a password reset. Click the button below to set a new password:</p>
             <div style="text-align: center; margin: 30px 0;">
               <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
             </div>
             <p style="color: #6b7280; font-size: 12px;">This link is valid for 1 hour. If you didn't request this, ignore this email.</p>
           </div>`;
  await sendViaProxy({ to, subject: 'Password Reset - Secure Chat', text: `Click this link to reset your password: ${resetLink}`, html });
};

export const sendEmail = async (to: string, subject: string, message: string) => {
  await sendViaProxy({ to, subject, text: message, html: message.replace(/\n/g, '<br>') });
};
