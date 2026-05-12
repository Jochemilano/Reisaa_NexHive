/**
 * Utilidades para el registro de nuevos usuarios y verificación de identidad.
 */
import { apiFetch } from "@/utils/apiClient";

/**
 * Registra una solicitud de nueva cuenta en el servidor.
 */
export async function register(name, email, password, first_name, last_name, phone, bio, birthday) {
  try {
    const data = await apiFetch("register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, first_name, last_name, phone, bio, birthday }),
    });

    return data;
  } catch (err) {
    throw new Error(err.message || "Error de conexión con el servidor");
  }
}

/**
 * Verifica el código enviado por correo para activar la cuenta.
 * NOTE: Al verificar con éxito, se establece la sesión automáticamente.
 */
export async function verifyCode(email, code) {
  try {
    const data = await apiFetch("verify-code", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });

    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id);
    }

    return data;
  } catch (err) {
    throw new Error(err.message || "Error al verificar el código");
  }
}
