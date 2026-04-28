import React, { useState, useRef, useEffect } from "react";
import { FaTimes, FaSearch, FaUserPlus, FaCheck } from "react-icons/fa";
import { addFriend } from "@/utils/friends";
import "./CollaboratorPicker.css";

const CollaboratorPicker = ({ availableUsers = [], selectedCollaborators = [], onSelect, onRemove }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Filtrar usuarios basados en la búsqueda
  const filteredUsers = availableUsers.filter(user => {
    const name = user.name || user.username || `Usuario ${user.id}`;
    const email = user.email || "";
    const searchLower = searchQuery.toLowerCase();
    
    // Si no hay búsqueda, solo mostramos amigos
    if (searchQuery.trim() === "") {
      return user.isFriend;
    }

    return name.toLowerCase().includes(searchLower) || email.toLowerCase().includes(searchLower);
  });

  // Ordenar para que los amigos salgan primero si hay búsqueda
  if (searchQuery.trim() !== "") {
    filteredUsers.sort((a, b) => {
      if (a.isFriend === b.isFriend) return 0;
      return a.isFriend ? -1 : 1;
    });
  }

  // Cerrar el dropdown al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleSelect = (user) => {
    onSelect({ target: { value: user.id } });
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

  const handleAddFriend = async (e, userId) => {
    e.stopPropagation();
    try {
      await addFriend(userId);
      // Actualizar localmente para mostrar que ya es amigo (aunque lo ideal sería recargar la lista)
      // En este caso, como availableUsers viene de props, el padre debería refrescar.
      // Pero para feedback inmediato podemos intentar algo, o simplemente confiar en que el usuario verá el cambio al reabrir.
      // Por simplicidad, alertamos éxito.
      alert("Solicitud de amistad enviada");
    } catch (err) {
      console.error(err);
      alert("Error al agregar amigo");
    }
  };

  return (
    <div className="collaborator-picker">
      <div className="collaborator-picker__search-wrapper" ref={wrapperRef}>
        <label className="input-label">Agregar colaboradores</label>
        <div className="collaborator-picker__input-container">
          <FaSearch className="collaborator-picker__search-icon" />
          <input
            type="text"
            className="input-field collaborator-picker__input"
            placeholder="Buscar por nombre o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsDropdownOpen(true)}
          />
        </div>

        {isDropdownOpen && (
          <div className="collaborator-picker__dropdown">
            {filteredUsers.length > 0 ? (
              <ul className="collaborator-picker__dropdown-list">
                {filteredUsers.map(user => (
                  <li 
                    key={user.id} 
                    className="collaborator-picker__dropdown-item"
                    onClick={() => handleSelect(user)}
                  >
                    <div className="user-info">
                      <span className="user-name">{user.name || user.username || `Usuario ${user.id}`}</span>
                      {user.email && <span className="user-email">{user.email}</span>}
                    </div>
                    
                    <div className="user-actions">
                      {user.isFriend ? (
                        <span className="friend-badge" title="Es tu amigo">
                          <FaCheck /> Amigo
                        </span>
                      ) : (
                        <button 
                          className="add-friend-btn" 
                          title="Agregar a amigos"
                          onClick={(e) => handleAddFriend(e, user.id)}
                        >
                          <FaUserPlus />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="collaborator-picker__dropdown-empty">
                {searchQuery.trim() === "" 
                  ? "Busca usuarios por nombre o correo para agregarlos" 
                  : "No se encontraron usuarios"}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCollaborators.length > 0 && (
        <div className="collaborator-picker__list-wrapper">
          <p className="collaborator-picker__list-title">
            Colaboradores seleccionados ({selectedCollaborators.length}):
          </p>
          <ul className="collaborator-picker__list">
            {selectedCollaborators.map(c => (
              <li key={c.id} className="collaborator-picker__item">
                <span>{c.name || c.username || `Usuario ${c.id}`}</span>
                <button
                  type="button"
                  onClick={() => onRemove(c.id)}
                  className="collaborator-picker__remove-btn"
                >
                  <FaTimes />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CollaboratorPicker;