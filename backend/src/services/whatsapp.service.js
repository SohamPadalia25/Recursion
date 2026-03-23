import { ApiError } from "../utils/ApiError.js";

const getGreenApiConfig = () => {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const apiToken = process.env.GREEN_API_TOKEN;

  if (!instanceId || !apiToken) {
    throw new ApiError(
      500,
      "WhatsApp transport is not configured. Set GREEN_API_INSTANCE_ID and GREEN_API_TOKEN.",
    );
  }

  const baseUrl = `https://api.green-api.com/waInstance${instanceId}`;
  return { apiToken, baseUrl };
};

const normalizePhone = (phone) => {
  const input = String(phone || "").trim();
  const digits = input.replace(/\D/g, "");

  // GreenAPI expects an international number without + and without separators.
  if (!digits || digits.length < 8) {
    throw new ApiError(400, `Invalid phone number: ${phone}`);
  }

  return digits;
};

export const sendWhatsAppMessage = async ({ phone, message }) => {
  if (!message || !String(message).trim()) {
    throw new ApiError(400, "`message` is required");
  }

  const normalizedPhone = normalizePhone(phone);
  const { apiToken, baseUrl } = getGreenApiConfig();

  const response = await fetch(`${baseUrl}/sendMessage/${apiToken}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chatId: `${normalizedPhone}@c.us`,
      message,
    }),
  });

  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { raw };
  }

  if (!response.ok) {
    throw new ApiError(
      502,
      data?.message || data?.error || `GreenAPI request failed (${response.status})`,
    );
  }

  return data;
};

export const normalizePhoneList = (phones) => {
  if (phones === undefined || phones === null) return [];

  const list = Array.isArray(phones)
    ? phones
    : String(phones)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  return list.map(normalizePhone);
};
