import React from "react";
import Modal from "@/components/modal/Modal";
import Skeleton from "@/components/loading/Skeleton";
import { getAvatarUrl } from "@/utils/media";
import { FaPhone, FaBirthdayCake, FaInfoCircle, FaCalendarAlt, FaUserPlus, FaComments, FaVideo, FaClock } from "react-icons/fa";
import "./UserDetailModal.css";

const ROL_LABEL = {
  admin: "Administrador",
  user: "Usuario",
};

const UserDetailModal = ({ isOpen, onClose, user, loading, onAddFriend, onNavigateToChat, onStartCall }) => {
  const isFriend = user?.friendship_status === 'accepted';
  const isPending = user?.friendship_status === 'pending';

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="simple-profile-v3">
      <div className="v3-container">
        
        {/* PARTE SUPERIOR: IDENTIDAD */}
        <div className="v3-header">
          <div className="v3-avatar-section">
            <div className="v3-avatar-wrapper">
              {loading ? (
                <Skeleton width="100%" height="100%" borderRadius="50%" />
              ) : user?.profile_pic ? (
                <img src={getAvatarUrl(user.profile_pic)} alt="User" className="v3-img" />
              ) : (
                <div className="v3-placeholder">
                  {user?.first_name?.[0]?.toUpperCase() || user?.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {!loading && <div className={`v3-status-dot ${user?.rol === 'admin' ? 'admin' : ''}`} />}
          </div>

          <div className="v3-basic-info">
            {loading ? (
              <>
                <Skeleton width="150px" height="24px" className="mb-2" />
                <Skeleton width="100px" height="14px" />
              </>
            ) : (
              <>
                <h2 className="v3-name">{user?.first_name} {user?.last_name}</h2>
                <div className="v3-meta">
                  <span className="v3-nickname">@{user?.name}</span>
                  <span className="v3-role">({user?.rol ? (ROL_LABEL[user.rol.toLowerCase()] || user.rol) : "Usuario"})</span>
                </div>
                <p className="v3-email">{user?.email}</p>
                {user?.created_at && (
                  <div className="v3-member-since">
                    <FaCalendarAlt /> 
                    <span>Miembro desde {new Date(user.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="v3-body">
          {!loading && (
            <div className="v3-view-mode">
              <div className="v3-section">
                <div className="v3-section-label">BIOGRAFÍA</div>
                <p className="v3-bio-text">{user?.bio || "No hay biografía disponible."}</p>
              </div>

              {/* Solo mostrar si son amigos */}
              {isFriend && (
                <div className="v3-section">
                  <div className="v3-section-label">DETALLES PRIVADOS</div>
                  <div className="v3-details-list">
                    <div className="v3-detail-item">
                      <FaPhone />
                      <div className="v3-detail-content">
                        <label>Celular</label>
                        <span>{user?.phone || "No registrado"}</span>
                      </div>
                    </div>
                    <div className="v3-detail-item">
                      <FaBirthdayCake />
                      <div className="v3-detail-content">
                        <label>Cumpleaños</label>
                        <span>
                          {user?.birthday 
                            ? new Date(user.birthday.split('T')[0] + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
                            : "No registrado"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="v3-footer">
                {isFriend ? (
                  <div className="v3-friend-actions">
                    <button className="v3-btn-primary" onClick={onNavigateToChat}>
                      <FaComments /> Enviar Mensaje
                    </button>
                    <button className="v3-btn-outline" onClick={onStartCall}>
                      <FaVideo /> Llamada
                    </button>
                  </div>
                ) : isPending ? (
                  <button className="v3-btn-disabled" disabled>
                    <FaClock /> Solicitud Pendiente
                  </button>
                ) : (
                  <button className="v3-btn-primary" onClick={() => onAddFriend(user.id)}>
                    <FaUserPlus /> Enviar Solicitud de Amistad
                  </button>
                )}
                
                <div className="v3-footer-secondary">
                  <span /> {/* Spacer */}
                  <button className="v3-btn-close" onClick={onClose}>Cerrar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default UserDetailModal;
