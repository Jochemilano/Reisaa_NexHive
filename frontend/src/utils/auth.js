export const isTokenValid = (token) => {
  if (!token || token === "undefined" || token === "null" || token === "") return false;
  
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const payloadBase64 = parts[1];
    // Reemplazar caracteres de base64url a base64 estándar y decodificar
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const decodedPayload = JSON.parse(jsonPayload);
    
    // El campo 'exp' está en segundos
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

export const logout = () => {
  localStorage.clear();
  // Usamos replace para que no puedan volver atrás a una página protegida
  window.location.replace("/login");
};
