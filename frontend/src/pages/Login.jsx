import { useState } from "react";
import LoginBox from "@/components/login/LoginBox";
import { login, forgotPassword, resetPassword } from "@/utils/login";
import { register, verifyCode } from "@/utils/register";
import { isPasswordValid } from "@/components/login/LoginBox";

/**
 * Página de Autenticación Centralizada.
 * Actúa como un coordinador de estados para los flujos de:
 * - Inicio de sesión (Login)
 * - Registro de cuenta (Register)
 * - Verificación de correo (OTP/Code)
 * - Recuperación de contraseña (Forgot/Reset)
 */
const Login = () => {
  // Estado de pestaña principal (Login vs Register)
  const [activeTab, setActiveTab] = useState("login");
  
  // Modo secundario para flujos multi-paso
  const [mode, setMode] = useState("default"); // default, verify, forgot, reset
  
  // Datos de usuario para Registro
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [birthday, setBirthday] = useState("");
  
  // Datos de sesión y recuperación
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  
  // Estado de feedback para el usuario
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // ── Helpers ───────────────────────────────────────────────
  const clearErrors = () => {
    setError("");
    setFieldErrors({});
    setSuccess(false);
  };

  const setField = (key, msg) =>
    setFieldErrors((prev) => ({ ...prev, [key]: msg }));

  // ── Submit ────────────────────────────────────────────────
  /**
   * Manejador central de envío de formularios.
   * Deriva la acción a ejecutar basándose en el 'activeTab' y el 'mode' actual.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    // ── MODO VERIFICACIÓN (OTP) ─────────────────────────────
    if (mode === "verify") {
      if (!code.trim()) {
        setField("code", "Ingresa el código de verificación.");
        return;
      }
      try {
        const data = await verifyCode(email, code);
        // Persistencia manual tras verificación exitosa
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setSuccess(true);
        window.location.href = "/home"; // Redirección forzada para limpiar estados de React
      } catch (err) {
        setError(err.message);
      }
      return;
    }

    // ── MODO RECUPERACIÓN (Solicitud) ───────────────────────
    if (mode === "forgot") {
      if (!email.trim()) {
        setField("email", "Ingresa tu correo.");
        return;
      }
      try {
        await forgotPassword(email);
        setMode("reset");
        setSuccess(true);
      } catch (err) {
        setError(err.message);
      }
      return;
    }

    // ── MODO RESTABLECIMIENTO (Nueva Pass) ─────────────────
    if (mode === "reset") {
      const errs = {};
      if (!code.trim()) errs.code = "Ingresa el código recibido.";
      if (!password)    errs.password = "Ingresa tu nueva contraseña.";
      else if (!isPasswordValid(password))
        errs.password = "La contraseña no cumple los requisitos de seguridad.";
      
      if (!confirmPassword) errs.confirmPassword = "Confirma tu contraseña.";
      else if (password && confirmPassword !== password)
        errs.confirmPassword = "Las contraseñas no coinciden.";

      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        return;
      }

      try {
        await resetPassword(email, code, password);
        setMode("default");
        setActiveTab("login");
        setSuccess(true);
        setError("Contraseña actualizada. Ya puedes iniciar sesión.");
      } catch (err) {
        setError(err.message);
      }
      return;
    }

    // ── FLUJO DE REGISTRO ──────────────────────────────────
    if (activeTab === "register") {
      const errs = {};
      if (!firstName.trim())  errs.first_name     = "El nombre es obligatorio.";
      if (!lastName.trim())   errs.last_name      = "El apellido es obligatorio.";
      if (!name.trim())       errs.name           = "El apodo es obligatorio.";
      if (!email.trim())      errs.email          = "El correo es obligatorio.";
      
      if (!password)          errs.password       = "La contraseña es obligatoria.";
      else if (!isPasswordValid(password))
        errs.password = "La contraseña no cumple los requisitos de seguridad.";
      
      if (!confirmPassword)   errs.confirmPassword = "Confirma tu contraseña.";
      else if (confirmPassword !== password)
        errs.confirmPassword = "Las contraseñas no coinciden.";

      if (Object.keys(errs).length) {
        setFieldErrors(errs);
        return;
      }

      try {
        const data = await register(
          name.trim(), email.trim(), password,
          firstName.trim(), lastName.trim(), phone.trim(),
          bio.trim(), birthday
        );
        // Si el servidor requiere verificación por correo, cambiamos al modo 'verify'
        if (data.needsVerification) {
          setMode("verify");
          setSuccess(true);
          return;
        }
      } catch (err) {
        setError(err.message);
        return;
      }
    }

    // ── FLUJO DE LOGIN ─────────────────────────────────────
    const errs = {};
    if (!email.trim()) errs.email = "El correo es obligatorio.";
    if (!password)     errs.password = "La contraseña es obligatoria.";
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    try {
      const data = await login(email.trim(), password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setSuccess(true);
      window.location.href = "/home";
    } catch (err) {
      // Regla de negocio: Si el error indica falta de verificación, forzar flujo de OTP
      if (err.message.includes("verificada")) {
        setMode("verify");
        setError("Cuenta no verificada. Por favor ingresa el código enviado a tu correo.");
      } else {
        setError(err.message);
      }
    }
  };

  /**
   * Determina el título dinámico según el estado actual de la vista.
   */
  const getTitle = () => {
    if (mode === "verify") return "Verificar correo";
    if (mode === "forgot") return "Recuperar contraseña";
    if (mode === "reset")  return "Cambiar contraseña";
    return activeTab === "login" ? "Iniciar sesión" : "Registrarse";
  };

  return (
    <LoginBox
      title={getTitle()}
      activeTab={activeTab}
      setActiveTab={(tab) => {
        setActiveTab(tab);
        setMode("default");
        clearErrors();
      }}
      mode={mode}
      setMode={(m) => { setMode(m); clearErrors(); }}
      code={code}
      setCode={setCode}
      name={name}
      first_name={firstName}
      last_name={lastName}
      phone={phone}
      bio={bio}
      birthday={birthday}
      email={email}
      password={password}
      confirmPassword={confirmPassword}
      setName={setName}
      setFirstName={setFirstName}
      setLastName={setLastName}
      setPhone={setPhone}
      setBio={setBio}
      setBirthday={setBirthday}
      setEmail={setEmail}
      setPassword={setPassword}
      setConfirmPassword={setConfirmPassword}
      onSubmit={handleSubmit}
      error={error}
      success={success}
      fieldErrors={fieldErrors}
    />
  );
};

export default Login;