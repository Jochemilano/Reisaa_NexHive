import { apiFetch } from "@/utils/apiClient";
import { CONFIG } from "./config";

/**
 * Utilidades auxiliares para el módulo de chat.
 */

/**
 * Resuelve la URL absoluta de un recurso/archivo estático alojado en el servidor.
 */
export const getFileUrl = (path) => {
  if (!path) return "";
  return `${CONFIG.BASE_URL}${path}`;
};

/**
 * Alterna el estado de favorito de un mensaje específico.
 */
export const toggleFavoriteMessage = async (messageId) => {
  return apiFetch(`messages/${messageId}/favorite`, {
    method: "POST",
  });
};

/**
 * Extrae el nombre de archivo de una ruta completa.
 */
export const getFileName = (path) => path?.split("/").pop() || "";

/**
 * Determina si un mensaje fue enviado por el usuario actual.
 * Compara IDs numéricamente para evitar errores de tipo.
 */
export const isMine = (msg, userId) =>
  Number(msg.sender_id) === Number(userId);