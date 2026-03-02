import Modal from "components/modal/Modal";
import { FaCircle, FaTimesCircle, FaQuestionCircle, FaMinusCircle } from "react-icons/fa";
import SearchBar from "components/searchbar/Searchbar";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "utils/apiClient";
import "./TopBar.css";

const TopBar = () => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  //LOGOUT
  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  useEffect(() => {
    const fetchPerfil = async () => {
      try {
        const data = await apiFetch("perfil"); // ✅ usamos apiFetch
        setPerfil(data);
      } catch (err) {
        console.error("Error al traer perfil:", err);
      }
    };

    fetchPerfil();
  }, []);

  return (
    <header className="topbar">
      <SearchBar />

      <Modal.Button text="N" onClick={() => setIsNotifOpen(true)}/>
      <Modal.Button text="P" onClick={() => setIsOpen(true)}/>
      
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <Modal.Body>
          <p>{perfil?.name}</p>
          <p>{perfil?.email}</p>
          <p>{perfil?.rol === 1 ? "Owner" : perfil?.status === 2 ? "Admin" : perfil?.status === 3 ? "IT" : perfil?.status === 4 ? "Tecnico" : "Invitado"}</p>
          <p>
            <div className="status-container">
              {perfil?.status === 1 ? (<><FaCircle className="icon activo" />Activo</>) :
              perfil?.status === 2 ? (<><FaTimesCircle className="icon desactivado" />Desactivado</>) :
              perfil?.status === 3 ? (<><FaMinusCircle className="icon no-molestar" />No molestar</>) :
              (<><FaQuestionCircle className="icon desconocido" />Desconocido</>)}
            </div>
          </p>
          <button className="log-out" onClick={logout}>Cerrar sesión</button>
        </Modal.Body>
      </Modal>

      <Modal isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)}>
        <Modal.Header onClose={() => setIsNotifOpen(false)}>Notificaciones</Modal.Header>
        <Modal.Body>
          <p>Información notificaciones</p>
          <p>Noti 1</p>
          <p>Información notifi</p>
        </Modal.Body>
      </Modal>
    </header>
  );
};

export default TopBar;