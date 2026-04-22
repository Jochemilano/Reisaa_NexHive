import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "@/utils/socket";
import { apiFetch } from "@/utils/apiClient";
import { getAvatarUrl } from "@/utils/media"; 
import { useGroup } from "@/context/GroupContext";
import "./Home.css"

export default function Home() {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const navigate = useNavigate();
  const { setSelectedProjectId } = useGroup();
  const currentUserId = parseInt(localStorage.getItem("userId"));

  useEffect(() => {
    // Escuchar usuarios conectados
    socket.on("usuarios:lista", (lista) => {
      setOnlineUsers(lista.filter((u) => u.id !== currentUserId));
    });

    // Cargar mis actividades "En progreso"
    const loadActivities = async () => {
      try {
        const data = await apiFetch("my-activities");
        setActivities(data);
      } catch (err) {
        console.error("Error cargando actividades:", err);
      } finally {
        setLoadingActivities(false);
      }
    };

    loadActivities();

    return () => socket.off("usuarios:lista");
  }, [currentUserId]);

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
    <div className="home-container">
      {/* LADO IZQUIERDO: CONTENIDO PRINCIPAL (USUARIOS CONECTADOS) */}
      <main className="home-main">
        <div className="online-users">
          <h3>Conectados ({onlineUsers.length})</h3>
          <ul className="online-users-list">
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
      </main>

      {/* LADO DERECHO: DASHBOARD SECUNDARIO (ACTIVIDADES) */}
      <aside className="home-activities-sidebar">
        <div className="activities-widget">
          <h4 className="widget-title">Actividades en curso</h4>
          <div className="activities-list">
            {loadingActivities ? (
              <div className="widget-status">Cargando...</div>
            ) : activities.length > 0 ? (
              activities.map((act) => (
                <div 
                  key={act.id} 
                  className="mini-activity-card"
                  onClick={() => {
                    setSelectedProjectId(act.project_id);
                    navigate(`/groups/${act.group_id}`);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="mini-activity-name">{act.activity_name}</div>
                  <div className="mini-card-header">
                    <span className="mini-project-name">{act.project_name}</span>
                    <span className="mini-group-name">{act.group_name}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="widget-status">No hay actividades trabajando.</div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}