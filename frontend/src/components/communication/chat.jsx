import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useChat } from "@/hooks/useChat";
import { useCall } from "@/context/CallContext";
import CallVideo from "./Callvideo";
import MediaModal from "./MediaModal";
import MediaPanel from "./MediaPanel";
import ImageEditorModal from "./ImageEditorModal";
import ChatSearch from "./ChatSearch";
import { FaPaperclip, FaPaperPlane, FaStar, FaPhone, FaReply, FaEdit, FaTrash, FaTimes, FaImages, FaCopy, FaPlus, FaVolumeUp, FaVolumeMute, FaFileAlt, FaDownload } from "react-icons/fa";
import MessageAlbum from "./MessageAlbum";
import "./MessageAlbum.css";
import { MdDoneAll } from "react-icons/md";
import { FiCheck } from "react-icons/fi";
import { useUnread } from "@/context/UnreadContext";
import { useUserDetail } from "@/context/UserDetailContext";
import { getFileUrl, getFileName, toggleFavoriteMessage } from "@/utils/chat";
import "./chat.css";
import "./call.css";
import { smoothScroll } from "@/utils/smoothScroll";
import { getAvatarUrl } from "@/utils/media";
import Skeleton from "@/components/loading/Skeleton";

const normalizeText = (str) =>
  str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || "";

const renderMessageContent = (text, search) => {
  if (!text) return "";

  // 1. Detectar enlaces mediante Regex y convertirlos en componentes interactivos con target="_blank" por seguridad.
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  
  // Dividimos el texto primero por links
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a key={`link-${i}`} href={part} target="_blank" rel="noopener noreferrer" className="message-link">
          {part}
        </a>
      );
    }

    // 2. Si no es link, aplicar highlight de búsqueda
    if (!search.trim()) return part;

    const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const searchRegex = new RegExp(`(${escapedSearch})`, "gi");
    const subParts = part.split(searchRegex);

    return subParts.map((sub, j) => 
      normalizeText(sub) === normalizeText(search) ? (
        <span key={`high-${i}-${j}`} className="search-result-highlight">{sub}</span>
      ) : sub
    );
  });
};

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
};

const renderReplyContent = (content, caption = null) => {
  if (!content) return caption ? <div className="reply-text">{caption}</div> : null;
  // Ensure it's a path or url to avoid false positives on normal text that happens to end in .jpg
  const isPath = content.startsWith('/uploads/') || content.startsWith('http') || content.startsWith('blob:');
  const isImage = isPath && (content.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i) || content.startsWith('blob:'));
  const isVideo = isPath && content.match(/\.(mp4|webm|ogg)(\?.*)?$/i);

  if (isImage) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <img src={getFileUrl(content)} alt="reply" style={{ height: '30px', width: '30px', objectFit: 'cover', borderRadius: '4px' }} />
        <span style={{ fontSize: '12px', fontStyle: 'italic', opacity: 0.8 }}>{caption || 'Foto'}</span>
      </div>
    );
  }
  if (isVideo) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <video src={getFileUrl(content)} style={{ height: '30px', width: '30px', objectFit: 'cover', borderRadius: '4px' }} />
        <span style={{ fontSize: '12px', fontStyle: 'italic', opacity: 0.8 }}>{caption || 'Video'}</span>
      </div>
    );
  }
  if (content.startsWith('/uploads/')) {
    return <span style={{ fontSize: '12px', fontStyle: 'italic', opacity: 0.8, display: 'block', marginTop: '4px' }}>{caption || 'Archivo adjunto'}</span>;
  }
  return <div className="reply-text">{content}</div>;
};

