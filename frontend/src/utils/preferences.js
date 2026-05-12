/**
 * Utilidades para la persistencia de preferencias de usuario.
 */
import { apiFetch } from "./apiClient";

export const preferencesApi = {
  /**
   * Obtiene la configuración de preferencias del usuario (notificaciones, sonidos, etc).
   */
  getPreferences: async () => {
    try {
      const res = await apiFetch("preferences", { method: "GET" });
      return res.preferences || null;
    } catch (err) {
      console.error("Error cargando preferencias:", err);
      return null;
    }
  },

  /**
   * Actualiza las preferencias del usuario en el servidor.
   */
  savePreferences: async (data) => {
    try {
      const res = await apiFetch("preferences", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      return res.preferences;
    } catch (err) {
      console.error("Error guardando preferencias:", err);
      throw err;
    }
  },
};