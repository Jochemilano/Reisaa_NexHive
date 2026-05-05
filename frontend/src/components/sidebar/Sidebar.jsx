import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiMessageSquare, FiStar, FiCalendar, FiPlus, FiSettings, FiUser } from "react-icons/fi";
import { FaHome, FaUsers } from "react-icons/fa";
import { useGroups } from "@/hooks/useGroups";
import { useCreateGroupModal } from "@/hooks/useCreateGroupModal";
import CreateGroupModal from "@/components/groups/CreateGroupModal";
import EditGroupModal from "@/components/groups/EditGroupModal";
import UserPreferencesModal from '@/components/profile/UserPreferencesModal';
import { preferencesApi } from "@/utils/preferences";
import ProfileModal from '@/components/profile/ProfileModal';
import { getProfile } from "@/utils/profile";
import { createGroup, fetchGroups } from "@/utils/groups";
import { getAvatarUrl } from "@/utils/media";
import { useUnread } from "@/context/UnreadContext";
import { useSidebar } from "@/context/SidebarContext";
import { useUserDetail } from "@/context/UserDetailContext";
import Skeleton from "@/components/loading/Skeleton";
import { toast } from "sonner";
import "./Sidebar.css";

const NAV_ITEMS = [
  { path: "/home", icon: <FaHome />, label: "Inicio" },
  { path: "/social", icon: <FiMessageSquare />, label: "Social" },
  { path: "/calendar", icon: <FiCalendar />, label: "Calendario" },
  { path: "/favorites", icon: <FiStar />, label: "Favoritos" },
];

