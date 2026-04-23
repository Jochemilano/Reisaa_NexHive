import React, { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiClient";
import { useNavigate } from "react-router-dom";
import { useUnread } from "@/context/UnreadContext";
import Modal from "@/components/modal/Modal";
import { FiPlus, FiSearch, FiUserPlus } from "react-icons/fi";

const HomeSecondSidebar = () => {
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const { unreadByRoom } = useUnread();
  const navigate = useNavigate();
  const currentUserId = parseInt(localStorage.getItem("userId"));

  useEffect(() => {
    const loadData = async () => {
      try {
        const friendsData = await apiFetch("friends");
        setUsers(friendsData);
        
        const roomsData = await apiFetch("rooms");
        setRooms(roomsData);
      } catch (err) {
        console.error("Error cargando datos:", err);
      }
    };
    loadData();
  }, [currentUserId]);

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const data = await apiFetch(`users/search?q=${encodeURIComponent(q)}`);
      // Filtrar para no mostrarme a mí mismo y a los que ya son amigos
      const filtered = data.filter(u => u.id !== currentUserId && !users.some(friend => friend.id === u.id));
      setSearchResults(filtered);
    } catch (err) {
      console.error("Error buscando usuarios:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      await apiFetch("friends", {
        method: "POST",
        body: JSON.stringify({ friendId })
      });
      // Recargar lista de amigos
      const friendsData = await apiFetch("friends");
      setUsers(friendsData);
      // Cerrar modal o limpiar búsqueda
      setSearchQuery("");
      setSearchResults([]);
      setIsSearchModalOpen(false);
    } catch (err) {
      console.error("Error agregando amigo:", err);
    }
  };

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
      <div className="cont-sec">
        <h3>Amigos</h3>
        <button 
          className="add-activity-btn" 
          onClick={() => setIsSearchModalOpen(true)}
          title="Agregar amigo"
        >
          <FiPlus />
        </button>
      </div>

      <div className="user-list">
        {users.length > 0 ? (
          users.map(u => {
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
          })
        ) : (
          <div className="empty-state">No tienes amigos agregados</div>
        )}
      </div>

      {isSearchModalOpen && (
        <Modal 
          isOpen={isSearchModalOpen} 
          onClose={() => {
            setIsSearchModalOpen(false);
            setSearchQuery("");
            setSearchResults([]);
          }}
          title="Buscar personas"
        >
          <div className="friend-search-container">
            <div className="search-input-wrapper">
              <FiSearch className="search-icon" />
              <input 
                type="text" 
                placeholder="Nombre o correo..." 
                value={searchQuery}
                onChange={handleSearch}
                autoFocus
              />
            </div>

            <div className="search-results">
              {isSearching ? (
                <div className="search-status">Buscando...</div>
              ) : searchQuery && searchResults.length === 0 ? (
                <div className="search-status">No se encontraron resultados</div>
              ) : (
                searchResults.map(u => (
                  <div key={u.id} className="search-result-item">
                    <div className="user-info">
                      <span className="user-name">{u.name}</span>
                      <span className="user-email">{u.email}</span>
                    </div>
                    <button 
                      className="add-friend-btn"
                      onClick={() => handleAddFriend(u.id)}
                    >
                      <FiUserPlus /> Agregar
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HomeSecondSidebar;