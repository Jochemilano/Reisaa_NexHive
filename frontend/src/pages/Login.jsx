import { useState } from "react";
import LoginBox from "components/login/LoginBox";
import { login } from "utils/login";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      const data = await login(email, password);

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
      title="Iniciar sesión"
      email={email}
      password={password}
      setEmail={setEmail}
      setPassword={setPassword}
      onSubmit={handleSubmit}
      error={error}
      success={success}
    />
  );
};

export default Login;