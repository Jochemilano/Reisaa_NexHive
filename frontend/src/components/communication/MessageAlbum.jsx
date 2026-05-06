import React from "react";
import { getFileUrl } from "@/utils/chat";
import "./MessageAlbum.css";

const MessageAlbum = ({ messages, onImageClick, searchTerm }) => {
  const count = messages.length;
  
  // WhatsApp style grid logic
  // 2 images: 2 columns
  // 3 images: 1 large on top, 2 small on bottom
  // 4+ images: 2x2 grid, with "+X" on the last one if > 4
  
  const displayMessages = messages.slice(0, 4);
  const remaining = count - 4;

  return (
    <div className={`message-album grid-${Math.min(count, 4)}`}>
      {displayMessages.map((msg, idx) => (
        <div key={msg.id} className="album-item" onClick={() => onImageClick(msg.id)}>
          <img src={getFileUrl(msg.content)} alt="album" />
          {idx === 3 && remaining > 0 && (
            <div className="album-overlay">
              <span>+{remaining}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MessageAlbum;
