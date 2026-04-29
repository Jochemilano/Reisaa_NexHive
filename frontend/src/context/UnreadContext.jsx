import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { socket } from "@/utils/socket";
import { apiFetch } from "@/utils/apiClient";
import { playNotificationSound } from "@/utils/audio";

const UnreadContext = createContext();

export function UnreadProvider({ children }) {
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadByRoom, setUnreadByRoom] = useState({}); // { roomId: count }
  const [mutedRooms, setMutedRooms] = useState(() => {
    const saved = localStorage.getItem("muted_rooms");
    return saved ? JSON.parse(saved) : [];
  });
  
  const soundEnabledRef = useRef(true);
  const setSoundEnabled = useCallback((enabled) => {
    soundEnabledRef.current = !!enabled;
  }, []);

  const toggleMuteRoom = useCallback((roomId) => {
    setMutedRooms(prev => {
      const isMuted = prev.includes(roomId);
      const next = isMuted ? prev.filter(id => id !== roomId) : [...prev, roomId];
      localStorage.setItem("muted_rooms", JSON.stringify(next));
      return next;
    });
  }, []);

  const fetchUnreadData = useCallback(async () => {
    try {
      const prefs = await apiFetch("preferences").catch(() => null);
      if (prefs && prefs.notifications_enabled !== undefined) {
        soundEnabledRef.current = !!prefs.notifications_enabled;
      }

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

    const handleNotification = (data) => {
      const isRoomMuted = mutedRooms.includes(data.room_id);
      if (soundEnabledRef.current && !isRoomMuted) {
        playNotificationSound();
      }
      setUnreadByRoom(prev => ({
        ...prev,
        [data.room_id]: (prev[data.room_id] || 0) + 1
      }));
      setUnreadTotal(prev => prev + 1);
    };

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
  }, [fetchUnreadData, mutedRooms]);

  const markAsRead = useCallback((roomId) => {
    setUnreadByRoom(prev => {
      const oldCount = prev[roomId] || 0;
      if (oldCount === 0) return prev;
      setUnreadTotal(total => Math.max(0, total - oldCount));
      return { ...prev, [roomId]: 0 };
    });
  }, []);

  const value = useMemo(() => ({
    unreadTotal, unreadByRoom, fetchUnreadData, markAsRead, setSoundEnabled, mutedRooms, toggleMuteRoom
  }), [unreadTotal, unreadByRoom, fetchUnreadData, markAsRead, setSoundEnabled, mutedRooms, toggleMuteRoom]);

  return (
    <UnreadContext.Provider value={value}>
      {children}
    </UnreadContext.Provider>
  );
}

export const useUnread = () => useContext(UnreadContext);

