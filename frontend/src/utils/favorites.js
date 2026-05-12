import { apiFetch } from "./apiClient";

/**
 * Obtiene el listado de mensajes marcados como favoritos por un usuario.
 */
export const getUserFavorites = async (userId) => {
  return apiFetch(`users/${userId}/favorites`);
};

/**
 * Helper de formateo de fecha para visualización en componentes de favoritos.
 */
export const formatDate = (dateString) =>
  new Date(dateString).toLocaleString();