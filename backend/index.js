require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// Controllers
const authController = require("./controllers/auth");
const groupsController = require("./controllers/groups");
const projectsController = require("./controllers/projects");
const eventsController = require("./controllers/events");
const roomsController = require("./controllers/rooms");
const genericController = require("./controllers/generic");
const activitiesController = require("./controllers/activities");

// DB
const db = require("./db");

// Socket setup
const setupSockets = require("./sockets");

const app = express();
app.use(cors());
app.use(express.json());

// Endpoints básicos
app.get("/", (req, res) => res.send("Servidor corriendo"));

// ----------------------------------
// Controllers como rutas
// NOTA: Cada controller debe exportar un router interno como antes
app.use("/api", authController);
app.use("/api", groupsController);
app.use("/api", projectsController);
app.use("/api", eventsController);
app.use("/api", roomsController);
app.use("/api", genericController);
app.use("/api", activitiesController);

// ----------------------------------
// Servidor + Socket.io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
const connectedUsers = new Map();

// Llamar al socket handler
setupSockets(io, connectedUsers);

// ----------------------------------
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));