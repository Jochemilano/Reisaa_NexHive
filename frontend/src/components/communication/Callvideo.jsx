import React, { useEffect, useRef, useState } from "react";
import { useCall } from "@/context/CallContext";
import { useCallMedia } from "@/hooks/useCallMedia";
import { FaExpand, FaPhone, FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaDesktop, FaTimes, FaThumbtack } from "react-icons/fa";
const CallVideo = ({ expanded = true }) => {
  const {
    activeCall, callAccepted,
    isMinimized, setIsMinimized,
    localStreamRef, peerRef,
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
  } = useCallMedia(localStreamRef, peerRef, localVidRef);

  // Asignar streams
  useEffect(() => {
    if (localVidRef.current && localStreamRef.current)
      localVidRef.current.srcObject = localStreamRef.current;
  }, [activeCall, isMinimized]);

  useEffect(() => {
    if (remoteVidRef.current && remoteStream)
      remoteVidRef.current.srcObject = remoteStream;
  }, [remoteStream, callAccepted, isMinimized]);

  // Simple VAD (Voice Activity Detection) using WebAudio Analyser
  useEffect(() => {
    let localCtx, localAnalyser, localSource, localRAF;
    if (localStreamRef.current) {
      try {
        localCtx = new (window.AudioContext || window.webkitAudioContext)();
        localSource = localCtx.createMediaStreamSource(localStreamRef.current);
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
  }, [localStreamRef.current]);

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

  if (!activeCall) return null;

  // Vista FLOTANTE (Chiquita)
  if (!expanded || isMinimized) return (
    <div className="floating-call">
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
          <button onClick={hangUp} className="floating-btn danger">
            <FaTimes />
          </button>
        </div>
      </div>

      <div className="floating-video">
        <video
          ref={localVidRef}
          autoPlay
          playsInline
          muted
          className={`video-stream ${isLocalSpeaking ? 'speaking' : ''}`}
        />
        <div className="video-label">Tú {!isMicOn && "🔇"}</div>
        <button className={`pin-btn ${pinned === 'local' ? 'pinned' : ''}`} title="Fijar" onClick={() => setPinned(pinned === 'local' ? null : 'local')}><FaThumbtack /></button>
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
          <video ref={localVidRef} autoPlay playsInline muted className="video-stream" />
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