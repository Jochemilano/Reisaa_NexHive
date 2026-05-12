import { Navigate } from "react-router-dom";
import { isTokenValid } from "./auth";

/**
 * Componente para rutas que solo deben ser accesibles SIN sesión (ej: Login, Register).
 * Si el usuario ya está autenticado, lo redirige automáticamente al Home.
 */
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  // Redirigir al dashboard si la sesión ya es activa y válida
  if (isTokenValid(token)) {
    return <Navigate to="/home" replace />;
  }

  // Permitir acceso si no hay sesión
  return children;
};

export default PublicRoute;
