import React, { createContext, useContext, useState, useEffect } from "react";

const SidebarContext = createContext();

export const useSidebar = () => useContext(SidebarContext);

/**
 * Controla el estado de expansión/contracción de la barra lateral principal.
 */
export const SidebarProvider = ({ children }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleSidebar = () => {
    setIsMinimized(prev => !prev);
  };

  const setSidebarMinimized = (value) => {
    setIsMinimized(value);
  };

  return (
    <SidebarContext.Provider value={{ isMinimized, toggleSidebar, setSidebarMinimized }}>
      {children}
    </SidebarContext.Provider>
  );
};
