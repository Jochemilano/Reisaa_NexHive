import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { socket } from "@/utils/socket";
import { apiFetch } from "@/utils/apiClient";

const UnreadContext = createContext();

export const UnreadProvider = ({ children }) => {
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadByRoom, setUnreadByRoom] = useState({}); // { roomId: count }

  const fetchUnreadData = useCallback(async () => {
    try {
      const totalData = await apiFetch("rooms/unread/total");
      setUnreadTotal(totalData.total);

      const rooms = await apiFetch("rooms");
      const counts = {};
      rooms.forEach(r => {
        counts[r.id] = r.unread_count || 0;
      });
      setUnreadByRoom(counts);
    } catch (err) {
      console.error("Error fetching unread counts:", err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadData();

    // Escuchar notificaciones de nuevos mensajes (evento separado del chat)
    const handleNotification = (data) => {
      setUnreadByRoom(prev => ({
        ...prev,
        [data.room_id]: (prev[data.room_id] || 0) + 1
      }));
      setUnreadTotal(prev => prev + 1);
    };

    // Escuchar cuando una sala se marca como leída para resetear
    const handleRoomRead = ({ roomId, userId }) => {
      const currentUserId = parseInt(localStorage.getItem("userId"));
      if (parseInt(userId) !== currentUserId) return;

      setUnreadByRoom(prev => {
        const oldCount = prev[roomId] || 0;
        setUnreadTotal(total => Math.max(0, total - oldCount));
        return { ...prev, [roomId]: 0 };
      });
    };

    socket.on("new-message-notification", handleNotification);
    socket.on("room-read", handleRoomRead);

    return () => {
      socket.off("new-message-notification", handleNotification);
      socket.off("room-read", handleRoomRead);
    };
  }, [fetchUnreadData]);

  // Función para resetear manualmente (útil al entrar a un chat)
  const markAsRead = useCallback((roomId) => {
    setUnreadByRoom(prev => {
      const oldCount = prev[roomId] || 0;
      if (oldCount === 0) return prev;
      setUnreadTotal(total => Math.max(0, total - oldCount));
      return { ...prev, [roomId]: 0 };
    });
  }, []);

  const value = React.useMemo(() => ({
    unreadTotal, unreadByRoom, fetchUnreadData, markAsRead
  }), [unreadTotal, unreadByRoom, fetchUnreadData, markAsRead]);

  return (
    <UnreadContext.Provider value={value}>
      {children}
    </UnreadContext.Provider>
  );
};

export const useUnread = () => useContext(UnreadContext);
