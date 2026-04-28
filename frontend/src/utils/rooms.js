import { CONFIG } from "./config";
import { apiFetch } from "./apiClient";

// Traer todas las salas del usuario
export const fetchUserRooms = () => apiFetch("rooms");

// Crear sala (DM o Grupo)
export const createRoom = async (userIds, name = null) => {
  const roomData = {
    name: name || `chat-${userIds.sort().join("-")}`,
    type: "chat",
    userIds
  };
  const res = await apiFetch("rooms", {
    method: "POST",
    body: JSON.stringify(roomData)
  });
  return res.roomId;
};

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(CONFIG.UPLOAD_URL, {
    method: "POST",
    body: formData
  });

  return res.json();
};