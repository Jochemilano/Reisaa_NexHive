import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useChat } from "@/hooks/useChat";
import { useCall } from "@/context/CallContext";
import CallVideo from "./Callvideo";
import MediaModal from "./MediaModal";
import MediaPanel from "./MediaPanel";
import ImageEditorModal from "./ImageEditorModal";
import ChatSearch from "./ChatSearch";
import { FaPaperclip, FaPaperPlane, FaStar, FaPhone, FaReply, FaEdit, FaTrash, FaTimes, FaImages, FaCopy, FaPlus, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { MdDoneAll } from "react-icons/md";
import { FiCheck } from "react-icons/fi";
import { useUnread } from "@/context/UnreadContext";
import { useUserDetail } from "@/context/UserDetailContext";
import { getFileUrl, getFileName, toggleFavoriteMessage } from "@/utils/chat";
import "./chat.css";
import "./call.css";
import { smoothScroll } from "@/utils/smoothScroll";
import { getAvatarUrl } from "@/utils/media";

const normalizeText = (str) =>
  str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || "";

const highlightText = (text, search) => {
  if (!search.trim()) return text;
  const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  const regex = new RegExp(`(${escapedSearch})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    normalizeText(part) === normalizeText(search) ? (
      <span key={i} className="search-result-highlight">{part}</span>
    ) : (part)
  );
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
};

const MessageContent = ({ msg, onImageClick, onVideoClick, isMine, onReply, onEdit, onDelete, onReplyToOriginal, searchTerm }) => {
  const [favorite, setFavorite] = useState(msg.favorite === 1);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();
  const src = getFileUrl(msg.content);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFavorite = async () => {
    try {
      const data = await toggleFavoriteMessage(msg.id);
      setFavorite(data.favorite);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopy = () => {
    if (msg.type === "text") {
      navigator.clipboard.writeText(msg.content).catch(err => console.error(err));
    }
  };

  return (
    <div className="message-wrapper">
      <div className="message-content">
        {msg.reply_to_id && (
          <div
            className="reply-preview"
            onClick={() => onReplyToOriginal && onReplyToOriginal(msg.reply_to_id)}
            style={{ cursor: "pointer" }}
          >
            <div className="reply-author">{msg.reply_sender_name}</div>
            <div className="reply-text">{msg.reply_content}</div>
          </div>
        )}

        {{
          image: <img className="content-image" src={src} alt="imagen" onClick={() => onImageClick(src)} />,
          video: (
            <div className="video-preview-wrapper" onClick={() => onVideoClick(src)}>
              <video className="content-video" src={src} />
              <div className="video-play-overlay">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          ),
          audio: <audio className="content-audio" src={src} controls />,
          file: <a className="content-file" href={src} target="_blank" rel="noreferrer">{getFileName(msg.content)}</a>,
          text: <p className="content">{highlightText(msg.content, searchTerm)}</p>,
        }[msg.type]}

        <div className="message-meta">
          {msg.edited === 1 && <span className="edited-tag">editado</span>}
          <span className="message-time">{formatTime(msg.created_at)}</span>
          {isMine && (
            <span className={`read-status ${msg.read === true ? "read" : "sent"}`}>
              {msg.read === true
                ? <MdDoneAll className="check-mark done-all" />
                : <FiCheck className="check-mark sent-check" />
              }
            </span>
          )}
        </div>

        <button className="menu-toggle-btn" onClick={() => setMenuOpen(prev => !prev)} type="button">▼</button>

        {menuOpen && (
          <div className="context-menu" ref={menuRef}>
            <ul>
              {msg.type === "text" && (
                <li onClick={() => { handleCopy(); setMenuOpen(false); }}>
                  <FaCopy style={{ marginRight: 6 }} /> Copiar
                </li>
              )}
              <li onClick={() => { handleFavorite(); setMenuOpen(false); }}>
                <FaStar style={{ color: favorite ? "gold" : "gray", marginRight: 6 }} /> Favoritos
              </li>
              {isMine && (
                <>
                  <li onClick={() => { onEdit(msg); setMenuOpen(false); }}>
                    <FaEdit style={{ marginRight: 6 }} /> Editar
                  </li>
                  <li onClick={() => { onDelete(msg.id); setMenuOpen(false); }}>
                    <FaTrash style={{ marginRight: 6 }} /> Eliminar
                  </li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>

      <button className="reply-btn" onClick={() => onReply(msg)} type="button"><FaReply /></button>
    </div>
  );
};

const Chat = ({ roomId, userId, groupId, targetUserId, targetUserName, targetUserAvatar, initialUnreadCount }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialUnreadRef = useRef(initialUnreadCount);
  const [firstUnreadId, setFirstUnreadId] = useState(null);
  const [showUnreadSep, setShowUnreadSep] = useState(initialUnreadCount > 0);

  const [input, setInput] = useState("");
  const [modalMedia, setModalMedia] = useState(null);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showMediaPanel, setShowMediaPanel] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorFiles, setEditorFiles] = useState([]);

  const [showSearch, setSearchSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const chatPageRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const messagesRef = useRef(null);
  const messageRefs = useRef({});

  const { messages, send, sendFile, deleteMessage, editMessage } = useChat(roomId, userId);
  const { startCall, activeCall, isMinimized } = useCall();
  const { mutedRooms = [], toggleMuteRoom } = useUnread();
  const { showUserProfile, showGroupProfile, showRoomProfile } = useUserDetail();
  const isRoomMuted = mutedRooms?.includes(roomId) || false;

  const isInitialLoad = useRef(true);

  const scrollToBottom = (instant = false) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (instant) {
      container.scrollTop = container.scrollHeight;
      setIsAtBottom(true);
    } else {
      const targetPos = container.scrollHeight - container.clientHeight;
      smoothScroll(container, targetPos, { maxDuration: 500, onComplete: () => setIsAtBottom(true) });
    }
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    setIsAtBottom(atBottom);
  };

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    scrollContainerRef.current = container;
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Capturar el ID del primer mensaje no leído
  useEffect(() => {
    const count = initialUnreadRef.current;
    if (messages.length > 0 && count > 0 && !firstUnreadId) {
      const idx = messages.length - count;
      if (idx >= 0 && messages[idx]) {
        setFirstUnreadId(messages[idx].id);
      }
    }

    // Scroll inicial: sin animación, una sola vez
    if (isInitialLoad.current && messages.length > 0) {
      isInitialLoad.current = false;
      const isNavigatingToFav = !!location.state?.scrollToMessageId;
      if (!isNavigatingToFav) {
        // Usar requestAnimationFrame para esperar que el DOM se pinte
        requestAnimationFrame(() => {
          scrollToBottom(true); // instant
        });
      }
    }
  }, [messages, firstUnreadId]);

  // Scroll suave para mensajes nuevos (después de la carga inicial)
  useEffect(() => {
    if (isInitialLoad.current) return; // No hacer nada durante la carga inicial
    const isNavigatingToFav = !!location.state?.scrollToMessageId;
    if (isAtBottom && !isNavigatingToFav) scrollToBottom(false);
  }, [messages, isAtBottom, location.state]);

  useEffect(() => {
    const targetId = location.state?.scrollToMessageId;
    if (targetId && messages.length > 0) {
      const timer = setTimeout(() => {
        handleScrollToOriginal(targetId);
        navigate(location.pathname, { replace: true, state: {} });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.state, messages, navigate, location.pathname]);

  const clearUnread = () => {
    setShowUnreadSep(false);
  };

  const handleSend = () => {
    clearUnread();
    if (previewFiles.length > 0) {
      previewFiles.forEach(file => sendFile(file));
      setPreviewFiles([]);
    }
    if (!input.trim() && previewFiles.length === 0) return;
    if (input.trim()) {
      if (editingMsg) {
        editMessage(editingMsg.id, input);
        setEditingMsg(null);
      } else {
        send(input, replyTo?.id || null);
        setReplyTo(null);
      }
      setInput("");
      setTimeout(() => { scrollToBottom(); }, 50);
    }
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const images = selectedFiles.filter(f => f.type.startsWith("image/"));
    const others = selectedFiles.filter(f => !f.type.startsWith("image/"));
    if (images.length > 0) { setEditorFiles(images); setIsEditorOpen(true); }
    if (others.length > 0) { setPreviewFiles(prev => [...prev, ...others]); }
    e.target.value = null;
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          setEditorFiles([file]);
          setIsEditorOpen(true);
        }
      }
    }
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const images = files.filter(f => f.type.startsWith("image/"));
      const others = files.filter(f => !f.type.startsWith("image/"));
      if (images.length > 0) { setEditorFiles(images); setIsEditorOpen(true); }
      if (others.length > 0) { setPreviewFiles(prev => [...prev, ...others]); }
    }
  };

  const handleEdit = (msg) => { setEditingMsg(msg); setReplyTo(null); setInput(msg.content); };
  const handleReply = (msg) => { setReplyTo(msg); setEditingMsg(null); };
  const cancelAction = () => { setReplyTo(null); setEditingMsg(null); setPreviewFiles([]); setInput(""); };

  const handleInputChange = (e) => {
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 4 * 1.4 * 16) + "px";
    setInput(textarea.value);
  };

  const handleScrollToOriginal = (msgId) => {
    const container = scrollContainerRef.current;
    const target = messageRefs.current[msgId];
    if (!container || !target) return;
    const targetPos = target.offsetTop - container.offsetTop - (container.clientHeight / 2) + (target.clientHeight / 2);
    smoothScroll(container, targetPos, { maxDuration: 800 });
    target.classList.add("highlighted");
    setTimeout(() => target.classList.remove("highlighted"), 1500);
  };

  const formatDateSeparator = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Ayer";
    return date.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
  };

  const getMessagesWithSeparators = () => {
    const items = [];
    let lastDateKey = null;
    messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at);
      const dateKey = msgDate.toDateString();
      if (dateKey !== lastDateKey) {
        items.push({ separator: true, label: formatDateSeparator(msg.created_at), key: `sep-${dateKey}` });
        lastDateKey = dateKey;
      }
      if (msg.id === firstUnreadId && showUnreadSep) {
        items.push({ unreadSeparator: true, label: `Mensajes no leídos: ${initialUnreadRef.current}`, key: 'unread-sep' });
      }
      items.push({ ...msg, separator: false, key: msg.id || `${msg.sender_id}-${msg.created_at}-${Math.random()}` });
    });
    return items;
  };

  const handleSearch = (text) => {
    setSearchTerm(text);
    if (!text.trim()) { setSearchResults([]); setCurrentMatchIndex(-1); return; }
    const matches = messages.filter(m => m.type === "text" && normalizeText(m.content).includes(normalizeText(text))).map(m => m.id);
    setSearchResults(matches);
    if (matches.length > 0) {
      setCurrentMatchIndex(matches.length - 1);
      handleScrollToOriginal(matches[matches.length - 1]);
    } else {
      setCurrentMatchIndex(-1);
    }
  };

  const navigateMatch = (direction) => {
    if (searchResults.length === 0) return;
    let nextIdx = direction === "up" ? (currentMatchIndex > 0 ? currentMatchIndex - 1 : searchResults.length - 1) : (currentMatchIndex < searchResults.length - 1 ? currentMatchIndex + 1 : 0);
    setCurrentMatchIndex(nextIdx);
    handleScrollToOriginal(searchResults[nextIdx]);
  };

  return (
    <div className="chat-page" ref={chatPageRef}>
      {activeCall && !isMinimized && <div className="chat-call-section"><CallVideo expanded /></div>}
      <div className="chat-section" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} style={{ position: 'relative' }}>
        {isDragging && <div className="drag-drop-overlay"><div className="drag-drop-content"><FaImages size={50} color="#00a884" /><p>Suelta las imágenes aquí</p></div></div>}
        <div className="chat-header">
          <div 
            className="chat-header-info" 
            style={{ cursor: (targetUserId || groupId || roomId) ? "pointer" : "default" }}
            onClick={() => {
              if (groupId) showGroupProfile(groupId);
              else if (targetUserId) showUserProfile(targetUserId);
              else showRoomProfile(roomId);
            }}
          >
            <div className="chat-avatar">{targetUserAvatar ? <img src={getAvatarUrl(targetUserAvatar)} alt={targetUserName} className="avatar-img" /> : targetUserName?.[0] || "C"}</div>
            <span className="chat-username">{targetUserName || "Chat"}</span>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <ChatSearch showSearch={showSearch} setShowSearch={setSearchSearch} searchTerm={searchTerm} onSearch={handleSearch} results={searchResults} currentIndex={currentMatchIndex} onNavigate={navigateMatch} />
            <button 
              onClick={() => toggleMuteRoom(roomId)} 
              className={`header-icon-btn ${isRoomMuted ? 'audio-off' : 'audio-on'}`}
              title={isRoomMuted ? "Activar audio" : "Desactivar audio"}
            >
              {isRoomMuted ? <FaVolumeMute style={{ color: "#ff4d4d" }} /> : <FaVolumeUp />}
            </button>
            {targetUserId && !activeCall && <button onClick={() => startCall(targetUserId, targetUserName, roomId)} className="header-icon-btn" title="Llamar"><FaPhone /></button>}
            <button onClick={() => setShowMediaPanel(prev => !prev)} className="header-icon-btn" title="Multimedia"><FaImages /></button>
          </div>
        </div>
        <div className="chat-messages" ref={messagesRef}>
          {getMessagesWithSeparators().map((item) => (
            item.separator ? (
              <div key={item.key} className="date-separator"><span>{item.label}</span></div>
            ) : item.unreadSeparator ? (
              <div key={item.key} className="unread-messages-separator">
                <span>{item.label}</span>
                <button className="clear-unread-btn" onClick={clearUnread}><FaTimes /></button>
              </div>
            ) : (
              <div key={item.key} ref={(el) => (messageRefs.current[item.id] = el)} className={`chat-message ${Number(item.sender_id) === Number(userId) ? "mine" : "other"}`}>
                <span 
                  className="sender" 
                  style={{ cursor: "pointer" }}
                  onClick={() => showUserProfile(item.sender_id)}
                >
                  {item.sender_name || item.sender_id}
                </span>
                <MessageContent msg={item} searchTerm={searchTerm} onImageClick={(src) => setModalMedia({ src, type: 'image' })} onVideoClick={(src) => setModalMedia({ src, type: 'video' })} isMine={Number(item.sender_id) === Number(userId)} onReply={handleReply} onReplyToOriginal={handleScrollToOriginal} onEdit={handleEdit} onDelete={deleteMessage} />
              </div>
            )
          ))}
        </div>
        {showMediaPanel && <MediaPanel messages={messages} onClose={() => setShowMediaPanel(false)} onImageClick={(src) => setModalMedia({ src, type: 'image' })} onVideoClick={(src) => setModalMedia({ src, type: 'video' })} onGoToMessage={handleScrollToOriginal} />}
        <div className="chat-footer">
          {previewFiles.length > 0 && (
            <div className="preview-multi-container">
              {previewFiles.map((file, idx) => (
                <div key={idx} className="preview-image-wrapper">
                  {file.type.startsWith("image/") ? <img src={URL.createObjectURL(file)} alt="preview" /> : <div className="preview-file-icon"><FaPaperclip /></div>}
                  <button className="remove-preview" onClick={() => setPreviewFiles(prev => prev.filter((_, i) => i !== idx))} type="button"><FaTimes /></button>
                </div>
              ))}
              <label className="add-more-files"><FaPlus /><input type="file" multiple onChange={handleFileChange} style={{ display: "none" }} /></label>
            </div>
          )}
          {(replyTo || editingMsg) && (
            <div className="action-banner">
              <div className="action-content">
                {replyTo && <><FaReply className="action-icon" /><div className="action-info"><span className="reply-label">Respondiendo a <b>{replyTo.sender_name}</b></span><span className="reply-text-truncate">{replyTo.content}</span></div></>}
                {editingMsg && <><FaEdit className="action-icon" /><span>Editando mensaje...</span></>}
              </div>
              <button className="cancel-action" onClick={cancelAction}><FaTimes /></button>
            </div>
          )}
          <div className="chat-input">
            <label htmlFor="file-upload" className="upload-btn"><FaPaperclip /></label>
            <input id="file-upload" type="file" multiple onChange={handleFileChange} style={{ display: "none" }} />
            <textarea value={input} onChange={handleInputChange} onPaste={handlePaste} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder={previewFiles.length > 0 ? "Añade un comentario..." : (editingMsg ? "Edita el mensaje..." : "Escribe un mensaje...")} className="chat-textarea" rows={1} />
            <button onClick={handleSend} className="send-btn" disabled={!input.trim() && previewFiles.length === 0}><FaPaperPlane /></button>
          </div>
        </div>
      </div>
      {!isAtBottom && <button className="scroll-to-bottom-btn" onClick={scrollToBottom} type="button">↓</button>}
      <MediaModal media={modalMedia} onClose={() => setModalMedia(null)} />
      {isEditorOpen && <ImageEditorModal files={editorFiles} onSave={(edited) => { setPreviewFiles(prev => [...prev, ...edited]); setIsEditorOpen(false); setEditorFiles([]); }} onClose={() => { setIsEditorOpen(false); setEditorFiles([]); }} onAddMore={(newFiles) => { setEditorFiles(prev => [...prev, ...newFiles]); }} />}
    </div>
  );
};

export default Chat;