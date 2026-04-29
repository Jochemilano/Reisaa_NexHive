import React, { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiClient";
import { useNavigate } from "react-router-dom";
import { useUnread } from "@/context/UnreadContext";
import Modal from "@/components/modal/Modal";
import { FiPlus, FiSearch, FiUserPlus } from "react-icons/fi";
import { CONFIG } from "@/utils/config";
import { getAvatarUrl } from "@/utils/media";
import { useUserDetail } from "@/context/UserDetailContext";

const HomeSecondSidebar = () => {
  const [rooms, setRooms] = useState([]);
  const [friends, setFriends] = useState([]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Estados para creación de grupo
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [groupName, setGroupName] = useState("");
  
  const { unreadByRoom } = useUnread();
  const { showUserProfile, showRoomProfile } = useUserDetail();
  const navigate = useNavigate();
  const currentUserId = parseInt(localStorage.getItem("userId"));

  useEffect(() => {
    const loadData = async () => {
      try {
        const roomsData = await apiFetch("rooms");
        setRooms(roomsData);

        const friendsData = await apiFetch("friends");
        setFriends(friendsData);
      } catch (err) {
        console.error("Error cargando datos:", err);
      }
    };
    loadData();
    // Refrescar cada 10 segundos para no leídos
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
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
      const filtered = data.filter(u => u.id !== currentUserId && !friends.some(f => f.id === u.id));
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
      const friendsData = await apiFetch("friends");
      setFriends(friendsData);
      setSearchQuery("");
      setSearchResults([]);
      setIsSearchModalOpen(false);
    } catch (err) {
      console.error("Error agregando amigo:", err);
    }
  };

  const handleToggleFriendSelection = (friend) => {
    setSelectedFriends(prev => {
      const isSelected = prev.some(f => f.id === friend.id);
      if (isSelected) return prev.filter(f => f.id !== friend.id);
      if (prev.length >= 9) return prev; // Límite de 9 (total 10 con creador)
      return [...prev, friend];
    });
  };

  const handleStartGroup = async () => {
    if (selectedFriends.length < 2) return;
    if (!groupName.trim()) return alert("Ponle un nombre al grupo");

    try {
      const userIds = [currentUserId, ...selectedFriends.map(f => f.id)];
      const res = await apiFetch("rooms", {
        method: "POST",
        body: JSON.stringify({
          name: groupName,
          type: "chat",
          userIds
        })
      });
      
      setIsSearchModalOpen(false);
      setSelectedFriends([]);
      setGroupName("");
      navigate(`/chat/${res.roomId}`);
    } catch (err) {
      console.error("Error creando grupo:", err);
    }
  };

  const handleRoomClick = (roomId) => {
    navigate(`/chat/${roomId}`);
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
        {rooms.length > 0 ? (
          rooms.map(r => {
            const unread = unreadByRoom[r.id] || r.unread_count || 0;
            const avatarUrl = getAvatarUrl(r.display_avatar);
            
            return (
              <div
                key={r.id}
                className="user-item"
                onClick={() => handleRoomClick(r.id)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  background: 'transparent'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div 
                  className="avatar-wrapper" 
                  style={{ position: 'relative', width: '32px', height: '32px', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (r.participant_count > 2) {
                      showRoomProfile(r.id);
                    } else if (r.display_id) {
                      showUserProfile(r.display_id);
                    }
                  }}
                >
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="" 
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<div style="width:100%; height:100%; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px;">${r.display_name?.[0].toUpperCase()}</div>`; }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                      {r.display_name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    color: 'var(--text-primary)', 
                    fontSize: '0.95rem', 
                    fontWeight: unread > 0 ? '600' : '500',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {r.display_name}
                  </div>
                  {r.participant_count > 2 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {r.participant_count} miembros
                    </div>
                  )}
                </div>
                {unread > 0 && (
                  <span className="unread-badge-small" style={{ 
                    background: 'var(--error)', 
                    color: 'white', 
                    borderRadius: '10px', 
                    padding: '2px 6px', 
                    fontSize: '0.7rem' 
                  }}>
                    {unread}
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="empty-state" style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '20px' }}>
            No hay chats recientes
          </div>
        )}
      </div>

      {isSearchModalOpen && (
        <Modal 
          isOpen={isSearchModalOpen} 
          onClose={() => {
            setIsSearchModalOpen(false);
            setSearchQuery("");
            setSearchResults([]);
            setSelectedFriends([]);
            setGroupName("");
          }}
          title={selectedFriends.length > 1 ? "Mensaje de grupo" : "Nuevo mensaje"}
        >
          <div className="discord-modal-content" style={{ display: 'flex', flexDirection: 'column', height: '450px', background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
            
            {/* Buscador de amigos */}
            <div className="search-section" style={{ padding: '15px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                {selectedFriends.length > 0 
                  ? `Puedes añadir ${9 - selectedFriends.length} amigos más.` 
                  : "Busca o añade amigos"}
              </div>
              <div style={{ background: 'var(--bg-soft)', borderRadius: '4px', display: 'flex', alignItems: 'center', padding: '0 10px', border: '1px solid var(--border)' }}>
                <input 
                  type="text" 
                  placeholder="Escribe el nombre de un amigo" 
                  value={searchQuery}
                  onChange={handleSearch}
                  autoFocus
                  style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Input de Nombre de Grupo (Solo si hay >1 seleccionado) */}
            {selectedFriends.length > 1 && (
              <div style={{ padding: '0 15px 15px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Nombre del grupo
                </div>
                <input 
                  type="text" 
                  placeholder="Ponle un nombre a tu grupo..." 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-soft)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* Lista Vertical de Amigos */}
            <div className="friends-vertical-list" style={{ flex: 1, overflowY: 'auto', padding: '0 15px' }}>
              {friends
                .filter(f => !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(f => {
                  const isSelected = selectedFriends.some(sf => sf.id === f.id);
                  const avatarUrl = getAvatarUrl(f.profile_pic);
                  return (
                    <div 
                      key={f.id} 
                      onClick={() => handleToggleFriendSelection(f)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        padding: '8px', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        background: isSelected ? 'var(--bg-active)' : 'transparent',
                        marginBottom: '2px',
                        boxSizing: 'border-box'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = isSelected ? 'var(--bg-active)' : 'var(--bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? 'var(--bg-active)' : 'transparent'}
                    >
                      <div className="avatar-wrapper" style={{ width: '32px', height: '32px', flexShrink: 0 }}>
                        {avatarUrl ? (
                          <img 
                            src={avatarUrl} 
                            alt="" 
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<div style="width:100%; height:100%; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px;">${f.name?.[0].toUpperCase()}</div>`; }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                            {f.name?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.email}</div>
                      </div>
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        border: isSelected ? 'none' : '1px solid var(--text-tertiary)', 
                        borderRadius: '3px',
                        background: isSelected ? 'var(--primary)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {isSelected && <div style={{ color: 'white', fontSize: '12px' }}>✓</div>}
                      </div>
                    </div>
                  );
                })}
              
              {/* Resultados de búsqueda para NUEVOS amigos (No agregados) */}
              {searchQuery && searchResults.length > 0 && (
                <>
                  <div style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-tertiary)', margin: '15px 0 8px', textTransform: 'uppercase' }}>
                    Otros usuarios (No amigos)
                  </div>
                  {searchResults.map(u => {
                    const avatarUrl = getAvatarUrl(u.profile_pic);
                    return (
                      <div key={u.id} className="search-result-item" style={{ display: 'flex', alignItems: 'center', padding: '8px', gap: '12px', boxSizing: 'border-box' }}>
                        <div className="avatar-wrapper" style={{ width: '32px', height: '32px', flexShrink: 0 }}>
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt="" 
                              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                              onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<div style="width:100%; height:100%; border-radius:50%; background:var(--primary); color:white; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:14px;">${u.name?.[0].toUpperCase()}</div>`; }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                              {u.name?.[0]?.toUpperCase() || "?"}
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAddFriend(u.id); }}
                          style={{ background: 'var(--success)', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '3px', fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0 }}
                        >
                          Añadir
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer con botón de acción */}
            <div style={{ padding: '15px', background: 'var(--bg-soft)', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border)' }}>
              <button 
                onClick={() => setIsSearchModalOpen(false)}
                style={{ color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                disabled={selectedFriends.length === 0}
                onClick={selectedFriends.length > 1 ? handleStartGroup : () => {
                  const friend = selectedFriends[0];
                  // Lógica para abrir/crear DM 1:1
                  apiFetch(`rooms/direct/${friend.id}`).then(res => {
                    navigate(`/chat/${res.roomId}`);
                    setIsSearchModalOpen(false);
                  }).catch(() => {
                    // Si no existe, crear uno nuevo
                    apiFetch("rooms", {
                      method: "POST",
                      body: JSON.stringify({
                        name: `chat-${[currentUserId, friend.id].sort().join("-")}`,
                        type: "chat",
                        userIds: [currentUserId, friend.id]
                      })
                    }).then(res => {
                      navigate(`/chat/${res.roomId}`);
                      setIsSearchModalOpen(false);
                    });
                  });
                }}
                style={{ 
                  background: selectedFriends.length > 0 ? 'var(--primary)' : 'var(--bg-active)', 
                  color: 'white', 
                  border: 'none', 
                  padding: '8px 25px', 
                  borderRadius: '3px', 
                  fontWeight: '500',
                  cursor: selectedFriends.length > 0 ? 'pointer' : 'not-allowed'
                }}
              >
                {selectedFriends.length > 1 ? "Crear grupo" : "Crear mensaje"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HomeSecondSidebar;