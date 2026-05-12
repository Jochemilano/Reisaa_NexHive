import { Navigate } from "react-router-dom";
import { isTokenValid } from "./auth";

const RutaProtegida = ({ children }) => {
  const token = localStorage.getItem("token");

  // Validar si el token existe y no ha expirado
  if (!isTokenValid(token)) {
    // Si no es válido, limpiar por si acaso había basura y redirigir
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default RutaProtegida;