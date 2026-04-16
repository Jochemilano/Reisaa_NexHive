import { CONFIG } from "./config";
import { io } from "socket.io-client";

// Conectamos socket con token de localStorage
const socket = io(CONFIG.BASE_URL, {
  auth: {
    token: localStorage.getItem("token") || ""  
  }
});

// Función para unirse a una sala
const joinRoom = (roomId) => {
  socket.emit("join-room", roomId);
};

// Función para enviar mensaje
const sendMessage = (message) => {
  socket.emit("send-message", message);
};

const markRoomRead = (roomId) => {
  socket.emit("mark-room-read", { roomId });
};

export { socket, joinRoom, sendMessage, markRoomRead };