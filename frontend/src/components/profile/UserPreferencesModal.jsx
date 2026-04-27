import { useState, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import { FaPalette, FaBell, FaCheck, FaSun, FaMoon, FaFont, FaChevronDown, FaChevronUp } from "react-icons/fa";
import "./UserPreferencesModal.css";

const UserPreferencesModal = ({ isOpen, handleClose, initialData, onSave }) => {
  const [themeMode, setThemeMode] = useState("light");
  const [accentColor, setAccentColor] = useState("blue");
  const [fontFamily, setFontFamily] = useState("system");
  const [notifications, setNotifications] = useState(true);

  const [openSections, setOpenSections] = useState({ appearance: true, colors: false, fonts: false });
  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Los colores de acento disponibles (26 opciones)
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

  // Las tipografías disponibles
  const FONT_OPTIONS = [
    { id: "system", label: "Básica", family: "system-ui, sans-serif" },
    { id: "tahoma", label: "Tahoma", family: "Tahoma, sans-serif" },
    { id: "outfit", label: "Outfit", family: "'Outfit', sans-serif" },
    { id: "pixel", label: "Pixel", family: "'Pixelify Sans', monospace" }
  ];

  useEffect(() => {
    if (initialData) {
      setNotifications(initialData.notifications_enabled ?? true);

      let initialThemeMode = "light";
      let initialAccent = "blue";
      let initialFont = "system";

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
            if (parts[2]) {
              initialFont = parts[2];
            }
          }
        } else if (initialData.theme === "light") {
          initialThemeMode = "light";
          initialAccent = "blue";
        }
      }
      setThemeMode(initialThemeMode);
      setAccentColor(initialAccent);
      setFontFamily(initialFont);
    }
  }, [initialData, isOpen]);

  // Aplicar temporalmente los estilos al root para la previsualización
  useEffect(() => {
    if (isOpen) {
      document.documentElement.setAttribute('data-theme', themeMode);
      document.documentElement.setAttribute('data-accent', accentColor);
      document.documentElement.setAttribute('data-font', fontFamily);
    }
  }, [themeMode, accentColor, fontFamily, isOpen]);

  // Restaurar original si se cancela o cierra sin guardar
  useEffect(() => {
    if (!isOpen && initialData && initialData.theme) {
      let originalThemeMode = "light";
      let originalAccent = "blue";
      let originalFont = "system";
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
          if (parts[2]) {
            originalFont = parts[2];
          }
        }
      } else if (initialData.theme === "light") {
        originalThemeMode = "light";
        originalAccent = "blue";
      }
      document.documentElement.setAttribute('data-theme', originalThemeMode);
      document.documentElement.setAttribute('data-accent', originalAccent);
      document.documentElement.setAttribute('data-font', originalFont);
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    onSave({
      language: initialData?.language || "es",
      theme: `${themeMode}-${accentColor}-${fontFamily}`,
      notifications_enabled: notifications,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Modal.Header onClose={handleClose}>
        Preferencias de Usuario
      </Modal.Header>

      <Modal.Body>
        <div className="preferences-accordion-wrapper">
          
          {/* Sección de Tema Claro / Oscuro */}
          <div className="preferences-field">
            <div className="preferences-accordion-header" onClick={() => toggleSection('appearance')}>
              <label className="preferences-label">
                <FaPalette className="preferences-icon" />
                Modo de Apariencia
              </label>
              {openSections.appearance ? <FaChevronUp className="accordion-icon" /> : <FaChevronDown className="accordion-icon" />}
            </div>
            
            {openSections.appearance && (
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
            )}
          </div>

          {/* Sección de Color de Acento */}
          <div className="preferences-field">
            <div className="preferences-accordion-header" onClick={() => toggleSection('colors')}>
              <label className="preferences-label">
                <FaPalette className="preferences-icon" style={{ opacity: 0.6 }} />
                Color de Acento
              </label>
              {openSections.colors ? <FaChevronUp className="accordion-icon" /> : <FaChevronDown className="accordion-icon" />}
            </div>

            {openSections.colors && (
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
            )}
          </div>

          {/* Sección de Tipografía */}
          <div className="preferences-field">
            <div className="preferences-accordion-header" onClick={() => toggleSection('fonts')}>
              <label className="preferences-label">
                <FaFont className="preferences-icon" />
                Tipografía
              </label>
              {openSections.fonts ? <FaChevronUp className="accordion-icon" /> : <FaChevronDown className="accordion-icon" />}
            </div>

            {openSections.fonts && (
              <div className="font-pill-list">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font.id}
                    className={`font-pill ${fontFamily === font.id ? 'active' : ''}`}
                    onClick={() => setFontFamily(font.id)}
                    style={{ 
                      fontFamily: font.family, 
                      fontSize: font.id === 'pixel' ? '1.15rem' : '0.95rem' 
                    }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            )}
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