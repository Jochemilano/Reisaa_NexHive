import { useState, useRef } from "react";

/**
 * Hook para gestionar el hardware de media (audio/video) durante una llamada.
 * Maneja el estado de la cámara, micrófono y el flujo de compartición de pantalla.
 */
export const useCallMedia = (localStreamRef, peerRef, setCurrentStream) => {
  const [isCameraOn,    setIsCameraOn]    = useState(true);
  const [isMicOn,       setIsMicOn]       = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);
  
  const audioCtxRef = useRef(null);
  const screenStreamRef = useRef(null);

  /**
   * Alterna el estado (enable/disable) de un track de media sin detener el flujo.
   */
  const toggleTrack = (kind, setter) => {
    const track = localStreamRef.current?.[kind === "audio" ? "getAudioTracks" : "getVideoTracks"]()[0];
    if (track) { 
      track.enabled = !track.enabled; 
      setter(track.enabled); 
    }
  };

  const toggleMic    = () => toggleTrack("audio", setIsMicOn);
  const toggleCamera = () => toggleTrack("video", setIsCameraOn);

  /**
   * Reemplaza el track de video en la conexión P2P activa.
   */
  const replaceVideoTrack = async (track) => {
    const sender = peerRef.current?._pc?.getSenders().find(s => s.track?.kind === "video");
    if (sender) await sender.replaceTrack(track);
  };

  /**
   * Reemplaza el track de audio en la conexión P2P activa.
   */
  const replaceAudioTrack = async (track) => {
    const sender = peerRef.current?._pc?.getSenders().find(s => s.track?.kind === "audio");
    if (sender) await sender.replaceTrack(track);
  };

  /**
   * Inicia la compartición de pantalla.
   * NOTE: Incluye lógica de mezcla de audio para enviar tanto el sonido del sistema 
   * como el del micrófono simultáneamente.
   */
  const startScreenShare = async () => {
    try {
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

      // Mezcla de audio: Micrófono + Audio del Sistema (Screen Audio)
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
          await replaceAudioTrack(screenAudioTrack);
        }
      }

      setCurrentStream(screenStream);
      setSharingScreen(true);
      
      // Detención automática si el usuario deja de compartir desde el botón nativo del navegador
      screenTrack.onended = stopScreenShare;
    } catch (e) { 
      console.error("Error al iniciar screen share con audio:", e); 
    }
  };

  /**
   * Detiene la compartición de pantalla y restaura los tracks originales de la cámara y mic.
   */
  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    const originalVideo = localStreamRef.current?.originalVideoTrack;
    if (originalVideo) await replaceVideoTrack(originalVideo);

    const originalAudio = localStreamRef.current?.getAudioTracks()[0];
    if (originalAudio) await replaceAudioTrack(originalAudio);

    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }

    setCurrentStream(localStreamRef.current);
    setSharingScreen(false);
  };

  return { isCameraOn, isMicOn, sharingScreen, toggleMic, toggleCamera, startScreenShare, stopScreenShare };
};