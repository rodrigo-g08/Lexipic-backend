import mongoose from "mongoose";

const PictogramSchema = new mongoose.Schema(
  {
    id: Number,
    imageUrl: String,
    searchText: String,
    keywords: [String],
    description: String,
  },
  { _id: false } // no hace falta _id para cada pictograma
);

const ChatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    text: {
      type: String,
      default: "",
    },
    pictograms: {
      type: [PictogramSchema],
      default: [],
    },
    language: {
      type: String,
      default: "es",
    },
    sessionId: {
      type: String,
      index: true, // más adelante servirá para agrupar mensajes por sesión
    },
  },
  {
    timestamps: true, // crea createdAt y updatedAt
  }
);

export const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema);
