import { useState, useEffect } from "react";
import { socket, joinRoom, sendMessage, markRoomRead } from "@/utils/socket";
import { apiFetch } from "@/utils/apiClient";
import { uploadFile } from "@/utils/rooms";

export const useChat = (roomId, userId) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    apiFetch(`rooms/${roomId}/messages`)
      .then((loadedMessages) => {
        setMessages(loadedMessages.map((msg) => ({ ...msg, read: !!msg.read })));
        markRoomRead(roomId);
      })
      .catch(err => console.error("Error cargando mensajes:", err));

    joinRoom(roomId);
    markRoomRead(roomId);

    socket.on("receive-message", (msg) => {
      console.log("Received message:", msg);
      setMessages(prev => [...prev, { ...msg, read: !!msg.read }]);
      markRoomRead(roomId);
    });

    socket.on("room-read", ({ roomId: readRoomId, userId: readerId }) => {
      if (readRoomId !== roomId) return;
      if (Number(readerId) === Number(userId)) return;
      setMessages((prev) => prev.map((msg) => {
        if (msg.sender_id && Number(msg.sender_id) === Number(userId) && !msg.read) {
          return { ...msg, read: true };
        }
        return msg;
      }));
    });

    return () => {
      socket.off("receive-message");
      socket.off("room-read");
    };
  }, [roomId, userId]);

  const send = (content, replyToId = null) => {
    console.log("Sending message:", { roomId, type: "text", content, replyToId });
    sendMessage({
      roomId,
      senderId: userId,
      type: "text",
      content,
      replyToId: replyToId || null,
    });
  };

  const sendFile = async (file) => {
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
    });
  };
  const editMessage = async (messageId, content) => {
    await apiFetch(`messages/${messageId}`, {
      method: "PUT",
      body: JSON.stringify({ content }),
    });
    // Actualiza localmente
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content, edited: 1 } : m))
    );
  };

  const deleteMessage = async (messageId) => {
    await apiFetch(`messages/${messageId}`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };
  

  return { messages, send, sendFile, editMessage, deleteMessage };
};