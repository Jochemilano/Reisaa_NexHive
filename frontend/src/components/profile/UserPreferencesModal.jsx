import { useState, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import { FaGlobe, FaPalette, FaBell, FaCheck, FaSun, FaMoon } from "react-icons/fa";
import "./UserPreferencesModal.css";

const UserPreferencesModal = ({ isOpen, handleClose, initialData, onSave }) => {
  const [language, setLanguage] = useState("es");
  const [themeMode, setThemeMode] = useState("light");
  const [accentColor, setAccentColor] = useState("blue");
  const [notifications, setNotifications] = useState(true);

  // colores de acento disponibles (26)
  const ACCENT_COLORS = [
    { id: "red", hex: "#EF4444" },
    { id: "rose", hex: "#F43F5E" },
    { id: "salmon", hex: "#FA8072" },
    { id: "coral", hex: "#FF7F50" },
    { id: "orange", hex: "#F97316" },
    { id: "amber", hex: "#F59E0B" },
    { id: "gold", hex: "#FFC107" },
    { id: "yellow", hex: "#EAB308" },
    { id: "lime", hex: "#84CC16" },
    { id: "green", hex: "#10B981" },
    { id: "mint", hex: "#20C997" },
    { id: "teal", hex: "#14B8A6" },
    { id: "cyan", hex: "#06B6D4" },
    { id: "sky", hex: "#0EA5E9" },
    { id: "blue", hex: "#3B82F6" },
    { id: "royalblue", hex: "#4169E1" },
    { id: "indigo", hex: "#6366F1" },
    { id: "purple", hex: "#8B5CF6" },
    { id: "orchid", hex: "#DA70D6" },
    { id: "fuchsia", hex: "#D946EF" },
    { id: "pink", hex: "#DB2777" },
    { id: "gray", hex: "#4B5563" },
    { id: "slate", hex: "#64748B" },
    { id: "zinc", hex: "#52525B" },
    { id: "neutral", hex: "#525252" },
    { id: "stone", hex: "#57534E" }
  ];

  useEffect(() => {
    if (initialData) {
      setLanguage(initialData.language || "es");
      setNotifications(initialData.notifications_enabled ?? true);
      
      let initialThemeMode = "light";
      let initialAccent = "blue";
      
      if (initialData.theme) {
        if (initialData.theme.includes("-")) {
          const parts = initialData.theme.split("-");
          if (parts[0] === "theme") {
             const accent = parts[1];
             if (accent === "dark") {
               initialThemeMode = "dark";
               initialAccent = "amber";
             } else {
               initialAccent = accent;
               initialThemeMode = (accent === "blue" || accent === "purple") ? "dark" : "light";
             }
          } else {
             initialThemeMode = parts[0];
             initialAccent = parts[1];
          }
        } else if (initialData.theme === "light") {
          initialThemeMode = "light";
          initialAccent = "blue";
        }
      }
      setThemeMode(initialThemeMode);
      setAccentColor(initialAccent);
    }
  }, [initialData, isOpen]);

  // Aplicar temporalmente los estilos al root para la previsualización
  useEffect(() => {
    if (isOpen) {
      document.documentElement.setAttribute('data-theme', themeMode);
      document.documentElement.setAttribute('data-accent', accentColor);
    }
  }, [themeMode, accentColor, isOpen]);

  // Restaurar original si se cancela o cierra sin guardar
  useEffect(() => {
    if (!isOpen && initialData && initialData.theme) {
       let originalThemeMode = "light";
       let originalAccent = "blue";
       if (initialData.theme.includes("-")) {
          const parts = initialData.theme.split("-");
          if (parts[0] === "theme") {
             const accent = parts[1];
             if (accent === "dark") { 
               originalThemeMode = "dark"; 
               originalAccent = "amber"; 
             } else { 
               originalAccent = accent; 
               originalThemeMode = (accent === "blue" || accent === "purple") ? "dark" : "light"; 
             }
          } else {
             originalThemeMode = parts[0]; 
             originalAccent = parts[1];
          }
       } else if (initialData.theme === "light") {
          originalThemeMode = "light";
          originalAccent = "blue";
       }
       document.documentElement.setAttribute('data-theme', originalThemeMode);
       document.documentElement.setAttribute('data-accent', originalAccent);
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    onSave({
      language,
      theme: `${themeMode}-${accentColor}`,
      notifications_enabled: notifications,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Modal.Header onClose={handleClose}>
        Preferencias de Usuario
      </Modal.Header>

      <Modal.Body>
        <div className="preferences-field">
            <label className="preferences-label">
              <FaGlobe className="preferences-icon" />
              Idioma
            </label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

        {/* Sección de Tema Claro / Oscuro */}
        <div className="preferences-field">
            <label className="preferences-label">
              <FaPalette className="preferences-icon" />
              Modo de Apariencia
            </label>
            <div className="mode-selector-grid">
               <button 
                 className={`mode-card ${themeMode === 'light' ? 'active' : ''}`}
                 onClick={() => setThemeMode('light')}
               >
                 <FaSun className="mode-card-icon" />
                 <span>Claro</span>
               </button>
               <button 
                 className={`mode-card ${themeMode === 'dark' ? 'active' : ''}`}
                 onClick={() => setThemeMode('dark')}
               >
                 <FaMoon className="mode-card-icon" />
                 <span>Oscuro</span>
               </button>
            </div>
          </div>

        {/* Sección de Color de Acento */}
        <div className="preferences-field">
            <label className="preferences-label">
              Color de Acento
            </label>
            <div className="accent-color-swatches">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.id}
                  className={`color-swatch ${accentColor === color.id ? 'active' : ''}`}
                  style={{ backgroundColor: color.hex }}
                  onClick={() => setAccentColor(color.id)}
                  title={`Seleccionar color ${color.id}`}
                  aria-label={`Seleccionar color ${color.id}`}
                >
                  {accentColor === color.id && <FaCheck className="color-swatch-check" />}
                </button>
              ))}
            </div>
        </div>

        <div className="preferences-field preferences-field--checkbox">
          <input
            id="notifications"
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
           />

            <label htmlFor="notifications" className="preferences-label">
              <FaBell className="preferences-icon" />
              Notificaciones
             </label>
          </div>
      </Modal.Body>

      <Modal.Footer onClose={handleClose}>
        <Modal.AcceptButton onClick={handleSubmit}>
          Guardar
        </Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default UserPreferencesModal;