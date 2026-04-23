// components/groups/ViewActivityModal
import React, { useEffect, useState } from "react";
import Modal from "@/components/modal/Modal";
import { apiFetch } from "@/utils/apiClient";
import "./ViewActivityModal.css";
import { FaIdBadge, FaAlignLeft, FaUserTie, FaCalendarAlt, FaFlagCheckered, FaClock } from "react-icons/fa";

const STATUS_LABELS = {
  pending: "Pendiente",
  "in-progress": "En progreso",
  in_progress: "En progreso",
  completed: "Completada",
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !activityId) return;
    setLoading(true);
    apiFetch(`activities/${activityId}`)
      .then(setActivity)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, activityId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <Modal.Header onClose={onClose}>Detalle de actividad</Modal.Header>
      <Modal.Body>
        {loading && <p className="modal-loading">Cargando...</p>}
        {!loading && activity && (
          <div className="activity-detail">
            <div className="activity-detail__field">
              <span className="activity-detail__label">
                <FaIdBadge style={{ marginRight: "6px" }} />
                Nombre:
              </span>
              <span className="activity-detail__value">{activity.name}</span>
            </div>

            <div className="activity-detail__field">
              <span className="activity-detail__label">
                <FaAlignLeft style={{ marginRight: "6px" }} />
                Descripción:
              </span>
              <span className="activity-detail__value">
                {activity.description || "Sin descripción"}
              </span>
            </div>

            <div className="activity-detail__field">
              <span className="activity-detail__label">
                <FaUserTie style={{ marginRight: "6px" }} />
                Responsable:
              </span>
              <span className="activity-detail__value">
                {activity.owner_name || "—"}
              </span>
            </div>

            <div className="activity-detail__row">
              <div className="activity-detail__field">
                <span className="activity-detail__label">
                  <FaCalendarAlt style={{ marginRight: "6px" }} />
                  Fecha inicio:
                </span>
                <span className="activity-detail__value">{formatDate(activity.start_date, true)}</span>
              </div>
              <div className="activity-detail__field">
                <span className="activity-detail__label">
                  <FaFlagCheckered style={{ marginRight: "6px" }} />
                  Fecha límite:
                </span>
                <span className="activity-detail__value">{formatDate(activity.deadline, true)}</span>
              </div>
            </div>

            <div className="activity-detail__field">
              <span className="activity-detail__label">
                <FaClock style={{ marginRight: "6px" }} />
                Estado:
              </span>
              <span className={`activity-status activity-status--${activity.status}`}>
                {STATUS_LABELS[activity.status] ?? activity.status}
              </span>
            </div>

          </div>
        )}
      </Modal.Body>
      <Modal.Footer onClose={onClose} />
    </Modal>
  );
};

export default ViewActivityModal;