import nodemailer from 'nodemailer';

async function testEmail() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'kmk.kmk0789@gmail.com',
      pass: 'junspghhslbbgbwy'
    }
  });

  try {
    console.log('Attempting to send email...');
    const info = await transporter.sendMail({
      from: 'kmk.kmk0789@gmail.com',
      to: 'kmk.kmk0789@gmail.com',
      subject: 'Test Email from Nodemailer',
      text: 'If you receive this, the app password works perfectly!'
    });
    console.log('Success! Message ID:', info.messageId);
  } catch (error) {
    console.error('Failed to send email. Error details:');
    console.error(error);
  }
}

testEmail();
