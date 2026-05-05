import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "@/utils/socket";
import { apiFetch } from "@/utils/apiClient";
import { getAvatarUrl } from "@/utils/media";
import { useUserDetail } from "@/context/UserDetailContext";
import { FaPlug } from "react-icons/fa";
import Skeleton from "@/components/loading/Skeleton";
import "./Social.css";

export default function Social() {
  const [allOnlineUsers, setAllOnlineUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const navigate = useNavigate();
  const { showUserProfile } = useUserDetail();
  const currentUserId = parseInt(localStorage.getItem("userId"));

  useEffect(() => {
    // Cargar amigos
    const loadFriends = async () => {
      try {
        const friendsData = await apiFetch("friends");
        setFriends(friendsData);
      } catch (err) {
        console.error("Error cargando amigos:", err);
      } finally {
        setLoadingFriends(false);
      }
    };

    loadFriends();

    // Escuchar usuarios conectados
    const handleUserList = (lista) => setAllOnlineUsers(lista);
    socket.on("usuarios:lista", handleUserList);

    // Pedir lista inicial al montar
    socket.emit("get-online-users");

    return () => socket.off("usuarios:lista", handleUserList);
  }, [currentUserId]);

  const onlineUsers = allOnlineUsers
    .filter(u => u.id !== currentUserId && friends.some(f => f.id === u.id))
    .map(u => {
      const friendData = friends.find(f => f.id === u.id);
      return { ...u, ...friendData };
    });

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
    <div className="social-container">
      <main className="social-main">
        <div className="online-users">
          <h3>Conectados ({onlineUsers.length})</h3>
          <ul className="online-users-list">
            {loadingFriends ? (
              <>
                <div style={{ display: 'flex', gap: '12px', padding: '10px' }}>
                  <Skeleton width="40px" height="40px" borderRadius="50%" />
                  <Skeleton width="120px" height="20px" />
                </div>
                <div style={{ display: 'flex', gap: '12px', padding: '10px' }}>
                  <Skeleton width="40px" height="40px" borderRadius="50%" />
                  <Skeleton width="120px" height="20px" />
                </div>
              </>
            ) : onlineUsers.length > 0 ? (
              onlineUsers.map((u) => {
                const avatarUrl = getAvatarUrl(u.profile_pic);
                return (
                  <li
                    key={u.id}
                    className="online-user-item"
                    onClick={() => handleUserClick(u)}
                  >
                    <div
                      className="avatar-wrapper"
                      onClick={(e) => {
                        e.stopPropagation();
                        showUserProfile(u.id);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={u.name}
                          className="avatar"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.parentElement.querySelector('.avatar--fallback');
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`avatar avatar--fallback ${avatarUrl ? 'hidden' : ''}`} style={{ display: avatarUrl ? 'none' : 'flex' }}>
                        {u.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="online-dot" />
                    </div>
                    <span className="user-name">{u.name}</span>
                  </li>
                );
              })
            ) : (
              <div className="empty-online-state">
                <div className="empty-icon bounce-animation"><FaPlug style={{ color: 'var(--primary)' }} /></div>
                <p style={{ color: 'var(--primary)' }}>Nadie conectado en este momento.</p>
                <span className="empty-hint">Tus amigos aparecerán aquí cuando inicien sesión.</span>
              </div>
            )}
          </ul>
        </div>
      </main>
    </div>
  );
}
