import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "@/components/modal/Modal";
import SearchBar from "@/components/searchbar/Searchbar";
import ProfileModal from "@/components/profile/ProfileModal";
import { getProfile } from "@/utils/profile";
import "./TopBar.css";

const TopBar = () => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const navigate = useNavigate();

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  useEffect(() => {
    getProfile()
      .then(setPerfil)
      .catch((err) => console.error("Error al traer perfil:", err));
  }, []);

  const handlePicUpdated = (nuevaRuta) => {
    setPerfil((prev) => ({ ...prev, profile_pic: nuevaRuta }));
  };

  return (
    <header className="topbar">
      <SearchBar />
      <Modal.Button text="N" onClick={() => setIsNotifOpen(true)} />
      <Modal.Button text="P" onClick={() => setIsProfileOpen(true)} />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        perfil={perfil}
        onPicUpdated={handlePicUpdated}
        onLogout={logout}
        onProfileUpdated={(newData) => setPerfil(prev => ({ ...prev, ...newData }))}
      />

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