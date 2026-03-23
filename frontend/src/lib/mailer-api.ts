import { apiFetch, API_BASE_URL } from "./api-client";

const API_V1_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/i, "") + "/api/v1";

export type LiveSessionInvitePayload = {
  roomCode: string;
  emails?: string[];
  phones?: string[];
  customMessage?: string;
  instructorName?: string;
};

export type LiveSessionInviteResponse = {
  roomCode: string;
  sentEmails: string[];
  failedEmails: Array<{ recipient: string; reason: string }>;
  sentWhatsApp: string[];
  failedWhatsApp: Array<{ recipient: string; reason: string }>;
  sentCount: number;
};

export async function sendLiveSessionInvites(
  token: string,
  payload: LiveSessionInvitePayload,
): Promise<LiveSessionInviteResponse> {
  return apiFetch<LiveSessionInviteResponse>(`${API_V1_BASE_URL}/mailer/send-live-session-invite`, {
    method: "POST",
    token,
    body: payload,
  });
}
