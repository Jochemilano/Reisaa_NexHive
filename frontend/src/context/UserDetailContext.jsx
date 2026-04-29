import React, { createContext, useContext, useState } from "react";
import UserDetailModal from "@/components/profile/UserDetailModal";
import GroupDetailModal from "@/components/profile/GroupDetailModal";
import { apiFetch } from "@/utils/apiClient";

const UserDetailContext = createContext();

export const useUserDetail = () => useContext(UserDetailContext);

export const UserDetailProvider = ({ children }) => {
  // Perfil de usuario
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Perfil de grupo/sala
  const [isGroupOpen, setIsGroupOpen] = useState(false);
  const [groupData, setGroupData] = useState(null);

  const showUserProfile = async (userId) => {
    if (!userId) return;
    try {
      const data = await apiFetch(`users/${userId}`);
      setUser(data);
      setIsUserOpen(true);
    } catch (err) {
      console.error("Error al cargar perfil de usuario:", err);
    }
  };

  const showGroupProfile = async (groupId) => {
    if (!groupId) return;
    try {
      const data = await apiFetch(`groups/${groupId}/details`);
      setGroupData({ ...data, type: 'group' });
      setIsGroupOpen(true);
    } catch (err) {
      console.error("Error al cargar perfil de grupo:", err);
    }
  };

  const showRoomProfile = async (roomId) => {
    if (!roomId) return;
    try {
      const data = await apiFetch(`rooms/${roomId}/details`);
      setGroupData({ ...data, type: 'room' });
      setIsGroupOpen(true);
    } catch (err) {
      console.error("Error al cargar perfil de sala:", err);
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
      
      <UserDetailModal
        isOpen={isUserOpen}
        onClose={closeUserProfile}
        user={user}
      />

      <GroupDetailModal
        isOpen={isGroupOpen}
        onClose={closeGroupProfile}
        group={groupData}
        onMemberClick={(id) => {
          // No cerramos el grupo para que se pueda volver? 
          // El usuario pidió: "y de ahi que abajo salgan los integrantes y le puedas dar click a cada uno"
          // Si abro el perfil del usuario, el del grupo debería cerrarse o quedar debajo.
          // Por simplicidad en NexHive, cerraremos el de grupo.
          closeGroupProfile();
          showUserProfile(id);
        }}
      />
    </UserDetailContext.Provider>
  );
};
