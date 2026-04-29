import React, { useRef, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Draggable } from "@hello-pangea/dnd";
import { FaCalendarAlt, FaEye, FaEdit, FaTrash, FaUser } from "react-icons/fa";
import { BsThreeDots } from "react-icons/bs";
import "./KanbanBoard.css";

const formatDate = (d) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
};

const isOverdue = (date, status) => {
  if (!date) return false;
  const isDone = status === "done" || status === "completed";
  return new Date(date) < new Date() && !isDone;
};

// Dropdown renderizado en portal para escapar el overflow del contenedor
const DropdownPortal = ({ anchorRef, onView, onEdit, onDelete, onClose }) => {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.right + window.scrollX - 164, // alineado a la derecha del botón
    });
  }, [anchorRef]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      className="kanban-card__dropdown"
      style={{ position: "fixed", top: pos.top, left: pos.left }}
      onClick={(e) => e.stopPropagation()}
    >
      <button className="kanban-card__dropdown-item" onClick={() => { onView(); onClose(); }}>
        <FaEye /> Ver detalles
      </button>
      <button className="kanban-card__dropdown-item" onClick={() => { onEdit(); onClose(); }}>
        <FaEdit /> Editar
      </button>
      <button
        className="kanban-card__dropdown-item kanban-card__dropdown-item--danger"
        onClick={() => { onDelete(); onClose(); }}
      >
        <FaTrash /> Eliminar
      </button>
    </div>,
    document.body
  );
};

const KanbanCard = ({ activity, index, onView, onEdit, onDelete }) => {
  const overdue = isOverdue(activity.deadline, activity.status);
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef(null);

  return (
    <Draggable draggableId={String(activity.id)} index={index}>
      {(provided, snapshot) => (
        <div
          className={`kanban-card ${snapshot.isDragging ? "kanban-card--dragging" : ""} ${overdue ? "kanban-card--overdue" : ""}`}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          {/* Header */}
          <div className="kanban-card__header">
            <span className="kanban-card__title">{activity.name}</span>
            <button
              ref={btnRef}
              className="kanban-card__menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
            >
              <BsThreeDots />
            </button>
          </div>

          {/* Menú en portal */}
          {menuOpen && (
            <DropdownPortal
              anchorRef={btnRef}
              onView={() => onView(activity)}
              onEdit={() => onEdit(activity)}
              onDelete={() => onDelete(activity)}
              onClose={() => setMenuOpen(false)}
            />
          )}

          {/* Descripción corta */}
          {activity.description && (
            <p className="kanban-card__desc">
              {activity.description.length > 80
                ? activity.description.slice(0, 80) + "…"
                : activity.description}
            </p>
          )}

          {/* Footer */}
          <div className="kanban-card__footer">
            <span className="kanban-card__owner">
              <FaUser />
              {activity.owner_name || "—"}
            </span>
            {activity.deadline && (
              <span className={`kanban-card__date ${overdue ? "kanban-card__date--overdue" : ""}`}>
                <FaCalendarAlt />
                {formatDate(activity.deadline)}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default KanbanCard;
