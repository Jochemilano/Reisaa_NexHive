/**
 * Utilidades para la gestión de autenticación y sesiones.
 * Maneja la validación de tokens JWT sin dependencias externas.
 */

/**
 * Valida si un token JWT existe, tiene el formato correcto y no ha expirado.
 * @param {string} token - El token a validar.
 */
export const isTokenValid = (token) => {
  if (!token || token === "undefined" || token === "null" || token === "") return false;
  
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const payloadBase64 = parts[1];
    
    // NOTE: Decodificación manual de Base64URL a Base64 estándar para soporte de caracteres especiales
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const decodedPayload = JSON.parse(jsonPayload);
    
    // El campo 'exp' (expiration) está en segundos (Unix timestamp)
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (decodedPayload.exp && decodedPayload.exp < currentTime) {
      console.warn("La sesión ha expirado");
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error validando el token:", error);
    return false;
  }
};

/**
 * Finaliza la sesión del usuario limpiando el almacenamiento local
 * y redirigiendo al login sin posibilidad de volver atrás.
 */
export const logout = () => {
  localStorage.clear();
  window.location.replace("/login");
};
