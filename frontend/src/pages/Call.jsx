import React, { useEffect, useState } from "react";
import Call from "components/chat/call"; // componente en minúscula
import { socket } from "socket";
import { apiFetch } from "utils/apiClient"; // autorización

const CallPage = ({ currentUserId }) => {
  const [users, setUsers] = useState([]);
  const [targetUserId, setTargetUserId] = useState(null);

  // Traer usuarios
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiFetch("users");
        const otherUsers = data.filter(u => u.id !== currentUserId);
        setUsers(otherUsers);
      } catch (err) {
        console.error("Error al traer usuarios:", err);
      }
    };
    fetchUsers();
  }, [currentUserId]);

  // Escuchar desconexión
  useEffect(() => {
    socket.on("user-disconnected", (userId) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
    });
    return () => socket.off("user-disconnected");
  }, []);

  return (
    <div>
      <h2>Usuarios Conectados</h2>
      <ul>
        {users.length === 0 && <li>No hay otros usuarios conectados</li>}
        {users.map(u => (
          <li key={u.id} style={{ marginBottom: "10px" }}>
            {u.name || `Usuario ${u.id}`}
            <button 
              onClick={() => setTargetUserId(u.id)} 
              style={{ marginLeft: "10px" }}
            >
              Llamar
            </button>
          </li>
        ))}
      </ul>
      <Call 
        userId={currentUserId} 
        targetUserId={targetUserId} 
        onClose={() => setTargetUserId(null)} 
      />
    </div>
  );
};

export default CallPage;