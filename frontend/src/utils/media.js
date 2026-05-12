import { CONFIG } from "./config";

/**
 * Resuelve la URL absoluta de un avatar.
 * Soporta URLs completas (externas) y rutas relativas (locales).
 * 
 * @param {string} avatarPath - Ruta o URL del avatar.
 */
export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return null;
  
  // Si ya es una URL completa, no modificar
  if (avatarPath.startsWith("http")) return avatarPath;

  // Normalizar ruta para asegurar que comience con '/'
  const path = avatarPath.startsWith("/") ? avatarPath : `/${avatarPath}`;
  return `${CONFIG.BASE_URL}${path}`;
};