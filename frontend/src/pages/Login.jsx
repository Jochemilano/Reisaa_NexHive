import { useState } from "react";
import LoginBox from "@/components/login/LoginBox";
import { login } from "@/utils/login";
import { register } from "@/utils/register";

const Login = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      if (activeTab === "register") {
        if (!name.trim()) throw new Error("Ingresa tu nombre.");
        if (!email.trim()) throw new Error("Ingresa un correo válido.");
        if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
        if (password !== confirmPassword) throw new Error("Las contraseñas no coinciden.");

        const data = await register(name.trim(), email.trim(), password);
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setSuccess(true);
        window.location.href = "/home";
        return;
      }

      const data = await login(email.trim(), password);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setSuccess(true);
      window.location.href = "/home";
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <LoginBox
      title={activeTab === "login" ? "Iniciar sesión" : "Registrarse"}
      activeTab={activeTab}
      setActiveTab={(tab) => {
        setActiveTab(tab);
        setError("");
        setSuccess(false);
      }}
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