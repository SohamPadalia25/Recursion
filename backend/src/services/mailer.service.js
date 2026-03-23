import nodemailer from "nodemailer";
import { ApiError } from "../utils/ApiError.js";

let transporter;

const getTransporter = () => {
  // Lazy-init so the app can still boot even if mail env vars are missing.
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure =
    process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1";

  if (!host || !user || !pass) {
    throw new ApiError(
      500,
      "Mail transport is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS (and optionally SMTP_PORT, SMTP_SECURE)."
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
};

const buildOtpEmail = ({ otp, expiryMinutes }) => {
  const safeOtp = String(otp).trim();
  const expiresText =
    typeof expiryMinutes === "number"
      ? `This OTP expires in ${expiryMinutes} minute(s).`
      : "This OTP expires soon.";

  const subject = "Your OTP Code";
  const text = `Your OTP is: ${safeOtp}\n\n${expiresText}\n\nIf you did not request this, please ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h3 style="margin: 0 0 8px;">Your OTP Code</h3>
      <p style="margin: 0 0 12px;">Your OTP is:</p>
      <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 0 0 12px;">${safeOtp}</div>
      <p style="margin: 0 0 12px;">${expiresText}</p>
      <p style="margin: 0;">If you did not request this, please ignore this email.</p>
    </div>
  `;

  return { subject, text, html };
};

export const sendMail = async ({
  to,
  subject,
  text,
  html,
  from,
  cc,
  bcc,
}) => {
  if (!to) throw new ApiError(400, "`to` (recipient email) is required");
  if (!subject) throw new ApiError(400, "`subject` is required");

  const mailFrom =
    from ||
    process.env.MAIL_FROM ||
    (process.env.SMTP_USER ? `"<${process.env.SMTP_USER}>"` : undefined);
  if (!mailFrom) throw new ApiError(500, "MAIL_FROM is not set");

  const transport = getTransporter();

  await transport.sendMail({
    from: mailFrom,
    to,
    cc,
    bcc,
    subject,
    text,
    html,
  });
};

export const sendOtpEmail = async ({
  to,
  otp,
  expiryMinutes,
}) => {
  const { subject, text, html } = buildOtpEmail({ otp, expiryMinutes });
  await sendMail({ to, subject, text, html });
};

