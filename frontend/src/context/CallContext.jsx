import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { socket } from "@/utils/socket";
import Peer from "simple-peer";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/utils/apiClient";
import { playRingtone, stopRingtone } from "@/utils/audio";
import { useUnread } from "@/context/UnreadContext";

const CallContext = createContext(null);

/**
 * Gestiona llamadas WebRTC (P2P) y sincronización vía Sockets.
 * Utiliza simple-peer para la abstracción de WebRTC.
 */
export const CallProvider = ({ children }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [currentStream, setCurrentStream] = useState(null);
  const { mutedRooms, callsEnabled, callSound } = useUnread();

  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const isRingingRef = useRef(false);
  
  // NOTE: Se usan Refs para evitar problemas de clausura en los listeners de Socket.io
  const callsEnabledRef = useRef(callsEnabled);
  const callSoundRef = useRef(callSound);
  const navigate = useNavigate();

  // Mantener las referencias sincronizadas con el contexto global
  useEffect(() => {
    callsEnabledRef.current = callsEnabled;
    callSoundRef.current = callSound;
  }, [callsEnabled, callSound]);

  /**
   * Inicializa hardware de audio/video.
   * WARNING: Requiere HTTPS o localhost para funcionar en navegadores modernos.
   */
  const initMedia = async () => {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Tu navegador no permite acceso a cámara/micrófono en conexiones no seguras (HTTP). Usa HTTPS o localhost.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.originalVideoTrack = stream.getVideoTracks()[0];
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCurrentStream(stream);
      return stream;
    } catch (err) {
      console.error("Error de media:", err);
      throw err;
    }
  };

  /**
   * Limpieza de tracks para liberar el hardware.
   */
  const stopMedia = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setCurrentStream(null);
  };

  useEffect(() => {
    socket.on("incoming-call", ({ fromUserId, fromUserName, offer, roomId }) => {
      console.log("🔔 Incoming call from", fromUserName, "in room", roomId);
      setIncomingCall({ fromUserId, fromUserName, offer, roomId });

      const isMuted = mutedRooms?.includes(roomId);
      
      // Regla de negocio: No sonar si la sala está silenciada o llamadas desactivadas
      if (!isMuted && callsEnabledRef.current) {
        isRingingRef.current = true;
        playRingtone(callSoundRef.current); 

        // Doble verificación con el servidor por si las preferencias cambiaron en otra pestaña
        apiFetch("preferences")
          .then(prefs => {
            if (isRingingRef.current) {
              if (prefs.notifications_enabled === false || prefs.calls_enabled === false) {
                isRingingRef.current = false;
                stopRingtone();
              }
            }
          })
          .catch(err => console.warn("Error sincronizando prefs:", err));
      } else {
        console.log("🔇 Call blocked (muted or calls disabled in prefs)");
      }
    });

    socket.on("call-accepted", ({ answer }) => {
      isRingingRef.current = false;
      stopRingtone();
      peerRef.current?.signal(answer);
      setCallAccepted(true);
    });

    socket.on("call-declined", () => {
      isRingingRef.current = false;
      stopRingtone();
      hangUp(false);
    });

    socket.on("call-ended", () => {
      isRingingRef.current = false;
      stopRingtone();
      hangUp(false);
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-accepted");
      socket.off("call-declined");
      socket.off("call-ended");
      isRingingRef.current = false;
      stopRingtone();
    };
  }, []);

  /**
   * Inicia proceso de oferta WebRTC (Iniciador).
   */
  const startCall = async (targetUserId, targetUserName, chatRoomId) => {
    console.log("Starting call to", targetUserId, targetUserName);
    try {
      const stream = await initMedia();
      setActiveCall({ targetUserId, targetUserName, chatRoomId });
      setCallAccepted(false);
      setRemoteStream(null);
      setIsMinimized(false);

      const peer = new Peer({ initiator: true, trickle: false, stream });
      peer.on("signal", offer => {
        console.log("Emitting call-user with offer");
        socket.emit("call-user", { toUserId: targetUserId, offer });
      });
      peer.on("stream", remote => setRemoteStream(remote));
      peerRef.current = peer;
    } catch (err) {
      console.error("No se pudo iniciar la llamada:", err);
    }
  };

  /**
   * Responde a una oferta WebRTC recibida.
   */
  const acceptCall = async () => {
    if (!incomingCall) return;
    isRingingRef.current = false;
    stopRingtone(); 
    try {
      const stream = await initMedia();

      const peer = new Peer({ initiator: false, trickle: false, stream });
      peer.on("signal", answer => socket.emit("call-accepted", { toUserId: incomingCall.fromUserId, answer }));
      peer.on("stream", remote => setRemoteStream(remote));
      peer.signal(incomingCall.offer);
      peerRef.current = peer;

      setCallAccepted(true);
      setRemoteStream(null);
      setIncomingCall(null);

      // Buscar sala directa para coordinar navegación del chat junto con la llamada
      try {
        const data = await apiFetch(`rooms/direct/${incomingCall.fromUserId}`);
        setActiveCall({
          targetUserId: incomingCall.fromUserId,
          targetUserName: incomingCall.fromUserName,
          chatRoomId: data.roomId,
        });
        setIsMinimized(false);
        navigate(`/chat/${data.roomId}`);
      } catch {
        // Fallback: Si no hay sala, la llamada se mantiene en modo flotante
        setActiveCall({
          targetUserId: incomingCall.fromUserId,
          targetUserName: incomingCall.fromUserName,
          chatRoomId: null,
        });
        setIsMinimized(true);
      }
    } catch (err) {
      console.error("No se pudo aceptar la llamada:", err);
    }
  };

  /**
   * Expandir desde el modo flotante — restaura contexto de chat si existe.
   */
  const expandCall = () => {
    if (activeCall?.chatRoomId) {
      setIsMinimized(false);
      navigate(`/chat/${activeCall.chatRoomId}`);
    } else {
      setIsMinimized(false);
    }
  };

  const declineCall = () => {
    isRingingRef.current = false;
    stopRingtone();
    socket.emit("call-declined", { toUserId: incomingCall?.fromUserId });
    setIncomingCall(null);
  };

  /**
   * Finaliza la sesión actual y limpia recursos.
   * @param {boolean} notify - Si debe enviar evento de 'call-ended' al peer.
   */
  const hangUp = (notify = true) => {
    isRingingRef.current = false;
    stopRingtone(); 
    if (notify && activeCall) socket.emit("call-ended", { toUserId: activeCall.targetUserId });
    peerRef.current?.destroy();
    peerRef.current = null;
    stopMedia();
    setActiveCall(null);
    setCallAccepted(false);
    setRemoteStream(null);
    setIsMinimized(false);
  };

  return (
    <CallContext.Provider value={{
      incomingCall,
      activeCall,
      callAccepted,
      isMinimized,
      remoteStream,
      setIsMinimized,
      localStream,
      currentStream,
      setCurrentStream,
      localStreamRef,
      peerRef,
      startCall,
      acceptCall,
      declineCall,
      expandCall,
      hangUp,
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);