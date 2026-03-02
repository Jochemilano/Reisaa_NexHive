import { Navigate } from "react-router-dom";

const RutaProtegida = ({ children }) => {
  const sesionActiva = localStorage.getItem("token"); // ejemplo: tu token de sesión

  if (!sesionActiva) {
    return <Navigate to="/login" replace />; // redirige al login si no hay sesión
  }

  return children; // si hay sesión, deja entrar
};

export default RutaProtegida;