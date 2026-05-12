import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { fetchGroupProjects, fetchProjectDetails } from "@/utils/projects";
import CreateActivityModal from "@/components/groups/CreateActivityModal";
import EditActivityModal from "@/components/groups/EditActivityModal";
import ViewActivityModal from "@/components/groups/ViewActivityModal";
import Modal from "@/components/modal/Modal";
import { BsThreeDots } from "react-icons/bs";
import { useGroup } from "@/context/GroupContext";
import { FaEye, FaEdit, FaTrash, FaSort, FaSortUp, FaSortDown, FaCalendarAlt, FaCheck, FaClock, FaThumbtack, FaChevronRight, FaTable, FaThLarge, FaRocket } from "react-icons/fa";
import { apiFetch } from "@/utils/apiClient";
import { deleteActivity } from "@/utils/activities";
import { useCalendar } from "@/context/CalendarContext";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import GanttChart from "@/components/gantt/GanttChart";
import { useUserDetail } from "@/context/UserDetailContext";
import { getAvatarUrl } from "@/utils/media";
import Skeleton from "@/components/loading/Skeleton";
import { toast } from "sonner";
import "./GroupPage.css";
import "@/components/kanban/KanbanBoard.css";
import "@/components/gantt/GanttChart.css";

// Mapeo centralizado de estados para visualización en interfaz de usuario.
// Soporta variantes de nomenclatura (snake_case vs kebab-case) para compatibilidad con diferentes respuestas de API.
const STATUS_LABELS = {
  pending: "Pendiente",
  "in-progress": "En progreso",
  in_progress: "En progreso",
  done: "Completada",
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const normalizeText = (str) =>
  str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || "";

const highlightText = (text, search) => {
  if (!search) return text;
  const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(${escapedSearch})`, "gi");
  return text.split(regex).map((part, i) =>
    normalizeText(part) === normalizeText(search)
      ? <span key={i} className="highlighted-text">{part}</span>
      : part
  );
};

const GroupPage = () => {
  const { groupId } = useParams();
  const { selectedProjectId } = useGroup();
  const { refreshEvents } = useCalendar();
  const { showUserProfile } = useUserDetail();

  const [selectedProject, setSelectedProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, activityId: null });
  const [viewModal, setViewModal] = useState({ open: false, activityId: null });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupName, setGroupName] = useState("");
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingProject, setLoadingProject] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "id", direction: "desc" });
  const [viewMode, setViewMode] = useState("table"); // "table" | "kanban" | "gantt"

  // Cargar nombre del grupo para breadcrumbs
  useEffect(() => {
    if (!groupId) return;
    setLoadingGroup(true);
    apiFetch(`groups/${groupId}/details`)
      .then(g => setGroupName(g.name))
      .catch(err => console.error("Error cargando nombre del grupo:", err))
      .finally(() => setLoadingGroup(false));
  }, [groupId]);

  // Cargar lista de proyectos del grupo
  useEffect(() => {
    if (!groupId) return;
    setLoadingProjects(true);
    setSelectedProject(null); // Resetear proyecto seleccionado al cambiar de grupo
    fetchGroupProjects(groupId)
      .then(setProjects)
      .catch(err => console.error("Error cargando proyectos:", err))
      .finally(() => setLoadingProjects(false));
  }, [groupId]);

  // Cargar detalle del proyecto seleccionado (con actividades)
  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedProject(null);
      return;
    }
    setLoadingProject(true);
    fetchProjectDetails(selectedProjectId)
      .then(setSelectedProject)
      .catch(err => console.error("Error cargando proyecto:", err))
      .finally(() => setLoadingProject(false));
  }, [selectedProjectId]);

  const loadProjectDetails = () => {
    if (!selectedProjectId) return;
    fetchProjectDetails(selectedProjectId)
      .then(setSelectedProject)
      .catch(console.error);
  };

  useEffect(() => {
    if (!openMenuId) return;
    const handler = () => setOpenMenuId(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenuId]);

  const activities = selectedProject?.activities || [];

  // Lógica de filtrado y ordenamiento de actividades.
  // Se utiliza useMemo para evitar recalcular la lista filtrada en cada renderizado si los criterios no han cambiado.
  const filteredActivities = useMemo(() => {
    let result = activities.filter((a) => {
      const matchesSearch =
        normalizeText(a.name).includes(normalizeText(searchTerm)) ||
        normalizeText(a.owner_name).includes(normalizeText(searchTerm));
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Aplicar ordenamiento
    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === "start_date" || sortConfig.key === "deadline") {
          valA = valA ? new Date(valA).getTime() : 0;
          valB = valB ? new Date(valB).getTime() : 0;
        } else if (typeof valA === "string") {
          valA = normalizeText(valA);
          valB = normalizeText(valB);
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [activities, searchTerm, statusFilter, sortConfig]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="sort-icon-inactive" />;
    return sortConfig.direction === "asc" ? <FaSortUp /> : <FaSortDown />;
  };

  const isOverdue = (date, status) => {
    if (!date) return false;
    const isCompleted = status === "done" || status === "completed";
    return new Date(date) < new Date() && !isCompleted;
  };

  const stats = useMemo(() => {
    return {
      done: activities.filter(a => a.status === "done" || a.status === "completed").length,
      inProgress: activities.filter(a => a.status === "in-progress" || a.status === "in_progress").length,
      pending: activities.filter(a => a.status === "pending").length
    };
  }, [activities]);

  // Manejo de eliminación de actividades con actualización de estado local y global.
  // NOTE: Se dispara refreshEvents para mantener el calendario sincronizado tras la eliminación.
  const handleDelete = async (activity) => {
    const confirmed = window.confirm(`¿Eliminar la actividad "${activity.name}"? Esta acción no se puede deshacer.`);
    if (confirmed) {
      try {
        await deleteActivity(activity.id);
        toast.error("Actividad eliminada");
        loadProjectDetails();
        refreshEvents();
        setOpenMenuId(null);
      } catch (err) {
        console.error("Error al eliminar actividad:", err);
        toast.error("No se pudo eliminar la actividad");
      }
    }
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setOpenMenuId(prev => prev === id ? null : id);
  };

  return (
    <div className="group-page">
      <div className="main-content">
        <div className="group-page__breadcrumbs">
          <span className="breadcrumb-item">
            {loadingGroup ? <Skeleton width="80px" height="14px" /> : (groupName || "Grupo")}
          </span>
          <FaChevronRight className="breadcrumb-separator" />
          <span className="breadcrumb-item breadcrumb-item--active">
            {loadingProject ? <Skeleton width="120px" height="14px" /> : (selectedProject?.name || "Proyecto")}
          </span>
        </div>

        <div className="group-page__header">
          <div className="header-main-info">
            <h1 className="group-page__title">
              {loadingProject ? (
                <Skeleton width="300px" height="36px" />
              ) : (
                selectedProject?.name ?? `Bienvenido a ${groupName || "el grupo"}`
              )}
            </h1>
            {loadingProject ? (
              <div className="project-stats">
                <Skeleton width="60px" height="24px" />
                <Skeleton width="60px" height="24px" />
                <Skeleton width="60px" height="24px" />
              </div>
            ) : selectedProject && (() => {
              const total = activities.length;
              const pct = total === 0 ? 0 : Math.round((stats.done / total) * 100);
              const isComplete = pct === 100;
              return (
                <>
                  <div className="project-stats">
                    <span className="stat-item stat-item--done" title="Completadas">
                      <FaCheck /> {stats.done}
                    </span>
                    <span className="stat-item stat-item--progress" title="En progreso">
                      <FaClock /> {stats.inProgress}
                    </span>
                    <span className="stat-item stat-item--pending" title="Pendientes">
                      <FaThumbtack /> {stats.pending}
                    </span>
                  </div>
                  {total > 0 && (
                    <div className="project-progress">
                      <div className="progress-bar-track">
                        <div
                          className={`progress-bar-fill ${isComplete ? "progress-bar-fill--complete" : ""}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="progress-label">{pct}%</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          {selectedProject && (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              {/* Toggle vista */}
              {/* Selector de modo de vista: Permite alternar entre visualización estructurada (tabla), 
                  ágil (kanban) y cronológica (gantt) */}
              <div className="view-toggle">
                <button
                  className={`view-toggle__btn ${viewMode === "table" ? "view-toggle__btn--active" : ""}`}
                  onClick={() => setViewMode("table")}
                  title="Vista tabla"
                >
                  <FaTable /> Tabla
                </button>
                <button
                  className={`view-toggle__btn ${viewMode === "kanban" ? "view-toggle__btn--active" : ""}`}
                  onClick={() => setViewMode("kanban")}
                  title="Vista Kanban"
                >
                  <FaThLarge /> Kanban
                </button>
                <button
                  className={`view-toggle__btn ${viewMode === "gantt" ? "view-toggle__btn--active" : ""}`}
                  onClick={() => setViewMode("gantt")}
                  title="Diagrama de Gantt"
                >
                  <FaSort style={{ transform: 'rotate(90deg)' }} /> Gantt
                </button>
              </div>
              <Modal.Button onClick={() => setCreateModal(true)}>
                + Nueva actividad
              </Modal.Button>
            </div>
          )}
        </div>

        {loadingProjects || (selectedProjectId && loadingProject) ? (
          /* ── MOSTRAR ESQUELETOS MIENTRAS CARGA ── */
          viewMode === "table" ? (
            <div className="activity-table-wrapper">
              <table className="activity-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Responsable</th>
                    <th>Estado</th>
                    <th>Inicio</th>
                    <th>Fecha límite</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-row-${i}`}>
                      <td><Skeleton width="80%" height="20px" /></td>
                      <td><Skeleton width="120px" height="20px" circle /></td>
                      <td><Skeleton width="60px" height="24px" /></td>
                      <td><Skeleton width="80px" height="20px" /></td>
                      <td><Skeleton width="80px" height="20px" /></td>
                      <td><Skeleton width="30px" height="30px" circle /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="kanban-board-skeleton" style={{ display: 'flex', gap: '20px', padding: '20px', overflowX: 'auto' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ minWidth: '300px', flex: 1, background: 'var(--bg-secondary)', borderRadius: '12px', padding: '16px' }}>
                  <Skeleton width="120px" height="24px" className="mb-4" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
                    <Skeleton height="100px" borderRadius="12px" />
                    <Skeleton height="100px" borderRadius="12px" />
                    <Skeleton height="100px" borderRadius="12px" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : selectedProject ? (
          <>
            {/* Filtros — solo en vista tabla */}
            {viewMode === "table" && (
              <div className="group-page__filters">
                <input
                  type="text"
                  placeholder="Buscar por nombre o responsable..."
                  className="group-page__search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="group-page__filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En progreso</option>
                  <option value="done">Completada</option>
                </select>
              </div>
            )}

            {/* ── VISTA TABLA ── */}
            {viewMode === "table" && (
              <div className="activity-table-wrapper">
                <table className="activity-table">
                  <thead>
                    <tr>
                      <th onClick={() => requestSort("name")} className="sortable-th">
                        Nombre {getSortIcon("name")}
                      </th>
                      <th onClick={() => requestSort("owner_name")} className="sortable-th">
                        Responsable {getSortIcon("owner_name")}
                      </th>
                      <th onClick={() => requestSort("status")} className="sortable-th">
                        Estado {getSortIcon("status")}
                      </th>
                      <th onClick={() => requestSort("start_date")} className="sortable-th">
                        Inicio {getSortIcon("start_date")}
                      </th>
                      <th onClick={() => requestSort("deadline")} className="sortable-th">
                        Fecha límite {getSortIcon("deadline")}
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredActivities.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="activity-table__empty">
                          {activities.length === 0
                            ? "Este proyecto no tiene actividades aún."
                            : "No hay actividades que coincidan con la búsqueda."}
                        </td>
                      </tr>
                    ) : (
                      filteredActivities.map((a) => (
                        <tr key={`activity-${a.id}`}>
                          <td>{highlightText(a.name || "Sin nombre", searchTerm)}</td>
                          <td>
                            <div
                              className="activity-owner-cell"
                              onClick={() => a.owner_id && showUserProfile(a.owner_id)}
                            >
                              {a.profile_pic ? (
                                <img
                                  src={getAvatarUrl(a.profile_pic)}
                                  alt={a.owner_name}
                                  className="activity-table-avatar"
                                />
                              ) : (
                                <div className="activity-table-avatar-placeholder">
                                  {a.owner_name?.[0]?.toUpperCase() || "?"}
                                </div>
                              )}
                              <span>{highlightText(a.owner_name || "—", searchTerm)}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`activity-status activity-status--${a.status}`}>
                              {STATUS_LABELS[a.status] ?? "—"}
                            </span>
                          </td>
                          <td>{formatDate(a.start_date)}</td>
                          <td className={isOverdue(a.deadline, a.status) ? "date-overdue" : ""}>
                            {isOverdue(a.deadline, a.status) && <FaCalendarAlt style={{ marginRight: "4px", fontSize: "0.8em" }} />}
                            {formatDate(a.deadline)}
                          </td>
                          <td className="activity-table__actions">
                            <div className="activity-menu">
                              <button
                                className="activity-menu__trigger"
                                onClick={(e) => toggleMenu(e, a.id)}
                              >
                                <BsThreeDots />
                              </button>
                              {openMenuId === a.id && (
                                <div
                                  className="activity-menu__dropdown"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    className="activity-menu__item"
                                    onClick={() => {
                                      setViewModal({ open: true, activityId: a.id });
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    <FaEye style={{ marginRight: "12px" }} /> Ver detalles
                                  </button>
                                  <button
                                    className="activity-menu__item"
                                    onClick={() => {
                                      setEditModal({ open: true, activityId: a.id });
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    <FaEdit style={{ marginRight: "12px" }} /> Editar
                                  </button>
                                  <button
                                    className="activity-menu__item activity-menu__item--danger"
                                    onClick={() => {
                                      handleDelete(a);
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    <FaTrash style={{ marginRight: "12px" }} /> Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── VISTA KANBAN ── */}
            {viewMode === "kanban" && (
              <KanbanBoard
                activities={activities}
                onView={(a) => setViewModal({ open: true, activityId: a.id })}
                onEdit={(a) => setEditModal({ open: true, activityId: a.id })}
                onDelete={handleDelete}
                onStatusChanged={() => {
                  loadProjectDetails();
                  refreshEvents();
                }}
              />
            )}

            {/* ── VISTA GANTT ── */}
            {viewMode === "gantt" && (
              <GanttChart
                activities={activities}
                onView={(a) => setViewModal({ open: true, activityId: a.id })}
              />
            )}
          </>

        ) : (
          <div className="group-page__welcome-container">
            <div className="welcome-content">
              <div className="welcome-icon floating-animation"><FaRocket style={{ color: 'var(--primary)' }} /></div>
              <h2>¡Hola! Comienza seleccionando un proyecto</h2>
              <p>Elige un proyecto de la barra lateral para ver sus actividades, progreso y tablero Kanban.</p>
              {projects.length === 0 && (
                <p className="group-page__empty">Este grupo aún no tiene proyectos creados.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <CreateActivityModal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        currentProjectId={selectedProjectId}
        onCreated={() => {
          loadProjectDetails();
          refreshEvents();
          setCreateModal(false);
        }}
      />

      <EditActivityModal
        isOpen={editModal.open}
        onClose={() => setEditModal({ open: false, activityId: null })}
        activityId={editModal.activityId}
        onUpdated={() => {
          loadProjectDetails();
          refreshEvents();
        }}
      />

      <ViewActivityModal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, activityId: null })}
        activityId={viewModal.activityId}
      />
    </div>
  );
};

export default GroupPage;