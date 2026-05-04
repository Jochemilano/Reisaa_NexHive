import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserFavorites, formatDate } from "@/utils/favorites";
import { getFileUrl, getFileName, toggleFavoriteMessage } from "@/utils/chat";
import { FaStar, FaRegStar } from "react-icons/fa";
import MediaModal from "@/components/communication/MediaModal";
import Skeleton from "@/components/loading/Skeleton";
import "@/styles.css";
import "./Favorites.css"

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = parseInt(localStorage.getItem("userId"));
  const [modalMedia, setModalMedia] = useState(null); // {src, type}
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const data = await getUserFavorites(userId);
        setFavorites(data);
      } catch (err) {
        console.error("Error cargando favoritos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [userId]);

  const handleGoToChat = (msg) => {
    if (msg.room_id) {
      navigate(`/chat/${msg.room_id}`, { state: { scrollToMessageId: msg.id } });
    } else {
      console.warn("Este mensaje no tiene un room_id asociado.");
    }
  };

  const handleToggleFavorite = async (e, msgId) => {
    e.stopPropagation();
    const confirmRemove = window.confirm("¿Seguro que quieres quitar este mensaje de tus favoritos?");
    if (!confirmRemove) return;

    try {
      const data = await toggleFavoriteMessage(msgId);
      if (!data.favorite) {
        setFavorites((prev) => prev.filter((msg) => msg.id !== msgId));
      }
    } catch (err) {
      console.error("Error actualizando favorito:", err);
    }
  };

  if (loading) {
    return (
      <div className="favorites-page">
        <h2>Mensajes Favoritos</h2>
        <div className="favorites-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`fav-skeleton-${i}`} className="favorite-message" style={{ marginBottom: '1rem' }}>
              <Skeleton width="120px" height="20px" style={{ marginBottom: '8px' }} />
              <Skeleton width="100%" height="40px" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="favorites-page">
        <h2>Mensajes Favoritos</h2>
        <div className="empty-favorites-state">
          <div className="empty-icon pulse-animation"><FaStar style={{ color: 'gold' }} /></div>
          <h3 style={{ color: 'var(--primary)' }}>Aún no tienes favoritos</h3>
          <p>Haz clic en la estrella de cualquier mensaje para guardarlo aquí y encontrarlo rápidamente más tarde.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-page">
      <h2>Mensajes Favoritos</h2>

      <div className="favorites-list">
        {favorites.map((msg) => (
          <div key={msg.id} className="favorite-message"
            onClick={() => handleGoToChat(msg)}
            style={{ cursor: "pointer" }}
          >

            {/* Header */}
            <div className="message-header">
              <strong className="sender">{msg.sender_name}</strong>
              <small className="date">
                {formatDate(msg.created_at)}
              </small>
            </div>

            {/* Contenido */}
            <div className="message-content">
              {msg.type === "image" ? (
                <img
                  src={getFileUrl(msg.content)}
                  alt="Imagen enviada"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalMedia({ src: getFileUrl(msg.content), type: 'image' });
                  }}
                  style={{ cursor: "pointer", maxWidth: "200px", borderRadius: "8px" }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              ) : msg.type === "video" ? (
                <div
                  className="favorite-video-preview"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModalMedia({ src: getFileUrl(msg.content), type: 'video' });
                  }}
                  style={{ cursor: "pointer", position: "relative", width: "150px" }}
                >
                  <video src={getFileUrl(msg.content)} style={{ width: "100%", borderRadius: "8px" }} />
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
              ) : msg.type === "file" ? (
                <a
                  href={getFileUrl(msg.content)}
                  target="_blank"
                  rel="noreferrer"
                  className="content-file"
                  onClick={(e) => e.stopPropagation()}
                >
                  {getFileName(msg.content)}
                </a>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>

            {/* Botón flotante */}
            <button
              className="favorite-toggle-btn"
              onClick={(e) => handleToggleFavorite(e, msg.id)}
              title="Quitar de favoritos"
            >
              <FaStar style={{ color: "gold" }} />
            </button>

          </div>
        ))}
      </div>

      <MediaModal media={modalMedia} onClose={() => setModalMedia(null)} />
    </div>
  );
};

export default Favorites;