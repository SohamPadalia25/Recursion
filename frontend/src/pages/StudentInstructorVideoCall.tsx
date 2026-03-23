import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  MessageSquare,
  FileText,
  Mic,
  MicOff,
  PhoneOff,
  SendHorizontal,
  Video,
  VideoOff,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import * as TwilioVideo from "twilio-video";
import { useAuth } from "@/auth/AuthContext";
import { API_V1_BASE_URL } from "@/lib/api-client";
import { getUserDirectory } from "@/lib/user-api";
import { LiveMap } from "@liveblocks/client";
import Whiteboard from "@/components/Whiteboard";
import { RoomProvider } from "../liveblocks.config";

const SOCKET_URL = import.meta.env.VITE_SOCKET_BASE_URL || "http://localhost:8000";
const API_URL = API_V1_BASE_URL;

type StoredUser = {
  _id: string;
  name: string;
  role?: string;
};

type UserOption = {
  _id: string;
  name: string;
  role?: string;
};

type CallPayload = {
  callId: string;
  callerId: string;
  callerName?: string;
  callerRole?: string;
  calleeId: string;
  calleeRole?: string;
  roomName: string;
  status?: string;
};

type ChatMessage = {
  id: string;
  callId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
};

const StudentInstructorVideoCall = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [counterpartId, setCounterpartId] = useState("");
  const [counterpartName, setCounterpartName] = useState("");
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [callStatus, setCallStatus] = useState<
    "idle" | "ringing" | "incoming" | "connecting" | "connected"
  >("idle");
  const [statusMessage, setStatusMessage] = useState("Ready for live session");
  const [error, setError] = useState("");

  const [incomingCall, setIncomingCall] = useState<CallPayload | null>(null);
  const [activeCall, setActiveCall] = useState<CallPayload | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notes, setNotes] = useState("");

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [remoteParticipantName, setRemoteParticipantName] = useState("Waiting for participant");
  const [copied, setCopied] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const roomRef = useRef<TwilioVideo.Room | null>(null);
  const localVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoRef = useRef<HTMLDivElement | null>(null);

  const isInstructor = currentUser?.role === "instructor";
  const counterpartyRole = isInstructor ? "student" : "instructor";

  const clearMediaContainer = (container: HTMLDivElement | null) => {
    if (!container) return;
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  };

  const attachTrack = (track: any, container: HTMLDivElement | null) => {
    if (!track || !container) return;
    const element = track.attach();
    if (track.kind === "video") {
      element.className = "w-full h-full object-cover rounded-2xl";
    }
    container.appendChild(element);
  };

  const detachTrack = (track: any) => {
    if (!track) return;
    track.detach()?.forEach((element: Element) => element.remove());
  };

  const cleanupRoom = () => {
    if (roomRef.current) {
      roomRef.current.localParticipant.tracks.forEach((publication: any) => {
        publication.track?.stop?.();
        detachTrack(publication.track);
      });
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    clearMediaContainer(localVideoRef.current);
    clearMediaContainer(remoteVideoRef.current);
    setRemoteParticipantName("Waiting for participant");
    setIsMuted(false);
    setIsCameraOff(false);
  };

  const participantConnected = (participant: any) => {
    setRemoteParticipantName(participant.identity || "Participant");
    clearMediaContainer(remoteVideoRef.current);

    // Attach tracks that are already subscribed (isSubscribed = true)
    // and listen for tracks that subscribe in the future
    participant.tracks.forEach((publication: any) => {
      if (publication.track) {
        attachTrack(publication.track, remoteVideoRef.current);
      }
    });

    participant.on("trackSubscribed", (track: any) => {
      attachTrack(track, remoteVideoRef.current);
    });

    participant.on("trackPublished", (publication: any) => {
      if (publication.track) {
        attachTrack(publication.track, remoteVideoRef.current);
      }

      publication.on?.("subscribed", (track: any) => {
        attachTrack(track, remoteVideoRef.current);
      });
    });

    participant.on("trackUnsubscribed", (track: any) => {
      detachTrack(track);
    });
  };


  const participantDisconnected = () => {
    clearMediaContainer(remoteVideoRef.current);
    setRemoteParticipantName("Waiting for participant");
  };

  const joinTwilioRoom = async (roomName: string, callId: string) => {
    if (!currentUser) return;

    try {
      setCallStatus("connecting");
      setStatusMessage("Connecting to video room...");

      const response = await fetch(`${API_URL}/video/generate-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: `${currentUser.role || "user"}_${currentUser._id}`,
          room: roomName,
        }),
      });

      const tokenPayload = await response.json();
      if (!response.ok || !tokenPayload.ok || !tokenPayload.token) {
        throw new Error(tokenPayload.error || "Failed to generate Twilio token");
      }

      cleanupRoom();

      let room;
      try {
        room = await TwilioVideo.connect(tokenPayload.token, {
          name: roomName,
          audio: true,
          video: { width: 640, height: 480 },
        });
      } catch (videoError: any) {
        if (videoError?.message?.toLowerCase().includes("video source")) {
          room = await TwilioVideo.connect(tokenPayload.token, {
            name: roomName,
            audio: true,
            video: false,
          });
          setStatusMessage("Connected without camera. Enable camera permissions to use video.");
        } else {
          throw videoError;
        }
      }

      roomRef.current = room;

      // NOTE: Do NOT attach tracks or register participantConnected here.
      // The video <div> containers are not yet in the DOM (they render on callStatus === "connecting").
      // All track attachment + participantConnected listener are set up in the useEffect
      // below, which fires AFTER React commits the DOM on callStatus === "connected".

      // These listeners are DOM-independent, so they're safe to set here:
      room.on("participantDisconnected", participantDisconnected);
      room.on("disconnected", () => {
        cleanupRoom();
        setActiveCall(null);
        setCallStatus("idle");
        setStatusMessage("Session ended");
      });

      setActiveCall((prev) => ({
        ...(prev || {}),
        callId,
        roomName,
        callerId: prev?.callerId || currentUser._id,
        calleeId: prev?.calleeId || counterpartId,
      }));

      setCallStatus("connected");
      setStatusMessage(`Connected to ${remoteParticipantName || counterpartyRole}`);
    } catch (joinError: any) {
      console.error("Error joining Twilio room:", joinError);
      setError(joinError.message || "Unable to join video room");
      setCallStatus("idle");
      cleanupRoom();
    }
  };

  useEffect(() => {
    if (!authUser?._id) {
      setError("Please log in before starting a live session.");
      return;
    }

    setCurrentUser({
      _id: authUser._id,
      name: authUser.name,
      role: authUser.role,
    });
    setError("");
  }, [authUser]);

  useEffect(() => {
    if (!currentUser?._id) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("user:register", {
        userId: currentUser._id,
        name: currentUser.name,
        role: currentUser.role,
      });
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      cleanupRoom();
    });

    socket.on("call:incoming", (payload: CallPayload) => {
      setIncomingCall(payload);
      setCallStatus("incoming");
      setStatusMessage(`${payload.callerName || "A participant"} is calling...`);
    });

    socket.on("call:ringing", (payload: CallPayload) => {
      setActiveCall(payload);
      setCallStatus("ringing");
      setStatusMessage("Ringing the other participant...");
    });

    socket.on("call:accept", (payload: CallPayload) => {
      setIncomingCall(null);
      setActiveCall(payload);
      joinTwilioRoom(payload.roomName, payload.callId);
    });

    socket.on("call:reject", () => {
      cleanupRoom();
      setIncomingCall(null);
      setActiveCall(null);
      setCallStatus("idle");
      setStatusMessage("Call was rejected");
    });

    socket.on("call:end", () => {
      cleanupRoom();
      setIncomingCall(null);
      setActiveCall(null);
      setCallStatus("idle");
      setStatusMessage("Session ended");
    });

    socket.on("call:chat", (message: ChatMessage) => {
      setChatMessages((prev) => {
        if (prev.some((existing) => existing.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser?._id]);

  useEffect(() => {
    if (!currentUser?._id) return;

    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        if (!authUser?.accessToken) {
          setAvailableUsers([]);
          return;
        }

        const fetched = await getUserDirectory(authUser.accessToken, {
          role: counterpartyRole,
          limit: 100,
        });

        const filtered = fetched
          .map((user) => ({
            _id: user._id,
            name: user.fullname || user.username,
            role: user.role,
          }))
          .filter((user) => user.role === counterpartyRole && user._id !== currentUser._id);

        setAvailableUsers(filtered);
      } catch (loadError) {
        console.error("Failed to load user directory", loadError);
        setAvailableUsers([]);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [authUser?.accessToken, currentUser?._id, counterpartyRole]);

  // ─── Attach media tracks after the video containers are mounted in the DOM ───
  // This useEffect fires after React commits the render triggered by
  // setCallStatus("connected"), ensuring localVideoRef and remoteVideoRef are non-null.
  useEffect(() => {
    if (callStatus !== "connected" || !roomRef.current) return;

    const room = roomRef.current;

    // ── Local tracks ────────────────────────────────────────────────────────
    room.localParticipant.tracks.forEach((publication: any) => {
      if (publication.track) {
        attachTrack(publication.track, localVideoRef.current);
      }
    });

    // ── Remote participants already in the room ──────────────────────────────
    // (handles the case where the other person joined before us)
    room.participants.forEach((participant: any) => {
      participantConnected(participant);
    });

    // ── Future remote participants ───────────────────────────────────────────
    // Registered HERE (not in joinTwilioRoom) so the DOM refs are guaranteed
    // to be non-null when a participant connects and their tracks subscribe.
    room.on("participantConnected", participantConnected);

    return () => {
      room.off("participantConnected", participantConnected);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callStatus]);

  const initiateCall = () => {
    if (!socketRef.current || !currentUser?._id) {
      setError("Socket connection not ready. Refresh and try again.");
      return;
    }

    if (!counterpartId.trim()) {
      setError(`Enter a valid ${counterpartyRole} user ID`);
      return;
    }

    setError("");

    socketRef.current.emit(
      "call:initiate",
      {
        callerId: currentUser._id,
        callerName: currentUser.name,
        callerRole: currentUser.role,
        calleeId: counterpartId.trim(),
        calleeRole: counterpartyRole,
        calleeName: counterpartName,
      },
      (response: { ok: boolean; error?: string; call?: CallPayload }) => {
        if (!response?.ok || !response.call) {
          setError(response?.error || "Failed to initiate call");
          return;
        }
        setActiveCall(response.call);
        setCallStatus("ringing");
        setStatusMessage("Calling...");
      }
    );
  };

  const acceptCall = () => {
    if (!incomingCall || !socketRef.current || !currentUser?._id) return;

    socketRef.current.emit(
      "call:accept",
      { callId: incomingCall.callId, userId: currentUser._id },
      (response: { ok: boolean; error?: string }) => {
        if (!response?.ok) {
          setError(response?.error || "Failed to accept call");
        }
      }
    );
  };

  const rejectCall = () => {
    if (!incomingCall || !socketRef.current || !currentUser?._id) return;

    socketRef.current.emit(
      "call:reject",
      { callId: incomingCall.callId, userId: currentUser._id },
      () => {
        setIncomingCall(null);
        setCallStatus("idle");
        setStatusMessage("Call rejected");
      }
    );
  };

  const endCall = () => {
    if (activeCall?.callId && socketRef.current && currentUser?._id) {
      socketRef.current.emit("call:end", {
        callId: activeCall.callId,
        userId: currentUser._id,
      });
    }
    cleanupRoom();
    setIncomingCall(null);
    setActiveCall(null);
    setCallStatus("idle");
    setStatusMessage("Session ended");
    setChatMessages([]);
  };

  const toggleMute = () => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.audioTracks.forEach((publication: any) => {
      if (isMuted) {
        publication.track?.enable();
      } else {
        publication.track?.disable();
      }
    });
    setIsMuted((prev) => !prev);
  };

  const toggleCamera = () => {
    if (!roomRef.current) return;
    roomRef.current.localParticipant.videoTracks.forEach((publication: any) => {
      if (isCameraOff) {
        publication.track?.enable();
      } else {
        publication.track?.disable();
      }
    });
    setIsCameraOff((prev) => !prev);
  };

  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text || !activeCall?.callId || !socketRef.current || !currentUser?._id) {
      return;
    }

    socketRef.current.emit(
      "call:chat",
      {
        callId: activeCall.callId,
        senderId: currentUser._id,
        senderName: currentUser.name,
        text,
      },
      (response: { ok: boolean; message?: ChatMessage; error?: string }) => {
        if (!response?.ok || !response.message) {
          setError(response?.error || "Unable to send chat message");
          return;
        }
        setChatMessages((prev) => [...prev, response.message as ChatMessage]);
        setChatInput("");
      }
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentUser?._id || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCallActive = callStatus === "connected";
  const participantLabel = incomingCall?.callerName || counterpartName || `Assigned ${counterpartyRole}`;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-display font-bold text-xl">Live Session</h2>
              <p className="text-sm text-muted-foreground">
                {statusMessage} {socketConnected ? "· Connected" : "· Offline"}
              </p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{currentUser?.name}</span>
          </div>
        </motion.div>

        {error && (
          <div className="glass-card p-4 border-l-4 border-red-400 bg-red-50/50 text-red-700 text-sm">{error}</div>
        )}

        {currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-3 text-xs flex items-center justify-between"
          >
            <div className="text-muted-foreground">
              Your ID: <span className="font-mono text-foreground font-medium">{currentUser._id}</span>
            </div>
            <button onClick={copyToClipboard} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Copy ID">
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </motion.div>
        )}

        {callStatus === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 text-center space-y-5"
          >
            <Video className="w-10 h-10 text-primary mx-auto" />
            <div>
              <h3 className="font-display font-bold text-xl mb-2">Start a Live Session</h3>
              <p className="text-sm text-muted-foreground">Connect with a {counterpartyRole} for real-time collaboration.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              <div>
                <label className="text-sm font-medium mb-1.5 block capitalize">{counterpartyRole} User ID</label>
                <input
                  value={counterpartId}
                  onChange={(event) => setCounterpartId(event.target.value)}
                  placeholder={`Enter ${counterpartyRole} ID`}
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block capitalize">{counterpartyRole} Name</label>
                <input
                  value={counterpartName}
                  onChange={(event) => setCounterpartName(event.target.value)}
                  placeholder={`${counterpartyRole} name (optional)`}
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium mb-1.5 block capitalize">Select {counterpartyRole}</label>
                <select
                  value={counterpartId}
                  onChange={(event) => {
                    const selected = availableUsers.find((user) => user._id === event.target.value);
                    setCounterpartId(event.target.value);
                    if (selected) {
                      setCounterpartName(selected.name);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                >
                  <option value="">{loadingUsers ? "Loading users..." : `Select ${counterpartyRole}`}</option>
                  {availableUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} • {user._id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={initiateCall}
              disabled={!counterpartId.trim()}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-60 hover:shadow-lg transition-shadow"
            >
              <Video className="w-4 h-4" /> Start Live Session
            </motion.button>
          </motion.div>
        )}

        {incomingCall && callStatus === "incoming" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h3 className="font-display semi-bold text-lg">Incoming Session</h3>
              <p className="text-sm text-muted-foreground">
                {incomingCall.callerName || "A participant"} is calling...
              </p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={rejectCall}
                className="px-6 py-2 rounded-xl bg-muted text-sm font-medium hover:bg-accent transition-colors"
              >
                Decline
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={acceptCall}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-medium hover:shadow-lg transition-shadow"
              >
                Accept
              </motion.button>
            </div>
          </motion.div>
        )}

        {(callStatus === "connecting" || callStatus === "connected") && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card aspect-video grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 p-4 bg-foreground/5 overflow-hidden rounded-2xl"
              >
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 min-h-[320px] flex items-center justify-center">
                  <div ref={remoteVideoRef} className="w-full h-full" />
                  {!remoteVideoRef.current?.children.length && (
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
                        {participantLabel.slice(0, 2).toUpperCase()}
                      </div>
                      <p className="font-medium text-foreground">{participantLabel}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {callStatus === "connecting" ? "Connecting..." : remoteParticipantName}
                      </p>
                    </div>
                  )}
                </div>

                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 min-h-[220px] flex items-center justify-center">
                  <div ref={localVideoRef} className="w-full h-full" />
                  {!localVideoRef.current?.children.length && (
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-foreground text-lg font-bold mx-auto mb-2">
                        YOU
                      </div>
                      <p className="text-xs text-muted-foreground">Local preview</p>
                    </div>
                  )}
                </div>
              </motion.div>

              <div className="flex items-center justify-center gap-4">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={toggleMute}
                  className={`p-4 rounded-full transition-colors ${
                    isMuted ? "bg-red-500 text-white" : "bg-muted text-foreground hover:bg-accent"
                  }`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={toggleCamera}
                  className={`p-4 rounded-full transition-colors ${
                    isCameraOff ? "bg-red-500 text-white" : "bg-muted text-foreground hover:bg-accent"
                  }`}
                >
                  {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={endCall}
                  className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  <PhoneOff className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            <div className="space-y-4 lg:max-h-[calc(100vh-300px)] lg:overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass-card p-4 flex-shrink-0"
              >
                <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> Live Chat
                </h3>
                <div className="space-y-2 mb-3 max-h-32 overflow-y-auto scrollbar-hide text-xs">
                  {!isCallActive && (
                    <div className="p-3 rounded-lg bg-muted text-muted-foreground">Chat will activate once the session connects.</div>
                  )}
                  {isCallActive && chatMessages.length === 0 && (
                    <div className="p-3 rounded-lg bg-muted text-muted-foreground">No messages yet.</div>
                  )}
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        message.senderId === currentUser?._id ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <p className="font-medium text-foreground text-xs">{message.senderName}</p>
                      <p className="text-muted-foreground text-xs mt-1">{message.text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && sendChatMessage()}
                    placeholder="Type a message"
                    className="flex-1 px-3 py-2 rounded-lg bg-muted text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                    disabled={!isCallActive}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!isCallActive || !chatInput.trim()}
                    className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-medium disabled:opacity-70"
                  >
                    <SendHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-4 flex-shrink-0"
              >
                <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Session Notes
                </h3>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Jot down important points during the call.
                </p>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={isCallActive ? "Write your notes here..." : "Notes will be available once the session is connected."}
                  disabled={!isCallActive}
                  className="w-full min-h-[120px] resize-y rounded-lg bg-muted px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-70"
                />
              </motion.div>
            </div>
          </div>
        )}

        {/* Full-Width Whiteboard Section - ALWAYS SHOW DURING CALL */}
        {isCallActive && activeCall?.roomName ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 w-full"
          >
            <h2 className="text-lg font-bold text-foreground mb-4">📝 Interactive Whiteboard</h2>
            <div className="rounded-xl overflow-hidden shadow-lg border-2 border-border bg-background w-full" style={{ height: "500px" }}>
              <RoomProvider
                id={activeCall.roomName}
                initialPresence={{ selectedShape: null }}
                initialStorage={{ shapes: new LiveMap() }}
              >
                <Whiteboard />
              </RoomProvider>
            </div>
          </motion.div>
        ) : (
          (callStatus === "connecting" || callStatus === "connected") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 w-full"
            >
              <h2 className="text-lg font-bold text-foreground mb-4">📝 Interactive Whiteboard</h2>
              <div className="rounded-xl overflow-hidden shadow-lg border-2 border-border bg-muted/50 w-full flex items-center justify-center" style={{ height: "500px" }}>
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">Loading whiteboard...</p>
                  <p className="text-xs mt-2">
                    {!activeCall?.roomName ? "Waiting for room..." : "Initializing..."}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        )}
      </div>
    </div>
  );
};

export default StudentInstructorVideoCall;