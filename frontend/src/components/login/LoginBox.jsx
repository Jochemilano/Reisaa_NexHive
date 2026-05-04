import "./LoginBox.css";
import { Input, Textarea } from "@/components/input/Input";

const LoginBox = ({
  title,
  activeTab,
  setActiveTab,
  mode,
  setMode,
  name,
  first_name,
  last_name,
  phone,
  bio,
  birthday,
  email,
  password,
  confirmPassword,
  code,
  setName,
  setFirstName,
  setLastName,
  setPhone,
  setBio,
  setBirthday,
  setEmail,
  setPassword,
  setConfirmPassword,
  setCode,
  onSubmit,
  error,
  success,
}) => {
  return (
    <div className="login-container">
      <div className={`center-box ${activeTab === "register" ? "register-mode" : ""}`}>
        <h2>{title}</h2>

        <form onSubmit={onSubmit}>
          {mode === "verify" && (
            <>
              <p className="verify-text">
                Hemos enviado un código a <strong>{email}</strong>. Por favor ingrésalo abajo:
              </p>
              <Input
                label="Código de verificación"
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </>
          )}

          {mode === "forgot" && (
            <>
              <p className="verify-text">
                Ingresa tu correo para recibir un código de recuperación.
              </p>
              <Input
                label="Correo"
                type="email"
                name="email"
                autoComplete="username email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </>
          )}

          {mode === "reset" && (
            <>
              <p className="verify-text">
                Ingresa el código que recibiste y tu nueva contraseña.
              </p>
              <Input
                label="Código"
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Input
                label="Nueva contraseña"
                type="password"
                name="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          )}

          {mode === "default" && (
            <>
              {activeTab === "register" && (
                <>
                  <div className="input-group-row">
                    <Input
                      label="Nombres"
                      type="text"
                      placeholder="Tus nombres"
                      value={first_name}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                    <Input
                      label="Apellidos"
                      type="text"
                      placeholder="Tus apellidos"
                      value={last_name}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                  <div className="input-group-row">
                    <Input
                      label="Apodo"
                      type="text"
                      placeholder="Cómo te dicen"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <Input
                      label="Celular"
                      type="tel"
                      placeholder="Tu número"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <Input
                    label="Cumpleaños"
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                  />
                  <Textarea
                    label="Biografía / Acerca de mí"
                    placeholder="Cuéntanos un poco sobre ti..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </>
              )}

              <Input
                label="Correo"
                type="email"
                name="email"
                autoComplete="username email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                label="Contraseña"
                type="password"
                name="password"
                autoComplete={activeTab === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {activeTab === "register" && (
                <Input
                  label="Confirmar contraseña"
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              )}

              {activeTab === "login" && (
                <div className="forgot-password-container">
                  <span className="toggle-link small" onClick={() => setMode("forgot")}>
                    ¿Olvidaste tu contraseña?
                  </span>
                </div>
              )}
            </>
          )}

          <button type="submit" className="submit-button">
            {mode === "verify" ? "Verificar" : 
             mode === "forgot" ? "Enviar código" :
             mode === "reset" ? "Cambiar contraseña" :
             (activeTab === "login" ? "Entrar" : "Registrarme")}
          </button>

          {mode === "default" ? (
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
          ) : (
            <div className="toggle-container">
              <span className="toggle-link" onClick={() => setMode("default")}>
                Volver
              </span>
            </div>
          )}

          {error && <p className="error-message active">{error}</p>}
          {success && (
            <p className="success-message active">
              {mode === "verify" && "Código enviado correctamente."}
              {mode === "forgot" && "Correo enviado."}
              {mode === "reset" && "Contraseña restablecida."}
              {mode === "default" && (activeTab === "login" ? "¡Login exitoso!" : "Registro exitoso.")}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginBox;