import { Router } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isInstructor } from "../middlewares/role.middleware.js";
import { sendMail, sendOtpEmail } from "../services/mailer.service.js";
import {
  normalizePhoneList,
  sendWhatsAppMessage,
} from "../services/whatsapp.service.js";

const router = Router();

const parseEmailList = (input) => {
  if (input === undefined || input === null) return [];

  const list = Array.isArray(input)
    ? input
    : String(input)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  return list;
};

const buildSessionInvitePayload = ({ instructorName, roomCode, customMessage }) => {
  const safeInstructorName = instructorName || "Your instructor";
  const safeRoomCode = String(roomCode || "").trim();
  const extra = customMessage ? `\n\nNote: ${customMessage}` : "";

  const subject = `Live Session Invite • Code: ${safeRoomCode}`;
  const text = [
    `${safeInstructorName} invited you to a live class session.`,
    `Session code: ${safeRoomCode}`,
    "Open the student dashboard, choose Join Live Session, and enter this code.",
    extra,
  ]
    .join("\n")
    .trim();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h3 style="margin: 0 0 8px;">Live Session Invite</h3>
      <p style="margin: 0 0 8px;">${safeInstructorName} invited you to a live class session.</p>
      <p style="margin: 0 0 8px;"><strong>Session code:</strong></p>
      <div style="display: inline-block; margin: 0 0 12px; padding: 8px 12px; border-radius: 8px; background: #f4f6f8; font-size: 20px; font-weight: bold; letter-spacing: 1px;">${safeRoomCode}</div>
      <p style="margin: 0 0 8px;">Open the student dashboard, choose <em>Join Live Session</em>, and enter this code.</p>
      ${customMessage ? `<p style="margin: 0;"><strong>Note:</strong> ${customMessage}</p>` : ""}
    </div>
  `;

  const whatsappMessage = [
    `Live session invite from ${safeInstructorName}`,
    `Session code: ${safeRoomCode}`,
    "Open your student dashboard and enter this code in Join Live Session.",
    customMessage ? `Note: ${customMessage}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, text, html, whatsappMessage };
};

// POST /api/v1/mailer/send
// Note: Protected so only logged-in instructors/admins can trigger emails.
router.post(
  "/v1/mailer/send",
  verifyJWT,
  isInstructor,
  asyncHandler(async (req, res) => {
    const { to, subject, text, html, template, otp, expiryMinutes } =
      req.body || {};

    const recipients = parseEmailList(to);
    if (recipients.length === 0) {
      throw new ApiError(400, "`to` (recipient email) is required");
    }

    if (template === "otp") {
      if (!otp) throw new ApiError(400, "`otp` is required for template=otp");
      await Promise.all(recipients.map((email) => sendOtpEmail({ to: email, otp, expiryMinutes })));
    } else {
      if (!subject) throw new ApiError(400, "`subject` is required");
      if (!text && !html) {
        throw new ApiError(400, "Provide either `text` or `html`");
      }
      await Promise.all(recipients.map((email) => sendMail({ to: email, subject, text, html })));
    }

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      data: { sent: recipients.length },
    });
  })
);

// POST /api/v1/mailer/send-whatsapp
// Body: { phones: string[] | comma-separated string, message: string }
router.post(
  "/v1/mailer/send-whatsapp",
  verifyJWT,
  isInstructor,
  asyncHandler(async (req, res) => {
    const { phones, message } = req.body || {};
    const recipients = normalizePhoneList(phones);

    if (recipients.length === 0) {
      throw new ApiError(400, "`phones` is required");
    }

    if (!message || !String(message).trim()) {
      throw new ApiError(400, "`message` is required");
    }

    const results = await Promise.allSettled(
      recipients.map((phone) => sendWhatsAppMessage({ phone, message: String(message) }))
    );

    const delivered = [];
    const failed = [];
    results.forEach((result, idx) => {
      const phone = recipients[idx];
      if (result.status === "fulfilled") {
        delivered.push({ phone, response: result.value });
      } else {
        failed.push({ phone, reason: result.reason?.message || "Unknown error" });
      }
    });

    if (delivered.length === 0) {
      throw new ApiError(500, "Failed to send WhatsApp message to all recipients");
    }

    return res.status(200).json({
      success: true,
      message: "WhatsApp message processing completed",
      data: {
        delivered,
        failed,
        deliveredCount: delivered.length,
        failedCount: failed.length,
      },
    });
  })
);

// POST /api/v1/mailer/send-live-session-invite
// Body:
// {
//   roomCode: string,
//   emails?: string[] | string,
//   phones?: string[] | string,
//   customMessage?: string,
//   instructorName?: string,
// }
router.post(
  "/v1/mailer/send-live-session-invite",
  verifyJWT,
  isInstructor,
  asyncHandler(async (req, res) => {
    const {
      roomCode,
      emails,
      phones,
      customMessage,
      instructorName,
    } = req.body || {};

    const emailRecipients = parseEmailList(emails);
    const phoneRecipients = normalizePhoneList(phones);

    if (!roomCode || !String(roomCode).trim()) {
      throw new ApiError(400, "`roomCode` is required");
    }

    if (emailRecipients.length === 0 && phoneRecipients.length === 0) {
      throw new ApiError(400, "Provide at least one recipient in `emails` or `phones`");
    }

    const senderName =
      String(instructorName || "").trim() ||
      req.user?.fullname ||
      req.user?.username ||
      "Your instructor";

    const { subject, text, html, whatsappMessage } = buildSessionInvitePayload({
      instructorName: senderName,
      roomCode,
      customMessage: customMessage ? String(customMessage) : "",
    });

    const emailResults = await Promise.allSettled(
      emailRecipients.map((to) => sendMail({ to, subject, text, html }))
    );

    const whatsappResults = await Promise.allSettled(
      phoneRecipients.map((phone) =>
        sendWhatsAppMessage({ phone, message: whatsappMessage })
      )
    );

    const sentEmails = [];
    const failedEmails = [];
    emailResults.forEach((result, idx) => {
      const recipient = emailRecipients[idx];
      if (result.status === "fulfilled") sentEmails.push(recipient);
      else failedEmails.push({ recipient, reason: result.reason?.message || "Unknown error" });
    });

    const sentWhatsApp = [];
    const failedWhatsApp = [];
    whatsappResults.forEach((result, idx) => {
      const recipient = phoneRecipients[idx];
      if (result.status === "fulfilled") sentWhatsApp.push(recipient);
      else failedWhatsApp.push({ recipient, reason: result.reason?.message || "Unknown error" });
    });

    if (sentEmails.length === 0 && sentWhatsApp.length === 0) {
      throw new ApiError(500, "Failed to send invites via both email and WhatsApp");
    }

    return res.status(200).json({
      success: true,
      message: "Live session invites processed",
      data: {
        roomCode: String(roomCode),
        sentEmails,
        failedEmails,
        sentWhatsApp,
        failedWhatsApp,
        sentCount: sentEmails.length + sentWhatsApp.length,
      },
    });
  })
);

export default router;

