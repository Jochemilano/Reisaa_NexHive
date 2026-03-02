// apiClient.js
const BASE_URL = "http://localhost:3001/api"; // Cambia aquí si tu backend cambia de host

export const apiFetch = async (endpoint, options = {}) => {
  try {
    const token = localStorage.getItem("token"); // Token almacenado en localStorage

    const res = await fetch(`${BASE_URL}/${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
        ...(options.headers || {}),
      },
    });

    // Manejo de errores de respuesta
    if (!res.ok) {
      let errorData = {};
      try {
        errorData = await res.json();
      } catch (e) {}
      throw new Error(errorData.message || "Error en la API");
    }

    return await res.json(); // Devuelve los datos de la respuesta
  } catch (err) {
    console.error("API Fetch Error:", err);
    throw err;
  }
};