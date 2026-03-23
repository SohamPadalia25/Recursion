import { Router } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isInstructor } from "../middlewares/role.middleware.js";
import { sendMail, sendOtpEmail } from "../services/mailer.service.js";

const router = Router();

// POST /api/v1/mailer/send
// Note: Protected so only logged-in instructors/admins can trigger emails.
router.post(
  "/v1/mailer/send",
  verifyJWT,
  isInstructor,
  asyncHandler(async (req, res) => {
    const { to, subject, text, html, template, otp, expiryMinutes } =
      req.body || {};

    if (!to) throw new ApiError(400, "`to` (recipient email) is required");

    if (template === "otp") {
      if (!otp) throw new ApiError(400, "`otp` is required for template=otp");
      await sendOtpEmail({ to, otp, expiryMinutes });
    } else {
      if (!subject) throw new ApiError(400, "`subject` is required");
      if (!text && !html) {
        throw new ApiError(400, "Provide either `text` or `html`");
      }
      await sendMail({ to, subject, text, html });
    }

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
    });
  })
);

export default router;

