// GROQ API — https://console.groq.com
// Add to .env:  GROQ_API_KEY=your_key_here

import Groq from "groq-sdk";
import { ApiError } from "../utils/ApiError.js";
import { createReadStream } from "fs";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";

let groqClient;

const GROQ_MODEL_CANDIDATES = [
  process.env.GROQ_CHAT_MODEL,
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
].filter(Boolean);

const isModelDecommissionedError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.error?.code || error?.code || "").toLowerCase();
  return code.includes("decommissioned") || message.includes("decommissioned") || message.includes("no longer supported");
};

const getGroqClient = () => {
  if (groqClient) return groqClient;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new ApiError(503, "GROQ_API_KEY is not configured. AI endpoints are unavailable.");
  }

  groqClient = new Groq({ apiKey });
  return groqClient;
};

// Core chat completion — all agents use this
const chatWithGroq = async (messages, model, jsonMode = false) => {
  const groq = getGroqClient();
  const modelChain = model
    ? [model, ...GROQ_MODEL_CANDIDATES.filter((m) => m !== model)]
    : GROQ_MODEL_CANDIDATES;

  let lastError;
  for (const candidateModel of modelChain) {
    try {
      const response = await groq.chat.completions.create({
        model: candidateModel,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        response_format: jsonMode ? { type: "json_object" } : undefined,
      });
      return response.choices[0].message.content;
    } catch (error) {
      lastError = error;
      if (!isModelDecommissionedError(error)) {
        throw error;
      }
    }
  }

  throw lastError || new ApiError(503, "No available Groq chat model configured");
};

const MAX_TRANSCRIPTION_FILE_BYTES = 24 * 1024 * 1024;

const ALLOWED_TRANSCRIPTION_EXTENSIONS = new Set([
  ".flac",
  ".mp3",
  ".mp4",
  ".mpeg",
  ".mpga",
  ".m4a",
  ".ogg",
  ".opus",
  ".wav",
  ".webm",
]);

const CONTENT_TYPE_TO_EXTENSION = {
  "audio/flac": ".flac",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/mp4": ".m4a",
  "audio/m4a": ".m4a",
  "audio/ogg": ".ogg",
  "audio/opus": ".opus",
  "audio/wav": ".wav",
  "audio/webm": ".webm",
  "video/mp4": ".mp4",
  "video/mpeg": ".mpeg",
  "video/webm": ".webm",
};

const toNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const getExtensionFromUrl = (fileUrl) => {
  try {
    const parsedUrl = new URL(fileUrl);
    const ext = path.extname(parsedUrl.pathname || "").toLowerCase();
    return ALLOWED_TRANSCRIPTION_EXTENSIONS.has(ext) ? ext : "";
  } catch {
    return "";
  }
};

const getExtensionFromContentType = (contentType) => {
  if (!contentType) return "";
  const normalized = String(contentType).split(";")[0].trim().toLowerCase();
  const ext = CONTENT_TYPE_TO_EXTENSION[normalized];
  return ext && ALLOWED_TRANSCRIPTION_EXTENSIONS.has(ext) ? ext : "";
};

const transcribeAudioFromUrl = async (audioUrl) => {
  if (!audioUrl || typeof audioUrl !== "string") {
    throw new ApiError(400, "audioUrl is required for transcription");
  }

  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new ApiError(400, `Failed to fetch media for transcription (${response.status})`);
  }

  const contentLength = toNumber(response.headers.get("content-length"), 0);
  if (contentLength > MAX_TRANSCRIPTION_FILE_BYTES) {
    throw new ApiError(413, "Video is too large for transcription. Please use a smaller file.");
  }

  const extFromUrl = getExtensionFromUrl(audioUrl);
  const extFromContentType = getExtensionFromContentType(response.headers.get("content-type"));
  const fileExtension = extFromUrl || extFromContentType || ".mp4";

  const arrayBuffer = await response.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  if (fileBuffer.byteLength > MAX_TRANSCRIPTION_FILE_BYTES) {
    throw new ApiError(413, "Video is too large for transcription. Please use a smaller file.");
  }

  const tmpFilePath = path.join(os.tmpdir(), `transcript-${randomUUID()}${fileExtension}`);
  await fs.writeFile(tmpFilePath, fileBuffer);

  try {
    const groq = getGroqClient();
    const transcription = await groq.audio.transcriptions.create({
      file: createReadStream(tmpFilePath),
      model: process.env.GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3-turbo",
      response_format: "verbose_json",
      temperature: 0,
    });

    const rawSegments = Array.isArray(transcription?.segments) ? transcription.segments : [];
    const segments = rawSegments
      .map((segment, index) => ({
        id: String(segment?.id ?? index),
        start: toNumber(segment?.start, 0),
        end: toNumber(segment?.end, toNumber(segment?.start, 0) + 2),
        text: String(segment?.text || "").trim(),
      }))
      .filter((segment) => Boolean(segment.text));

    if (!segments.length && transcription?.text) {
      segments.push({
        id: "0",
        start: 0,
        end: Math.max(toNumber(transcription?.duration, 0), 30),
        text: String(transcription.text).trim(),
      });
    }

    return {
      text: String(transcription?.text || "").trim(),
      duration: toNumber(transcription?.duration, 0),
      language: String(transcription?.language || ""),
      segments,
      provider: "groq",
      model: process.env.GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3-turbo",
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error?.message || "Transcription failed");
  } finally {
    try {
      await fs.unlink(tmpFilePath);
    } catch {
      // no-op cleanup
    }
  }
};

export { getGroqClient, chatWithGroq, transcribeAudioFromUrl };