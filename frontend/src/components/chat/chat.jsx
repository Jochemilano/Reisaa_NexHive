import React, { useState, useEffect } from "react";
import { socket, joinRoom, sendMessage } from "socket";
import { apiFetch } from "utils/apiClient";

const Chat = ({ roomId, userId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    // 1️⃣ Cargar mensajes históricos con apiFetch
    const fetchMessages = async () => {
      try {
        const data = await apiFetch(`rooms/${roomId}/messages`);
        setMessages(data);
      } catch (err) {
        console.error("Error cargando mensajes:", err);
      }
    };
    fetchMessages();

    // 2️⃣ Unirse a la sala y escuchar mensajes nuevos
    joinRoom(roomId);

    socket.on("receive-message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Limpiar listener al desmontar
    return () => {
      socket.off("receive-message");
    };
  }, [roomId]);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const message = {
      roomId,
      senderId: userId,
      type: "text",
      content: input
    };

    sendMessage(message); // Socket sigue igual
    setInput("");
  };

  return (
    <div>
      <div style={{ border: "1px solid #ccc", height: "300px", overflowY: "scroll", padding: "10px" }}>
        {messages.map((msg) => (
          <div key={msg.id}>
            <b>{msg.sender_name || msg.senderId}:</b> {msg.content}
          </div>
        ))}
      </div>

      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Escribe un mensaje..."
      />
      <button onClick={handleSendMessage}>Enviar</button>
    </div>
  );
};

export default Chat;