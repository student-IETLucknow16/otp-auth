const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.html
 */
const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"MERN Auth" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

const otpEmailTemplate = (name, otp) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;">
    <h2 style="color: #1a1a1a;">Verify your email</h2>
    <p>Hi ${name},</p>
    <p>Use the code below to verify your email address. This code expires in 10 minutes.</p>
    <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f4f4f4; padding: 16px; text-align: center; border-radius: 6px; margin: 16px 0;">
      ${otp}
    </div>
    <p style="color: #666; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
  </div>
`;

module.exports = { sendEmail, otpEmailTemplate };
