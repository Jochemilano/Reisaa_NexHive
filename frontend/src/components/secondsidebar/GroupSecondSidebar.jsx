import React, { useEffect, useState, useRef, useCallback } from "react";
import { fetchGroupDetails, fetchGroupUsers } from "@/utils/groups";
import { fetchGroupProjects } from "@/utils/projects";
import Modal from "@/components/modal/Modal";
import CreateProjectModal from "@/components/groups/CreateProjectModal";
import EditProjectModal from "@/components/groups/EditProjectModal";
import { FaHashtag, FaVolumeUp, FaEdit, FaFolderOpen } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useGroup } from "@/context/GroupContext";
import { useCalendar } from "@/context/CalendarContext";
import { getProfile } from "@/utils/profile";
import { useUnread } from "@/context/UnreadContext";
import Skeleton from "@/components/loading/Skeleton";

const GroupSecondSidebar = ({ groupId }) => {
  const [details, setDetails] = useState({ channels: [], members: [] });
  const [projects, setProjects] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const { selectedProjectId, setSelectedProjectId } = useGroup();
  const { refreshEvents } = useCalendar();
  const navigate = useNavigate();
  const [availableUsers, setAvailableUsers] = useState([]);
  const myId = Number(localStorage.getItem("userId"));
  const filteredAvailableUsers = availableUsers.filter(u => u.id !== myId);

  const { unreadByRoom } = useUnread();
  const [userRole, setUserRole] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [dragHoverId, setDragHoverId] = useState(null);

  const dragTimerRef = useRef(null);
  const currentHoverRef = useRef(null);

  const handleDragOverItem = (e, id, callback) => {
    e.preventDefault();
    if (currentHoverRef.current !== id) {
      currentHoverRef.current = id;
      setDragHoverId(id);
      if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
      dragTimerRef.current = setTimeout(() => {
        callback();
        setDragHoverId(null);
        currentHoverRef.current = null;
      }, 800);
    }
  };

  const handleDragLeaveList = () => {
    if (dragTimerRef.current) clearTimeout(dragTimerRef.current);
    dragTimerRef.current = null;
    currentHoverRef.current = null;
    setDragHoverId(null);
  };

  const loadDetails = async () => {
    if (!groupId) return;
    setLoadingDetails(true);
    try {
      const data = await fetchGroupDetails(groupId);
      setDetails(data);
    } catch (err) {
      console.error("Error cargando detalles del grupo:", err);
      setDetails({ channels: [], members: [] });
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    getProfile()
      .then(p => setUserRole(p.rol))
      .catch(console.error);
  }, []);

  const loadProjects = async () => {
    if (!groupId) return;
    setLoadingProjects(true);
    try {
      const data = await fetchGroupProjects(groupId);
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      console.error("Error cargando proyectos:", err);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    setSelectedProjectId(null);
    loadDetails();
    loadProjects();
  }, [groupId]);

  useEffect(() => {
    const loadUsers = async () => {
      if (!groupId) return;
      try {
        const users = await fetchGroupUsers(groupId);
        setAvailableUsers(users);
      } catch (err) {
        setAvailableUsers([]);
      }
    };
    loadUsers();
  }, [groupId]);

  // Long press logic
  const longPressTimer = useRef(null);
  const longPressTriggered = useRef(false);

  const startPress = useCallback((project) => {
    const canEdit = userRole === 'admin' || myId === project.owner_id || myId === details.owner_id;
    if (!canEdit) return;

    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setEditingProject(project);
    }, 500);
  }, [userRole, myId, details.owner_id]);

  const cancelPress = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handleProjectClick = useCallback((project) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    setSelectedProjectId(project.id);
    // Asegurar que navegamos a la página del grupo para ver el proyecto
    navigate(`/groups/${groupId}`);
  }, [groupId, navigate, setSelectedProjectId]);

  return (
    <>
      <div className="sidebar-content" onDragLeave={handleDragLeaveList} onDrop={handleDragLeaveList}>
        {loadingDetails ? (
          <div className="channel-group">
            <h3>Canales</h3>
            <div className="user-item"><Skeleton width="100%" height="24px" /></div>
            <div className="user-item"><Skeleton width="100%" height="24px" /></div>
          </div>
        ) : (
          details.channels.map((c) => (
            <div key={c.id} className="channel-group">
              <h3>Canales</h3>
              <div
                className="user-item"
                onClick={() => navigate(`/groups/${groupId}/chat/${c.chat_room_id}`)}
                onDragOver={(e) => handleDragOverItem(e, c.chat_room_id, () => navigate(`/groups/${groupId}/chat/${c.chat_room_id}`))}
                style={{ background: dragHoverId === c.chat_room_id ? 'var(--bg-hover)' : undefined }}
              >
                <FaHashtag className="channel-icon" />
                <span>Mensajes</span>
                {unreadByRoom[c.chat_room_id] > 0 && (
                  <span className="unread-badge-small" style={{ marginLeft: 'auto' }}>
                    {unreadByRoom[c.chat_room_id]}
                  </span>
                )}
              </div>
              <div
                className="user-item"
                onClick={() => navigate(`/groups/${groupId}/voice/${c.voice_room_id}`)}
              >
                <FaVolumeUp className="channel-icon" />
                <span>Sala de voz</span>
              </div>
            </div>
          ))
        )}

        <div className="cont-sec">
          <h3>Proyectos</h3>
          <Modal.Button onClick={() => setIsOpen(true)}>+</Modal.Button>
        </div>

        <div className="project-list">
          {loadingProjects ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={`project-skeleton-${i}`} className="user-item">
                <Skeleton width="100%" height="24px" />
              </div>
            ))
          ) : projects.length === 0 ? (
            <div className="empty-projects-minimal-v2">
              <span>Sin proyectos</span>
            </div>
          ) : (
            projects.map((p) => {
              const canEdit = userRole === 'admin' || myId === p.owner_id || myId === details.owner_id;
              return (
                <div
                  key={`project-${p.id}`}
                  className={`user-item ${selectedProjectId === p.id ? "project-item--active" : ""}`}
                  onMouseDown={() => startPress(p)}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  onTouchStart={() => startPress(p)}
                  onTouchEnd={cancelPress}
                  onClick={() => handleProjectClick(p)}
                >
                  <span>{p.name}</span>
                  {canEdit && (
                    <button
                      className="project-edit-btn"
                      onClick={(e) => { e.stopPropagation(); setEditingProject(p); }}
                      title="Editar proyecto"
                    >
                      <FaEdit />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <CreateProjectModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        groupId={groupId}
        availableUsers={filteredAvailableUsers}
        onCreated={(newProject) => {
          setProjects(prev => [...prev, newProject]);
          setSelectedProjectId(newProject.id);
          refreshEvents();
          setIsOpen(false);
        }}
      />

      <EditProjectModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        groupId={groupId}
        onUpdated={() => {
          loadProjects();
          refreshEvents();
          setEditingProject(null);
        }}
      />
    </>
  );
};

export default GroupSecondSidebar;