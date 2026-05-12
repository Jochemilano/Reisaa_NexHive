import { CONFIG } from "./config";

/**
 * Wrapper sobre fetch para estandarizar las llamadas al API.
 * Maneja automáticamente:
 * - Inyección del token de sesión (Bearer).
 * - Cabeceras de contenido JSON.
 * - Expulsión automática en errores de autorización (401).
 * - Parseo de errores del backend.
 */
export const apiFetch = async (endpoint, options = {}) => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`${CONFIG.API_URL}/${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      // NOTE: Manejo crítico de sesión expirada o inválida
      if (res.status === 401 && token) {
        // Solo redirigir si había un token (evita bucles si la ruta ya es pública pero falla)
        localStorage.clear();
        window.location.href = "/login";
      }
      
      let errorData = {};
      try { errorData = await res.json(); } catch (e) { /* Error no es JSON */ }
      
      throw new Error(errorData.message || "Error en la API");
    }

    return await res.json();
  } catch (err) {
    console.error("API Fetch Error:", err);
    throw err;
  }
};