// Componente de mensaje individual memorizado para optimizar el rendimiento del scroll y renderizado masivo.
const MessageContent = React.memo(({ msg, onImageClick, onVideoClick, isMine, onReply, onEdit, onDelete, onReplyToOriginal, searchTerm }) => {
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
            {renderReplyContent(msg.reply_content, msg.reply_caption)}
          </div>
        )}

        {{
          image: (
            <div className="message-media-container">
              <img className="content-image" src={src} alt="imagen" onClick={() => onImageClick(msg.id)} />
              {msg.caption && <p className="content caption">{renderMessageContent(msg.caption, searchTerm)}</p>}
            </div>
          ),
          video: (
            <div className="message-media-container">
              <div className="video-preview-wrapper" onClick={() => onVideoClick(msg.id)}>
                <video className="content-video" src={src} />
                <div className="video-play-overlay">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
              {msg.caption && <p className="content caption">{renderMessageContent(msg.caption, searchTerm)}</p>}
            </div>
          ),
          audio: (
            <div className="message-media-container">
              <audio className="content-audio" src={src} controls />
              {msg.caption && <p className="content caption">{renderMessageContent(msg.caption, searchTerm)}</p>}
            </div>
          ),
          file: (
            <div className="message-media-container">
              <div className="document-attachment">
                <div className="doc-icon-container">
                  <FaFileAlt size={20} />
                </div>
                <div className="doc-details">
                  <a className="doc-name" href={src} target="_blank" rel="noreferrer" title="Abrir en nueva pestaña">
                    {getFileName(msg.content)}
                  </a>
                  <span className="doc-size">{formatFileSize(msg.file_size)}</span>
                </div>
                <a className="doc-download-btn" href={src} download={getFileName(msg.content)} title="Descargar">
                  <FaDownload />
                </a>
              </div>
              {msg.caption && <p className="content caption">{renderMessageContent(msg.caption, searchTerm)}</p>}
            </div>
          ),
          text: <p className="content">{renderMessageContent(msg.content, searchTerm)}</p>,
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
}, (prevProps, nextProps) => {
  return prevProps.msg === nextProps.msg &&
    prevProps.isMine === nextProps.isMine &&
    prevProps.searchTerm === nextProps.searchTerm;
});

