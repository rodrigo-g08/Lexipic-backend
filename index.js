import "dotenv/config";
import mongoose from "mongoose";


import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI no está definida");
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch(err => console.error("❌ Error de conexión MongoDB:", err));


app.use(cors());
app.use(express.json());

const MAX_PICTOGRAMS = 6;

// Hace una búsqueda en ARASAAC y devuelve una lista normalizada
async function searchArasaac(language, query) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const url = `https://api.arasaac.org/api/pictograms/${language}/search/${encodeURIComponent(
    trimmed
  )}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn("ARASAAC error", res.status, "for query", trimmed);
    return [];
  }

  const data = await res.json();

  // Normalizamos a la forma que ya usas en el front
  return data.map((p) => {
    const id = p._id ?? p.id;
    return {
      id,
      searchText: trimmed,
      language,
      keywords: Array.isArray(p.keywords)
        ? p.keywords.map((k) => k.keyword)
        : [],
      // URL típica de ARASAAC (puedes ajustar tamaño si quieres)
      imageUrl: `https://static.arasaac.org/pictograms/${id}/${id}_500.png`,
    };
  });
}

// Quita pictos duplicados por id y corta a MAX_PICTOGRAMS
function dedupePictogramsBackend(list, max = MAX_PICTOGRAMS) {
  const seen = new Set();
  const result = [];

  for (const item of list) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
    if (result.length >= max) break;
  }

  return result;
}

app.post("/api/generate-pictograms", async (req, res) => {
  const { text, language = "es" } = req.body || {};

  if (!text || typeof text !== "string") {
    return res.status(400).json({ ok: false, error: "Missing text" });
  }

  const lang = typeof language === "string" ? language : "es";
  const prompt = text.trim();

  try {
    // 1) construimos queries: frase completa + palabras sueltas
    const tokens = prompt.split(/\s+/).filter(Boolean);

    const querySet = new Set();
    querySet.add(prompt); // frase completa

    // añadimos hasta 3 tokens “interesantes”
    tokens
      .filter((t) => t.length > 2)
      .slice(0, 3)
      .forEach((t) => querySet.add(t));

    const queries = Array.from(querySet);
    const aggregated = [];
    const successfulQueries = [];

    // 2) consultamos ARASAAC para cada query
    for (const q of queries) {
      const results = await searchArasaac(lang, q);
      if (results.length) {
        aggregated.push(...results);
        successfulQueries.push(q);
      }
    }

    if (!aggregated.length) {
      return res.json({
        ok: true,
        pictograms: [],
        usedQueries: queries,
        message: "No se encontraron pictogramas",
      });
    }

    // 3) dedupe + recorte
    const deduped = dedupePictogramsBackend(aggregated, MAX_PICTOGRAMS);

    return res.json({
      ok: true,
      pictograms: deduped,
      usedQueries: successfulQueries.length ? successfulQueries : queries,
    });
  } catch (error) {
    console.error("Error en /api/generate-pictograms:", error);
    return res.status(500).json({
      ok: false,
      error: "Error interno generando pictogramas",
    });
  }
});


// Endpoint de prueba
app.get("/", (req, res) => {
  res.send("Lexipic backend OK");
});

// Servidor HTTP + WebSockets
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  // Por ahora solo reenvía el mensaje a todos
  socket.on("send_message", (data) => {
    console.log("Mensaje recibido:", data);
    io.emit("new_message", data);
  });

  socket.on("disconnect", () => {
    console.log("Usuario desconectado");
  });
});

// Azure pone el puerto en process.env.PORT
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log("Servidor Lexipic escuchando en el puerto", port);
});

app.post("/api/echo", (req, res) => {
  const { message, language } = req.body || {};
  res.json({
    ok: true,
    received: { message, language },
    info: "Echo desde Lexipic backend 🚀",
  });
});

