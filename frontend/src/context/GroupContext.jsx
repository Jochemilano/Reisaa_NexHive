import { createContext, useContext, useState } from "react";

const GroupContext = createContext(null);

/**
 * Contexto simple para compartir el proyecto/grupo seleccionado globalmente.
 * Permite sincronizar la barra lateral con las vistas de detalle y contenido.
 */
export const GroupProvider = ({ children }) => {
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  return (
    <GroupContext.Provider value={{ selectedProjectId, setSelectedProjectId }}>
      {children}
    </GroupContext.Provider>
  );
};

export const useGroup = () => useContext(GroupContext);