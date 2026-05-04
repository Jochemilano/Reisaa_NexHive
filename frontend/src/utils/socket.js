import { CONFIG } from "./config";
import { io } from "socket.io-client";

// Inicializamos el socket sin conectar automáticamente si no hay token
const socket = io(CONFIG.BASE_URL, {
  auth: {
    token: localStorage.getItem("token") || ""
  },
  autoConnect: !!localStorage.getItem("token"), // Solo conecta si ya hay token
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

socket.on("connect", () => {
  console.log("✅ Socket conectado:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("❌ Socket desconectado:", reason);
  if (reason === "io server disconnect") {
    // El servidor nos desconectó (posiblemente token expirado), intentar reconectar manualmente
    socket.connect();
  }
});

socket.on("connect_error", (err) => {
  console.log("⚠️ Socket error de conexión:", err.message);
  // Si el error es de autenticación, podríamos intentar refrescar el token aquí si tuviéramos lógica de refresh
});

// Función para forzar la reconexión con un nuevo token
const connectWithToken = (token) => {
  if (token) {
    socket.auth.token = token;
    if (socket.disconnected) {
      socket.connect();
    } else {
      // Si ya está conectado pero queremos asegurar el nuevo token
      socket.disconnect().connect();
    }
  }
};

// Función para unirse a una sala
const joinRoom = (roomId) => {
  if (socket.connected) {
    socket.emit("join-room", roomId);
  } else {
    // Si no está conectado, esperar a que conecte y unirse
    socket.once("connect", () => socket.emit("join-room", roomId));
  }
};

// Función para enviar mensaje
const sendMessage = (message) => {
  socket.emit("send-message", message);
};

const markRoomRead = (roomId) => {
  if (socket.connected) {
    socket.emit("mark-room-read", { roomId });
  } else {
    socket.once("connect", () => socket.emit("mark-room-read", { roomId }));
  }
};

export { socket, joinRoom, sendMessage, markRoomRead, connectWithToken };