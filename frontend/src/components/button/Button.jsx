const Button = ({children, text, onClick }) => {
  return (
    <button className="button-general" onClick={onClick}>
      {text}
      {children}
    </button>
  );
};

export default Button;