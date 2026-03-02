import "./Input.css";

export const Input = ({ label, type = "text", placeholder, value, onChange }) => {
  return (
    <div className="input-container">
      <label className="input-label">{label}</label>
      <input
        className="input-field"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
};

export const Textarea = ({ label, placeholder, value, onChange }) => {
  return (
    <div className="input-container">
      <label className="input-label">{label}</label>
      <textarea
        className="input-field"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
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