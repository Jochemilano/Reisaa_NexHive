import { useState } from "react";

/**
 * Hook utilitario para gestionar la selección local de colaboradores (usuarios)
 * antes de enviarlos a una petición de creación/edición de grupo o proyecto.
 */
const useCollaborators = (allUsers = []) => {
  const [selectedCollaborators, setSelectedCollaborators] = useState([]);

  // Derivamos los usuarios que aún no han sido seleccionados
  const availableUsers = allUsers.filter(
    u => !selectedCollaborators.some(c => c.id === u.id)
  );

  /**
   * Agrega un usuario a la lista de seleccionados basándose en su ID.
   */
  const selectCollaborator = (e) => {
    const userId = parseInt(e.target.value);
    const user = allUsers.find(u => u.id === userId);
    if (user) setSelectedCollaborators(prev => [...prev, user]);
  };

  /**
   * Elimina un usuario de la lista de selección.
   */
  const removeCollaborator = (userId) => {
    setSelectedCollaborators(prev => prev.filter(c => c.id !== userId));
  };

  /**
   * Limpia toda la selección.
   */
  const resetCollaborators = () => setSelectedCollaborators([]);

  return { availableUsers, selectedCollaborators, selectCollaborator, removeCollaborator, resetCollaborators };
};

export default useCollaborators;