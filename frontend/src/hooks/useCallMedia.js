import { useState, useRef } from "react";

export const useCallMedia = (localStreamRef, peerRef, setCurrentStream) => {
  const [isCameraOn,    setIsCameraOn]    = useState(true);
  const [isMicOn,       setIsMicOn]       = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  
  const audioCtxRef = useRef(null);
  const screenStreamRef = useRef(null);

  const toggleTrack = (kind, setter) => {
    const track = localStreamRef.current?.[kind === "audio" ? "getAudioTracks" : "getVideoTracks"]()[0];
    if (track) { track.enabled = !track.enabled; setter(track.enabled); }
  };

  const toggleMic    = () => toggleTrack("audio", setIsMicOn);
  const toggleCamera = () => toggleTrack("video", setIsCameraOn);

  const replaceVideoTrack = async (track) => {
    const sender = peerRef.current?._pc?.getSenders().find(s => s.track?.kind === "video");
    if (sender) await sender.replaceTrack(track);
  };

  const replaceAudioTrack = async (track) => {
    const sender = peerRef.current?._pc?.getSenders().find(s => s.track?.kind === "audio");
    if (sender) await sender.replaceTrack(track);
  };

  const startScreenShare = async () => {
    try {
      // Capturamos video y audio de la pantalla/pestaña
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      screenStreamRef.current = screenStream;
      const screenTrack  = screenStream.getVideoTracks()[0];
      await replaceVideoTrack(screenTrack);

      // Si hay audio en la captura de pantalla, lo mezclamos con el micrófono
      const screenAudioTrack = screenStream.getAudioTracks()[0];
      if (screenAudioTrack) {
        const micStream = localStreamRef.current;
        const micTrack = micStream?.getAudioTracks()[0];

        if (micTrack) {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          audioCtxRef.current = audioCtx;
          
          const micSource = audioCtx.createMediaStreamSource(new MediaStream([micTrack]));
          const screenSource = audioCtx.createMediaStreamSource(new MediaStream([screenAudioTrack]));
          const destination = audioCtx.createMediaStreamDestination();
          
          micSource.connect(destination);
          screenSource.connect(destination);
          
          const mixedTrack = destination.stream.getAudioTracks()[0];
          await replaceAudioTrack(mixedTrack);
        } else {
          // Si no hay mic por alguna razón, enviamos solo el de la pantalla
          await replaceAudioTrack(screenAudioTrack);
        }
      }

      setCurrentStream(screenStream);
      setSharingScreen(true);
      screenTrack.onended = stopScreenShare;
    } catch (e) { 
      console.error("Error al iniciar screen share con audio:", e); 
    }
  };

  const stopScreenShare = async () => {
    // Detener físicamente la captura en el navegador (quitar la barra de Google)
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Restaurar video original
    const originalVideo = localStreamRef.current?.originalVideoTrack;
    if (originalVideo) {
      await replaceVideoTrack(originalVideo);
    }

    // Restaurar audio original (micrófono)
    const originalAudio = localStreamRef.current?.getAudioTracks()[0];
    if (originalAudio) {
      await replaceAudioTrack(originalAudio);
    }

    // Limpiar contexto de audio si se creó uno para mezclar
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    setCurrentStream(localStreamRef.current);
    setSharingScreen(false);
  };

  return { isCameraOn, isMicOn, sharingScreen, toggleMic, toggleCamera, startScreenShare, stopScreenShare };
};