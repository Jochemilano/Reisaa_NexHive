import { useState, useEffect } from "react";
import { socket, joinRoom, sendMessage, markRoomRead } from "@/utils/socket";
import { apiFetch } from "@/utils/apiClient";
import { uploadFile } from "@/utils/rooms";

import { useUnread } from "@/context/UnreadContext";

export const useChat = (roomId, userId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]); // Array de { id, name }
  const { markAsRead } = useUnread();

  useEffect(() => {
    // Limpiar mensajes y estados del chat anterior
    setMessages([]);
    setLoading(true);
    setTypingUsers([]);

    apiFetch(`rooms/${roomId}/messages`)
      .then((loadedMessages) => {
        setMessages(loadedMessages.map((msg) => ({ ...msg, read: !!msg.read })));
        markRoomRead(roomId);
        markAsRead(roomId);
      })
      .catch(err => console.error("Error cargando mensajes:", err))
      .finally(() => setLoading(false));

    joinRoom(roomId);
    markRoomRead(roomId);
    markAsRead(roomId);

    const handleReceiveMessage = (msg) => {
      // FILTRAR: solo aceptar mensajes de ESTA sala
      if (String(msg.room_id) !== String(roomId)) return;
      setMessages(prev => [...prev, { ...msg, read: !!msg.read }]);
      markRoomRead(roomId);
      markAsRead(roomId);
    };

    const handleRoomReadEvent = ({ roomId: readRoomId, userId: readerId }) => {
      if (String(readRoomId) !== String(roomId)) return;
      if (Number(readerId) === Number(userId)) return;
      setMessages((prev) => prev.map((msg) => {
        if (msg.sender_id && Number(msg.sender_id) === Number(userId) && !msg.read) {
          return { ...msg, read: true };
        }
        return msg;
      }));
    };

    const handleConnect = () => {
      console.log("Re-joining room after reconnect:", roomId);
      joinRoom(roomId);
    };

    const handleUserTyping = ({ roomId: typingRoomId, userId: typingUserId, userName: typingUserName }) => {
      if (String(typingRoomId) !== String(roomId)) return;
      if (Number(typingUserId) === Number(userId)) return;
      
      setTypingUsers(prev => {
        if (prev.find(u => u.id === typingUserId)) return prev;
        return [...prev, { id: typingUserId, name: typingUserName }];
      });
    };

    const handleUserStopTyping = ({ roomId: typingRoomId, userId: typingUserId }) => {
      if (String(typingRoomId) !== String(roomId)) return;
      setTypingUsers(prev => prev.filter(u => u.id !== typingUserId));
    };

    socket.on("receive-message", handleReceiveMessage);
    socket.on("room-read", handleRoomReadEvent);
    socket.on("user-typing", handleUserTyping);
    socket.on("user-stop-typing", handleUserStopTyping);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("receive-message", handleReceiveMessage);
      socket.off("room-read", handleRoomReadEvent);
      socket.off("user-typing", handleUserTyping);
      socket.off("user-stop-typing", handleUserStopTyping);
      socket.off("connect", handleConnect);
      // Salir de la sala al desmontar para no recibir mensajes de otras salas
      socket.emit("leave-room", roomId);
    };

  }, [roomId, userId, markAsRead]);

  const send = (content, replyToId = null) => {
    sendMessage({
      roomId,
      senderId: userId,
      type: "text",
      content,
      replyToId: replyToId || null,
    });
  };

  const sendFile = async (file, caption = null, replyToId = null) => {
    if (!file) return;
    const data = await uploadFile(file);
    let type = "file";
    if (file.type.startsWith("image/")) type = "image";
    else if (file.type.startsWith("video/")) type = "video";
    else if (file.type.startsWith("audio/")) type = "audio";

    sendMessage({
      roomId,
      senderId: userId,
      type,
      content: data.url,
      caption,
      fileSize: data.size,
      replyToId: replyToId || null,
    });
  };
  const editMessage = async (messageId, content) => {
    await apiFetch(`messages/${messageId}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content, edited: 1 } : m))
    );
  };

  const deleteMessage = async (messageId) => {
    await apiFetch(`messages/${messageId}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const setTyping = (isTyping, userName) => {
    if (isTyping) {
      socket.emit("typing", { roomId, userId, userName });
    } else {
      socket.emit("stop-typing", { roomId, userId });
    }
  };
  
  return { messages, typingUsers, send, sendFile, editMessage, deleteMessage, setTyping };
};