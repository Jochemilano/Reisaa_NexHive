import React from "react";
import { Droppable } from "@hello-pangea/dnd";
import KanbanCard from "./KanbanCard";
import "./KanbanBoard.css";

const COLUMN_CONFIG = {
  pending: {
    label: "Pendiente",
    colorClass: "kanban-col--pending",
    dotClass: "kanban-dot--pending",
  },
  in_progress: {
    label: "En progreso",
    colorClass: "kanban-col--progress",
    dotClass: "kanban-dot--progress",
  },
  done: {
    label: "Completada",
    colorClass: "kanban-col--done",
    dotClass: "kanban-dot--done",
  },
};

const KanbanColumn = ({ columnId, activities, totalInCol, onView, onEdit, onDelete }) => {
  const config = COLUMN_CONFIG[columnId] || {
    label: columnId,
    colorClass: "",
    dotClass: "",
  };

  return (
    <div className={`kanban-col ${config.colorClass}`}>
      {/* Header */}
      <div className="kanban-col__header">
        <div className="kanban-col__title-row">
          <span className={`kanban-dot ${config.dotClass}`} />
          <h3 className="kanban-col__title">{config.label}</h3>
        </div>
        <span className="kanban-col__count">
          {totalInCol !== undefined && totalInCol !== activities.length
            ? `${activities.length}/${totalInCol}`
            : activities.length}
        </span>
      </div>

      {/* Área droppable */}
      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            className={`kanban-col__body ${snapshot.isDraggingOver ? "kanban-col__body--over" : ""}`}
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {activities.map((activity, index) => (
              <KanbanCard
                key={activity.id}
                activity={activity}
                index={index}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
            {provided.placeholder}

            {activities.length === 0 && !snapshot.isDraggingOver && (
              <div className="kanban-col__empty">Sin actividades</div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
