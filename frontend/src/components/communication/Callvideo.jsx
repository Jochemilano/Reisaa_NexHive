import React, { useEffect, useRef, useState } from "react";
import { useCall } from "@/context/CallContext";
import { useCallMedia } from "@/hooks/useCallMedia";
import { FaExpand, FaPhone, FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaDesktop, FaTimes, FaThumbtack } from "react-icons/fa";
const CallVideo = ({ expanded = true }) => {
  const {
    activeCall, callAccepted,
    isMinimized, setIsMinimized,
    localStream, currentStream, setCurrentStream, localStreamRef, peerRef,
    remoteStream, expandCall, hangUp,
  } = useCall();

  const localVidRef  = useRef(null);
  const remoteVidRef = useRef(null);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);
  const [pinned, setPinned] = useState(null); // 'local' | 'remote' | null

  const {
    isCameraOn, isMicOn, sharingScreen,
    toggleMic, toggleCamera,
    startScreenShare, stopScreenShare,
  } = useCallMedia(localStreamRef, peerRef, setCurrentStream);

  useEffect(() => {
    if (localVidRef.current && currentStream)
      localVidRef.current.srcObject = currentStream;
  }, [currentStream, activeCall, callAccepted, isMinimized, pinned]);

  useEffect(() => {
    if (remoteVidRef.current && remoteStream)
      remoteVidRef.current.srcObject = remoteStream;
  }, [remoteStream, callAccepted, isMinimized, pinned]);


  useEffect(() => {
    let localCtx, localAnalyser, localSource, localRAF;
    if (localStream) {
      try {
        localCtx = new (window.AudioContext || window.webkitAudioContext)();
        localSource = localCtx.createMediaStreamSource(localStream);
        localAnalyser = localCtx.createAnalyser();
        localAnalyser.fftSize = 2048;
        localSource.connect(localAnalyser);
        const data = new Float32Array(localAnalyser.fftSize);
        const sample = () => {
          localAnalyser.getFloatTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
          const rms = Math.sqrt(sum / data.length);
          setIsLocalSpeaking(rms > 0.01);
          localRAF = requestAnimationFrame(sample);
        };
        sample();
      } catch (e) { console.warn('VAD local not available', e); }
    }
    return () => {
      if (localRAF) cancelAnimationFrame(localRAF);
      try { localCtx?.close(); } catch (e) {}
    };
  }, [localStream]);

  useEffect(() => {
    let remoteCtx, remoteAnalyser, remoteSource, remoteRAF;
    if (remoteStream) {
      try {
        remoteCtx = new (window.AudioContext || window.webkitAudioContext)();
        remoteSource = remoteCtx.createMediaStreamSource(remoteStream);
        remoteAnalyser = remoteCtx.createAnalyser();
        remoteAnalyser.fftSize = 2048;
        remoteSource.connect(remoteAnalyser);
        const data = new Float32Array(remoteAnalyser.fftSize);
        const sample = () => {
          remoteAnalyser.getFloatTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
          const rms = Math.sqrt(sum / data.length);
          setIsRemoteSpeaking(rms > 0.01);
          remoteRAF = requestAnimationFrame(sample);
        };
        sample();
      } catch (e) { console.warn('VAD remote not available', e); }
    }
    return () => {
      if (remoteRAF) cancelAnimationFrame(remoteRAF);
      try { remoteCtx?.close(); } catch (e) {}
    };
  }, [remoteStream]);

  const [pos, setPos] = useState({ x: window.innerWidth - 240, y: window.innerHeight - 200 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const onMouseDown = (e) => {
    // Solo arrastrar desde el header o el area de video si no es un boton
    if (e.target.closest('button')) return;
    
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isDragging) return;
      
      // Dimensiones aproximadas de la ventana minimizada
      const winW = 220; 
      const winH = 260; // Aumentado por los nuevos controles
      
      let newX = e.clientX - dragStartPos.current.x;
      let newY = e.clientY - dragStartPos.current.y;
      
      // Limites de pantalla
      newX = Math.max(0, Math.min(window.innerWidth - winW, newX));
      newY = Math.max(0, Math.min(window.innerHeight - winH, newY));
      
      setPos({ x: newX, y: newY });
    };
    const onMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  if (!activeCall) return null;

  // Vista FLOTANTE (Chiquita)
  if (!expanded || isMinimized) return (
    <div 
      className="floating-call"
      style={{ 
        left: `${pos.x}px`, 
        top: `${pos.y}px`, 
        bottom: 'auto', 
        right: 'auto',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        height: 'auto'
      }}
      onMouseDown={onMouseDown}
    >
      <div className="floating-header">
        <span className="floating-name">
          <FaPhone /> {activeCall.targetUserName}
        </span>
        <div className="floating-buttons">
          <button
            onClick={() => setIsMinimized(false)}
            className="floating-btn"
            title="Maximizar"
          >
            <FaExpand />
          </button>
        </div>
      </div>

      <div className="floating-video">
        {/* Siempre tener el video remoto aunque sea oculto para no perder el audio si no es el principal */}
        {pinned !== 'remote' && (
          <video ref={remoteVidRef} autoPlay playsInline style={{ display: 'none' }} />
        )}
        
        <video
          ref={pinned === 'remote' ? remoteVidRef : localVidRef}
          autoPlay
          playsInline
          muted={pinned !== 'remote'}
          className={`video-stream ${(pinned === 'remote' ? isRemoteSpeaking : isLocalSpeaking) ? 'speaking' : ''} ${(!pinned && sharingScreen) ? 'sharing-screen' : ''}`}
        />
        <div className="video-label">
          {pinned === 'remote' ? activeCall.targetUserName : `Tú ${!isMicOn ? "🔇" : ""}`}
        </div>
        <button 
          className={`pin-btn ${pinned ? 'pinned' : ''}`} 
          title="Fijar" 
          onClick={() => setPinned(pinned ? null : 'remote')}
        >
          <FaThumbtack />
        </button>
      </div>



      <div className="floating-mini-controls">
        <button onClick={toggleMic} className={`mini-control-btn ${isMicOn ? "on" : "off"}`}>
          {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
        <button onClick={toggleCamera} className={`mini-control-btn ${isCameraOn ? "on" : "off"}`}>
          {isCameraOn ? <FaVideo /> : <FaVideoSlash />}
        </button>
        <button onClick={hangUp} className="mini-control-btn danger" title="Colgar">
          <FaPhone style={{ transform: 'rotate(135deg)' }} />
        </button>
      </div>
    </div>
  );



  // Vista EXPANDIDA
  return (
    <div className="call-extended-floating">
      <div className="call-header">
        <span>{callAccepted ? `En llamada con ${activeCall.targetUserName}` : "Llamando..."}</span>
        <button
          className="minimize-btn"
          onClick={() => setIsMinimized(true)}
          title="Minimizar"
        >
          ⏷
        </button>
      </div>

      <div className={`video-grid ${pinned ? 'pinned' : ''}`}>
        <div className={`video-wrapper ${isLocalSpeaking ? 'speaking' : ''} ${pinned === 'local' ? 'pinned-active' : ''}`} style={{ order: pinned === 'local' ? 0 : 1 }}>
          <video ref={localVidRef} autoPlay playsInline muted className={`video-stream ${sharingScreen ? 'sharing-screen' : ''}`} />
          <div className="video-label">
            Tú {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
            {isCameraOn ? <FaVideo /> : <FaVideoSlash />}
          </div>
          <button className={`pin-btn ${pinned === 'local' ? 'pinned' : ''}`} title="Fijar" onClick={() => setPinned(pinned === 'local' ? null : 'local')}><FaThumbtack /></button>
        </div>

        {callAccepted && (
          <div className={`video-wrapper ${isRemoteSpeaking ? 'speaking' : ''} ${pinned === 'remote' ? 'pinned-active' : ''}`} style={{ order: pinned === 'remote' ? 0 : 2 }}>
            <video ref={remoteVidRef} autoPlay playsInline className="video-stream" />
            <div className="video-label">{activeCall.targetUserName}</div>
            <button className={`pin-btn ${pinned === 'remote' ? 'pinned' : ''}`} title="Fijar" onClick={() => setPinned(pinned === 'remote' ? null : 'remote')}><FaThumbtack /></button>
          </div>
        )}
      </div>

      <div className="call-controls-floating">
        <button onClick={toggleMic} className={`control-btn ${isMicOn ? "on" : "off"}`}>
          {isMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
        <button onClick={toggleCamera} className={`control-btn ${isCameraOn ? "on" : "off"}`}>
          {isCameraOn ? <FaVideo /> : <FaVideoSlash />}
        </button>
        {callAccepted && (
          <button onClick={sharingScreen ? stopScreenShare : startScreenShare} className="control-btn warning">
            {sharingScreen ? <FaTimes /> : <FaDesktop />}
          </button>
        )}
        <button onClick={hangUp} className="control-btn danger"><FaTimes /></button>
      </div>
    </div>
  );
};

export default CallVideo;