// ─── SidebarItem ──────────────────────────────────────────────────────────────
const SidebarItem = ({
  label, tooltip, isActive, onClick, children, avatar,
  onLongPress, showDot, showLabel = true
}) => {
  const [show, setShow] = useState(false);
  const wrapperRef = useRef(null);
  const longPressTriggered = useRef(false);
  const timerRef = useRef(null);

  const startPress = useCallback(() => {
    longPressTriggered.current = false;
    if (!onLongPress) return;
    timerRef.current = setTimeout(() => {
      longPressTriggered.current = true;
      setShow(false);
      onLongPress();
    }, 500);
  }, [onLongPress]);

  const cancelPress = useCallback(() => {
    clearTimeout(timerRef.current);
  }, []);

  const handleClick = useCallback(() => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    onClick?.();
  }, [onClick]);

  return (
    <div
      ref={wrapperRef}
      className={`sidebar-item-wrapper ${isActive ? "active" : ""}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => { setShow(false); cancelPress(); }}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onClick={handleClick}
    >
      <div className="pill" />
      <div className="sidebar-item-content">
        <div className="sidebar-item-icon">
          {children ? (
            children
          ) : avatar ? (
            <img src={avatar} alt={label} className="sidebar-avatar-img" draggable={false} />
          ) : (
            <div className="sidebar-avatar-initial">{label?.[0]?.toUpperCase() || "?"}</div>
          )}
          {showDot && <div className="sidebar-dot" />}
        </div>

        {showLabel && label && (
          <span className="sidebar-item-label">{label}</span>
        )}

        {onLongPress && (
          <button
            className="sidebar-item-edit"
            onClick={(e) => { e.stopPropagation(); onLongPress(); }}
            title="Editar"
          >
            <FiSettings />
          </button>
        )}
      </div>

      {!showLabel && tooltip && (
        <div className={`sidebar-tooltip ${show ? "visible" : ""}`}>
          {tooltip}
        </div>
      )}
    </div>
  );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadByRoom, setSoundEnabled } = useUnread();
  const { toggleSidebar, setSidebarMinimized } = useSidebar();
  const { isUserOpen, isGroupOpen } = useUserDetail();

  const [isOpen, setIsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);

  const { groups, loading: loadingGroups, addGroup } = useGroups();
  const {
    name, setName,
    availableUsers,
    selectedCollaborators,
    selectCollaborator,
    removeCollaborator,
    reset,
  } = useCreateGroupModal(isOpen);

  const groupChatRoomIds = useMemo(() => groups.map(g => String(g.chat_room_id)), [groups]);

  const homeUnreadTotal = useMemo(() => {
    return Object.entries(unreadByRoom).reduce((acc, [roomId, count]) => {
      if (!groupChatRoomIds.includes(String(roomId))) {
        return acc + count;
      }
      return acc;
    }, 0);
  }, [unreadByRoom, groupChatRoomIds]);

  // Minimizar si se abre un perfil
  useEffect(() => {
    if (isUserOpen || isGroupOpen) {
      setSidebarMinimized(true);
    }
  }, [isUserOpen, isGroupOpen, setSidebarMinimized]);

  const handleCreateGroup = async (avatarFile) => {
    if (!name.trim()) return toast.error("El nombre del grupo es requerido");
    try {
      const newGroup = await createGroup(name, selectedCollaborators.map(c => c.id), avatarFile);
      addGroup(newGroup);
      toast.success(`Grupo "${name}" creado con éxito`);
      handleClose();
    } catch (err) {
      console.error(err);
      toast.error("Error al crear el grupo");
    }
  };

  const logout = () => { localStorage.clear(); navigate("/login"); };
  const handleClose = () => { setIsOpen(false); reset(); };

  useEffect(() => {
    getProfile().then(setPerfil).catch((err) => console.error("Error al traer perfil:", err));
  }, []);

  const handlePicUpdated = (nuevaRuta) => setPerfil((prev) => ({ ...prev, profile_pic: nuevaRuta }));

  const handleSidebarItemClick = (path) => {
    if (location.pathname === path) {
      toggleSidebar();
    } else {
      navigate(path);
      setSidebarMinimized(false);
    }
  };

  const handleSavePreferences = async (data) => {
    try {
      const saved = await preferencesApi.savePreferences(data);
      setUserPreferences(saved);
      setIsPreferencesOpen(false);
      document.body.className = saved.theme === "light" ? "" : saved.theme;
      setSoundEnabled(saved.notifications_enabled);
      toast.warning("Preferencias guardadas");
    } catch (err) {
      toast.error("Error guardando preferencias: " + err.message);
    }
  };

  useEffect(() => {
    const fetchPrefs = async () => {
      const prefs = await preferencesApi.getPreferences();
      if (prefs) setUserPreferences(prefs);
    };
    fetchPrefs();
  }, []);

  return (
    <>
      <aside className="sidebar creative-sidebar">
        {/* BLOQUE 1: NAVEGACIÓN */}
        <div className="sidebar-pod nav-pod">
          <h3 className="pod-title">Navegación</h3>
          {NAV_ITEMS.map(({ path, icon, label }) => (
            <SidebarItem
              key={path}
              label={label}
              isActive={location.pathname === path}
              onClick={() => handleSidebarItemClick(path)}
              showDot={path === "/social" && homeUnreadTotal > 0}
            >
              {icon}
            </SidebarItem>
          ))}
        </div>

        {/* BLOQUE 2: GRUPOS */}
        <div className="sidebar-pod groups-pod">
          <h3 className="pod-title">Grupos</h3>
          <div className="groups-container">
            <SidebarItem label="Añadir Grupo" onClick={() => setIsOpen(true)}>
              <div className="add-group-icon"><FiPlus /></div>
            </SidebarItem>

            <div className="sidebar-groups-list">
              {loadingGroups ? (
                <div style={{ padding: '0 16px' }}>
                  <Skeleton width="100%" height="32px" borderRadius="4px" />
                </div>
              ) : (
                groups.map(group => {
                  const canEdit = perfil?.rol === 'admin' || perfil?.id === group.owner_id;
                  const badgeCount = unreadByRoom[String(group.chat_room_id)] || 0;
                  return (
                    <SidebarItem
                      key={group.id}
                      label={group.name}
                      avatar={getAvatarUrl(group.avatar)}
                      isActive={location.pathname === `/groups/${group.id}`}
                      onClick={() => handleSidebarItemClick(`/groups/${group.id}`)}
                      onLongPress={canEdit ? () => setEditingGroup(group) : null}
                      showDot={badgeCount > 0}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* BLOQUE 3: AJUSTES */}
        <div className="sidebar-pod user-pod">
          <h3 className="pod-title">Ajustes</h3>
          <SidebarItem label="Preferencias" onClick={() => setIsPreferencesOpen(true)}>
            <FiSettings />
          </SidebarItem>
          <SidebarItem label="Mi Perfil" onClick={() => setIsProfileOpen(true)}>
            <FiUser />
          </SidebarItem>
        </div>
      </aside>

      {/* MODALS */}
      <CreateGroupModal
        isOpen={isOpen}
        handleClose={handleClose}
        name={name}
        setName={setName}
        availableUsers={availableUsers}
        selectedCollaborators={selectedCollaborators}
        selectCollaborator={selectCollaborator}
        removeCollaborator={removeCollaborator}
        handleCreate={handleCreateGroup}
      />
      <EditGroupModal
        isOpen={!!editingGroup}
        group={editingGroup}
        handleClose={() => setEditingGroup(null)}
        onUpdate={() => fetchGroups()}
      />
      <UserPreferencesModal
        isOpen={isPreferencesOpen}
        handleClose={() => setIsPreferencesOpen(false)}
        initialData={userPreferences}
        onSave={handleSavePreferences}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        perfil={perfil}
        onPicUpdated={handlePicUpdated}
        onLogout={logout}
        onProfileUpdated={(newData) => setPerfil(prev => ({ ...prev, ...newData }))}
      />
    </>
  );
};

export default Sidebar;