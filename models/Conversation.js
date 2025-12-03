// models/Conversation.ts
import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ], // [userA, userB]
    lastMessageAt: Date,
  },
  { timestamps: true }
);

export const Conversation = mongoose.model("Conversation", conversationSchema);
