import { apiFetch } from "@/utils/apiClient";

export async function register(name, email, password) {
  try {
    const data = await apiFetch("register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    return data;
  } catch (err) {
    throw new Error(err.message || "Error de conexión con el servidor");
  }
}

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
