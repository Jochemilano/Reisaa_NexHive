import React, { useRef } from "react";
import Modal from "@/components/modal/Modal";
import { FaCamera, FaSignOutAlt } from "react-icons/fa";
import { updateProfilePic } from "@/utils/profile";
import { CONFIG } from "@/utils/config";
import "./ProfileModal.css";
import { getAvatarUrl } from "@/utils/media";

const ROL_LABEL = {
  admin: "Administrador",
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

 return (
    <Modal isOpen={isOpen} onClose={onClose} className="personal-profile-modal">
      <div className="profile-banner" />
      
      <div className="profile-content">
        <div className="profile-pic-section">
          <div className="profile-pic-wrapper" onClick={() => fileRef.current.click()} title="Cambiar foto de perfil">
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
        </div>

        <div className="profile-info">
          <h2 className="profile-name">{perfil?.name}</h2>
          <p className="profile-email">{perfil?.email}</p>
          <div className="profile-badges">
            <span className="profile-role-badge">
              {perfil?.rol ? (ROL_LABEL[perfil.rol.toLowerCase()] || perfil.rol) : "Usuario"}
            </span>
          </div>
        </div>

        <div className="profile-divider" />

        <div className="profile-actions">
          <button className="log-out-btn" onClick={onLogout}>
            <FaSignOutAlt /> Cerrar sesión
          </button>
          <button className="profile-close-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </Modal>
  );
};

export default ProfileModal;