const Chat = ({ roomId, userId, groupId, targetUserId, targetUserName, targetUserAvatar, initialUnreadCount, loadingHeader }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialUnreadRef = useRef(initialUnreadCount);
  const [firstUnreadId, setFirstUnreadId] = useState(null);
  const [showUnreadSep, setShowUnreadSep] = useState(initialUnreadCount > 0);

  const [input, setInput] = useState("");
  const [activeMediaId, setActiveMediaId] = useState(null);
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
  const typingTimeoutRef = useRef(null);

  const { messages, loading: loadingMessages, typingUsers, send, sendFile, deleteMessage, editMessage, setTyping } = useChat(roomId, userId);
  const { startCall, activeCall, isMinimized } = useCall();
  const { mutedRooms = [], toggleMuteRoom } = useUnread();
  const { showUserProfile, showGroupProfile, showRoomProfile } = useUserDetail();
  const isRoomMuted = mutedRooms?.includes(roomId) || false;

  const isInitialLoad = useRef(true);
  const myNameRef = useRef("Alguien");

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userObj = JSON.parse(userStr);
        myNameRef.current = userObj?.name || "Alguien";
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const scrollToBottom = useCallback((instant = false) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    if (instant) {
      container.scrollTop = container.scrollHeight;
      setIsAtBottom(true);
    } else {
      const targetPos = container.scrollHeight - container.clientHeight;
      smoothScroll(container, targetPos, { maxDuration: 500, onComplete: () => setIsAtBottom(true) });
    }
  }, []);

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

  const clearUnread = useCallback(() => {
    setShowUnreadSep(false);
  }, []);

  const handleSend = useCallback(() => {
    clearUnread();
    
    const hasFiles = previewFiles.length > 0;
    const hasText = input.trim().length > 0;

    if (!hasFiles && !hasText) return;

    if (hasFiles) {
      // Mandar el primer archivo con el texto del input como caption
      sendFile(previewFiles[0], input.trim() || null, replyTo?.id || null);
      
      // Mandar el resto de archivos normalmente
      if (previewFiles.length > 1) {
        previewFiles.slice(1).forEach(file => sendFile(file));
      }
      
      setPreviewFiles([]);
      setInput("");
      setReplyTo(null);
      setTimeout(() => { scrollToBottom(); }, 50);
    } else if (hasText) {
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
  }, [input, previewFiles, editingMsg, replyTo, send, sendFile, editMessage, clearUnread, scrollToBottom]);

  const mediaMessages = messages.filter(m => m.type === "image" || m.type === "video");
  const currentMedia = mediaMessages.find(m => m.id === activeMediaId);

  const handleOpenMedia = (msgId) => {
    setActiveMediaId(msgId);
  };

  const handleNextMedia = useCallback(() => {
    const idx = mediaMessages.findIndex(m => m.id === activeMediaId);
    if (idx < mediaMessages.length - 1) setActiveMediaId(mediaMessages[idx + 1].id);
  }, [activeMediaId, mediaMessages]);

  const handlePrevMedia = useCallback(() => {
    const idx = mediaMessages.findIndex(m => m.id === activeMediaId);
    if (idx > 0) setActiveMediaId(mediaMessages[idx - 1].id);
  }, [activeMediaId, mediaMessages]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!activeMediaId) return;
      if (e.key === "ArrowRight") handleNextMedia();
      if (e.key === "ArrowLeft") handlePrevMedia();
      if (e.key === "Escape") setActiveMediaId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeMediaId, handleNextMedia, handlePrevMedia]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // Evitar enviar si hay modales abiertos o el editor de imágenes
        if (isEditorOpen || activeMediaId) return;

        const activeElement = document.activeElement;
        const isInputOrTextarea = activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA";
        const isButton = activeElement.tagName === "BUTTON";

        // Si no estamos en un elemento interactivo, enviamos el mensaje si hay contenido o archivos
        if (!isInputOrTextarea && !isButton) {
          if (input.trim() || previewFiles.length > 0) {
            e.preventDefault();
            handleSend();
          }
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleSend, isEditorOpen, activeMediaId, input, previewFiles]);

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
  // Manejo de carga de archivos por arrastre.
  // Soporta tanto archivos del sistema como imágenes copiadas/arrastradas desde el navegador (HTML/URL).
  const handleDrop = async (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const images = files.filter(f => f.type.startsWith("image/"));
      const others = files.filter(f => !f.type.startsWith("image/"));
      if (images.length > 0) { setEditorFiles(images); setIsEditorOpen(true); }
      if (others.length > 0) { setPreviewFiles(prev => [...prev, ...others]); }
    } else {
      const html = e.dataTransfer.getData("text/html");
      const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
      
      let imageUrl = null;
      if (html) {
        const match = html.match(/src="([^"]+)"/);
        if (match && match[1]) {
          imageUrl = match[1];
        }
      }
      if (!imageUrl && url && url.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
        imageUrl = url;
      }
      
      if (imageUrl) {
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          const file = new File([blob], "image.jpg", { type: blob.type || "image/jpeg" });
          setEditorFiles([file]);
          setIsEditorOpen(true);
        } catch (err) {
          console.error("Error fetching dropped image", err);
        }
      }
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

    // Typing indicator logic
    if (!typingTimeoutRef.current) {
      setTyping(true, myNameRef.current);
    } else {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
      typingTimeoutRef.current = null;
    }, 3000);
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

  // Procesa la lista plana de mensajes para inyectar separadores de fecha, 
  // indicadores de no leídos y agrupar imágenes consecutivas en álbumes para una interfaz más limpia.
  const getMessagesWithSeparators = () => {
    const items = [];
    let lastDateKey = null;
    let lastSenderId = null;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const msgDate = new Date(msg.created_at);
      const dateKey = msgDate.toDateString();
      let separatorAdded = false;

      if (dateKey !== lastDateKey) {
        items.push({ separator: true, label: formatDateSeparator(msg.created_at), key: `sep-${dateKey}` });
        lastDateKey = dateKey;
        separatorAdded = true;
      }
      if (msg.id === firstUnreadId && showUnreadSep) {
        items.push({ unreadSeparator: true, label: `Mensajes no leídos: ${initialUnreadRef.current}`, key: 'unread-sep' });
        separatorAdded = true;
      }

      // Agrupar imágenes consecutivas sin caption
      if (msg.type === "image" && !msg.caption) {
        const group = [msg];
        let j = i + 1;
        while (
          j < messages.length &&
          messages[j].type === "image" &&
          !messages[j].caption &&
          Number(messages[j].sender_id) === Number(msg.sender_id) &&
          (new Date(messages[j].created_at) - new Date(messages[j - 1].created_at)) < 30000
        ) {
          group.push(messages[j]);
          j++;
        }

        if (group.length >= 2) {
          items.push({
            album: true,
            messages: group,
            sender_id: msg.sender_id,
            sender_name: msg.sender_name,
            created_at: msg.created_at,
            id: msg.id,
            key: `album-${msg.id}`
          });
          i = j - 1;
          lastSenderId = msg.sender_id;
          continue;
        }
      }

      const isConsecutive = !separatorAdded && Number(lastSenderId) === Number(msg.sender_id);
      lastSenderId = msg.sender_id;

      items.push({
        ...msg,
        originalMsg: msg,
        separator: false,
        isConsecutive,
        key: msg.id || `temp-${msg.sender_id}-${msg.created_at}-${msg.content?.substring(0, 20) || Math.random()}`
      });
    }
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
            <div className="chat-avatar">
              {loadingHeader ? (
                <Skeleton width="100%" height="100%" borderRadius="50%" />
              ) : targetUserAvatar ? (
                <img src={getAvatarUrl(targetUserAvatar)} alt={targetUserName} className="avatar-img" />
              ) : (
                targetUserName?.[0] || "C"
              )}
            </div>
            <span className="chat-username">
              {loadingHeader ? <Skeleton width="100px" height="20px" /> : (targetUserName || "Chat")}
            </span>
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
          {loadingMessages ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
              <div style={{ alignSelf: 'flex-start', width: '60%' }}><Skeleton height="40px" borderRadius="12px" /></div>
              <div style={{ alignSelf: 'flex-end', width: '50%' }}><Skeleton height="60px" borderRadius="12px" /></div>
              <div style={{ alignSelf: 'flex-start', width: '40%' }}><Skeleton height="30px" borderRadius="12px" /></div>
              <div style={{ alignSelf: 'flex-end', width: '70%' }}><Skeleton height="50px" borderRadius="12px" /></div>
              <div style={{ alignSelf: 'flex-start', width: '55%' }}><Skeleton height="45px" borderRadius="12px" /></div>
            </div>
          ) : getMessagesWithSeparators().map((item) => (
            item.separator ? (
              <div key={item.key} className="date-separator"><span>{item.label}</span></div>
            ) : item.unreadSeparator ? (
              <div key={item.key} className="unread-messages-separator">
                <span>{item.label}</span>
                <button className="clear-unread-btn" onClick={clearUnread}><FaTimes /></button>
              </div>
            ) : item.album ? (
              <div key={item.key} ref={(el) => (messageRefs.current[item.id] = el)} className={`chat-message ${Number(item.sender_id) === Number(userId) ? "mine" : "other"}`}>
                <span className="sender">{item.sender_name}</span>
                <div className="message-wrapper">
                  <div className="message-content album-content">
                    <MessageAlbum messages={item.messages} onImageClick={handleOpenMedia} searchTerm={searchTerm} />
                    <div className="message-meta">
                      <span className="message-time">{formatTime(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div key={item.key} ref={(el) => (messageRefs.current[item.id] = el)} className={`chat-message ${Number(item.sender_id) === Number(userId) ? "mine" : "other"} ${item.isConsecutive ? "consecutive" : ""}`}>
                {!item.isConsecutive && (
                  <span
                    className="sender"
                    style={{ cursor: "pointer" }}
                    onClick={() => showUserProfile(item.sender_id)}
                  >
                    {item.sender_name || item.sender_id}
                  </span>
                )}
                <MessageContent msg={item.originalMsg || item} searchTerm={searchTerm} onImageClick={handleOpenMedia} onVideoClick={handleOpenMedia} isMine={Number(item.sender_id) === Number(userId)} onReply={handleReply} onReplyToOriginal={handleScrollToOriginal} onEdit={handleEdit} onDelete={deleteMessage} />
              </div>
            )
          ))}
        </div>
        {showMediaPanel && <MediaPanel messages={messages} onClose={() => setShowMediaPanel(false)} onImageClick={handleOpenMedia} onVideoClick={handleOpenMedia} onGoToMessage={handleScrollToOriginal} />}
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
                {replyTo && <><FaReply className="action-icon" /><div className="action-info"><span className="reply-label">Respondiendo a <b>{replyTo.sender_name}</b></span><div className="reply-text-truncate">{renderReplyContent(replyTo.content, replyTo.caption)}</div></div></>}
                {editingMsg && <><FaEdit className="action-icon" /><span>Editando mensaje...</span></>}
              </div>
              <button className="cancel-action" onClick={cancelAction}><FaTimes /></button>
            </div>
          )}

          {/* Indicador de escritura */}
          {typingUsers.length > 0 && (
            <div className="typing-indicator-container">
              <div className="typing-bubbles">
                <span></span><span></span><span></span>
              </div>
              <span className="typing-text">
                {typingUsers.length === 1 && <b>{typingUsers[0].name} está escribiendo...</b>}
                {typingUsers.length === 2 && <b>{typingUsers[0].name} y {typingUsers[1].name} están escribiendo...</b>}
                {typingUsers.length > 2 && <b>{typingUsers[0].name}, {typingUsers[1].name} y otros están escribiendo...</b>}
              </span>
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
      <MediaModal 
        media={currentMedia ? { src: getFileUrl(currentMedia.content), type: currentMedia.type } : null} 
        onClose={() => setActiveMediaId(null)} 
        onNext={handleNextMedia}
        onPrev={handlePrevMedia}
        hasMore={mediaMessages.length > 1}
      />
      {isEditorOpen && <ImageEditorModal files={editorFiles} onSave={(edited) => { setPreviewFiles(prev => [...prev, ...edited]); setIsEditorOpen(false); setEditorFiles([]); }} onClose={() => { setIsEditorOpen(false); setEditorFiles([]); }} onAddMore={(newFiles) => { setEditorFiles(prev => [...prev, ...newFiles]); }} />}
    </div>
  );
};

export default Chat;