// routes/conversations.js
import express from "express";
import jwt from "jsonwebtoken";
import { Conversation } from "../models/Conversation.js";
import { DirectMessage } from "../models/DirectMessage.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "LEXIPICAI123!";

// Middleware de auth SOLO para estas rutas (duplicamos lógica a propósito para evitar imports circulares)
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res.status(401).json({ ok: false, error: "No autorizado" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, error: "Token inválido" });
  }
}

// POST /api/conversations  -> crear o reutilizar conversación 1 a 1
router.post("/conversations", authMiddleware, async (req, res) => {
  try {
    const { otherUserId } = req.body || {};
    if (!otherUserId) {
      return res
        .status(400)
        .json({ ok: false, error: "Falta otherUserId en el body" });
    }

    let convo = await Conversation.findOne({
      participants: { $all: [req.userId, otherUserId], $size: 2 },
    });

    if (!convo) {
      convo = await Conversation.create({
        participants: [req.userId, otherUserId],
        lastMessageAt: new Date(),
      });
    }

    res.json({ ok: true, conversation: convo });
  } catch (err) {
    console.error("Error en POST /api/conversations:", err);
    res
      .status(500)
      .json({ ok: false, error: "Error creando/conectando conversación" });
  }
});

// GET /api/conversations  -> lista de conversaciones del usuario
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const convos = await Conversation.find({
      participants: req.userId,
    })
      .sort({ lastMessageAt: -1 })
      .populate("participants", "name email");

    res.json({ ok: true, conversations: convos });
  } catch (err) {
    console.error("Error en GET /api/conversations:", err);
    res
      .status(500)
      .json({ ok: false, error: "Error obteniendo conversaciones" });
  }
});

// GET /api/conversations/:id/messages  -> historial de mensajes
router.get("/conversations/:id/messages", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await DirectMessage.find({ conversationId: id })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ ok: true, messages });
  } catch (err) {
    console.error("Error en GET /api/conversations/:id/messages:", err);
    res
      .status(500)
      .json({ ok: false, error: "Error obteniendo mensajes" });
  }
});

// POST /api/conversations/:id/messages  -> enviar mensaje
router.post("/conversations/:id/messages", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, pictograms, language } = req.body || {};

    const message = await DirectMessage.create({
      conversationId: id,
      senderId: req.userId,
      text: text || "",
      pictograms: pictograms || [],
      language: language || "es",
    });

    await Conversation.findByIdAndUpdate(id, { lastMessageAt: new Date() });

    // Más adelante aquí conectaremos Socket.io (io.to(...).emit("dm:new", message))

    res.status(201).json({ ok: true, message });
  } catch (err) {
    console.error("Error en POST /api/conversations/:id/messages:", err);
    res.status(500).json({ ok: false, error: "Error guardando mensaje" });
  }
});

export default router;
