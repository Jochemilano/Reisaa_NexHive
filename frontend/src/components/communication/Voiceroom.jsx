import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVoiceRoom } from "@/hooks/usevoiceroom";
import { fetchGroupDetails } from "@/utils/groups";
import {
  FaMicrophone, FaMicrophoneSlash,
  FaVideo, FaVideoSlash,
  FaDesktop, FaSignOutAlt,
  FaThumbtack, FaUsers
} from "react-icons/fa";
import './Voiceroom.css'

// ── Tile de participante remoto ───────────────────────────
const RemoteTile = ({ participant, isPinned, onPin }) => {
  const videoRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // IMPORTANTE: el stream debe re-asignarse si el elemento se remonta (isPinned cambia)
  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream, isPinned]);

  // VAD para participante remoto
  useEffect(() => {
    let ctx, analyser, source, raf;
    if (participant.stream && participant.stream.getAudioTracks().length > 0) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        source = ctx.createMediaStreamSource(participant.stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const data = new Float32Array(analyser.fftSize);
        const sample = () => {
          analyser.getFloatTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
          const rms = Math.sqrt(sum / data.length);
          setIsSpeaking(rms > 0.015);
          raf = requestAnimationFrame(sample);
        };
        sample();
      } catch (e) { console.warn('VAD remote error', e); }
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      try { ctx?.close(); } catch (e) {}
    };
  }, [participant.stream]);

  return (
    <div className={`voice-tile ${isSpeaking ? 'speaking' : ''} ${isPinned ? 'pinned-active' : ''}`}>
      <video ref={videoRef} autoPlay playsInline className="voice-video" />
      <div className="voice-tile-label">{participant.userName}</div>
      <button 
        className={`pin-btn ${isPinned ? 'pinned' : ''}`} 
        onClick={() => onPin(isPinned ? null : participant.userId)}
        title={isPinned ? "Desfijar" : "Fijar"}
      >
        <FaThumbtack />
      </button>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────
const VoiceRoom = ({ voiceRoomId, groupId }) => {
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const [amISpeaking, setAmISpeaking] = useState(false);
  const [pinnedId, setPinnedId] = useState(null); // 'local' | userId | null
  const [groupName, setGroupName] = useState("Cargando...");

  const {
    localStream,
    currentStream,
    localStreamRef,
    participants,
    isMicOn,
    isCameraOn,
    sharingScreen,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    leaveRoom,
  } = useVoiceRoom(voiceRoomId);

  // Obtener nombre del grupo
  useEffect(() => {
    if (groupId) {
      fetchGroupDetails(groupId)
        .then(data => setGroupName(data.name))
        .catch(err => {
          console.error("Error fetching group name:", err);
          setGroupName("Sala de Voz");
        });
    }
  }, [groupId]);

  // IMPORTANTE: el stream debe re-asignarse si el elemento se remonta (pinnedId cambia)
  useEffect(() => {
    if (localVideoRef.current && currentStream) {
      localVideoRef.current.srcObject = currentStream;
    }
  }, [currentStream, pinnedId]);

  useEffect(() => {
    let ctx, analyser, source, raf;
    if (localStream && isMicOn) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        source = ctx.createMediaStreamSource(localStream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const data = new Float32Array(analyser.fftSize);
        const sample = () => {
          analyser.getFloatTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
          const rms = Math.sqrt(sum / data.length);
          setAmISpeaking(rms > 0.015);
          raf = requestAnimationFrame(sample);
        };
        sample();
      } catch (e) { console.warn('VAD local error', e); }
    } else {
      setAmISpeaking(false);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      try { ctx?.close(); } catch (e) {}
    };
  }, [localStream, isMicOn]);

  const handleScreenShare = async () => {
    if (sharingScreen) {
      stopScreenShare();
    } else {
      await startScreenShare();
    }
  };

  const handleLeave = () => {
    leaveRoom();
    navigate(`/groups/${groupId}`);
  };

  const totalParticipants = participants.length + 1;
  const isLocalPinned = pinnedId === 'local';

  const renderLocalTile = () => (
    <div key="local-tile" className={`voice-tile ${amISpeaking ? 'speaking' : ''} ${isLocalPinned ? 'pinned-active' : ''}`}>
      <video ref={localVideoRef} autoPlay playsInline muted className="voice-video" />
      <div className="voice-tile-label">
        Tú {!isMicOn && <FaMicrophoneSlash />}
      </div>
      <button 
        className={`pin-btn ${isLocalPinned ? 'pinned' : ''}`} 
        onClick={() => setPinnedId(isLocalPinned ? null : 'local')}
        title={isLocalPinned ? "Desfijar" : "Fijar"}
      >
        <FaThumbtack />
      </button>
    </div>
  );

  return (
    <div className="voice-room-container">
      <div className="voice-room-header">
        <div className="header-info">
          <div className="group-badge">NexHive</div>
          <h2>{groupName}</h2>
          <div className="participants-badge">
            <FaUsers />
            <span>{totalParticipants} conectado{totalParticipants !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </div>

      <div className={`voice-video-grid ${pinnedId ? 'has-pinned' : `participants-${totalParticipants}`}`}>
        {pinnedId ? (
          <>
            {/* Elemento fijado */}
            {isLocalPinned ? renderLocalTile() : (
              participants.filter(p => p.userId === pinnedId).map(p => (
                <RemoteTile 
                  key={p.userId} 
                  participant={p} 
                  isPinned={true} 
                  onPin={setPinnedId} 
                />
              ))
            )}

            {/* Sidebar con el resto */}
            <div className="voice-participants-sidebar">
              {!isLocalPinned && renderLocalTile()}
              {participants.filter(p => p.userId !== pinnedId).map(p => (
                <RemoteTile 
                  key={p.userId} 
                  participant={p} 
                  isPinned={false} 
                  onPin={setPinnedId} 
                />
              ))}
            </div>
          </>
        ) : (
          <>
            {renderLocalTile()}
            {participants.map(p => (
              <RemoteTile 
                key={p.userId} 
                participant={p} 
                isPinned={false} 
                onPin={setPinnedId} 
              />
            ))}
          </>
        )}
      </div>

      <div className="voice-controls">
        <button onClick={toggleMic} className={`control-btn ${isMicOn ? "on" : "off"}`}>
          {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
        <button onClick={toggleCamera} className={`control-btn ${isCameraOn ? "on" : "off"}`}>
          {isCameraOn ? <FaVideo /> : <FaVideoSlash />}
        </button>
        <button onClick={handleScreenShare} className={`control-btn ${sharingScreen ? "warning" : ""}`}>
          <FaDesktop /> {sharingScreen ? "Dejar de compartir" : "Compartir pantalla"}
        </button>
        <button onClick={handleLeave} className="control-btn danger">
          <FaSignOutAlt /> Salir
        </button>
      </div>
    </div>
  );
};

export default VoiceRoom;

