import "./LoginBox.css";
import { Input, Textarea } from "@/components/input/Input";

// ── Password rules ─────────────────────────────────────────
export const PASSWORD_RULES = [
  { key: "length",   label: "Al menos 8 caracteres",                 test: (p) => p.length >= 8 },
  { key: "upper",    label: "Una letra mayúscula",                    test: (p) => /[A-Z]/.test(p) },
  { key: "lower",    label: "Una letra minúscula",                    test: (p) => /[a-z]/.test(p) },
  { key: "number",   label: "Un número",                              test: (p) => /\d/.test(p) },
  { key: "special",  label: "Un carácter especial (!@#$%^&*...)",     test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export const isPasswordValid = (p) => PASSWORD_RULES.every((r) => r.test(p));

// ── Helper: required label ──────────────────────────────────
const Req = () => <span className="input-label-required">*</span>;

// ── Helper: field hint ──────────────────────────────────────
const FieldHint = ({ msg, type = "error" }) =>
  msg ? (
    <div className={`field-hint ${type} visible`}>{msg}</div>
  ) : null;

// ── Password rules list ─────────────────────────────────────
const PasswordRules = ({ password, show }) => {
  if (!show) return null;
  return (
    <ul className="password-rules">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.key} className={ok ? "ok" : ""}>
            <span className="rule-icon">{ok ? "✓" : "✗"}</span>
            {r.label}
          </li>
        );
      })}
    </ul>
  );
};

// ── Main component ──────────────────────────────────────────
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
  fieldErrors = {},
}) => {
  const showPasswordRules =
    (activeTab === "register" && mode === "default") || mode === "reset";

  return (
    <div className="login-container">
      <div className={`center-box ${activeTab === "register" ? "register-mode" : ""}`}>
        <img src="/icon.png" alt="NexHive Logo" className="login-logo" />
        <h2>{title}</h2>

        <form onSubmit={onSubmit} noValidate>

          {/* ── VERIFY ── */}
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
                error={!!fieldErrors.code}
              />
              <FieldHint msg={fieldErrors.code} />
            </>
          )}

          {/* ── FORGOT ── */}
          {mode === "forgot" && (
            <>
              <p className="verify-text">
                Ingresa tu correo para recibir un código de recuperación.
              </p>
              <Input
                label={<>Correo<Req /></>}
                type="email"
                name="email"
                autoComplete="username email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!fieldErrors.email}
              />
              <FieldHint msg={fieldErrors.email} />
            </>
          )}

          {/* ── RESET ── */}
          {mode === "reset" && (
            <>
              <p className="verify-text">
                Ingresa el código que recibiste y tu nueva contraseña.
              </p>
              <Input
                label={<>Código<Req /></>}
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                error={!!fieldErrors.code}
              />
              <FieldHint msg={fieldErrors.code} />

              <Input
                label={<>Nueva contraseña<Req /></>}
                type="password"
                name="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!fieldErrors.password}
              />
              <PasswordRules password={password} show={showPasswordRules} />
              <FieldHint msg={fieldErrors.password} />

              <Input
                label={<>Confirmar contraseña<Req /></>}
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={!!fieldErrors.confirmPassword}
              />
              <FieldHint msg={fieldErrors.confirmPassword} />
            </>
          )}

          {/* ── DEFAULT (login / register) ── */}
          {mode === "default" && (
            <>
              {activeTab === "register" && (
                <>
                  <div className="input-group-row">
                    <div>
                      <Input
                        label={<>Nombres<Req /></>}
                        type="text"
                        placeholder="Tus nombres"
                        value={first_name}
                        onChange={(e) => setFirstName(e.target.value)}
                        error={!!fieldErrors.first_name}
                      />
                      <FieldHint msg={fieldErrors.first_name} />
                    </div>
                    <div>
                      <Input
                        label={<>Apellidos<Req /></>}
                        type="text"
                        placeholder="Tus apellidos"
                        value={last_name}
                        onChange={(e) => setLastName(e.target.value)}
                        error={!!fieldErrors.last_name}
                      />
                      <FieldHint msg={fieldErrors.last_name} />
                    </div>
                  </div>

                  <div className="input-group-row">
                    <div>
                      <Input
                        label={<>Apodo<Req /></>}
                        type="text"
                        placeholder="Cómo te dicen"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        error={!!fieldErrors.name}
                      />
                      <FieldHint msg={fieldErrors.name} />
                    </div>
                    <div>
                      <Input
                        label="Celular"
                        type="tel"
                        placeholder="Tu número"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
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
                label={<>Correo<Req /></>}
                type="email"
                name="email"
                autoComplete="username email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!fieldErrors.email}
              />
              <FieldHint msg={fieldErrors.email} />

              <Input
                label={<>Contraseña<Req /></>}
                type="password"
                name="password"
                autoComplete={activeTab === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!fieldErrors.password}
              />
              {activeTab === "register" && (
                <PasswordRules password={password} show={showPasswordRules} />
              )}
              <FieldHint msg={fieldErrors.password} />

              {activeTab === "register" && (
                <>
                  <Input
                    label={<>Confirmar contraseña<Req /></>}
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={!!fieldErrors.confirmPassword}
                  />
                  <FieldHint msg={fieldErrors.confirmPassword} />
                </>
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
            {mode === "verify"  ? "Verificar"         :
             mode === "forgot"  ? "Enviar código"     :
             mode === "reset"   ? "Cambiar contraseña":
             activeTab === "login" ? "Entrar" : "Registrarme"}
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

          {error   && <p className="error-message active">{error}</p>}
          {success && (
            <p className="success-message active">
              {mode === "verify"  && "Código enviado correctamente."}
              {mode === "forgot"  && "Correo enviado."}
              {mode === "reset"   && "Contraseña restablecida."}
              {mode === "default" && (activeTab === "login" ? "¡Login exitoso!" : "Registro exitoso.")}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginBox;