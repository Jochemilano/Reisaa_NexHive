import { Navigate } from "react-router-dom";
import { isTokenValid } from "./auth";

/**
 * Componente de orden superior para proteger rutas privadas.
 * Redirige al login si no se detecta una sesión válida o si el token ha expirado.
 */
const RutaProtegida = ({ children }) => {
  const token = localStorage.getItem("token");

  // Validar si el token existe y no ha expirado
  if (!isTokenValid(token)) {
    // NOTE: Limpieza preventiva de datos locales en caso de token corrupto o expirado
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default RutaProtegida;