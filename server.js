// server.js
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- Base de datos SQLite ---
const db = new sqlite3.Database("./chat.db", (err) => {
  if (err) console.error("X Error abriendo la base de datos:", err);
  else console.log(">>>>>>>>>>>>>>>>>>>>> Base de datos SQLite conectada");
});

// Crear tabla si no existe
db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    avatar TEXT,
    color TEXT,
    text TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// --- Lista de clientes SSE ---
let clients = [];

// --- Ruta SSE ---
app.get("/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Enviar historial inicial
  db.all("SELECT * FROM messages ORDER BY id ASC", [], (err, rows) => {
    if (!err && rows) {
      res.write(`data: ${JSON.stringify({ type: "history", data: rows })}\n\n`);
    }
  });

  // Mantener conexión viva
  clients.push(res);
  console.log(`🟢 Cliente conectado. Total: ${clients.length}`);

  req.on("close", () => {
    clients = clients.filter((c) => c !== res);
    console.log(`🔴 Cliente desconectado. Total: ${clients.length}`);
  });
});

// --- Ruta para enviar mensaje ---
app.post("/send", (req, res) => {
  const { username, avatar, color, text } = req.body;

  if (!username || !text) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  const stmt = db.prepare(`
    INSERT INTO messages (username, avatar, color, text)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(username, avatar, color, text, function (err) {
    if (err) {
      console.error(" Error guardando mensaje:", err);
      return res.status(500).json({ error: "Error al guardar el mensaje" });
    }

    const newMessage = {
      id: this.lastID,
      username,
      avatar,
      color,
      text,
      timestamp: new Date().toISOString(),
    };

    // Enviar el mensaje nuevo a todos los clientes conectados
    clients.forEach((client) =>
      client.write(`data: ${JSON.stringify({ type: "new_message", data: newMessage })}\n\n`)
    );

    res.json({ success: true });
  });

  stmt.finalize();
});

// --- Iniciar servidor ---
app.listen(PORT, () =>
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`)
);