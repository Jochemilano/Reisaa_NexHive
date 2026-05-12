import { useState, useEffect } from "react";
import { fetchAllUsers } from "@/utils/groups";
import { fetchFriends } from "@/utils/friends";

/**
 * Hook para orquestar la lógica del modal de creación de grupos.
 * Maneja la carga de contactos, etiquetado de amigos y selección de integrantes.
 */
export const useCreateGroupModal = (isOpen) => {
  const [name, setName] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    // NOTE: Solo cargamos datos si el modal está abierto para optimizar peticiones
    if (!isOpen) return;
    
    // Carga paralela de usuarios totales y lista de amigos
    Promise.all([fetchAllUsers(), fetchFriends()])
      .then(([users, friends]) => {
        const friendIds = new Set(friends.map(f => f.id));
        const taggedUsers = users.map(u => ({
          ...u,
          isFriend: friendIds.has(u.id) // Marcamos quién es amigo para la UI
        }));
        setAllUsers(taggedUsers);
        setCurrentUserId(parseInt(localStorage.getItem("userId")) || null);
      })
      .catch(err => console.error("Error cargando usuarios:", err));
  }, [isOpen]);

  // Filtramos la lista para no incluirnos a nosotros mismos ni a los ya seleccionados
  const availableUsers = allUsers.filter(
    user => user.id !== currentUserId && !selectedCollaborators.find(c => c.id === user.id)
  );

  /**
   * Maneja la selección de un integrante desde el dropdown.
   */
  const selectCollaborator = (e) => {
    const userId = parseInt(e.target.value);
    if (!userId) return;
    const user = allUsers.find(u => u.id === userId);
    if (user) setSelectedCollaborators(prev => [...prev, user]);
    e.target.value = "";
  };

  const removeCollaborator = (userId) =>
    setSelectedCollaborators(prev => prev.filter(c => c.id !== userId));

  /**
   * Limpia el formulario.
   */
  const reset = () => {
    setName("");
    setSelectedCollaborators([]);
  };

  return {
    name, setName,
    availableUsers,
    selectedCollaborators,
    selectCollaborator,
    removeCollaborator,
    reset,
  };
};