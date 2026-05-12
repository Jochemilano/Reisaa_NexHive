/**
 * Utilidades para la gestión de salas de chat y manejo de archivos.
 */
import { CONFIG } from "./config";
import { apiFetch } from "./apiClient";

/**
 * Recupera el listado de salas (DMs y Grupos) asociadas al usuario actual.
 */
export const fetchUserRooms = () => apiFetch("rooms");

/**
 * Crea una nueva sala de conversación.
 * @param {Array<number>} userIds - Lista de IDs de participantes.
 * @param {string} name - Nombre opcional de la sala (por defecto basado en participantes).
 */
export const createRoom = async (userIds, name = null) => {
  const roomData = {
    // Regla de negocio: Generar nombre técnico si no se provee uno amigable
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

/**
 * Sube un archivo al servidor y devuelve los metadatos (incluyendo la URL).
 */
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(CONFIG.UPLOAD_URL, {
    method: "POST",
    body: formData
  });

  return res.json();
};