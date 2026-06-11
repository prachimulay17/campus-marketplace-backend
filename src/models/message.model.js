import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    deletedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    deletedForAll: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for efficiently paginating messages within a specific conversation
messageSchema.index({ conversationId: 1, createdAt: -1 });
// Index for efficiently querying unread messages for status updates
messageSchema.index({ conversationId: 1, sender: 1, status: 1 });
// Index for delete-for-me filtering
messageSchema.index({ conversationId: 1, deletedBy: 1 });

export const Message = mongoose.model("Message", messageSchema);
