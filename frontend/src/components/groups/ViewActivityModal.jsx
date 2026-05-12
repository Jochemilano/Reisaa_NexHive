// components/groups/ViewActivityModal
import React, { useEffect, useState } from "react";
import Modal from "@/components/modal/Modal";
import { apiFetch } from "@/utils/apiClient";
import "./ViewActivityModal.css";
import { FaIdBadge, FaAlignLeft, FaUserTie, FaCalendarAlt, FaFlagCheckered, FaClock } from "react-icons/fa";
import { getAvatarUrl } from "@/utils/media";
import { useUserDetail } from "@/context/UserDetailContext";

const STATUS_LABELS = {
  pending: "Pendiente",
  "in-progress": "En progreso",
  in_progress: "En progreso",
  completed: "Completada",
  done: "Completada",
  cancelled: "Cancelada",
};

const formatDate = (d, numeric = false) => {
  if (!d) return "—";
  const date = new Date(d);
  if (numeric) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const ViewActivityModal = ({ isOpen, onClose, activityId }) => {
  const [activity, setActivity] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showUserProfile } = useUserDetail();

  useEffect(() => {
    if (!isOpen || !activityId) return;
    setLoading(true);
    
    Promise.all([
      apiFetch(`activities/${activityId}`),
      apiFetch(`activities/${activityId}/users`).catch(() => [])
    ])
      .then(([activityData, collaboratorsData]) => {
        setActivity(activityData);
        setCollaborators(collaboratorsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, activityId]);

  const renderAvatarFallback = (user) => {
    const firstLetter = user.name ? user.name[0].toUpperCase() : "?";
    return (
      <div 
        className="avatar-letter-fallback"
        onClick={(e) => {
          e.stopPropagation();
          showUserProfile(user.id || user.owner_id);
        }}
      >
        {firstLetter}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="view-activity-modal">
      <Modal.Header onClose={onClose}>Detalle de actividad</Modal.Header>
      <Modal.Body>
        {loading && <p className="modal-loading">Cargando...</p>}
        {!loading && activity && (
          <div className="activity-detail">
            <div className="activity-detail__section">
              <div className="activity-detail__field main-title">
                <span className="activity-detail__value name-highlight">{activity.name}</span>
              </div>

              <div className="activity-detail__field">
                <span className="activity-detail__label">
                  <FaAlignLeft />
                  Descripción
                </span>
                <p className="activity-detail__description">
                  {activity.description || "Sin descripción"}
                </p>
              </div>
            </div>

            <div className="activity-detail__grid">
              <div className="activity-detail__field">
                <span className="activity-detail__label">
                  <FaUserTie />
                  Responsable
                </span>
                <div className="user-info-chip" onClick={() => showUserProfile(activity.owner_id)}>
                  {activity.owner_avatar ? (
                    <img 
                      src={getAvatarUrl(activity.owner_avatar)} 
                      alt={activity.owner_name} 
                      className="chip-avatar"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="avatar-letter-fallback mini" style={{ display: activity.owner_avatar ? 'none' : 'flex' }}>
                    {activity.owner_name ? activity.owner_name[0].toUpperCase() : "?"}
                  </div>
                  <span className="activity-detail__value">{activity.owner_name || "—"}</span>
                </div>
              </div>

              <div className="activity-detail__field">
                <span className="activity-detail__label">
                  <FaClock />
                  Estado
                </span>
                <span className={`activity-status activity-status--${activity.status}`}>
                  {STATUS_LABELS[activity.status] ?? activity.status}
                </span>
              </div>

              <div className="activity-detail__field">
                <span className="activity-detail__label">
                  <FaCalendarAlt />
                  Inicio
                </span>
                <span className="activity-detail__value">{formatDate(activity.start_date, true)}</span>
              </div>

              <div className="activity-detail__field">
                <span className="activity-detail__label">
                  <FaFlagCheckered />
                  Límite
                </span>
                <span className={`activity-detail__value ${new Date(activity.deadline) < new Date() && activity.status !== 'completed' ? 'overdue' : ''}`}>
                  {formatDate(activity.deadline, true)}
                </span>
              </div>
            </div>

            {collaborators.length > 0 && (
              <div className="activity-detail__collaborators">
                <span className="activity-detail__label">Colaboradores</span>
                <div className="collaborators-list">
                  {collaborators.map(user => {
                    const isOwner = user.id === activity.owner_id;
                    return (
                      <div 
                        key={user.id} 
                        className={`collaborator-item ${isOwner ? 'is-owner' : ''}`} 
                        title={isOwner ? `${user.name} (Responsable)` : user.name} 
                        onClick={() => showUserProfile(user.id)}
                      >
                        {user.avatar ? (
                          <img 
                            src={getAvatarUrl(user.avatar)} 
                            alt={user.name} 
                            className="collaborator-avatar"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="avatar-letter-fallback mini" style={{ display: user.avatar ? 'none' : 'flex' }}>
                          {user.name ? user.name[0].toUpperCase() : "?"}
                        </div>
                        <span className="collaborator-name">
                          {user.name}
                          {isOwner && <span className="owner-badge">👑</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer onClose={onClose} />
    </Modal>
  );
};

export default ViewActivityModal;