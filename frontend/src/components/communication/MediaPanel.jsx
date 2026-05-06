import React, { useState } from "react";
import { FaImages, FaTimes, FaExternalLinkAlt, FaFileAlt } from "react-icons/fa";
import { getFileUrl } from "@/utils/chat";
import "./MediaPanel.css";

const MediaPanel = ({ messages = [], onClose, onImageClick, onVideoClick, onGoToMessage }) => {
  const [activeTab, setActiveTab] = useState("media"); // "media" o "docs"
  
  const mediaItems = messages.filter(msg => msg.type === "image" || msg.type === "video");
  const docItems = messages.filter(msg => msg.type === "file" || msg.type === "audio");

  return (
    <div className="media-panel">
      <div className="media-header">
        <h3>Multimedia</h3>
        <button onClick={onClose} className="close-btn">
          <FaTimes />
        </button>
      </div>

      <div className="media-tabs">
        <button 
          className={`tab-btn ${activeTab === "media" ? "active" : ""}`} 
          onClick={() => setActiveTab("media")}
        >
          Multimedia
        </button>
        <button 
          className={`tab-btn ${activeTab === "docs" ? "active" : ""}`} 
          onClick={() => setActiveTab("docs")}
        >
          Documentos
        </button>
      </div>

      <div className="media-content-area">
        {activeTab === "media" ? (
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
                      <div className="media-item-video" onClick={() => onVideoClick(msg.id)}>
                        <video src={url} />
                        <div className="media-play-icon">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={url}
                        alt="media"
                        onClick={() => onImageClick(msg.id)}
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
        ) : (
          <div className="docs-list">
            {docItems.length === 0 ? (
              <div className="no-media">
                <FaFileAlt className="no-media-icon" />
                <p>No hay documentos aún.</p>
              </div>
            ) : (
              docItems.map((msg) => {
                const url = getFileUrl(msg.content);
                const fileName = msg.content.split("/").pop().split("-").slice(1).join("-") || msg.content;
                return (
                  <div key={msg.id} className="doc-item">
                    <div className="doc-info" onClick={() => window.open(url, "_blank")}>
                      <FaFileAlt className="doc-icon" />
                      <div className="doc-text">
                        <span className="doc-name">{fileName}</span>
                        <span className="doc-type">{msg.type === "audio" ? "Audio" : "Documento"}</span>
                      </div>
                    </div>
                    <button 
                      className="goto-msg-btn-inline"
                      onClick={() => {
                        onGoToMessage(msg.id);
                        onClose();
                      }}
                      title="Ir al mensaje"
                    >
                      <FaExternalLinkAlt />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPanel;