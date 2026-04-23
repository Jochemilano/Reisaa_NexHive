import { useState } from "react";
import LoginBox from "@/components/login/LoginBox";
import { login, forgotPassword, resetPassword } from "@/utils/login";
import { register, verifyCode } from "@/utils/register";

const Login = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [mode, setMode] = useState("default"); // default, verify, forgot, reset
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      if (mode === "verify") {
        if (!code) throw new Error("Ingresa el código de verificación.");
        const data = await verifyCode(email, code);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setSuccess(true);
        window.location.href = "/home";
        return;
      }

      if (mode === "forgot") {
        if (!email) throw new Error("Ingresa tu correo.");
        await forgotPassword(email);
        setMode("reset");
        setSuccess(true);
        return;
      }

      if (mode === "reset") {
        if (!code || !password) throw new Error("Completa todos los campos.");
        await resetPassword(email, code, password);
        setMode("default");
        setActiveTab("login");
        setSuccess(true);
        setError("Contraseña actualizada. Ya puedes iniciar sesión.");
        return;
      }

      if (activeTab === "register") {
        if (!name.trim()) throw new Error("Ingresa tu nombre.");
        if (!email.trim()) throw new Error("Ingresa un correo válido.");
        if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
        if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden.");

        const data = await register(name.trim(), email.trim(), password);
        if (data.needsVerification) {
          setMode("verify");
          setSuccess(true);
          return;
        }
      }

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
    if (mode === "reset") return "Cambiar contraseña";
    return activeTab === "login" ? "Iniciar sesión" : "Registrarse";
  };

  return (
    <LoginBox
      title={getTitle()}
      activeTab={activeTab}
      setActiveTab={(tab) => {
        setActiveTab(tab);
        setMode("default");
        setError("");
        setSuccess(false);
      }}
      mode={mode}
      setMode={setMode}
      code={code}
      setCode={setCode}
      name={name}
      email={email}
      password={password}
      confirmPassword={confirmPassword}
      setName={setName}
      setEmail={setEmail}
      setPassword={setPassword}
      setConfirmPassword={setConfirmPassword}
      onSubmit={handleSubmit}
      error={error}
      success={success}
    />
  );
};

export default Login;