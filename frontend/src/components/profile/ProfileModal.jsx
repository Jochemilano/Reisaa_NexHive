import React, { useRef } from "react";
import Modal from "@/components/modal/Modal";
import { FaCamera } from "react-icons/fa";
import { updateProfilePic } from "@/utils/profile";
import { CONFIG } from "@/utils/config";
import "./ProfileModal.css";
import { getAvatarUrl } from "@/utils/media";

const ROL_LABEL = {
  admin: "Admin",
  user: "Usuario",
};

const ProfileModal = ({ isOpen, onClose, perfil, onPicUpdated, onLogout }) => {
  const fileRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${CONFIG.BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      await updateProfilePic(data.url);
      onPicUpdated?.(data.url);
    } catch (err) {
      console.error("Error subiendo foto:", err);
    }
  };

  // Mapeo de clase de estado
  const statusClass = { 1: "activo", 2: "desactivado", 3: "no-molestar" }[perfil?.status] || "desconocido";
  const statusText = { 1: "Activo", 2: "Desactivado", 3: "No molestar" }[perfil?.status] || "Desconocido";

 return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="profile-card">
        <div className="profile-banner" />
        
        <div className="profile-content">
          <div className="profile-pic-section">
            <div className="profile-pic-wrapper" onClick={() => fileRef.current.click()}>
              {perfil?.profile_pic ? (
                <img
                  src={getAvatarUrl(perfil.profile_pic)}
                  alt="Perfil"
                  className="profile-pic"
                />
          ) : (
            <div className="profile-pic-placeholder">
              {perfil?.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="profile-pic-overlay"><FaCamera /></div>
            </div>
            <div className={`status-badge ${statusClass}`} title={statusText} />
          </div>

        <div className="user-details">
            <h2 className="name">{perfil?.name}</h2>
            <p className="email">{perfil?.email}</p>
            <span className="role-badge">
              {perfil?.rol ? (ROL_LABEL[perfil.rol.toLowerCase()] || perfil.rol) : "Invitado"}
            </span>
          </div>

          <div className="divider" />

          <button className="log-out" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>
    </Modal>
  );
};

export default ProfileModal;