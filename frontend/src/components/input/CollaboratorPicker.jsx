import React, { useState, useRef, useEffect } from "react";
import { FaTimes, FaSearch } from "react-icons/fa";
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
    return name.toLowerCase().includes(searchLower) || email.toLowerCase().includes(searchLower);
  });

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
    // Simulamos el evento 'e.target.value' para no romper los componentes padres
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
                    <span className="user-name">{user.name || user.username || `Usuario ${user.id}`}</span>
                    {user.email && <span className="user-email">{user.email}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="collaborator-picker__dropdown-empty">
                {availableUsers.length === 0 ? "No hay más usuarios disponibles" : "No se encontraron usuarios"}
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