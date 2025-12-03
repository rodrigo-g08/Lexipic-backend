// models/DirectMessage.ts
import mongoose from "mongoose";

const directMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    pictograms: { type: Array, default: [] }, // igual que en ChatMessage
    language: { type: String, default: "es" },
  },
  { timestamps: true }
);

export const DirectMessage = mongoose.model("DirectMessage", directMessageSchema);
