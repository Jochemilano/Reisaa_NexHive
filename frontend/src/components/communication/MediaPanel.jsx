import React from "react";
import { FaImages, FaTimes, FaExternalLinkAlt } from "react-icons/fa";
import { getFileUrl } from "@/utils/chat";
import "./MediaPanel.css";

const MediaPanel = ({ messages = [], onClose, onImageClick, onGoToMessage }) => {
  const images = messages.filter(msg => msg.type === "image");

  return (
    <div className="media-panel">
      <div className="media-header">
        <h3>Multimedia</h3>
        <button onClick={onClose} className="close-btn">
          <FaTimes />
        </button>
      </div>

      <div className="media-grid">
        {images.length === 0 ? (
          <div className="no-media">
            <FaImages className="no-media-icon" />
            <p>No hay imágenes aún.</p>
          </div>
        ) : (
          images.map((msg) => {
            const url = getFileUrl(msg.content);
            return (
              <div key={msg.id} className="media-item-container">
                <img
                  src={url}
                  alt="media"
                  onClick={() => onImageClick(url)}
                />
                <button 
                  className="goto-msg-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGoToMessage(msg.id);
                    onClose();
                  }}
                  title="Ir al mensaje original"
                >
                  <FaExternalLinkAlt />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MediaPanel;