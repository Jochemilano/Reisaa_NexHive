import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { socket } from "@/utils/socket";
import { apiFetch } from "@/utils/apiClient";
import { playNotificationSound } from "@/utils/audio";

const UnreadContext = createContext();

export function UnreadProvider({ children }) {
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadByRoom, setUnreadByRoom] = useState({}); // { roomId: count }
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [mutedRooms, setMutedRooms] = useState(() => {
    const saved = localStorage.getItem("muted_rooms");
    return saved ? JSON.parse(saved) : [];
  });
  const [allRooms, setAllRooms] = useState([]); // State para guardar la info unificada de los chats
  const [selectedSound, setSelectedSound] = useState(() => {
    return localStorage.getItem("notification_sound") || "crystal";
  });
  const [callsEnabled, setCallsEnabledGlobal] = useState(() => {
    const saved = localStorage.getItem("calls_enabled");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [callSound, setCallSoundGlobal] = useState(() => {
    return localStorage.getItem("call_sound_type") || "digital";
  });

  const soundEnabledRef = useRef(true);
  const setSoundEnabled = useCallback((enabled) => {
    soundEnabledRef.current = !!enabled;
  }, []);

  const changeNotificationSound = useCallback((soundType) => {
    setSelectedSound(soundType);
    localStorage.setItem("notification_sound", soundType);
  }, []);

  const changeCallEnabled = useCallback((enabled) => {
    setCallsEnabledGlobal(enabled);
    localStorage.setItem("calls_enabled", JSON.stringify(enabled));
  }, []);

  const changeCallSound = useCallback((soundType) => {
    setCallSoundGlobal(soundType);
    localStorage.setItem("call_sound_type", soundType);
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
      const groups = await apiFetch("groups");
      
      // Unificar salas (DMs) y grupos para poder buscar nombres en preferencias
      const unifiedRooms = [
        ...rooms.map(r => ({
          ...r,
          name: r.display_name || r.name || `Chat #${r.id}`
        })),
        ...groups.map(g => ({
          id: g.chat_room_id,
          name: g.name,
          type: 'group'
        }))
      ];
      
      setAllRooms(unifiedRooms); 

      // Usar los counts que vienen del nuevo endpoint unread/total
      setUnreadByRoom(totalData.byRoom || {});
    } catch (err) {
      console.error("Error fetching unread counts:", err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadData();

    const handleNotification = (data) => {
      const currentUserId = parseInt(localStorage.getItem("userId"));
      // No contar si yo soy el remitente o si estoy en esa sala actualmente
      if (data.sender_id && parseInt(data.sender_id) === currentUserId) return;
      if (activeRoomId && String(data.room_id) === String(activeRoomId)) return;

      const isRoomMuted = mutedRooms.includes(data.room_id);
      if (soundEnabledRef.current && !isRoomMuted) {
        playNotificationSound(selectedSound);
      }
      setUnreadByRoom(prev => {
        const roomId = String(data.room_id);
        const oldCount = Number(prev[roomId] || 0);
        return {
          ...prev,
          [roomId]: oldCount + 1
        };
      });
      setUnreadTotal(prev => Number(prev || 0) + 1);
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
  }, [fetchUnreadData, mutedRooms, selectedSound, activeRoomId]);

  const markAsRead = useCallback((roomId) => {
    setUnreadByRoom(prev => {
      const oldCount = prev[roomId] || 0;
      if (oldCount === 0) return prev;
      setUnreadTotal(total => Math.max(0, total - oldCount));
      return { ...prev, [roomId]: 0 };
    });
  }, []);

  const value = useMemo(() => ({
    unreadTotal,
    unreadByRoom,
    fetchUnreadData,
    markAsRead, 
    setSoundEnabled, 
    activeRoomId,
    setActiveRoomId,
    mutedRooms, 
    toggleMuteRoom,
    selectedSound,
    changeNotificationSound,
    callsEnabled,
    changeCallEnabled,
    callSound,
    changeCallSound,
    allRooms,
    setAllRooms
  }), [unreadTotal, unreadByRoom, fetchUnreadData, markAsRead, setSoundEnabled, activeRoomId, mutedRooms, toggleMuteRoom, selectedSound, changeNotificationSound, callsEnabled, changeCallEnabled, callSound, changeCallSound, allRooms]);

  return (
    <UnreadContext.Provider value={value}>
      {children}
    </UnreadContext.Provider>
  );
}

export const useUnread = () => useContext(UnreadContext);