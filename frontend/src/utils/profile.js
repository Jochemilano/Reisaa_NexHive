/**
 * Utilidades para la gestión del perfil del usuario actual.
 */
import { apiFetch } from "./apiClient";

/**
 * Obtiene la información básica del perfil del usuario.
 */
export const getProfile = () => apiFetch("profile");

/**
 * Actualiza únicamente la imagen de perfil.
 */
export const updateProfilePic = (profile_pic) =>
  apiFetch("profile/picture", {
    method: "PUT",
    body: JSON.stringify({ profile_pic }),
  });

/**
 * Actualiza los datos generales del perfil (nombre, biografía, etc).
 */
export const updateProfile = (data) =>
  apiFetch("profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });