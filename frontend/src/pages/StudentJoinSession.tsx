import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  ArrowLeft,
  RefreshCw,
  Play,
  Save,
  Check,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import * as TwilioVideo from "twilio-video";

const SOCKET_URL = import.meta.env.VITE_SOCKET_BASE_URL || "http://localhost:8000";
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

type StoredUser = {
  _id: string;
  name: string;
  role?: string;
};

type ActiveRoom = {
  name: string;
  participantCount: number;
  status: string;
};

const StudentJoinSession = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [sessionJoined, setSessionJoined] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRooms, setIsFetchingRooms] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const socketRef = useRef<any>(null);
  const roomRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoRef = useRef<HTMLDivElement | null>(null);

  // ─── Load current user ───────────────────────────────────────────────────────
  useEffect(() => {
    const rawUser = localStorage.getItem("user");
    console.log("Loading user from localStorage:", rawUser);

    if (!rawUser) {
      console.warn("No user found in localStorage - Creating test student");
      const testStudent: StoredUser = {
        _id: "student-test-001",
        name: "Test Student",
        role: "student",
      };
      localStorage.setItem("user", JSON.stringify(testStudent));
      setCurrentUser(testStudent);
      return;
    }

    try {
      const parsed = JSON.parse(rawUser) as StoredUser;
      console.log("Parsed user:", parsed);
      setCurrentUser(parsed);
    } catch (e) {
      console.error("Error parsing user:", e);
      const testStudent: StoredUser = {
        _id: "student-test-001",
        name: "Test Student",
        role: "student",
      };
      localStorage.setItem("user", JSON.stringify(testStudent));
      setCurrentUser(testStudent);
    }
  }, []);

  // ─── Fetch active rooms on load and periodically ─────────────────────────────
  useEffect(() => {
    if (!currentUser?._id) return;

    const fetchActiveRooms = async () => {
      setIsFetchingRooms(true);
      try {
        const response = await fetch(`${API_URL}/video/rooms`);
        const data = await response.json();
        if (data.ok) {
          console.log("Active rooms:", data.rooms);
          setActiveSessions(data.rooms || []);
        } else {
          setActiveSessions([]);
        }
      } catch (err) {
        console.error("Error fetching rooms:", err);
        setActiveSessions([]);
      } finally {
        setIsFetchingRooms(false);
      }
    };

    fetchActiveRooms();
    const interval = setInterval(fetchActiveRooms, 3000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // ─── Socket.io for real-time updates ─────────────────────────────────────────
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
        role: "student",
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  // ─── Attach local video + remote participants after DOM mounts ────────────────
  useEffect(() => {
    if (!sessionJoined || !roomRef.current) return;

    const room = roomRef.current;

    // Attach local video track
    const localVideoTrack = room.localParticipant.videoTracks.values().next().value?.track;
    if (localVideoTrack && localVideoRef.current) {
      const el = localVideoTrack.attach();
      el.className = "w-full h-full object-cover rounded-2xl";
      localVideoRef.current.appendChild(el);
    }

    // Attach already-present remote participants
    room.participants.forEach((participant: any) => {
      attachRemoteParticipant(participant);
    });

    // Register future participant listener HERE so refs are guaranteed non-null
    room.on("participantConnected", attachRemoteParticipant);

    return () => {
      room.off("participantConnected", attachRemoteParticipant);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionJoined]);

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const getCurrentUser = (): StoredUser | null => {
    try {
      const rawUser = localStorage.getItem("user");
      if (!rawUser) return null;
      return JSON.parse(rawUser) as StoredUser;
    } catch {
      return null;
    }
  };

  const attachRemoteParticipant = (participant: any) => {
    setRemoteParticipants((prev) => [...prev, participant]);

    participant.tracks.forEach((publication: any) => {
      if (publication.isSubscribed && publication.track) {
        if (publication.kind === "video" && remoteVideoRef.current) {
          const el = publication.track.attach();
          el.className = "w-full h-full object-cover rounded-2xl";
          remoteVideoRef.current.appendChild(el);
        }
      }
    });

    participant.on("trackSubscribed", (track: any) => {
      if (track.kind === "video" && remoteVideoRef.current) {
        const el = track.attach();
        el.className = "w-full h-full object-cover rounded-2xl";
        remoteVideoRef.current.appendChild(el);
      }
    });

    participant.on("trackUnsubscribed", (track: any) => {
      track.detach().forEach((el: HTMLElement) => el.remove());
    });
  };

  const participantDisconnected = (participant: any) => {
    console.log("Participant disconnected:", participant.sid);
    setRemoteParticipants((prev) => prev.filter((p) => p.sid !== participant.sid));
  };

  // ─── Join Session ─────────────────────────────────────────────────────────────
  const joinSession = async (roomName: string) => {
    const user = getCurrentUser();
    if (!user?._id) {
      setError("User not loaded. Please log in again and try refreshing the page.");
      return;
    }

    setIsLoading(true);
    setSelectedRoom(roomName);
    setError("");

    try {
      console.log("Joining session:", roomName, "User:", user);

      const response = await fetch(`${API_URL}/video/generate-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: `student_${user._id}`,
          room: roomName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Token generation error:", errorData);
        throw new Error(`Backend error: ${response.status} ${response.statusText}. ${errorData.error || ""}`);
      }

      const tokenResponse = await response.json();
      console.log("Token response:", tokenResponse);

      if (!tokenResponse.ok || !tokenResponse.token) {
        throw new Error(tokenResponse.error || "Failed to get token");
      }

      const room = await TwilioVideo.connect(tokenResponse.token, {
        name: roomName,
        audio: true,
        video: { width: 640, height: 480 },
      });

      roomRef.current = room;

      // DOM-independent listeners — safe to set here:
      room.on("participantDisconnected", participantDisconnected);
      room.on("disconnected", () => {
        leaveSession();
      });
      // NOTE: room.on("participantConnected") is set in the useEffect below
      // AFTER setSessionJoined(true) mounts the video divs in the DOM.

      // sessionJoined = true triggers re-render which mounts video divs,
      // then the useEffect above attaches tracks to the real DOM nodes.
      setSessionJoined(true);
      console.log("Joined session successfully");
    } catch (err: any) {
      console.error("Error joining session:", err);
      let errorMessage = "Failed to join session";
      if (err.message?.includes("Failed to fetch")) {
        errorMessage = "❌ Cannot connect to backend. Make sure backend is running at http://localhost:8000";
      } else if (err.message?.includes("Backend error")) {
        errorMessage = `❌ ${err.message}`;
      } else {
        errorMessage = err.message || errorMessage;
      }
      setError(errorMessage);
      setSessionJoined(false);
      setSelectedRoom(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Leave Session ────────────────────────────────────────────────────────────
  const leaveSession = () => {
    if (roomRef.current) {
      roomRef.current.localParticipant.tracks.forEach((publication: any) => {
        publication.track?.stop();
        publication.track?.detach().forEach((el: HTMLElement) => el.remove());
      });
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.innerHTML = "";
    if (remoteVideoRef.current) remoteVideoRef.current.innerHTML = "";

    setSessionJoined(false);
    setSelectedRoom(null);
    setRemoteParticipants([]);
    setIsMuted(false);
    setIsCameraOff(false);
  };

  // ─── Controls ─────────────────────────────────────────────────────────────────
  const toggleMute = () => {
    if (roomRef.current) {
      roomRef.current.localParticipant.audioTracks.forEach((publication: any) => {
        if (isMuted) {
          publication.track?.enable();
        } else {
          publication.track?.disable();
        }
      });
    }
    setIsMuted((prev) => !prev);
  };

  const toggleCamera = () => {
    if (roomRef.current) {
      roomRef.current.localParticipant.videoTracks.forEach((publication: any) => {
        if (isCameraOff) {
          publication.track?.enable();
        } else {
          publication.track?.disable();
        }
      });
    }
    setIsCameraOff((prev) => !prev);
  };

  // ─── Save Notes ────────────────────────────────────────────────────────────────
  const saveNotes = async () => {
    if (!notes.trim() || !currentUser?._id) {
      return;
    }

    setIsSavingNotes(true);
    try {
      const response = await fetch(`${API_URL}/notes/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: currentUser._id,
          callId: selectedRoom,
          roomName: selectedRoom,
          title: `Class Notes - ${new Date().toLocaleDateString()}`,
          content: notes,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        console.error("Error saving notes:", data.error);
        alert("Failed to save notes: " + (data.error || "Unknown error"));
        return;
      }

      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
      console.log("Notes saved successfully:", data.notes);
    } catch (error) {
      console.error("Error saving notes:", error);
      alert("Failed to save notes: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsSavingNotes(false);
    }
  };

  // ─── Render: In-Session View ──────────────────────────────────────────────────
  if (sessionJoined) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="bg-background border-b border-border p-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-foreground">Live Class</h1>
            {selectedRoom && (
              <p className="text-sm text-muted-foreground font-mono">{selectedRoom}</p>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={leaveSession}
            className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold flex items-center gap-2 hover:bg-red-600 transition-all"
          >
            <PhoneOff className="w-4 h-4" />
            Leave
          </motion.button>
        </div>

        {/* Main Video Area */}
        <div className="max-w-6xl mx-auto p-6 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Remote Video (instructor) */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-2xl overflow-hidden bg-black shadow-2xl aspect-video"
              >
                <div ref={remoteVideoRef} className="w-full h-full" />
                {remoteParticipants.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Users className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-400">Waiting for instructor...</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Sidebar: Local Video, Controls, Notes */}
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
              {/* Local Video (self) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-2xl overflow-hidden bg-black shadow-xl aspect-square flex-shrink-0"
              >
                <div ref={localVideoRef} className="w-full h-full" />
                {isCameraOff && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <VideoOff className="w-8 h-8 text-gray-600" />
                  </div>
                )}
              </motion.div>

              {/* Controls */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex gap-3 flex-shrink-0"
              >
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleMute}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                    isMuted
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-muted hover:bg-accent text-foreground"
                  }`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {isMuted ? "Muted" : "Mute"}
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleCamera}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                    isCameraOff
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-muted hover:bg-accent text-foreground"
                  }`}
                >
                  {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                  {isCameraOff ? "Off" : "On"}
                </motion.button>
              </motion.div>

              {/* Legal Pad Notepad */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-yellow-100 rounded-lg shadow-lg p-0 border-2 border-yellow-200 flex-shrink-0 flex flex-col"
              >
                {/* Notepad header */}
                <div className="bg-yellow-200 px-4 py-2 border-b-2 border-yellow-300 rounded-t-md">
                  <p className="text-xs font-semibold text-yellow-900">Class Notes</p>
                </div>

                {/* Lined notepad area */}
                <div className="relative h-64 overflow-hidden flex-1">
                  {/* Background lines */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 27px, #3b82f6 27px, #3b82f6 28px)",
                      backgroundPosition: "0 20px",
                    }}
                  />
                  {/* Left margin line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-blue-500" />

                  {/* Textarea */}
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Write your notes here..."
                    className="relative w-full h-full bg-transparent resize-none border-none focus:outline-none focus:ring-0 p-4 pl-8 text-sm font-mono text-gray-800 placeholder-yellow-600"
                    style={{
                      backgroundImage: "repeating-linear-gradient(to bottom, transparent 0px, transparent 27px, #3b82f6 27px, #3b82f6 28px)",
                      backgroundPosition: "0 20px",
                      lineHeight: "28px",
                    }}
                  />
                </div>

                {/* Save button */}
                <div className="bg-yellow-50 px-4 py-3 border-t border-yellow-200 rounded-b-md">
                  <motion.button
                    whileHover={{ scale: noteSaved ? 1 : 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={saveNotes}
                    disabled={!notes.trim() || isSavingNotes}
                    className={`w-full px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all text-sm ${
                      noteSaved
                        ? "bg-green-500 text-white"
                        : "bg-yellow-400 hover:bg-yellow-500 text-yellow-900 disabled:opacity-50"
                    }`}
                  >
                    {isSavingNotes ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                          <Save className="w-4 h-4" />
                        </motion.div>
                        Saving...
                      </>
                    ) : noteSaved ? (
                      <>
                        <Check className="w-4 h-4" />
                        Notes Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Notes
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Session List View ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-background border-b border-border p-4 flex items-center justify-between sticky top-0 z-10"
      >
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          <h1 className="text-2xl font-bold text-foreground">Live Sessions</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setIsFetchingRooms(true);
            setTimeout(() => setIsFetchingRooms(false), 500);
          }}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          disabled={isFetchingRooms}
        >
          <motion.div
            animate={isFetchingRooms ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 0.5 }}
          >
            <RefreshCw className="w-5 h-5 text-foreground" />
          </motion.div>
        </motion.button>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/10 border-b border-red-500 p-6"
        >
          <div className="max-w-4xl mx-auto">
            <p className="text-red-600 text-sm font-semibold mb-3">⚠️ {error}</p>
            <details className="text-xs cursor-pointer">
              <summary className="font-semibold text-red-600 mb-2">💡 How to fix this:</summary>
              <div className="space-y-2 mt-2 ml-2 text-red-600/80">
                <p>1. Make sure backend is running:</p>
                <code className="bg-black/20 px-2 py-1 rounded block my-1">cd backend && npm run dev</code>
                <p>2. Verify Twilio credentials in <span className="font-mono">backend/.env</span></p>
                <p>3. Check browser console (F12) for more details</p>
              </div>
            </details>
          </div>
        </motion.div>
      )}

      {/* Sessions List */}
      <div className="max-w-4xl mx-auto p-6">
        {activeSessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <motion.div
                animate={{ scale: isFetchingRooms ? [1, 1.1, 1] : 1 }}
                transition={{ duration: 1, repeat: isFetchingRooms ? Infinity : 0 }}
              >
                <Users className="w-8 h-8 text-primary" />
              </motion.div>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {isFetchingRooms ? "Fetching Sessions..." : "No Active Sessions"}
            </h2>
            <p className="text-muted-foreground">
              {isFetchingRooms
                ? "Connecting to find available sessions..."
                : "Instructors will start live sessions here. Check back soon!"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4"
          >
            <div className="mb-2 text-sm text-muted-foreground">
              Found {activeSessions.length} active session{activeSessions.length !== 1 ? "s" : ""}
            </div>
            {activeSessions.map((session, index) => (
              <motion.div
                key={session.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-6 flex items-center justify-between hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => {
                  if (!isLoading) joinSession(session.name);
                }}
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-2">{session.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {session.participantCount} participant{session.participantCount !== 1 ? "s" : ""}
                    </span>
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-green-600 font-semibold">Live</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isLoading) joinSession(session.name);
                  }}
                  disabled={isLoading}
                  className="ml-4 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading && selectedRoom === session.name ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-4 h-4"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </motion.div>
                      Joining...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Join Now
                    </>
                  )}
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default StudentJoinSession;
