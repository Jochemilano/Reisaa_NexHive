import { Navigate } from "react-router-dom";
import { isTokenValid } from "./auth";

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  // Si ya hay una sesión activa y es válida, redirigir al home
  if (isTokenValid(token)) {
    return <Navigate to="/home" replace />;
  }

  // Si no hay sesión o ha expirado, permitir el acceso (ej. para el Login)
  return children;
};

export default PublicRoute;
