import { Conversation } from "../models/conversation.model.js";
import { User } from "../models/user.model.js";

const onlineUsers = new Map();

export default function handleConnection(socket, io) {
  const userId = socket.userId;

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  socket.join(`user_${userId}`);

  // Update lastSeen to now and mark online
  User.findByIdAndUpdate(userId, { lastSeen: new Date() }).exec();
  io.emit("userStatusUpdate", { userId, status: "online", lastSeen: new Date().toISOString() });

  socket.on("joinConversation", async (conversationId, callback) => {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return callback?.({ success: false, error: "Conversation not found" });
      }
      const isParticipant = conversation.participants.some(
        (p) => p.toString() === userId
      );
      if (!isParticipant) {
        return callback?.({ success: false, error: "Not a participant" });
      }
      socket.join(`conv_${conversationId}`);
      callback?.({ success: true });
    } catch (error) {
      console.error("[connectionHandler] joinConversation error:", error);
      callback?.({ success: false, error: "Internal server error" });
    }
  });

  socket.on("leaveConversation", (conversationId, callback) => {
    socket.leave(`conv_${conversationId}`);
    callback?.({ success: true });
  });

  socket.on("disconnect", () => {
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        const now = new Date();
        User.findByIdAndUpdate(userId, { lastSeen: now }).exec();
        io.emit("userStatusUpdate", {
          userId,
          status: "offline",
          lastSeen: now.toISOString(),
        });
      }
    }
  });
}

export function isUserOnline(userId) {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
}

export function getOnlineUsers() {
  return onlineUsers;
}
