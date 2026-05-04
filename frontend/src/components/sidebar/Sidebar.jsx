import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiMessageSquare, FiStar, FiCalendar, FiPlus, FiSettings, FiUser } from "react-icons/fi";
import Modal from "@/components/modal/Modal";
import Separator from "@/components/separator/Separator";
import Button from "@/components/button/Button";
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
import { addLongPress } from "@/utils/longPress";
import { useUnread } from "@/context/UnreadContext";
import { useSidebar } from "@/context/SidebarContext";
import Skeleton from "@/components/loading/Skeleton";
import { toast } from "sonner";
import "./Sidebar.css";

const NAV_ITEMS = [
  { path: "/home", icon: <FiMessageSquare />, tooltip: "Mensajes" },
  { path: "/favorites", icon: <FiStar />, tooltip: "Favoritos" },
  { path: "/calendar", icon: <FiCalendar />, tooltip: "Calendario" },
];

// ─── SidebarItem ──────────────────────────────────────────────────────────────
const SidebarItem = ({
  label, tooltip, isActive, onClick, children, avatar,
  onLongPress, showDot
}) => {
  const [show, setShow] = useState(false);
  const [y, setY] = useState(0);
  const wrapperRef = useRef(null);

  const longPressTriggered = useRef(false);
  const timerRef = useRef(null);

  const startPress = useCallback((e) => {
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

  const handleClick = useCallback((e) => {
    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }
    onClick?.();
  }, [onClick]);

  const handleMouseEnter = () => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) setY(rect.top + rect.height / 2);
    setShow(true);
  };

  return (
    <div
      ref={wrapperRef}
      className={`sidebar-item-wrapper ${isActive ? "active" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => { setShow(false); cancelPress(); }}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
    >
      <div className="pill" />
      <div className="sidebar-item-content">
        {children ? (
          <div onClick={handleClick}>{children}</div>
        ) : avatar ? (
          <img
            src={avatar}
            alt={label}
            className="sidebar-avatar"
            onClick={handleClick}
            draggable={false}
          />
        ) : (
          <Button className="button-general" text={label} onClick={handleClick} />
        )}

        {showDot && (
          <div className="sidebar-dot" />
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
      {tooltip && (
        <div
          className={`sidebar-tooltip ${show ? "visible" : ""}`}
          style={{
            top: y,
            transform: `translateY(-50%) translateX(${show ? "0px" : "-4px"})`,
          }}
        >
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
  const { unreadTotal, unreadByRoom, setSoundEnabled } = useUnread();
  const { toggleSidebar, setSidebarMinimized } = useSidebar();

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
  
  const groupChatRoomIds = React.useMemo(() => groups.map(g => String(g.chat_room_id)), [groups]);
  
  const homeUnreadTotal = React.useMemo(() => {
    const total = Object.entries(unreadByRoom).reduce((acc, [roomId, count]) => {
      // Si la sala NO es de un grupo, entonces es del Home (DM)
      if (!groupChatRoomIds.includes(String(roomId))) {
        return acc + count;
      }
      return acc;
    }, 0);
    // Log para depuración (opcional)
    console.log("Sidebar homeUnreadTotal:", total, "unreadByRoom:", unreadByRoom);
    return total;
  }, [unreadByRoom, groupChatRoomIds, unreadTotal]); // unreadTotal como dependencia extra

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
    <aside className="sidebar">
      <div className="sidebar-header">
        {NAV_ITEMS.map(({ path, icon, tooltip }) => (
          <SidebarItem
            key={path}
            tooltip={tooltip}
            isActive={location.pathname === path}
            onClick={() => handleSidebarItemClick(path)}
            showDot={path === "/home" && homeUnreadTotal > 0}
          >
            <Button className="button-general">{icon}</Button>
          </SidebarItem>
        ))}
        <Separator />
      </div>

      <div className="sidebar-groups">
        <SidebarItem tooltip="Nuevo grupo">
          <Modal.Button className="modal-button" onClick={() => setIsOpen(true)}>
            <FiPlus />
          </Modal.Button>
        </SidebarItem>

        {loadingGroups ? (
          <>
            <div style={{ padding: '8px 12px' }}><Skeleton width="48px" height="48px" borderRadius="12px" /></div>
            <div style={{ padding: '8px 12px' }}><Skeleton width="48px" height="48px" borderRadius="12px" /></div>
            <div style={{ padding: '8px 12px' }}><Skeleton width="48px" height="48px" borderRadius="12px" /></div>
          </>
        ) : (
          groups.map(group => {
            const canEdit = perfil?.rol === 'admin' || perfil?.id === group.owner_id;
            const badgeCount = unreadByRoom[String(group.chat_room_id)] || 0;
            return (
              <SidebarItem
                key={group.id}
                label={group.name[0].toUpperCase()}
                avatar={getAvatarUrl(group.avatar)}
                tooltip={group.name}
                isActive={location.pathname === `/groups/${group.id}`}
                onClick={() => handleSidebarItemClick(`/groups/${group.id}`)}
                onLongPress={canEdit ? () => setEditingGroup(group) : null}
                showDot={badgeCount > 0}
              />
            );
          })
        )}
      </div>

      <div className="sidebar-footer">
        <Separator />
        <SidebarItem tooltip="Preferencias">
          <Button onClick={() => setIsPreferencesOpen(true)}><FiSettings /></Button>
        </SidebarItem>
        <SidebarItem tooltip="Perfil">
          <Button onClick={() => setIsProfileOpen(true)}><FiUser /></Button>
        </SidebarItem>
      </div>

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
    </aside>
  );
};

export default Sidebar;