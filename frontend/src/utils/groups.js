import { apiFetch } from "./apiClient";
import { CONFIG } from "./config";

// Traer grupos del usuario
export const fetchGroups = () => apiFetch("groups");

// Crear un grupo nuevo con avatar
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

//Editar gpo
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

// Traer detalles de un grupo
export const fetchGroupDetails = (groupId) => apiFetch(`groups/${groupId}/details`);

// Traer usuarios de un grupo
export const fetchGroupUsers = (groupId) => apiFetch(`groups/${groupId}/users`);

export const fetchAllUsers = () => apiFetch("allusers");

// Eliminar grupo
export const deleteGroup = (groupId) =>
  apiFetch(`groups/${groupId}`, {
    method: "DELETE",
  });
