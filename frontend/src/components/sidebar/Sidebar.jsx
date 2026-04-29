import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaPlus, FaCog, FaUserAlt, FaComments, FaStar, FaCalendarAlt, FaVolumeMute } from "react-icons/fa";
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
import "./Sidebar.css";

const NAV_ITEMS = [
  { path: "/home", icon: <FaComments />, tooltip: "Mensajes" },
  { path: "/favorites", icon: <FaStar />, tooltip: "Favoritos" },
  { path: "/calendar", icon: <FaCalendarAlt />, tooltip: "Calendario" },
];

// ─── SidebarItem ──────────────────────────────────────────────────────────────
const SidebarItem = ({
  label, tooltip, isActive, onClick, children, avatar,
  onLongPress, badge,
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

        {badge > 0 && (
          <div className="sidebar-badge">{badge > 99 ? '99+' : badge}</div>
        )}
        {onLongPress && (
          <button
            className="sidebar-item-edit"
            onClick={(e) => { e.stopPropagation(); onLongPress(); }}
            title="Editar"
          >
            <FaCog />
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

  const [isOpen, setIsOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);

  const { groups, addGroup } = useGroups();
  const {
    name, setName,
    availableUsers,
    selectedCollaborators,
    selectCollaborator,
    removeCollaborator,
    reset,
  } = useCreateGroupModal(isOpen);

  const handleCreateGroup = async (avatarFile) => {
    if (!name.trim()) return alert("Nombre requerido");
    try {
      const newGroup = await createGroup(name, selectedCollaborators.map(c => c.id), avatarFile);
      addGroup(newGroup);
      handleClose();
    } catch (err) {
      console.error(err);
      alert("Error al crear grupo");
    }
  };

  const logout = () => { localStorage.clear(); navigate("/login"); };
  const handleClose = () => { setIsOpen(false); reset(); };

  useEffect(() => {
    getProfile().then(setPerfil).catch((err) => console.error("Error al traer perfil:", err));
  }, []);

  const handlePicUpdated = (nuevaRuta) => setPerfil((prev) => ({ ...prev, profile_pic: nuevaRuta }));

  const handleSavePreferences = async (data) => {
    try {
      const saved = await preferencesApi.savePreferences(data);
      setUserPreferences(saved);
      setIsPreferencesOpen(false);
      document.body.className = saved.theme === "light" ? "" : saved.theme;
      setSoundEnabled(saved.notifications_enabled);
    } catch (err) {
      alert("Error guardando preferencias: " + err.message);
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
            onClick={() => navigate(path)}
            badge={0}
          >
            <Button className="button-general">{icon}</Button>
          </SidebarItem>
        ))}
        <Separator />
      </div>

      <div className="sidebar-groups">
        <SidebarItem tooltip="Nuevo grupo">
          <Modal.Button className="modal-button" onClick={() => setIsOpen(true)}>
            <FaPlus />
          </Modal.Button>
        </SidebarItem>

        {groups.map(group => {
          const canEdit = perfil?.rol === 'admin' || perfil?.id === group.owner_id;
          const badgeCount = unreadByRoom[String(group.chat_room_id)] || 0;
          return (
            <SidebarItem
              key={group.id}
              label={group.name[0].toUpperCase()}
              avatar={getAvatarUrl(group.avatar)}
              tooltip={group.name}
              isActive={location.pathname === `/groups/${group.id}`}
              onClick={() => navigate(`/groups/${group.id}`)}
              onLongPress={canEdit ? () => setEditingGroup(group) : null}
              badge={badgeCount}
            />
          );
        })}
      </div>

      <div className="sidebar-footer">
        <Separator />
        <SidebarItem tooltip="Preferencias">
          <Button onClick={() => setIsPreferencesOpen(true)}><FaCog /></Button>
        </SidebarItem>
        <SidebarItem tooltip="Perfil">
          <Button onClick={() => setIsProfileOpen(true)}><FaUserAlt /></Button>
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
      />
    </aside>
  );
};

export default Sidebar;