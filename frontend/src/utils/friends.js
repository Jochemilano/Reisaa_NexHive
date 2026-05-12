/**
 * Utilidades para la gestión de relaciones sociales (amigos).
 */
import { apiFetch } from "./apiClient";

/**
 * Recupera la lista de contactos/amigos del usuario autenticado.
 */
export const fetchFriends = () => apiFetch("friends");

/**
 * Envía o acepta una solicitud de amistad.
 */
export const addFriend = (friendId) => 
  apiFetch("friends", {
    method: "POST",
    body: JSON.stringify({ friendId }),
  });
