import React, { createContext, useContext, useEffect, useState } from "react";
import { socket, connectWithToken } from "@/utils/socket";
import { isTokenValid } from "@/utils/auth";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    // Solo intentar conectar si el token existe y es válido
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

  // Función para reconectar manualmente (útil tras login)
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
