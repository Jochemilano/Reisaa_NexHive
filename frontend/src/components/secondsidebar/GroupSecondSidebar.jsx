import React, { useEffect, useState, useRef, useCallback } from "react";
import { fetchGroupDetails, fetchGroupUsers } from "@/utils/groups";
import { fetchGroupProjects } from "@/utils/projects";
import Modal from "@/components/modal/Modal";
import CreateProjectModal from "@/components/groups/CreateProjectModal";
import EditProjectModal from "@/components/groups/EditProjectModal";
import { FaHashtag, FaVolumeUp, FaEdit } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useGroup } from "@/context/GroupContext";
import { useCalendar } from "@/context/CalendarContext";

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

  const loadDetails = async () => {
    if (!groupId) return;
    try {
      const data = await fetchGroupDetails(groupId);
      setDetails(data);
    } catch (err) {
      console.error("Error cargando detalles del grupo:", err);
      setDetails({ channels: [], members: [] });
    }
  };

  const loadProjects = async () => {
    if (!groupId) return;
    try {
      const data = await fetchGroupProjects(groupId);
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (err) {
      console.error("Error cargando proyectos:", err);
      setProjects([]);
    }
  };

  useEffect(() => {
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
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setEditingProject(project);
    }, 500);
  }, []);

  const cancelPress = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handleProjectClick = useCallback((project) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    setSelectedProjectId(project.id);
  }, []);

  return (
    <>
      <div className="sidebar-content">
        {details.channels.map((c) => (
          <div key={c.id} className="channel-group">
            <h3>Canales</h3>
            <div
              className="user-item"
              onClick={() => navigate(`/groups/${groupId}/chat/${c.chat_room_id}`)}
            >
              <FaHashtag className="channel-icon" />
              <span>Mensajes</span>
            </div>
            <div
              className="user-item"
              onClick={() => navigate(`/groups/${groupId}/voice/${c.voice_room_id}`)}
            >
              <FaVolumeUp className="channel-icon" />
              <span>Sala de voz</span>
            </div>
          </div>
        ))}

        <div className="cont-sec">
          <h3>Proyectos</h3>
          <Modal.Button onClick={() => setIsOpen(true)}>+</Modal.Button>
        </div>

        <div className="project-list">
          {projects.length === 0 && (
            <span className="empty-activities">Sin proyectos</span>
          )}
          {projects.map((p) => (
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
              <button 
                className="project-edit-btn"
                onClick={(e) => { e.stopPropagation(); setEditingProject(p); }}
                title="Editar proyecto"
              >
                <FaEdit />
              </button>
            </div>
          ))}
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