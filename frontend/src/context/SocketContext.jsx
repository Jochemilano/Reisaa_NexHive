import React, { createContext, useContext, useEffect, useState } from "react";
import { socket, connectWithToken } from "@/utils/socket";
import { isTokenValid } from "@/utils/auth";

const SocketContext = createContext();

/**
 * Proveedor global de la instancia de Socket.io.
 * Centraliza la lógica de conexión/desconexión y estado de red.
 */
export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    // Solo intentar conectar si el token existe y es válido (Lazy loading de la conexión)
    const token = localStorage.getItem("token");
    if (isTokenValid(token) && socket.disconnected) {
      connectWithToken(token);
    }

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  /**
   * Fuerza la reconexión. Útil tras un login exitoso para vincular el socket al usuario.
   */
  const reconnect = () => {
    const token = localStorage.getItem("token");
    if (isTokenValid(token)) {
      connectWithToken(token);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
