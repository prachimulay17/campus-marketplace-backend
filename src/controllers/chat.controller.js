import { Conversation } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { Item } from "../models/item.model.js";
import { getIO } from "../socket/index.js";

const UNSEND_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// Initialize a conversation or fetch if it already exists
export const createConversation = async (req, res) => {
  const { itemId, sellerId, initialMessage } = req.body;
  const buyerId = req.user._id;

  if (buyerId.toString() === sellerId) {
    return res.status(400).json({ success: false, message: "You cannot start a conversation with yourself" });
  }

  // Verify item exists
  const item = await Item.findById(itemId);
  if (!item) return res.status(404).json({ success: false, message: "Item not found" });

  // Prevent duplicate conversations between same buyer, seller, and item
  let conversation = await Conversation.findOne({
    participants: { $all: [buyerId, sellerId] },
    item: itemId
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [buyerId, sellerId],
      item: itemId,
      unreadCounts: {
        [buyerId.toString()]: 0,
        [sellerId.toString()]: 0
      }
    });
  }

  // Process initial message if provided
  if (initialMessage) {
    const message = await Message.create({
      conversationId: conversation._id,
      sender: buyerId,
      content: initialMessage
    });

    conversation.lastMessage = message._id;
    const currentUnread = conversation.unreadCounts.get(sellerId.toString()) || 0;
    conversation.unreadCounts.set(sellerId.toString(), currentUnread + 1);
    await conversation.save();
  }

  return res.status(201).json({ success: true, data: conversation });
};

// Get user's inbox — excludes hidden conversations
export const getConversations = async (req, res) => {
  const userId = req.user._id;

  const conversations = await Conversation.find({
    participants: userId,
    hiddenFor: { $ne: userId },
  })
    .populate("participants", "name avatar lastSeen")
    .populate("item", "title images price")
    .populate({
      path: "lastMessage",
      populate: { path: "sender", select: "name avatar" },
    })
    .sort({ updatedAt: -1 })
    .lean();

  return res.status(200).json({ success: true, data: conversations });
};

// Mark conversation as read (reset unread count)
export const markConversationRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({ _id: id, participants: userId });
  if (!conversation) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  conversation.unreadCounts.set(userId.toString(), 0);
  await conversation.save();

  return res.status(200).json({ success: true, data: conversation });
};

// Get paginated messages for a conversation
export const getMessages = async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const userId = req.user._id;

  // Authorization check
  const conversation = await Conversation.findOne({ _id: id, participants: userId });
  if (!conversation) {
    return res.status(403).json({ success: false, message: "Not authorized to view this conversation" });
  }

  const messages = await Message.find({ conversationId: id })
    .populate("sender", "name avatar lastSeen")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const totalMessages = await Message.countDocuments({ conversationId: id });
  const totalPages = Math.ceil(totalMessages / Number(limit));

  return res.status(200).json({
    success: true,
    data: {
      messages,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems: totalMessages
      }
    }
  });
};

// Delete message — "delete for me" or "unsend for everyone"
export const deleteMessage = async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;
  const userId = req.user._id;

  if (!type || !["forMe", "forEveryone"].includes(type)) {
    return res.status(400).json({ success: false, message: "type must be 'forMe' or 'forEveryone'" });
  }

  const message = await Message.findById(id);
  if (!message) {
    return res.status(404).json({ success: false, message: "Message not found" });
  }

  // Authorization: must be a participant
  const conversation = await Conversation.findById(message.conversationId);
  if (!conversation) {
    return res.status(404).json({ success: false, message: "Conversation not found" });
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId.toString()
  );
  if (!isParticipant) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  if (type === "forEveryone") {
    // Only sender can unsend
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Only the sender can unsend a message" });
    }

    // Must be within 15-minute window
    const elapsed = Date.now() - new Date(message.createdAt).getTime();
    if (elapsed > UNSEND_WINDOW_MS) {
      return res.status(400).json({ success: false, message: "Cannot unsend after 15 minutes" });
    }

    // Already unsent
    if (message.deletedForAll) {
      return res.status(400).json({ success: false, message: "Message already unsent" });
    }

    message.deletedForAll = true;
    message.content = "This message was deleted";
    await message.save();

    // Broadcast to conversation room
    try {
      const io = getIO();
      io.to(`conv_${message.conversationId}`).emit("messageDeleted", {
        messageId: message._id,
        conversationId: message.conversationId.toString(),
        type: "forEveryone",
        content: "This message was deleted",
      });
    } catch (_) {
      // Socket not initialized — skip broadcast
    }

    return res.status(200).json({ success: true, data: message });
  }

  // "delete for me"
  const alreadyDeleted = message.deletedBy.some(
    (id) => id.toString() === userId.toString()
  );
  if (alreadyDeleted) {
    return res.status(400).json({ success: false, message: "Message already deleted" });
  }

  message.deletedBy.push(userId);
  await message.save();

  // Notify only the requesting user's client(s) to remove the message
  try {
    const io = getIO();
    io.to(`user_${userId}`).emit("messageDeleted", {
      messageId: message._id,
      conversationId: message.conversationId.toString(),
      type: "forMe",
    });
  } catch (_) {
    // Socket not initialized — skip broadcast
  }

  return res.status(200).json({ success: true, data: message });
};

// Hide (delete for me) a conversation — does NOT delete the MongoDB document
export const hideConversation = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({ _id: id, participants: userId });
  if (!conversation) {
    return res.status(404).json({ success: false, message: "Conversation not found" });
  }

  const alreadyHidden = conversation.hiddenFor.some(
    (h) => h.toString() === userId.toString()
  );
  if (alreadyHidden) {
    return res.status(400).json({ success: false, message: "Conversation already hidden" });
  }

  conversation.hiddenFor.push(userId);
  await conversation.save();

  return res.status(200).json({ success: true, data: conversation });
};

// Unhide a conversation for the current user
export const unhideConversation = async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const conversation = await Conversation.findOne({ _id: id });
  if (!conversation) {
    return res.status(404).json({ success: false, message: "Conversation not found" });
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userId.toString()
  );
  if (!isParticipant) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  conversation.hiddenFor = conversation.hiddenFor.filter(
    (h) => h.toString() !== userId.toString()
  );
  await conversation.save();

  return res.status(200).json({ success: true, data: conversation });
};
