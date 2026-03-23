import { Router } from "express";
import {
  generateVideoToken,
  getActiveRooms,
  getRoomParticipants,
  endVideoRoom,
} from "../controllers/videoCall.controller.js";

const router = Router();

/**
 * GET /api/v1/video/rooms
 * Get all active video rooms (for displaying available sessions to join)
 */
router.get("/rooms", getActiveRooms);

/**
 * POST /api/v1/video/generate-token
 * Generate a Twilio Video token for joining a room
 * Body: { identity, room }
 */
router.post("/generate-token", generateVideoToken);

/**
 * GET /api/v1/video/room/:room/participants
 * Get active participants in a video room
 */
router.get("/room/:room/participants", getRoomParticipants);

/**
 * POST /api/v1/video/end-room
 * End a video room session
 * Body: { room }
 */
router.post("/end-room", endVideoRoom);

export default router;
