import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Copy,
  Check,
  Mail,
  MessageSquare,
  Send,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import * as TwilioVideo from "twilio-video";
import { useAuth } from "@/auth/AuthContext";
import { sendLiveSessionInvites } from "@/lib/mailer-api";
import { LiveMap } from "@liveblocks/client";
import Whiteboard from "@/components/Whiteboard";
import { RoomProvider } from "@/liveblocks.config";

const SOCKET_URL = import.meta.env.VITE_SOCKET_BASE_URL || "http://localhost:8000";
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
const TWILIO_REGION_FALLBACKS = [
  import.meta.env.VITE_TWILIO_VIDEO_REGION,
  "in1",
  "sg1",
  "gll",
].filter((value, idx, arr): value is string => Boolean(value) && arr.indexOf(value) === idx);

type StoredUser = {
  _id: string;
  name: string;
  role?: string;
};

const InstructorLiveSession = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [invitePhones, setInvitePhones] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteStatus, setInviteStatus] = useState("");

  const socketRef = useRef<any>(null);
  const roomRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLDivElement | null>(null);

  const connectToRoom = async (token: string, room: string) => {
    let lastError: any = null;

    for (const region of TWILIO_REGION_FALLBACKS) {
      try {
        const connected = await TwilioVideo.connect(token, {
          name: room,
          audio: true,
          video: { width: 640, height: 480 },
          region,
        });
        return connected;
      } catch (err) {
        lastError = err;
        console.warn(`Twilio connect failed for region ${region}:`, err);
      }
    }

    throw lastError || new Error("Unable to connect to Twilio room");
  };

  const getAccessToken = () => {
    if (authUser?.accessToken) return authUser.accessToken;

    try {
      const raw = localStorage.getItem("dei-auth-user");
      if (!raw) return "";
      const parsed = JSON.parse(raw) as { accessToken?: string };
      return parsed?.accessToken || "";
    } catch {
      return "";
    }
  };

  // Load current user
  useEffect(() => {
    if (authUser?._id) {
      setCurrentUser({
        _id: authUser._id,
        name: authUser.name,
        role: authUser.role,
      });
      return;
    }

    let rawUser = localStorage.getItem("user");
    console.log("Loading user from localStorage:", rawUser);
    
    if (!rawUser) {
      console.warn("No user found in localStorage - Creating test instructor");
      // Create a test instructor for testing
      const testInstructor: StoredUser = {
        _id: "instructor-test-001",
        name: "Dr. Test Instructor",
        role: "instructor",
      };
      localStorage.setItem("user", JSON.stringify(testInstructor));
      setCurrentUser(testInstructor);
      return;
    }

    try {
      const parsed = JSON.parse(rawUser) as StoredUser;
      console.log("Parsed user:", parsed);
      setCurrentUser(parsed);
    } catch (e) {
      console.error("Error parsing user:", e);
      // Create a test instructor on parse error
      const testInstructor: StoredUser = {
        _id: "instructor-test-001",
        name: "Dr. Test Instructor",
        role: "instructor",
      };
      localStorage.setItem("user", JSON.stringify(testInstructor));
      setCurrentUser(testInstructor);
    }
  }, [authUser]);

  const generateRoomName = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `LIVE-${timestamp}-${random}`.toUpperCase();
  };

  const getCurrentUser = (): StoredUser | null => {
    if (authUser?._id) {
      return {
        _id: authUser._id,
        name: authUser.name,
        role: authUser.role,
      };
    }

    try {
      const rawUser = localStorage.getItem("user");
      if (!rawUser) return null;
      return JSON.parse(rawUser) as StoredUser;
    } catch {
      return null;
    }
  };

  const startSession = async () => {
    // Get fresh user data from localStorage
    const user = getCurrentUser();
    if (!user?._id) {
      setError("User not loaded. Please log in again and try refreshing the page.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const newRoomName = generateRoomName();
      setRoomName(newRoomName);

      console.log("Starting session with room:", newRoomName);
      console.log("Current user:", user);
      console.log("API URL:", API_URL);

      // Get token from backend
      const tokenUrl = `${API_URL}/video/generate-token`;
      console.log("Fetching token from:", tokenUrl);

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: `instructor_${user._id}`,
          room: newRoomName,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }

      const tokenResponse = await response.json();
      console.log("Token response:", tokenResponse);

      if (!tokenResponse.ok || !tokenResponse.token) {
        throw new Error(tokenResponse.error || "Failed to get token");
      }

      // Connect to Twilio Video room with region fallback retries.
      const room = await connectToRoom(tokenResponse.token, newRoomName);

      roomRef.current = room;

      // NOTE: Do NOT attach local video track here — the video <div> only renders
      // after setSessionStarted(true). Attachment is handled in the useEffect below.

      setSessionStarted(true);

      // Emit session start via Socket.io
      if (socketRef.current) {
        socketRef.current.emit("session:start", {
          roomName: newRoomName,
          instructorId: user._id,
          instructorName: user.name,
        });
      }

      console.log("Session started successfully");
    } catch (err: any) {
      console.error("Error starting session:", err);
      
      // Provide helpful error messages
      let errorMessage = "Failed to start session";
      if (err.message.includes("Failed to fetch")) {
        errorMessage = "Cannot connect to backend server. Check VITE_API_BASE_URL and backend status.";
      } else if (err.message.includes("Backend error")) {
        errorMessage = `❌ Backend API error: ${err.message}. Check if video endpoint is working.`;
      } else if (err.message?.toLowerCase().includes("signaling")) {
        errorMessage = `❌ Twilio signaling failed${err.code ? ` (code ${err.code})` : ""}. Check internet/firewall and verify Twilio project + API key belong to the same account.`;
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      setSessionStarted(false);
    } finally {
      setIsLoading(false);
    }
  };

  const endSession = () => {
    if (roomRef.current) {
      roomRef.current.localParticipant.tracks.forEach((publication: any) => {
        const track = publication.track;
        if (track) {
          track.stop();
          track.detach().forEach((el: HTMLElement) => el.remove());
        }
      });
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.innerHTML = "";
    }

    setSessionStarted(false);
    setRoomName("");

    if (socketRef.current) {
      socketRef.current.emit("session:end", {
        roomName,
        instructorId: currentUser?._id,
      });
    }
  };

  const toggleMute = () => {
    if (roomRef.current) {
      roomRef.current.localParticipant.audioTracks.forEach((audioTrack: any) => {
        if (isMuted) {
          audioTrack.enable();
        } else {
          audioTrack.disable();
        }
      });
    }
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    if (roomRef.current) {
      roomRef.current.localParticipant.videoTracks.forEach((videoTrack: any) => {
        if (isCameraOff) {
          videoTrack.enable();
        } else {
          videoTrack.disable();
        }
      });
    }
    setIsCameraOff(!isCameraOff);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parseCsv = (value: string) =>
    value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

  const sendInvites = async () => {
    setInviteError("");
    setInviteStatus("");

    if (!roomName) {
      setInviteError("Start a live session first to get a room code.");
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setInviteError("Missing auth token. Please login again as instructor.");
      return;
    }

    const emails = parseCsv(inviteEmails);
    const phones = parseCsv(invitePhones);

    if (emails.length === 0 && phones.length === 0) {
      setInviteError("Add at least one email or phone recipient.");
      return;
    }

    setInviteLoading(true);
    try {
      const result = await sendLiveSessionInvites(token, {
        roomCode: roomName,
        emails,
        phones,
        customMessage: inviteMessage.trim() || undefined,
        instructorName: currentUser?.name || authUser?.name,
      });

      setInviteStatus(
        `Invites sent: ${result.sentCount} | Email: ${result.sentEmails.length}, WhatsApp: ${result.sentWhatsApp.length}`,
      );

      if (result.failedEmails.length || result.failedWhatsApp.length) {
        setInviteError(
          `Some invites failed (email: ${result.failedEmails.length}, WhatsApp: ${result.failedWhatsApp.length}).`,
        );
      }
    } catch (err: any) {
      setInviteError(err?.message || "Failed to send invites");
    } finally {
      setInviteLoading(false);
    }
  };

  // Initialize Socket.io
  useEffect(() => {
    if (!currentUser?._id) return;

    const socket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected");
      socket.emit("user:register", {
        userId: currentUser._id,
        name: currentUser.name,
        role: "instructor",
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  // ─── Attach local video AFTER the session view is mounted in the DOM ────────────
  // setSessionStarted(true) triggers a re-render that mounts <div ref={localVideoRef}>
  // This useEffect fires after that commit, guaranteeing localVideoRef.current is set.
  useEffect(() => {
    if (!sessionStarted || !roomRef.current) return;

    const room = roomRef.current;
    const videoTrack = room.localParticipant.videoTracks.values().next().value?.track;
    if (videoTrack && localVideoRef.current) {
      // Clear any stale content before attaching
      localVideoRef.current.innerHTML = "";
      const el = videoTrack.attach();
      el.className = "w-full h-full object-cover rounded-2xl";
      localVideoRef.current.appendChild(el);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStarted]);

  if (!sessionStarted) {
    const isPageLoading = !currentUser;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="dei-card p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-2xl dei-gradient-sky flex items-center justify-center mx-auto mb-6">
            {isPageLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Video className="w-8 h-8 text-dei-sky" />
              </motion.div>
            ) : (
              <Video className="w-8 h-8 text-dei-sky" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">Start Live Session</h1>
          <p className="text-muted-foreground mb-6">
            Click the button below to start your live class. Students will be able to join using the session code.
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-500/10 border border-red-500 rounded-lg p-4 text-red-600 text-sm mb-6"
            >
              <p className="font-semibold mb-2">{error}</p>
              <details className="text-xs mt-3 cursor-pointer">
                <summary className="font-semibold mb-2">💡 How to fix this:</summary>
                <div className="space-y-2 mt-2 ml-2 text-red-600/80">
                  <p>1. Make sure backend is running:</p>
                  <code className="bg-black/20 px-2 py-1 rounded block my-1">cd backend && npm run dev</code>
                  <p>2. Check that backend is at <span className="font-mono">http://localhost:8000</span></p>
                  <p>3. Verify Twilio credentials in <span className="font-mono">backend/.env</span> are from the same Twilio account</p>
                  <p>4. If message says signaling error, try another network / disable VPN / allow websocket traffic</p>
                  <p>5. Check browser console (F12) for more details</p>
                </div>
              </details>
            </motion.div>
          )}

          {isPageLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-blue-500/10 border border-blue-500 rounded-lg p-3 text-blue-600 text-sm mb-6"
            >
              Loading your profile...
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: isPageLoading || isLoading ? 1 : 1.05 }}
            whileTap={{ scale: isPageLoading || isLoading ? 1 : 0.95 }}
            onClick={startSession}
            disabled={isPageLoading || isLoading}
            className="w-full py-3 rounded-lg dei-gradient-sky text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPageLoading ? "Initializing..." : isLoading ? "Starting..." : "Start Session Now"}
          </motion.button>

          {error && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/login")}
              className="w-full mt-3 py-2 rounded-lg border border-dei-sky text-dei-sky font-semibold hover:bg-dei-sky/10 transition-all"
            >
              Go to Login
            </motion.button>
          )}

        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-background border-b border-border p-4 flex items-center justify-between sticky top-0 z-10"
      >
        <div>
          <h1 className="text-xl font-bold text-foreground">Live Session Active</h1>
          <p className="text-sm text-muted-foreground">{currentUser?.name}</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={endSession}
          className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold flex items-center gap-2 hover:bg-red-600 transition-all"
        >
          <PhoneOff className="w-4 h-4" />
          End Session
        </motion.button>
      </motion.div>

      {/* Session Code */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-r from-dei-sky/10 to-dei-purple/10 border-b border-dei-sky/20 p-4 flex items-center justify-between"
      >
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Session Code</p>
          <p className="text-2xl font-bold text-foreground font-mono">{roomName}</p>
          <p className="text-xs text-muted-foreground mt-1">Share this code with students to join</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={copyRoomCode}
          className="px-4 py-2 rounded-lg bg-dei-sky text-white font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Code
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Main Video Area */}
      <div className="max-w-6xl mx-auto p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-2xl overflow-hidden bg-black shadow-2xl aspect-video"
        >
          <div ref={localVideoRef} className="w-full h-full" />

          {/* Controls Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isMuted
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-white hover:bg-gray-100 text-black"
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleCamera}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                isCameraOff
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-white hover:bg-gray-100 text-black"
              }`}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Info Box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 dei-card p-4 border-l-4 border-dei-sky"
        >
          <h3 className="font-semibold text-foreground mb-2">👥 Waiting for students to join...</h3>
          <p className="text-sm text-muted-foreground">
            Share the session code <span className="font-mono font-bold text-dei-sky">{roomName}</span> with your students. They can join from their dashboard.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-4 dei-card p-4"
        >
          <h3 className="font-semibold text-foreground mb-3 inline-flex items-center gap-2">
            <Send className="w-4 h-4 text-dei-sky" />
            Share Session Code via Email & WhatsApp
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground inline-flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3.5 h-3.5" />
                Student emails (comma separated)
              </label>
              <input
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                placeholder="student1@email.com, student2@email.com"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring-2"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground inline-flex items-center gap-1.5 mb-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp numbers (comma separated)
              </label>
              <input
                value={invitePhones}
                onChange={(e) => setInvitePhones(e.target.value)}
                placeholder="9198XXXXXXXX, 447XXXXXXXXX"
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none ring-primary/30 focus:ring-2"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="text-xs text-muted-foreground mb-1.5 block">Optional note</label>
            <textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              placeholder="Class starts in 5 minutes. Please join on time."
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none ring-primary/30 focus:ring-2"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={sendInvites}
              disabled={inviteLoading}
              className="px-4 py-2 rounded-lg bg-dei-sky text-white font-semibold hover:bg-dei-sky/90 transition-all disabled:opacity-60"
            >
              {inviteLoading ? "Sending..." : "Send Invites"}
            </button>
            {inviteStatus && <p className="text-xs text-dei-sage font-medium">{inviteStatus}</p>}
          </div>

          {inviteError && <p className="mt-2 text-xs text-red-600">{inviteError}</p>}
        </motion.div>

        {roomName && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <h2 className="text-lg font-bold text-foreground mb-4">Interactive Whiteboard</h2>
            <div
              className="rounded-xl overflow-hidden shadow-lg border border-border bg-background"
              style={{ height: "500px" }}
            >
              <RoomProvider
                id={roomName}
                initialPresence={{ selectedShape: null }}
                initialStorage={{ shapes: new LiveMap() }}
              >
                <Whiteboard />
              </RoomProvider>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default InstructorLiveSession;