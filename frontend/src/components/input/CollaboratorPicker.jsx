import React, { useState, useRef, useEffect } from "react";
import { FaTimes, FaSearch } from "react-icons/fa";
import "./CollaboratorPicker.css";

const CollaboratorPicker = ({ availableUsers = [], selectedCollaborators = [], onSelect, onRemove, showAllByDefault = false, ownerId = null }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Filtrar usuarios basados en la búsqueda
  const filteredUsers = availableUsers.filter(user => {
    const name = user.name || user.username || `Usuario ${user.id}`;
    const email = user.email || "";
    const searchLower = searchQuery.toLowerCase();

    // Si no hay búsqueda
    if (searchQuery.trim() === "") {
      return showAllByDefault || user.isFriend;
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
                    <div className="collaborator-picker__user-info">
                      <div className="collaborator-picker__user-name">{user.name || user.username || `Usuario ${user.id}`}</div>
                      {user.email && <div className="collaborator-picker__user-email">{user.email}</div>}
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
            Colaboradores seleccionados
          </p>
          <ul className="collaborator-picker__list">
            {selectedCollaborators.map(c => {
              const isOwner = Number(c.id) === Number(ownerId);
              return (
                <li
                  key={c.id}
                  className={`collaborator-picker__item ${isOwner ? 'is-owner' : ''}`}
                  data-email={c.email || ''}
                >
                  <span className="collaborator-picker__item-name">
                    {c.name || c.username || `Usuario ${c.id}`}
                    {isOwner && <span className="owner-badge" title="Responsable">👑</span>}
                  </span>
                  {!isOwner && (
                    <button
                      type="button"
                      onClick={() => onRemove(c.id)}
                      className="collaborator-picker__remove-btn"
                      aria-label={`Quitar a ${c.name || c.username || 'usuario'}`}
                    >
                      <FaTimes />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CollaboratorPicker;