import { useState, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import { FaPalette, FaBell, FaCheck, FaSun, FaMoon, FaFont, FaChevronDown, FaChevronUp, FaVolumeUp, FaMusic, FaGem, FaCloud, FaBolt, FaWaveSquare, FaTint, FaMicrophoneAlt, FaBroadcastTower, FaFingerprint, FaCircle, FaPhone, FaVolumeMute, FaPlay, FaStop } from "react-icons/fa";
import { useUnread } from "@/context/UnreadContext";
import { playNotificationSound, playRingtone, playRingtoneOnce, stopRingtone } from "@/utils/audio";
import "./UserPreferencesModal.css";

const UserPreferencesModal = ({ isOpen, handleClose, initialData, onSave }) => {
  const [themeMode, setThemeMode] = useState("light");
  const [accentColor, setAccentColor] = useState("blue");
  const [fontFamily, setFontFamily] = useState("system");
  const [notifications, setNotifications] = useState(true);
  
  const { 
    selectedSound, changeNotificationSound, 
    mutedRooms, toggleMuteRoom, allRooms,
    callsEnabled, changeCallEnabled,
    callSound, changeCallSound
  } = useUnread();

  const [localSound, setLocalSound] = useState(selectedSound);

  const [openSections, setOpenSections] = useState({ appearance: true, colors: false, fonts: false, sounds: false, calls: false, muted: false });
  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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

  const FONT_OPTIONS = [
    { id: "system", label: "Básica", family: "system-ui, sans-serif" },
    { id: "tahoma", label: "Tahoma", family: "Tahoma, sans-serif" },
    { id: "outfit", label: "Outfit", family: "'Outfit', sans-serif" },
    { id: "pixel", label: "Pixel", family: "'Pixelify Sans', monospace" }
  ];

  const SOUND_OPTIONS = [
    { id: "crystal", label: "Cristal", icon: <FaGem />, color: "#00d2ff" },
    { id: "bubble", label: "Burbuja", icon: <FaCloud />, color: "#a8e063" },
    { id: "pop", label: "Toque", icon: <FaFingerprint />, color: "#ff9a9e" },
    { id: "chime", label: "Campana", icon: <FaBell />, color: "#f6d365" },
    { id: "echo", label: "Radar", icon: <FaBroadcastTower />, color: "#8e44ad" },
    { id: "zap", label: "Zap", icon: <FaBolt />, color: "#f1c40f" },
    { id: "tink", label: "Gota", icon: <FaTint />, color: "#3498db" },
    { id: "bloop", label: "Bloop", icon: <FaCircle />, color: "#95a5a6" }
  ];

  const CALL_SOUND_OPTIONS = [
    { id: "retro", label: "Arcade", color: "#f1c40f" },
    { id: "zen", label: "Garden", color: "#2ecc71" },
    { id: "modern", label: "Modern", color: "#3498db" }
  ];

  useEffect(() => {
    if (initialData) {
      setNotifications(initialData.notifications_enabled ?? true);
      // Fallback a 'retro' si el ID guardado ya no existe
      const validSounds = ["retro", "zen", "modern"];
      const savedSound = localStorage.getItem("call_sound_type") || initialData.call_sound_type;
      if (!validSounds.includes(savedSound)) {
        changeCallSound("retro");
      }

      let initialThemeMode = "light";
      let initialAccent = "blue";
      let initialFont = "system";

      // El tema se almacena como un string compuesto "modo-acento-fuente" para optimizar el almacenamiento 
      // y facilitar la reconstrucción del estado visual en un solo paso.
      if (initialData.theme && initialData.theme.includes("-")) {
        const parts = initialData.theme.split("-");
        initialThemeMode = parts[0];
        initialAccent = parts[1];
        if (parts[2]) initialFont = parts[2];
      }
      
      setThemeMode(initialThemeMode);
      setAccentColor(initialAccent);
      setFontFamily(initialFont);
      setLocalSound(selectedSound);
    }
  }, [initialData, isOpen, selectedSound]);

  useEffect(() => {
    if (isOpen) {
      document.documentElement.setAttribute('data-theme', themeMode);
      document.documentElement.setAttribute('data-accent', accentColor);
      document.documentElement.setAttribute('data-font', fontFamily);
    }
  }, [themeMode, accentColor, fontFamily, isOpen]);

  const handleSubmit = () => {
    changeNotificationSound(localSound);
    onSave({
      language: initialData?.language || "es",
      theme: `${themeMode}-${accentColor}-${fontFamily}`,
      notifications_enabled: notifications,
      calls_enabled: callsEnabled,
      call_sound_type: callSound
    });
    stopRingtone();
  };

  const handlePreviewSound = (e, soundId) => {
    e.stopPropagation();
    setLocalSound(soundId);
    playNotificationSound(soundId);
  };

  const handlePreviewRingtone = (e, soundId) => {
    e.stopPropagation();
    changeCallSound(soundId); // Se guarda al instante en el contexto
    playRingtoneOnce(soundId);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Modal.Header onClose={handleClose}>
        Preferencias de Usuario
      </Modal.Header>

      <Modal.Body>
        <div className="preferences-accordion-wrapper">

          {/* Modo de Apariencia */}
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
                <button className={`mode-card ${themeMode === 'light' ? 'active' : ''}`} onClick={() => setThemeMode('light')}>
                  <FaSun className="mode-card-icon" /> <span>Claro</span>
                </button>
                <button className={`mode-card ${themeMode === 'dark' ? 'active' : ''}`} onClick={() => setThemeMode('dark')}>
                  <FaMoon className="mode-card-icon" /> <span>Oscuro</span>
                </button>
              </div>
            )}
          </div>

          {/* Color de Acento */}
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
                  >
                    {accentColor === color.id && <FaCheck className="color-swatch-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tipografía */}
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
                    style={{ fontFamily: font.family }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sonido Notificación */}
          <div className="preferences-field">
            <div className="preferences-accordion-header" onClick={() => toggleSection('sounds')}>
              <label className="preferences-label">
                <FaMusic className="preferences-icon" />
                Notificaciones
              </label>
              {openSections.sounds ? <FaChevronUp className="accordion-icon" /> : <FaChevronDown className="accordion-icon" />}
            </div>

            {openSections.sounds && (
              <div className="sound-pill-list">
                {SOUND_OPTIONS.map((sound) => (
                  <button
                    key={sound.id}
                    className={`sound-pill ${localSound === sound.id ? 'active' : ''}`}
                    onClick={(e) => handlePreviewSound(e, sound.id)}
                  >
                    <span className="sound-pill-icon" style={{ color: sound.color }}>{sound.icon}</span>
                    {sound.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tono de Llamada */}
          <div className="preferences-field">
            <div className="preferences-accordion-header" onClick={() => toggleSection('calls')}>
              <label className="preferences-label">
                <FaPhone className="preferences-icon" />
                Tono de Llamada
              </label>
              {openSections.calls ? <FaChevronUp className="accordion-icon" /> : <FaChevronDown className="accordion-icon" />}
            </div>

            {openSections.calls && (
              <div className="sound-pill-list">
                {CALL_SOUND_OPTIONS.map((sound) => (
                  <button
                    key={sound.id}
                    className={`sound-pill ${callSound === sound.id ? 'active' : ''}`}
                    onClick={(e) => handlePreviewRingtone(e, sound.id)}
                  >
                    <span className="sound-pill-icon" style={{ color: sound.color }}><FaMusic /></span>
                    {sound.label}
                    {callSound === sound.id && <FaPlay style={{ fontSize: '0.7rem', marginLeft: 'auto' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chats Silenciados */}
          <div className="preferences-field">
            <div className="preferences-accordion-header" onClick={() => toggleSection('muted')}>
              <label className="preferences-label">
                <FaVolumeMute className="preferences-icon" />
                Chats Silenciados
              </label>
              {openSections.muted ? <FaChevronUp className="accordion-icon" /> : <FaChevronDown className="accordion-icon" />}
            </div>

            {openSections.muted && (
              <div className="muted-chats-scroll-list">
                {mutedRooms.length === 0 ? (
                  <p className="no-muted-text">No hay chats silenciados.</p>
                ) : (
                    mutedRooms.map(roomId => {
                      const room = allRooms.find(r => String(r.id) === String(roomId));
                      // Si no encontramos el room en la lista cargada, mostramos el ID
                      const roomName = room ? (room.name || `Chat #${roomId}`) : `Chat #${roomId}`;
                      
                      return (
                        <div key={roomId} className="muted-chat-item">
                          <span title={roomName}>{roomName}</span>
                          <button className="unmute-btn" onClick={() => toggleMuteRoom(roomId)} title="Activar sonido">
                            <FaVolumeUp />
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>

        </div>

        <div className="preferences-field preferences-field--checkbox">
          <input id="notifications" type="checkbox" checked={notifications} onChange={(e) => setNotifications(e.target.checked)} />
          <label htmlFor="notifications" className="preferences-label">
            <FaBell className="preferences-icon" /> Notificaciones
          </label>
        </div>

        <div className="preferences-field preferences-field--checkbox">
          <input id="calls_enabled" type="checkbox" checked={callsEnabled} onChange={(e) => changeCallEnabled(e.target.checked)} />
          <label htmlFor="calls_enabled" className="preferences-label">
            <FaPhone className="preferences-icon" /> Sonido de Llamadas
          </label>
        </div>
      </Modal.Body>

      <Modal.Footer onClose={() => { stopRingtone(); handleClose(); }}>
        <Modal.AcceptButton onClick={handleSubmit}>Guardar</Modal.AcceptButton>
      </Modal.Footer>
    </Modal>
  );
};

export default UserPreferencesModal;