import "./LoginBox.css";
import Input from "@/components/input/Input";

const LoginBox = ({
  title,
  activeTab,
  setActiveTab,
  name,
  email,
  password,
  confirmPassword,
  setName,
  setEmail,
  setPassword,
  setConfirmPassword,
  onSubmit,
  error,
  success
}) => {
  return (
    <div className="login-container">
      <div className="center-box">
        <h2>{title}</h2>

        <form onSubmit={onSubmit}>
          {activeTab === "register" && (
            <Input
              label="Nombre"
              type="text"
              placeholder="Tu nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}

          <Input
            label="Correo"
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {activeTab === "register" && (
            <Input
              label="Confirmar contraseña"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}

          <button type="submit" className="submit-button">
            {activeTab === "login" ? "Entrar" : "Registrarme"}
          </button>

          <div className="toggle-container">
            {activeTab === "login" ? (
              <p>
                ¿No tienes cuenta?{" "}
                <span className="toggle-link" onClick={() => setActiveTab("register")}>
                  Regístrate
                </span>
              </p>
            ) : (
              <p>
                ¿Ya tienes cuenta?{" "}
                <span className="toggle-link" onClick={() => setActiveTab("login")}>
                  Inicia sesión
                </span>
              </p>
            )}
          </div>

          {error && <p className="error-message active">{error}</p>}
          {success && (
            <p className="success-message active">
              {activeTab === "login" ? "¡Login exitoso! Redirigiendo..." : "Registro exitoso. Redirigiendo..."}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginBox;