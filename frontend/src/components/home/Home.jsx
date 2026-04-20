import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "@/utils/socket";
import { apiFetch } from "@/utils/apiClient";
import { getAvatarUrl } from "@/utils/media"; 
import "./Home.css"

export default function Home() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const navigate = useNavigate();
  const currentUserId = parseInt(localStorage.getItem("userId"));

  useEffect(() => {
    socket.on("usuarios:lista", (lista) => {
      // filtra al usuario actual
      setOnlineUsers(lista.filter((u) => u.id !== currentUserId));
    });

    return () => socket.off("usuarios:lista");
  }, []);

  const handleUserClick = async (user) => {
    try {
      const userIds = [currentUserId, user.id].sort();
      const roomName = `chat-${userIds.join("-")}`;

      const rooms = await apiFetch("rooms");
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
    <div className="online-users">
      <h3>Conectados ({onlineUsers.length})</h3>
      <ul>
        {onlineUsers.map((u) => {
          const avatarUrl = getAvatarUrl(u.profile_pic);
          return (
            <li key={u.id} className="online-user-item" onClick={() => handleUserClick(u)}>
              <div className="avatar-wrapper">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={u.name} className="avatar" />
                ) : (
                  <div className="avatar avatar--fallback">
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="online-dot" />
              </div>
              <span className="user-name">{u.name}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}