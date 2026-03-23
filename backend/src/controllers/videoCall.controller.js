import dotenv from "dotenv";
import twilio from "twilio";

dotenv.config();

const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioApiKey = process.env.TWILIO_API_KEY;
const twilioApiSecret = process.env.TWILIO_API_SECRET;

if (!twilioAccountSid || !twilioAuthToken || !twilioApiKey || !twilioApiSecret) {
  console.warn("Warning: Twilio credentials not fully configured in environment variables");
}

/**
 * Generate a Twilio Video token for a user
 * @param {string} identity - User identifier (userId)
 * @param {string} room - Room name for the video session
 * @returns {Promise<object>} Token and room details
 */
export const generateVideoToken = async (req, res) => {
  try {
    const { identity, room } = req.body;

    console.log("Generate token request - Identity:", identity, "Room:", room);

    if (!identity || !room) {
      return res.status(400).json({
        ok: false,
        error: "Identity and room name are required",
      });
    }

    if (!twilioAccountSid || !twilioAuthToken || !twilioApiKey || !twilioApiSecret) {
      console.error("Missing Twilio credentials!");
      console.error({
        hasAccountSid: !!twilioAccountSid,
        hasAuthToken: !!twilioAuthToken,
        hasApiKey: !!twilioApiKey,
        hasApiSecret: !!twilioApiSecret,
      });
      return res.status(500).json({
        ok: false,
        error: "Twilio credentials not configured. Check backend/.env file.",
        details: {
          hasAccountSid: !!twilioAccountSid,
          hasAuthToken: !!twilioAuthToken,
          hasApiKey: !!twilioApiKey,
          hasApiSecret: !!twilioApiSecret,
        }
      });
    }

    console.log("Creating Twilio access token...");
    const AccessToken = twilio.jwt.AccessToken;
    const VideoGrant = twilio.jwt.AccessToken.VideoGrant;

    // Create an access token which we will sign and return to the client
    // NOTE: identity must be passed in the options object (4th param) in newer Twilio SDK versions
    const token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret, { identity });

    // Add a Video Grant
    token.addGrant(new VideoGrant({ room }));

    // Serialize the token to a JWT string
    const jwt = token.toJwt();

    console.log("Token generated successfully");

    return res.status(200).json({
      ok: true,
      token: jwt,
      room: room,
      identity: identity,
    });
  } catch (error) {
    console.error("Error generating video token:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to generate video token",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Get all active video rooms (for students to see available sessions)
 */
export const getActiveRooms = async (req, res) => {
  try {
    if (!twilioAccountSid || !twilioAuthToken) {
      return res.status(500).json({
        ok: false,
        error: "Twilio credentials not configured",
        rooms: [],
      });
    }

    const client = twilio(twilioAccountSid, twilioAuthToken);

    const rooms = await client.video.rooms.list({ status: "in-progress" });

    const activeRooms = rooms.map((room) => ({
      name: room.uniqueName,
      participantCount: room.participantCount,
      status: room.status,
    }));

    console.log(`Found ${activeRooms.length} active rooms`);

    return res.status(200).json({
      ok: true,
      rooms: activeRooms,
      count: activeRooms.length,
    });
  } catch (error) {
    console.error("Error fetching active rooms:", error);
    return res.status(200).json({
      ok: true,
      rooms: [],
      count: 0,
      message: "Could not fetch rooms - returning empty list",
    });
  }
};

/**
 * Get active participants in a room
 * Requires Twilio REST API setup
 */
export const getRoomParticipants = async (req, res) => {
  try {
    const { room } = req.params;

    if (!room) {
      return res.status(400).json({
        ok: false,
        error: "Room name is required",
      });
    }

    const client = twilio(twilioAccountSid, twilioAuthToken);

    const participants = await client.video.rooms(room).participants.list();

    return res.status(200).json({
      ok: true,
      room: room,
      participantCount: participants.length,
      participants: participants.map((p) => ({
        sid: p.sid,
        status: p.status,
        identity: p.identity,
      })),
    });
  } catch (error) {
    console.error("Error fetching room participants:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to fetch room participants",
    });
  }
};

/**
 * End a video room session
 */
export const endVideoRoom = async (req, res) => {
  try {
    const { room } = req.body;

    if (!room) {
      return res.status(400).json({
        ok: false,
        error: "Room name is required",
      });
    }

    const client = twilio(twilioAccountSid, twilioAuthToken);

    await client.video
      .rooms(room)
      .update({ status: "completed" });

    return res.status(200).json({
      ok: true,
      message: `Room ${room} has been closed`,
    });
  } catch (error) {
    console.error("Error ending video room:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Failed to end video room",
    });
  }
};
