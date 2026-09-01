import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'kmk.kmk0789@gmail.com',
    pass: 'junspghhslbbgbwy'
  }
});

export const sendOtpEmail = async (to: string, otp: string) => {
  const mailOptions = {
    from: 'kmk.kmk0789@gmail.com',
    to,
    subject: 'Your Login OTP - Secure Chat',
    text: `Your OTP is: ${otp}\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
             <h2 style="color: #4f46e5;">Secure Chat Login</h2>
             <p>You requested to log in. Here is your One-Time Password:</p>
             <h1 style="background: #f3f4f6; padding: 10px; text-align: center; letter-spacing: 5px; color: #111827; border-radius: 5px;">${otp}</h1>
             <p style="color: #6b7280; font-size: 12px;">This OTP is valid for 10 minutes. Do not share it with anyone.</p>
           </div>`
  };

  await transporter.sendMail(mailOptions);
};

export const sendPasswordResetEmail = async (to: string, resetLink: string) => {
  const mailOptions = {
    from: 'kmk.kmk0789@gmail.com',
    to,
    subject: 'Password Reset - Secure Chat',
    text: `You requested a password reset. Click this link to reset your password: ${resetLink}\n\nThis link is valid for 1 hour.`,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
             <h2 style="color: #4f46e5;">Password Reset</h2>
             <p>You requested a password reset. Click the button below to set a new password:</p>
             <div style="text-align: center; margin: 30px 0;">
               <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
             </div>
             <p style="color: #6b7280; font-size: 12px;">This link is valid for 1 hour. If you didn't request this, ignore this email.</p>
           </div>`
  };

  await transporter.sendMail(mailOptions);
};

export const sendEmail = async (to: string, subject: string, message: string) => {
  const mailOptions = {
    from: 'kmk.kmk0789@gmail.com',
    to,
    subject,
    text: message,
    html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
             <h2 style="color: #4f46e5;">Message from Admin</h2>
             <p style="white-space: pre-wrap;">${message}</p>
           </div>`
  };
  await transporter.sendMail(mailOptions);
};
