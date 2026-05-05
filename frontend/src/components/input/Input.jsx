import React, { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import "./Input.css";

export const Input = ({ label, type = "text", placeholder, value, onChange, error, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="input-container">
      {label && <label className="input-label">{label}</label>}
      <div className="input-wrapper">
        <input
          className={`input-field ${error ? 'input-error' : ''}`}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex="-1"
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        )}
      </div>
    </div>
  );
};


export const Textarea = ({ label, placeholder, value, onChange, ...props }) => {
  return (
    <div className="input-container">
      <label className="input-label">{label}</label>
      <textarea
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...props}
      />
    </div>
  );
};

export const Select = ({ label, value, onChange, options = [] }) => {
  return (
    <div className="input-container">
      <label className="input-label">{label}</label>
      <select
        className="input-field"
        value={value}
        onChange={onChange}
      >
        <option value=""></option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Input;