import { useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import { socket } from "@/utils/socket";

/**
 * Hook de bajo nivel para gestionar videoconferencias P2P (Malla/Mesh).
 * Utiliza simple-peer para la señalización WebRTC y sockets para el intercambio de señales.
 */
export const useVoiceRoom = (voiceRoomId) => {
  const localStreamRef = useRef(null);
  const peersRef       = useRef({}); // Diccionario de Peer instances por ID de usuario
  const joinedRef      = useRef(false);

  const [participants, setParticipants] = useState([]);
  const [localStream,  setLocalStream]  = useState(null);
  const [currentStream, setCurrentStream] = useState(null);
  const [isMicOn,      setIsMicOn]      = useState(true);
  const [isCameraOn,   setIsCameraOn]   = useState(true);
  const [sharingScreen, setSharingScreen] = useState(false);

  /**
   * Agrega o actualiza un participante en la lista local.
   */
  const addParticipant = (userId, userName, stream = null) =>
    setParticipants(prev =>
      prev.find(p => p.userId === userId)
        ? prev.map(p => p.userId === userId ? { ...p, stream } : p)
        : [...prev, { userId, userName, stream }]
    );

  /**
   * Crea una instancia de Peer para un usuario específico.
   * @param {boolean} initiator - Si nosotros iniciamos la oferta WebRTC.
   */
  const createPeer = (userId, userName, initiator) => {
    const peer = new Peer({ 
      initiator, 
      trickle: false, 
      stream: localStreamRef.current // Enviamos nuestro flujo local inicial
    });

    // Evento de señalización: se envía al servidor para que lo haga llegar al otro peer
    peer.on("signal", signal => socket.emit("voice-signal", { toUserId: userId, signal }));
    
    // Evento de stream: el peer remoto nos envía su video/audio
    peer.on("stream", stream => addParticipant(userId, userName, stream));
    
    peer.on("error",  err    => console.error(`Peer error (${userId}):`, err));

    peersRef.current[userId] = peer;
    addParticipant(userId, userName);
  };

  /**
   * Cierra la conexión P2P con un usuario y limpia el estado.
   */
  const removePeer = (userId) => {
    peersRef.current[userId]?.destroy();
    delete peersRef.current[userId];
    setParticipants(prev => prev.filter(p => p.userId !== userId));
  };

  /**
   * Alterna el estado de tracks locales (Mic/Cámara).
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
   * Inicia compartición de pantalla reemplazando el track de video en todos los peers activos.
   */
  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack  = screenStream.getVideoTracks()[0];

      // Reemplazo dinámico de track para cada conexión P2P
      Object.values(peersRef.current).forEach(peer => {
        peer._pc?.getSenders().find(s => s.track?.kind === "video")?.replaceTrack(screenTrack);
      });

      setSharingScreen(true);
      setCurrentStream(screenStream);
      screenTrack.onended = stopScreenShare;
      return screenStream;
    } catch (err) {
      console.error(err);
    }
  };

  /**
   * Restaura el video de la cámara original tras compartir pantalla.
   */
  const stopScreenShare = () => {
    const original = localStreamRef.current?.originalVideoTrack;
    if (!original) return;
    
    Object.values(peersRef.current).forEach(peer => {
      peer._pc?.getSenders().find(s => s.track?.kind === "video")?.replaceTrack(original);
    });
    
    setSharingScreen(false);
    setCurrentStream(localStreamRef.current);
    return localStreamRef.current;
  };

  /**
   * Cierra todas las conexiones y detiene el hardware local.
   */
  const leaveRoom = () => {
    socket.emit("leave-voice-room", { voiceRoomId });
    Object.values(peersRef.current).forEach(p => p.destroy());
    peersRef.current = {};
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
  };

  useEffect(() => {
    if (joinedRef.current) return;
    joinedRef.current = true;

    // Solicitar permisos de hardware al entrar
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        // NOTE: Guardamos el track original para poder restaurarlo tras un screen share
        stream.originalVideoTrack = stream.getVideoTracks()[0];
        localStreamRef.current = stream;
        setLocalStream(stream);
        setCurrentStream(stream);
        socket.emit("join-voice-room", { voiceRoomId });
      })
      .catch(err => console.error("Error de media:", err));

    // Listeners de señalización vía Sockets
    socket.on("voice-room-users",  ({ users })             => users.forEach(({ userId, userName }) => createPeer(userId, userName, true)));
    socket.on("voice-user-joined", ({ userId, userName })  => createPeer(userId, userName, false));
    socket.on("voice-signal",      ({ fromUserId, signal }) => peersRef.current[fromUserId]?.signal(signal));
    socket.on("voice-user-left",   ({ userId })            => removePeer(userId));

    return () => {
      leaveRoom();
      socket.off("voice-room-users");
      socket.off("voice-user-joined");
      socket.off("voice-signal");
      socket.off("voice-user-left");
      joinedRef.current = false;
    };
  }, [voiceRoomId]);

  return {
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
  };
};