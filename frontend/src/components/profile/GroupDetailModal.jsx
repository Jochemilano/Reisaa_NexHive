import React, { useState } from "react";
import Modal from "@/components/modal/Modal";
import { getAvatarUrl } from "@/utils/media";
import { FaUsers, FaCrown, FaSignOutAlt, FaTrashAlt, FaExchangeAlt } from "react-icons/fa";
import { apiFetch } from "@/utils/apiClient";
import Skeleton from "@/components/loading/Skeleton";
import "./GroupDetailModal.css";

const GroupDetailModal = ({ isOpen, onClose, group, loading: loadingData, onMemberClick }) => {
  const [loading, setLoading] = useState(false);
  const currentUserId = parseInt(localStorage.getItem("userId"));

  const isOwner = group?.owner_id === currentUserId;
  const isGroup = group?.type === 'group';

  const handleLeave = async () => {
    if (isOwner) {
      alert("No puedes salirte siendo el dueño. Transfiere el mando a otro integrante primero.");
      return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres salir de ${group?.name || 'este chat'}?`)) return;

    setLoading(true);
    try {
      const endpoint = isGroup ? `groups/${group.id}/leave` : `rooms/${group.id}/leave`;
      await apiFetch(endpoint, { method: "POST" });
      onClose();
      window.location.reload(); // Recargar para actualizar listas
    } catch (err) {
      alert(err.message || "Error al salir");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿ESTÁS SEGURO? Esta acción eliminará permanentemente el ${isGroup ? 'grupo' : 'chat'} "${group?.name || ''}" y todos sus mensajes.`)) return;

    setLoading(true);
    try {
      const endpoint = isGroup ? `groups/${group.id}` : `rooms/${group.id}`;
      await apiFetch(endpoint, { method: "DELETE" });
      onClose();
      window.location.reload();
    } catch (err) {
      alert(err.message || "Error al eliminar");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (newOwnerId, memberName) => {
    if (!isOwner) return;
    if (newOwnerId === currentUserId) return;

    if (!window.confirm(`¿Quieres transferir la propiedad a ${memberName}? Ya no tendrás control total sobre el ${isGroup ? 'grupo' : 'chat'}.`)) return;

    setLoading(true);
    try {
      const endpoint = isGroup ? `groups/${group.id}/transfer` : `rooms/${group.id}/transfer`;
      await apiFetch(endpoint, {
        method: "PATCH",
        body: JSON.stringify({ newOwnerId })
      });
      alert(`Ahora ${memberName} es el dueño.`);
      onClose();
      window.location.reload();
    } catch (err) {
      alert(err.message || "Error al transferir");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="group-profile-modal">
      <div className="group-detail-banner">
        {group?.avatar ? (
          <img src={getAvatarUrl(group.avatar)} alt={group?.name} className="group-banner-img" />
        ) : (
          <div className="group-banner-placeholder">
            <FaUsers />
          </div>
        )}
        <div className="group-banner-overlay" />
      </div>

      <div className="group-detail-content">
        <div className="group-info-section">
          <h2 className="group-name">{loadingData ? <Skeleton width="150px" height="24px" /> : group?.name}</h2>
          <p className="group-meta">
            <FaUsers /> {loadingData ? <Skeleton width="80px" height="14px" /> : (group?.members?.length || 0) + " miembros"}
          </p>
        </div>

        <div className="group-detail-divider" />

        <div className="members-section">
          <h3 className="section-title">Integrantes</h3>
          <div className="members-list">
            {loadingData ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={`member-skeleton-${i}`} className="member-item">
                  <Skeleton width="32px" height="32px" circle />
                  <Skeleton width="100px" height="14px" />
                </div>
              ))
            ) : group?.members?.map((member) => (
              <div
                key={member.id}
                className="member-item"
                onClick={() => onMemberClick(member.id)}
              >
                <div 
                  className="member-avatar-wrapper"
                >
                  {member.profile_pic ? (
                    <img
                      src={getAvatarUrl(member.profile_pic)}
                      alt={member.name}
                      className="member-avatar"
                    />
                  ) : (
                    <div className="member-avatar-placeholder">
                      {member.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  {member.id === group.owner_id && (
                    <div className="owner-crown" title="Dueño">
                      <FaCrown />
                    </div>
                  )}
                </div>
                <span className="member-name">
                  {member.name}
                </span>
                
                {isOwner && member.id !== currentUserId && (
                  <button 
                    className="transfer-btn" 
                    title="Transferir propiedad"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTransfer(member.id, member.name);
                    }}
                    disabled={loading}
                  >
                    <FaExchangeAlt />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="group-actions">
          {loadingData ? (
            <Skeleton width="100%" height="40px" borderRadius="8px" />
          ) : (
            <>
              {isOwner ? (
                <button className="action-btn danger-btn" onClick={handleDelete} disabled={loading}>
                  <FaTrashAlt /> Eliminar {isGroup ? 'Grupo' : 'Chat'}
                </button>
              ) : (
                <button className="action-btn leave-btn" onClick={handleLeave} disabled={loading}>
                  <FaSignOutAlt /> Salir del {isGroup ? 'Grupo' : 'Chat'}
                </button>
              )}
            </>
          )}
          
          <button className="group-close-btn" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default GroupDetailModal;

