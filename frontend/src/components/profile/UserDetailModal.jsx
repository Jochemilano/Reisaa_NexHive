import React from "react";
import Modal from "@/components/modal/Modal";
import { getAvatarUrl } from "@/utils/media";
import "./UserDetailModal.css";

const ROL_LABEL = {
  admin: "Administrador",
  user: "Usuario",
};

const UserDetailModal = ({ isOpen, onClose, user }) => {
  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="user-profile-modal">
      <div className="user-detail-banner" />
      
      <div className="user-detail-content">
        <div className="user-detail-pic-section">
          <div className="user-detail-pic-wrapper">
            {user.profile_pic ? (
              <img
                src={getAvatarUrl(user.profile_pic)}
                alt={user.name}
                className="user-detail-pic"
              />
            ) : (
              <div className="user-detail-pic-placeholder">
                {user.name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="user-info">
          <h2 className="user-name">{user.name}</h2>
          <p className="user-email">{user.email}</p>
          <div className="user-badges">
            <span className="user-role-badge">
              {ROL_LABEL[user.rol?.toLowerCase()] || user.rol || "Usuario"}
            </span>
          </div>
        </div>

        <div className="user-detail-divider" />

        <div className="user-actions">
          <button className="user-close-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default UserDetailModal;
