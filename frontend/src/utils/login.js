// services/login.js
import { apiFetch } from "utils/apiClient";

export async function login(email, password) {
  try {
    // POST al endpoint login usando apiFetch
    const data = await apiFetch("login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // Guardar token en localStorage para usar en llamadas futuras
    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    // Devuelve el user y token
    return data;
  } catch (err) {
    // Dejar que el frontend maneje el error
    throw new Error(err.message || "Error de conexión con el servidor");
  }
}