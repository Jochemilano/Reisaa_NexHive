import { useState } from "react";
import LoginBox from "@/components/login/LoginBox";
import { login, forgotPassword, resetPassword } from "@/utils/login";
import { register, verifyCode } from "@/utils/register";

const Login = () => {
  const [activeTab, setActiveTab] = useState("login");
  const [mode, setMode] = useState("default"); // default, verify, forgot, reset
  const [name, setName] = useState(""); // Nickname
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
        if (!firstName.trim()) throw new Error("Enter your first name.");
        if (!lastName.trim()) throw new Error("Enter your last name.");
        if (!name.trim()) throw new Error("Enter your nickname.");
        if (!email.trim()) throw new Error("Enter a valid email.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");

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
    />
  );
};

export default Login;