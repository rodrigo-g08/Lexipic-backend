import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

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
