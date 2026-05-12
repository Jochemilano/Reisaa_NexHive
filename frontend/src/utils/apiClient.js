import { CONFIG } from "./config";

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
      if (res.status === 401 && token) {
        // Solo redirigir si había un token (evita bucles si la ruta ya es pública pero falla)
        localStorage.clear();
        window.location.href = "/login";
      }
      let errorData = {};
      try { errorData = await res.json(); } catch (e) {}
      throw new Error(errorData.message || "Error en la API");
    }

    return await res.json();
  } catch (err) {
    console.error("API Fetch Error:", err);
    throw err;
  }
};