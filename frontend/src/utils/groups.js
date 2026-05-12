/**
 * Utilidades para la gestión de grupos (chats grupales).
 * Maneja la creación, actualización y obtención de detalles de grupos, incluyendo carga de avatares.
 */
import { apiFetch } from "./apiClient";
import { CONFIG } from "./config";

/**
 * Recupera todos los grupos a los que pertenece el usuario.
 */
export const fetchGroups = () => apiFetch("groups");

/**
 * Crea un grupo nuevo.
 * NOTE: Si se incluye un avatar, se realiza primero una subida directa al servidor
 * de archivos y luego se vincula la URL resultante al grupo.
 */
export const createGroup = async (name, collaboratorIds = [], avatarFile = null) => {
  if (!name.trim()) throw new Error("Nombre vacío");

  let avatarUrl = null;

  if (avatarFile) {
    const formData = new FormData();
    formData.append("file", avatarFile);

    const res = await fetch(CONFIG.UPLOAD_URL, { method: "POST", body: formData });
    const data = await res.json();
    avatarUrl = data.url;
  }

  return apiFetch("groups", {
    method: "POST",
    body: JSON.stringify({
      name,
      collaborators: collaboratorIds,
      avatar: avatarUrl
    }),
  });
};

/**
 * Actualiza la información de un grupo existente.
 * Sigue el mismo patrón de subida de avatar que 'createGroup'.
 */
export const updateGroup = async (groupId, name, collaboratorIds = [], avatarFile = null) => {
  let avatarUrl = null;

  if (avatarFile) {
    const formData = new FormData();
    formData.append("file", avatarFile);

    const res = await fetch(CONFIG.UPLOAD_URL, { method: "POST", body: formData });
    const data = await res.json();
    avatarUrl = data.url;
  }

  return apiFetch(`groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name,
      collaborators: collaboratorIds,
      avatar: avatarUrl
    }),
  });
};

/**
 * Obtiene la configuración detallada y metadatos de un grupo.
 */
export const fetchGroupDetails = (groupId) => apiFetch(`groups/${groupId}/details`);

/**
 * Lista los miembros actuales de un grupo.
 */
export const fetchGroupUsers = (groupId) => apiFetch(`groups/${groupId}/users`);

/**
 * Helper para obtener todos los usuarios de la plataforma (útil para invitaciones).
 */
export const fetchAllUsers = () => apiFetch("allusers");

/**
 * Elimina un grupo permanentemente.
 */
export const deleteGroup = (groupId) =>
  apiFetch(`groups/${groupId}`, {
    method: "DELETE",
  });
