const getVercelUrl = () => {
  if (process.env.CLIENT_URL) {
    const baseUrl = process.env.CLIENT_URL.endsWith('/') ? process.env.CLIENT_URL.slice(0, -1) : process.env.CLIENT_URL;
    return `${baseUrl}/api/send-email`;
  }
  return 'https://decentralized-web-rtc-chat-applicat.vercel.app/api/send-email';
};

const VERCEL_API_URL = getVercelUrl();

const sendViaProxy = async (payload: any) => {
  try {
    const res = await fetch(VERCEL_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      console.error('Vercel email proxy returned non-OK:', await res.text());
    }
  } catch (error) {
    console.error('Email Proxy Error:', error);
  }
};

export const sendOtpEmail = async (to: string, otp: string) => {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #0c1017; color: #f1f5f9; border: 1px solid #1e293b; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; padding: 6px 14px; background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px;">
          ✦ P2PConnect Security
        </span>
        <h2 style="color: #ffffff; margin-top: 12px; margin-bottom: 4px; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
          Two-Step Verification Code
        </h2>
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption
        </p>
      </div>

      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
        You are signing in to your decentralized communication account. Enter this 6-digit One-Time Passcode (OTP) on the verification screen to complete login:
      </p>

      <div style="background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9)); border: 1px solid rgba(56, 189, 248, 0.3); padding: 20px; text-align: center; border-radius: 16px; margin: 24px 0; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.4);">
        <span style="font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #38bdf8; font-family: monospace; display: inline-block; margin-left: 12px;">
          ${otp}
        </span>
      </div>

      <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(148, 163, 184, 0.1); border-radius: 12px; padding: 12px 16px; margin-bottom: 24px;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.5;">
          ⏱️ <strong>Validity:</strong> This OTP is valid for <strong>10 minutes</strong>.<br>
          🔒 <strong>Privacy Notice:</strong> Never share this code with anyone. Our team will never ask for your verification code.
        </p>
      </div>

      <hr style="border: 0; border-top: 1px solid rgba(148, 163, 184, 0.15); margin: 24px 0;" />
      
      <p style="color: #64748b; font-size: 11px; text-align: center; margin: 0; line-height: 1.5;">
        This automated security alert was issued by <strong>Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption</strong>.<br>
        If you did not initiate this login request, please change your password immediately.
      </p>
    </div>
  `;

  await sendViaProxy({
    to,
    subject: 'Two-Step Verification Code - Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption',
    text: `Your Two-Step Verification OTP is: ${otp}. Valid for 10 minutes.`,
    html
  });
};

export const sendPasswordResetEmail = async (to: string, resetLink: string) => {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #0c1017; color: #f1f5f9; border: 1px solid #1e293b; border-radius: 20px;">
      <h2 style="color: #38bdf8;">Password Reset Request</h2>
      <p style="color: #94a3b8; font-size: 12px;">Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption</p>
      <p style="color: #cbd5e1; font-size: 14px; margin: 20px 0;">You requested to reset your password. Click below to proceed:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #38bdf8; color: #000000; padding: 12px 28px; text-decoration: none; border-radius: 9999px; font-weight: bold; font-size: 14px; display: inline-block;">
          Reset My Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 12px;">This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
    </div>
  `;
  await sendViaProxy({
    to,
    subject: 'Password Reset Request - Decentralized Real-Time Chat Application Using WebRTC with End-to-End Encryption',
    text: `Click this link to reset your password: ${resetLink}`,
    html
  });
};

export const sendEmail = async (to: string, subject: string, message: string) => {
  await sendViaProxy({ to, subject, text: message, html: message.replace(/\n/g, '<br>') });
};
