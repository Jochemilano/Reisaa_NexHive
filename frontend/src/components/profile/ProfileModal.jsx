import React, { useRef, useState, useEffect } from "react";
import Modal from "@/components/modal/Modal";
import { FaCamera, FaSignOutAlt, FaPhone, FaBirthdayCake, FaInfoCircle, FaEdit, FaCalendarAlt } from "react-icons/fa";
import { updateProfilePic, updateProfile } from "@/utils/profile";
import { CONFIG } from "@/utils/config";
import "./ProfileModal.css";
import { getAvatarUrl } from "@/utils/media";
import { Input, Textarea } from "@/components/input/Input";

const ROL_LABEL = {
  admin: "Administrador",
  user: "Usuario",
  moderador: "Moderador",
};

const ProfileModal = ({ isOpen, onClose, perfil, onPicUpdated, onLogout, onProfileUpdated }) => {
  const fileRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    name: "",
    phone: "",
    bio: "",
    birthday: ""
  });

  useEffect(() => {
    if (perfil) {
      setFormData({
        first_name: perfil.first_name || "",
        last_name: perfil.last_name || "",
        name: perfil.name || "",
        phone: perfil.phone || "",
        bio: perfil.bio || "",
        birthday: perfil.birthday ? perfil.birthday.split("T")[0] : ""
      });
    }
  }, [perfil]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await updateProfile(formData);
      onProfileUpdated?.(formData);
      setIsEditing(false);
    } catch (err) {
      console.error("Error actualizando perfil:", err);
      alert("Error al actualizar el perfil");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataPic = new FormData();
    formDataPic.append("profile_pic", file);

    try {
      const response = await fetch(`${CONFIG.API_URL}/profile/picture`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formDataPic,
      });

      const data = await response.json();
      if (data.profile_pic) {
        onPicUpdated(data.profile_pic);
      }
    } catch (err) {
      console.error("Error al subir imagen:", err);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="simple-profile-v3">
      <div className="v3-container">
        
        {/* PARTE SUPERIOR: IDENTIDAD */}
        <div className="v3-header">
          <div className="v3-avatar-section">
            <div className="v3-avatar-wrapper" onClick={() => !isEditing && fileRef.current.click()}>
              {perfil?.profile_pic ? (
                <img src={getAvatarUrl(perfil.profile_pic)} alt="User" className="v3-img" />
              ) : (
                <div className="v3-placeholder">
                  {perfil?.first_name?.[0]?.toUpperCase() || perfil?.name?.[0]?.toUpperCase()}
                </div>
              )}
              {!isEditing && <div className="v3-overlay"><FaCamera /></div>}
            </div>
            <div className={`v3-status-dot ${perfil?.rol === 'admin' ? 'admin' : ''}`} />
          </div>

          <div className="v3-basic-info">
            <h2 className="v3-name">{perfil?.first_name} {perfil?.last_name}</h2>
            <div className="v3-meta">
              <span className="v3-nickname">@{perfil?.name}</span>
              <span className="v3-role">({perfil?.rol ? (ROL_LABEL[perfil.rol.toLowerCase()] || perfil.rol) : "Usuario"})</span>
            </div>
            <p className="v3-email">{perfil?.email}</p>
            {perfil?.created_at && (
              <div className="v3-member-since">
                <FaCalendarAlt /> 
                <span>Miembro desde {new Date(perfil.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
              </div>
            )}
          </div>
        </div>

        <div className="v3-body">
          {isEditing ? (
            <div className="v3-edit-mode">
              <div className="v3-section-label">EDITAR INFORMACIÓN</div>
              <div className="v3-input-row">
                <Input label="Nombres" name="first_name" value={formData.first_name} onChange={handleChange} />
                <Input label="Apellidos" name="last_name" value={formData.last_name} onChange={handleChange} />
              </div>
              <div className="v3-input-row">
                <Input label="Apodo" name="name" value={formData.name} onChange={handleChange} />
                <Input label="Teléfono" name="phone" value={formData.phone} onChange={handleChange} />
              </div>
              <Input label="Fecha de Nacimiento" type="date" name="birthday" value={formData.birthday} onChange={handleChange} />
              <Textarea label="Acerca de mí" name="bio" value={formData.bio} onChange={handleChange} rows={3} />
              
              <div className="v3-edit-actions">
                <button className="v3-btn-save" onClick={handleSave}>Guardar Cambios</button>
                <button className="v3-btn-cancel" onClick={() => setIsEditing(false)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="v3-view-mode">
              <div className="v3-section">
                <div className="v3-section-label">BIOGRAFÍA</div>
                <p className="v3-bio-text">{perfil?.bio || "No hay biografía disponible."}</p>
              </div>

              <div className="v3-section">
                <div className="v3-section-label">DETALLES PERSONALES</div>
                <div className="v3-details-list">
                  <div className="v3-detail-item">
                    <FaPhone />
                    <div className="v3-detail-content">
                      <label>Celular</label>
                      <span>{perfil?.phone || "No registrado"}</span>
                    </div>
                  </div>
                  <div className="v3-detail-item">
                    <FaBirthdayCake />
                    <div className="v3-detail-content">
                      <label>Cumpleaños</label>
                      <span>
                        {perfil?.birthday 
                          ? new Date(perfil.birthday.split('T')[0] + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
                          : "No registrado"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="v3-footer">
                <button className="v3-btn-edit" onClick={() => setIsEditing(true)}>
                  <FaEdit /> Editar mi Perfil
                </button>
                <div className="v3-footer-secondary">
                  <button className="v3-btn-logout" onClick={onLogout}><FaSignOutAlt /> Salir</button>
                  <button className="v3-btn-close" onClick={onClose}>Cerrar</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
    </Modal>
  );
};

export default ProfileModal;