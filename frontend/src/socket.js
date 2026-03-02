// src/socket.js
import { io } from "socket.io-client";

// Conectamos socket con token de localStorage
const socket = io("http://localhost:3001", {
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

export { socket, joinRoom, sendMessage };