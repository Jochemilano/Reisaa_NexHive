import React from "react";
import "./MediaModal.css";

const MediaModal = ({ media, onClose, onPrev, onNext, hasMore }) => {
  if (!media || !media.src) return null;

  const { src, type } = media;

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch(src, { mode: "cors" });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const fileName = src.split("/").pop().split("?")[0] || (type === 'video' ? "video.mp4" : "imagen.jpg");
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error descargando el archivo:", error);
    }
  };

  return (
    <div className="media-modal-overlay" onClick={onClose}>
      <div className="media-modal-actions" onClick={(e) => e.stopPropagation()}>
        <button className="media-modal-btn" onClick={handleDownload}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Descargar
        </button>
        <button className="media-modal-btn media-modal-btn--close" onClick={onClose}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {hasMore && (
        <>
          <button className="nav-btn prev-btn" onClick={(e) => { e.stopPropagation(); onPrev(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button className="nav-btn next-btn" onClick={(e) => { e.stopPropagation(); onNext(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </>
      )}

      <div className="media-modal-wrapper" onClick={(e) => e.stopPropagation()}>
        {type === 'video' ? (
          <video className="media-modal-content" src={src} controls autoPlay />
        ) : (
          <img className="media-modal-content" src={src} alt="Preview" />
        )}
      </div>
    </div>
  );
};

export default MediaModal;
