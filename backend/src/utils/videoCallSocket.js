import Call from "../models/call.model.js";

const connectedUsers = new Map(); // userId -> Set<socketId>

const userRoom = (userId) => `user:${userId}`;
const buildRoomName = (callerId) => `live_${callerId}_${Date.now()}`;
const normalizeUserId = (value) => String(value || "").trim();

const addConnectedSocket = (map, userId, socketId) => {
  if (!userId || !socketId) return;
  const existing = map.get(userId) || new Set();
  existing.add(socketId);
  map.set(userId, existing);
};

const removeConnectedSocket = (map, userId, socketId) => {
  if (!userId || !socketId) return;
  const existing = map.get(userId);
  if (!existing) return;
  existing.delete(socketId);
  if (existing.size === 0) {
    map.delete(userId);
  } else {
    map.set(userId, existing);
  }
};

const computeDurationSeconds = (startedAt, endedAt) => {
  if (!startedAt || !endedAt) return 0;
  return Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));
};

export const setupVideoCallSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("user:register", async ({ userId, name, role }) => {
      const normalizedUserId = normalizeUserId(userId);
      if (!normalizedUserId) return;

      socket.data.userId = normalizedUserId;
      socket.data.name = name;
      socket.data.role = role;

      addConnectedSocket(connectedUsers, normalizedUserId, socket.id);
      socket.join(userRoom(normalizedUserId));
      socket.emit("user:registered", { userId: normalizedUserId, socketId: socket.id });

      try {
        const pendingCall = await Call.findOne({
          calleeId: normalizedUserId,
          status: "ringing",
        })
          .sort({ createdAt: -1 })
          .lean();

        if (pendingCall) {
          socket.emit("call:incoming", {
            callId: String(pendingCall._id),
            callerId: pendingCall.callerId,
            callerName: pendingCall.callerName,
            callerRole: pendingCall.callerRole,
            calleeId: pendingCall.calleeId,
            calleeRole: pendingCall.calleeRole,
            roomName: pendingCall.roomName,
            status: pendingCall.status,
          });
        }
      } catch (error) {
        console.error("Error checking pending calls:", error);
      }
    });

    socket.on("call:initiate", async (payload = {}, ack) => {
      try {
        const {
          callerId,
          callerName,
          callerRole = "student",
          calleeId,
          calleeRole = "instructor",
          calleeName,
        } = payload;

        const normalizedCallerId = normalizeUserId(callerId);
        const normalizedCalleeId = normalizeUserId(calleeId);

        if (!normalizedCallerId || !normalizedCalleeId || !callerName?.trim()) {
          ack?.({ ok: false, error: "callerId, callerName and calleeId are required" });
          return;
        }

        const calleeRoom = io.sockets.adapter.rooms.get(userRoom(normalizedCalleeId));
        const calleeOnlineByRoom = !!calleeRoom && calleeRoom.size > 0;
        const calleeOnlineByMap = (connectedUsers.get(normalizedCalleeId)?.size || 0) > 0;
        const calleeOnline = calleeOnlineByRoom || calleeOnlineByMap;

        if (!calleeOnline) {
          ack?.({
            ok: false,
            error: "The selected user is offline or not on the live session page.",
          });
          return;
        }

        const roomName = buildRoomName(normalizedCallerId);
        const call = await Call.create({
          callerId: normalizedCallerId,
          callerName: callerName.trim(),
          callerRole,
          calleeId: normalizedCalleeId,
          calleeName,
          calleeRole,
          roomName,
          status: "ringing",
        });

        const eventPayload = {
          callId: String(call._id),
          callerId: call.callerId,
          callerName: call.callerName,
          callerRole: call.callerRole,
          calleeId: call.calleeId,
          calleeRole: call.calleeRole,
          roomName: call.roomName,
          status: call.status,
        };

        io.to(userRoom(normalizedCalleeId)).emit("call:incoming", eventPayload);
        io.to(userRoom(normalizedCallerId)).emit("call:ringing", eventPayload);
        ack?.({ ok: true, call: eventPayload });
      } catch (error) {
        console.error("Error initiating call:", error);
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on("call:accept", async ({ callId, userId } = {}, ack) => {
      try {
        if (!callId) {
          ack?.({ ok: false, error: "callId is required" });
          return;
        }

        const startedAt = new Date();
        const call = await Call.findByIdAndUpdate(
          callId,
          { status: "accepted", startedAt },
          { new: true }
        );

        if (!call) {
          ack?.({ ok: false, error: "Call not found" });
          return;
        }

        const payload = {
          callId: String(call._id),
          callerId: call.callerId,
          callerName: call.callerName,
          calleeId: call.calleeId,
          calleeRole: call.calleeRole,
          roomName: call.roomName,
          startedAt,
          status: call.status,
        };

        io.to(userRoom(call.callerId)).emit("call:accept", payload);
        io.to(userRoom(call.calleeId)).emit("call:accept", payload);
        ack?.({ ok: true, call: payload });
      } catch (error) {
        console.error("Error accepting call:", error);
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on("call:reject", async ({ callId, userId } = {}, ack) => {
      try {
        if (!callId) {
          ack?.({ ok: false, error: "callId is required" });
          return;
        }

        const endedAt = new Date();
        const call = await Call.findByIdAndUpdate(
          callId,
          { status: "rejected", endedAt },
          { new: true }
        );

        if (!call) {
          ack?.({ ok: false, error: "Call not found" });
          return;
        }

        const payload = {
          callId: String(call._id),
          callerId: call.callerId,
          calleeId: call.calleeId,
          rejectedBy: userId,
          status: call.status,
        };

        io.to(userRoom(call.callerId)).emit("call:reject", payload);
        io.to(userRoom(call.calleeId)).emit("call:reject", payload);
        ack?.({ ok: true, call: payload });
      } catch (error) {
        console.error("Error rejecting call:", error);
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on("call:end", async ({ callId, userId } = {}, ack) => {
      try {
        if (!callId) {
          ack?.({ ok: false, error: "callId is required" });
          return;
        }

        const call = await Call.findById(callId);
        if (!call) {
          ack?.({ ok: false, error: "Call not found" });
          return;
        }

        const endedAt = new Date();
        call.status = "ended";
        call.endedAt = endedAt;
        call.durationSeconds = computeDurationSeconds(call.startedAt, endedAt);
        await call.save();

        const payload = {
          callId: String(call._id),
          callerId: call.callerId,
          calleeId: call.calleeId,
          endedBy: userId,
          durationSeconds: call.durationSeconds,
          status: call.status,
        };

        io.to(userRoom(call.callerId)).emit("call:end", payload);
        io.to(userRoom(call.calleeId)).emit("call:end", payload);
        ack?.({ ok: true, call: payload });
      } catch (error) {
        console.error("Error ending call:", error);
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on("call:chat", async ({ callId, senderId, senderName, text } = {}, ack) => {
      try {
        if (!callId || !senderId || !text) {
          ack?.({ ok: false, error: "callId, senderId and text are required" });
          return;
        }

        const call = await Call.findById(callId).lean();
        if (!call) {
          ack?.({ ok: false, error: "Call not found" });
          return;
        }

        const message = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          callId: String(call._id),
          senderId: String(senderId),
          senderName: senderName || "Participant",
          text: String(text),
          createdAt: new Date().toISOString(),
        };

        io.to(userRoom(call.callerId)).emit("call:chat", message);
        io.to(userRoom(call.calleeId)).emit("call:chat", message);
        ack?.({ ok: true, message });
      } catch (error) {
        console.error("Error sending chat message:", error);
        ack?.({ ok: false, error: error.message });
      }
    });

    socket.on("disconnect", () => {
      const userId = normalizeUserId(socket.data?.userId);
      if (!userId) return;
      removeConnectedSocket(connectedUsers, userId, socket.id);
      console.log(`User disconnected: ${userId}`);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });
  });
};

export { connectedUsers };
