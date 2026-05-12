/**
 * Utilidades para el flujo de autenticación y recuperación de cuenta.
 */
import { apiFetch } from "@/utils/apiClient";

/**
 * Inicia sesión del usuario.
 * NOTE: Si tiene éxito, persiste el token y el ID de usuario en localStorage
 * para ser utilizados por el interceptor de apiFetch.
 */
export async function login(email, password) {
  try {
    const data = await apiFetch("login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id);
    }

    return data;
  } catch (err) {
    throw new Error(err.message || "Error de conexión con el servidor");
  }
}

/**
 * Solicita un código de recuperación de contraseña al correo electrónico.
 */
export async function forgotPassword(email) {
  try {
    return await apiFetch("forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  } catch (err) {
    throw new Error(err.message || "Error al solicitar recuperación");
  }
}

/**
 * Restablece la contraseña utilizando el código de verificación recibido.
 */
export async function resetPassword(email, code, newPassword) {
  try {
    return await apiFetch("reset-password", {
      method: "POST",
      body: JSON.stringify({ email, code, newPassword }),
    });
  } catch (err) {
    throw new Error(err.message || "Error al restablecer contraseña");
  }
}