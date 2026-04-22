import React, { useEffect, useState } from "react";
import { fetchAllUsers } from "@/utils/groups";
import { apiFetch } from "@/utils/apiClient";
import { useNavigate } from "react-router-dom";
import { useUnread } from "@/context/UnreadContext";

const HomeSecondSidebar = () => {
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const { unreadByRoom } = useUnread();
  const navigate = useNavigate();
  const currentUserId = parseInt(localStorage.getItem("userId"));

  useEffect(() => {
    const loadData = async () => {
      try {
        const usersData = await fetchAllUsers();
        setUsers(usersData.filter(u => u.id !== currentUserId));
        
        const roomsData = await apiFetch("rooms");
        setRooms(roomsData);
      } catch (err) {
        console.error("Error cargando datos:", err);
      }
    };
    loadData();
  }, [currentUserId]);

  const getUnreadForUser = (userId) => {
    const userIds = [currentUserId, userId].sort();
    const roomName = `chat-${userIds.join("-")}`;
    const room = rooms.find(r => r.name === roomName);
    if (!room) return 0;
    // USAR EL CONTEXTO PARA TIEMPO REAL
    return unreadByRoom[room.id] || 0;
  };


  const handleUserClick = async (user) => {
    try {
      const userIds = [currentUserId, user.id].sort();
      const roomName = `chat-${userIds.join("-")}`;
      let existingRoom = rooms.find(r => r.name === roomName);
      let roomId;

      if (existingRoom) {
        roomId = existingRoom.id;
      } else {
        const res = await apiFetch("rooms", {
          method: "POST",
          body: JSON.stringify({
            name: roomName,
            type: "chat",
            userIds
          })
        });
        roomId = res.roomId;
      }

      navigate(`/chat/${roomId}`);
    } catch (err) {
      console.error("Error abriendo chat:", err);
    }
  };

  return (
    <div className="sidebar-inner">
      <h3>Usuarios</h3>
      <div className="user-list">
        {users.map(u => {
          const unread = getUnreadForUser(u.id);
          return (
            <div
              key={u.id}
              className="user-item"
              onClick={() => handleUserClick(u)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{u.name}</span>
              {unread > 0 && (
                <span className="unread-badge-small">{unread}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HomeSecondSidebar;