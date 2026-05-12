import { useState, useEffect } from "react";
import { fetchGroups, createGroup, fetchAllUsers } from "@/utils/groups";

/**
 * Hook para centralizar el listado de grupos del usuario.
 * Proporciona un estado reactivo y una función para inyectar nuevos grupos localmente.
 */
export const useGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchGroups()
      .then(setGroups)
      .catch(err => console.error("Error cargando grupos:", err))
      .finally(() => setLoading(false));
  }, []);

  const addGroup = (group) => {
    setGroups(prev => [...prev, group]);
  };

  return { groups, loading, addGroup };
};