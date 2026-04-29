import React, { useState, useEffect } from "react";
import { DragDropContext } from "@hello-pangea/dnd";
import KanbanColumn from "./KanbanColumn";
import { updateActivity } from "@/utils/activities";
import { FaSearch, FaTimes } from "react-icons/fa";
import "./KanbanBoard.css";

// Normaliza cualquier variante de status al key de columna
const normalizeStatus = (status) => {
  if (status === "in-progress" || status === "in_progress") return "in_progress";
  if (status === "completed") return "done";
  return status || "pending";
};

const normalize = (str) =>
  str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || "";

const COLUMN_ORDER = ["pending", "in_progress", "done"];

const KanbanBoard = ({ activities, onView, onEdit, onDelete, onStatusChanged }) => {
  const [columns, setColumns] = useState({ pending: [], in_progress: [], done: [] });
  const [search, setSearch] = useState("");

  // Distribuir actividades en columnas cuando cambian
  useEffect(() => {
    const cols = { pending: [], in_progress: [], done: [] };
    activities.forEach((a) => {
      const key = normalizeStatus(a.status);
      if (cols[key]) cols[key].push(a);
      else cols.pending.push(a);
    });
    setColumns(cols);
  }, [activities]);

  // Filtrar por búsqueda
  const filterCol = (list) => {
    if (!search.trim()) return list;
    const term = normalize(search);
    return list.filter(
      (a) =>
        normalize(a.name).includes(term) ||
        normalize(a.owner_name).includes(term) ||
        normalize(a.description).includes(term)
    );
  };

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;

    const srcCol = source.droppableId;
    const dstCol = destination.droppableId;
    const activityId = parseInt(draggableId);

    const activity = columns[srcCol].find((a) => a.id === activityId);
    if (!activity) return;

    // Optimistic update
    const newCols = { ...columns };
    newCols[srcCol] = newCols[srcCol].filter((a) => a.id !== activityId);
    const movedActivity = { ...activity, status: dstCol };
    newCols[dstCol] = [
      ...newCols[dstCol].slice(0, destination.index),
      movedActivity,
      ...newCols[dstCol].slice(destination.index),
    ];
    setColumns(newCols);

    try {
      await updateActivity(activityId, {
        name: activity.name,
        description: activity.description || "",
        status: dstCol,
        start_date: activity.start_date || null,
        deadline: activity.deadline || null,
      });
      if (onStatusChanged) onStatusChanged();
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      setColumns(columns);
    }
  };

  const totalVisible = COLUMN_ORDER.reduce(
    (acc, colId) => acc + filterCol(columns[colId] || []).length,
    0
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="kanban-wrapper">
        {/* Buscador del Kanban */}
        <div className="kanban-search-bar">
          <FaSearch className="kanban-search-icon" />
          <input
            type="text"
            className="kanban-search-input"
            placeholder="Buscar actividad, responsable..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="kanban-search-clear" onClick={() => setSearch("")}>
              <FaTimes />
            </button>
          )}
          {search && (
            <span className="kanban-search-results">
              {totalVisible} resultado{totalVisible !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Tablero */}
        <div className="kanban-board">
          {COLUMN_ORDER.map((colId) => (
            <KanbanColumn
              key={colId}
              columnId={colId}
              activities={filterCol(columns[colId] || [])}
              totalInCol={columns[colId]?.length || 0}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
