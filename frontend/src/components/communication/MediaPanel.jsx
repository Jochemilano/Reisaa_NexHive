import React from "react";
import { FaImages, FaTimes, FaExternalLinkAlt } from "react-icons/fa";
import { getFileUrl } from "@/utils/chat";
import "./MediaPanel.css";

const MediaPanel = ({ messages = [], onClose, onImageClick, onVideoClick, onGoToMessage }) => {
  const mediaItems = messages.filter(msg => msg.type === "image" || msg.type === "video");

  return (
    <div className="media-panel">
      <div className="media-header">
        <h3>Multimedia</h3>
        <button onClick={onClose} className="close-btn">
          <FaTimes />
        </button>
      </div>

      <div className="media-grid">
        {mediaItems.length === 0 ? (
          <div className="no-media">
            <FaImages className="no-media-icon" />
            <p>No hay multimedia aún.</p>
          </div>
        ) : (
          mediaItems.map((msg) => {
            const url = getFileUrl(msg.content);
            const isVideo = msg.type === "video";
            return (
              <div key={msg.id} className="media-item-container">
                {isVideo ? (
                  <div className="media-item-video" onClick={() => onVideoClick(url)}>
                    <video src={url} />
                    <div className="media-play-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                ) : (
                  <img
                    src={url}
                    alt="media"
                    onClick={() => onImageClick(url)}
                  />
                )}
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