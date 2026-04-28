import React, { createContext, useContext, useEffect, useState } from "react";
import { socket, connectWithToken } from "@/utils/socket";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    // Si hay un token al montar, intentar conectar
    const token = localStorage.getItem("token");
    if (token && socket.disconnected) {
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
    if (token) {
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
