import { useState } from "react";
import LoginBox from "@/components/login/LoginBox";
import { login, forgotPassword, resetPassword } from "@/utils/login";
import { register, verifyCode } from "@/utils/register";
import { isPasswordValid } from "@/components/login/LoginBox";

const Login = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [mode, setMode] = useState("default"); // default, verify, forgot, reset
  const [name, setName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    // ── VERIFY mode ──────────────────────────────────────────
    if (mode === "verify") {
      if (!code.trim()) {
        setField("code", "Ingresa el código de verificación.");
        return;
      }
      try {
        const data = await verifyCode(email, code);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setSuccess(true);
        window.location.href = "/home";
      } catch (err) {
        setError(err.message);
      }
      return;
    }

    // ── FORGOT mode ──────────────────────────────────────────
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

    // ── RESET mode ───────────────────────────────────────────
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

    // ── REGISTER mode ────────────────────────────────────────
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
          name.trim(),
          email.trim(),
          password,
          firstName.trim(),
          lastName.trim(),
          phone.trim(),
          bio.trim(),
          birthday
        );
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

    // ── LOGIN mode ───────────────────────────────────────────
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
      if (err.message.includes("verificada")) {
        setMode("verify");
        setError("Cuenta no verificada. Por favor ingresa el código enviado a tu correo.");
      } else {
        setError(err.message);
      }
    }
  };

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