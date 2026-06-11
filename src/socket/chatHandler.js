import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";

export default function registerChatHandlers(socket, io) {
  //
  // Typing indicators (ephemeral, no DB)
  //
  socket.on("typing_start", ({ conversationId }) => {
    if (!conversationId || !socket.userId) return;
    socket.to(`conv_${conversationId}`).emit("user_typing", {
      conversationId,
      userId: socket.userId,
    });
  });

  socket.on("typing_end", ({ conversationId }) => {
    if (!conversationId || !socket.userId) return;
    socket.to(`conv_${conversationId}`).emit("user_stopped_typing", {
      conversationId,
      userId: socket.userId,
    });
  });

  //
  // Send message
  //
  socket.on("sendMessage", async (payload, callback) => {
    try {
      const senderId = socket.userId;
      if (!senderId) {
        return callback?.({ success: false, error: "Authentication required" });
      }

      const { conversationId, content, receiverId } = payload || {};
      if (!conversationId || !content || !receiverId) {
        return callback?.({
          success: false,
          error: "Missing required fields: conversationId, content, receiverId",
        });
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return callback?.({ success: false, error: "Conversation not found" });
      }

      const isParticipant = conversation.participants.some(
        (p) => p.toString() === senderId
      );
      if (!isParticipant) {
        return callback?.({
          success: false,
          error: "You are not a participant of this conversation",
        });
      }

      const message = await Message.create({
        conversationId,
        sender: senderId,
        content,
        status: "sent",
      });

      conversation.lastMessage = message._id;
      const receiverIdStr = receiverId.toString();
      const currentUnread = conversation.unreadCounts.get(receiverIdStr) || 0;
      conversation.unreadCounts.set(receiverIdStr, currentUnread + 1);
      await conversation.save();

      const populatedMessage = await Message.findById(message._id)
        .populate("sender", "name avatar lastSeen")
        .lean();

      // Broadcast to conversation room (includes sender)
      io.to(`conv_${conversationId}`).emit("receiveMessage", {
        message: populatedMessage,
      });

      // Notify receiver's personal room (for notifications on other pages)
      io.to(`user_${receiverId}`).emit("newNotification", {
        type: "new_message",
        conversationId,
        message: populatedMessage,
      });

      // Update status to delivered after broadcast
      message.status = "delivered";
      await message.save();

      // Acknowledge to sender with delivered status
      callback?.({
        success: true,
        data: { ...populatedMessage, status: "delivered" },
      });
    } catch (error) {
      console.error("[chatHandler] sendMessage error:", error);
      callback?.({ success: false, error: "Internal server error" });
    }
  });

  //
  // Mark messages as seen when user opens conversation
  //
  socket.on("markMessagesSeen", async ({ conversationId }, callback) => {
    try {
      if (!socket.userId || !conversationId) {
        return callback?.({ success: false, error: "Invalid payload" });
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return callback?.({ success: false, error: "Conversation not found" });
      }

      const isParticipant = conversation.participants.some(
        (p) => p.toString() === socket.userId
      );
      if (!isParticipant) {
        return callback?.({ success: false, error: "Not a participant" });
      }

      // Find messages from the OTHER participant that are not yet seen
      const otherParticipant = conversation.participants.find(
        (p) => p.toString() !== socket.userId
      );

      if (!otherParticipant) {
        return callback?.({ success: true, data: { updated: 0 } });
      }

      // Update all messages from the other participant that are not "seen"
      const result = await Message.updateMany(
        {
          conversationId,
          sender: otherParticipant._id,
          status: { $ne: "seen" },
        },
        { $set: { status: "seen" } }
      );

      // Reset unread count for this user
      conversation.unreadCounts.set(socket.userId.toString(), 0);
      await conversation.save();

      // Broadcast to conversation room so sender sees status update
      socket.to(`conv_${conversationId}`).emit("messagesSeen", {
        conversationId,
        seenBy: socket.userId,
        messageIds: [], // Client can refetch or we could return IDs
      });

      callback?.({ success: true, data: { updated: result.modifiedCount } });
    } catch (error) {
      console.error("[chatHandler] markMessagesSeen error:", error);
      callback?.({ success: false, error: "Internal server error" });
    }
  });
}
