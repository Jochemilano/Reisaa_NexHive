import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import UserDetailModal from "@/components/profile/UserDetailModal";
import GroupDetailModal from "@/components/profile/GroupDetailModal";
import { apiFetch } from "@/utils/apiClient";

const UserDetailContext = createContext();

export const useUserDetail = () => useContext(UserDetailContext);

/**
 * Orquestador global de modales de perfiles (Usuarios, Grupos y Salas).
 * Permite disparar la visualización de detalles desde cualquier parte de la app.
 */
export const UserDetailProvider = ({ children }) => {
  const location = useLocation();
  
  // Perfil de usuario
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);

  // Perfil de grupo/sala
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [groupData, setGroupData] = useState(null);
  const [loadingGroup, setLoadingGroup] = useState(false);

  // NOTE: Cerrar modales automáticamente al navegar para evitar estados inconsistentes
  useEffect(() => {
    setIsUserOpen(false);
    setIsGroupOpen(false);
  }, [location.pathname]);

  const showUserProfile = async (userId) => {
    if (!userId) return;
    setUser(null);
    setLoadingUser(true);
    setIsUserOpen(true);
    try {
      const data = await apiFetch(`users/${userId}`);
      setUser(data);
    } catch (err) {
      console.error("Error al cargar perfil de usuario:", err);
    } finally {
      setLoadingUser(false);
    }
  };

  const showGroupProfile = async (groupId) => {
    if (!groupId) return;
    setGroupData(null);
    setLoadingGroup(true);
    setIsGroupOpen(true);
    try {
      const data = await apiFetch(`groups/${groupId}/details`);
      setGroupData({ ...data, type: 'group' });
    } catch (err) {
      console.error("Error al cargar perfil de grupo:", err);
    } finally {
      setLoadingGroup(false);
    }
  };

  const showRoomProfile = async (roomId) => {
    if (!roomId) return;
    setGroupData(null);
    setLoadingGroup(true);
    setIsGroupOpen(true);
    try {
      const data = await apiFetch(`rooms/${roomId}/details`);
      setGroupData({ ...data, type: 'room' });
    } catch (err) {
      console.error("Error al cargar perfil de sala:", err);
    } finally {
      setLoadingGroup(false);
    }
  };

  const closeUserProfile = () => setIsUserOpen(false);
  const closeGroupProfile = () => setIsGroupOpen(false);

  return (
    <UserDetailContext.Provider value={{ 
      showUserProfile, 
      showGroupProfile, 
      showRoomProfile,
      closeUserProfile, 
      closeGroupProfile 
    }}>
      {children}
      
      {/* Modales globales renderizados una sola vez en el root del provider */}
      <GroupDetailModal
        isOpen={isGroupOpen}
        onClose={closeGroupProfile}
        group={groupData}
        loading={loadingGroup}
        onMemberClick={(id) => {
          showUserProfile(id);
        }}
      />

      <UserDetailModal
        isOpen={isUserOpen}
        onClose={closeUserProfile}
        user={user}
        loading={loadingUser}
      />
    </UserDetailContext.Provider>
  );
};
