// ============================================================
// CONFIGURACIÓN INICIAL
// ============================================================
require("dotenv").config();

const express   = require("express");
const cors      = require("cors");
const http      = require("http");
const path      = require("path");
const { Server } = require("socket.io");

// ============================================================
// IMPORTS INTERNOS
// ============================================================

// Middleware
const upload = require("./middleware/uploadConfig");

// Base de datos
const db = require("./db");

// Sockets
const setupSockets = require("./sockets");

// Controladores
const authController       = require("./controllers/auth");
const groupsController     = require("./controllers/groups");
const projectsController   = require("./controllers/projects");
const eventsController     = require("./controllers/events");
const roomsController      = require("./controllers/rooms");
const profileController    = require("./controllers/profile");
const activitiesController = require("./controllers/activities");
const favoritesController  = require("./controllers/favorites");
const preferencesController  = require("./controllers/preferences");
const friendsController      = require("./controllers/friends");

// ============================================================
// CORS — Orígenes permitidos
// Desarrollo : localhost + cualquier IP local (192.168.x.x / 10.x.x.x)
// Producción : variable ALLOWED_ORIGIN en .env
// ============================================================
const prodOrigin = process.env.ALLOWED_ORIGIN;

const allowedOrigins = [
  "http://localhost:3000",
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  ...(prodOrigin ? [prodOrigin] : []),
];

const corsHandler = (origin, callback) => {
  if (!origin) return callback(null, true); // Postman / mobile / server-to-server
  const allowed = allowedOrigins.some(o =>
    typeof o === "string" ? o === origin : o.test(origin)
  );
  allowed
    ? callback(null, true)
    : callback(new Error("CORS no permitido: " + origin));
};

// ============================================================
// APP EXPRESS
// ============================================================
const app = express();

app.use(cors({ 
  origin: corsHandler, 
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], 
  credentials: true 
}));
app.use(express.json());

// ============================================================
// RUTAS DE ARCHIVOS
// ============================================================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Archivo no recibido" });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ============================================================
// RUTAS DE LA API
// ============================================================
app.get("/", (req, res) => res.send("Servidor corriendo"));

app.use("/api", authController);
app.use("/api", groupsController);
app.use("/api", projectsController);
app.use("/api", eventsController);
app.use("/api", roomsController);
app.use("/api", profileController);
app.use("/api", activitiesController);
app.use("/api", favoritesController);
app.use("/api", preferencesController);
app.use("/api", friendsController);

// ============================================================
// SERVIDOR HTTP + SOCKET.IO
// ============================================================
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: corsHandler, methods: ["GET", "POST"] }
});

const connectedUsers = new Map();
setupSockets(io, connectedUsers);

// ============================================================
// ARRANQUE
// ============================================================
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";

server.listen(PORT, HOST, () =>
  console.log(`✅ Servidor corriendo en http://${HOST}:${PORT}`)
);