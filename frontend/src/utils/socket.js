import { CONFIG } from "./config";
import { io } from "socket.io-client";

/**
 * Cliente global de Socket.io.
 * Centraliza la comunicación en tiempo real y el manejo de sesiones de socket.
 */

// Inicializamos el socket sin conectar automáticamente.
// La conexión se gatilla manualmente en el SocketProvider tras validar el token.
const socket = io(CONFIG.BASE_URL, {
  auth: {
    token: localStorage.getItem("token") || ""
  },
  autoConnect: false,
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
  // Regla de negocio: Intentar reconectar si el servidor forzó el cierre (ej: reinicio de servicio)
  if (reason === "io server disconnect") {
    socket.connect();
  }
});

socket.on("connect_error", (err) => {
  console.log("⚠️ Socket error de conexión:", err.message);
  
  // NOTE: Expulsión automática si el servidor de sockets rechaza el token (expiración o invalidez)
  if (err.message === "jwt expired" || err.message === "Not authorized") {
    localStorage.clear();
    window.location.href = "/login";
  }
});

/**
 * Fuerza la reconexión utilizando un nuevo token de autenticación.
 */
const connectWithToken = (token) => {
  if (token) {
    socket.auth.token = token;
    if (socket.disconnected) {
      socket.connect();
    } else {
      // Reiniciar conexión para asegurar que el nuevo token sea procesado por el middleware del servidor
      socket.disconnect().connect();
    }
  }
};

/**
 * Notifica al servidor que el usuario se une a una sala de chat específica.
 */
const joinRoom = (roomId) => {
  if (socket.connected) {
    socket.emit("join-room", roomId);
  } else {
    // Si no hay conexión activa, encolar la acción para cuando se establezca
    socket.once("connect", () => socket.emit("join-room", roomId));
  }
};

/**
 * Envía un mensaje en tiempo real a través del socket.
 */
const sendMessage = (message) => {
  socket.emit("send-message", message);
};

/**
 * Notifica que todos los mensajes de una sala han sido leídos.
 */
const markRoomRead = (roomId) => {
  if (socket.connected) {
    socket.emit("mark-room-read", { roomId });
  } else {
    socket.once("connect", () => socket.emit("mark-room-read", { roomId }));
  }
};

export { socket, joinRoom, sendMessage, markRoomRead, connectWithToken };