import React, { useEffect, useRef, useState } from "react";
import { socket } from "socket";
import Peer from "simple-peer";

const Call = ({ userId, targetUserId, onClose }) => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const localStreamRef = useRef();
  const isInitiatorRef = useRef(false);

  const [callIncoming, setCallIncoming] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  
  // ✅ Estados para controles de audio/video
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isMediaReady, setIsMediaReady] = useState(false);

  // ✅ Función para inicializar/reiniciar media
  const initializeMedia = async () => {
    try {
      console.log("🎥 Inicializando cámara y micrófono...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      localStreamRef.current = stream;
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.muted = true;
      await localVideoRef.current.play().catch(() => {});
      
      // Guardar tracks originales
      localStreamRef.current.originalVideoTrack = stream.getVideoTracks()[0];
      localStreamRef.current.originalAudioTrack = stream.getAudioTracks()[0];
      
      setIsCameraOn(true);
      setIsMicOn(true);
      setIsMediaReady(true);
      console.log("✅ Media inicializada");
      
      return stream;
    } catch (err) {
      console.error("❌ Error accediendo a mic/cámara:", err);
      setIsMediaReady(false);
      return null;
    }
  };

  // Inicializar media al montar
  useEffect(() => {
    initializeMedia();

    // Listeners de socket
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);

    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      
      // Cleanup al desmontar
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
    };
  }, []);

  // ✅ Toggle cámara
  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOn(videoTrack.enabled);
      console.log(videoTrack.enabled ? "📹 Cámara activada" : "📷 Cámara desactivada");
    }
  };

  // ✅ Toggle micrófono
  const toggleMicrophone = () => {
    if (!localStreamRef.current) return;
    
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMicOn(audioTrack.enabled);
      console.log(audioTrack.enabled ? "🎤 Micrófono activado" : "🔇 Micrófono desactivado");
    }
  };

  // Llamada entrante
  const handleIncomingCall = ({ fromUserId, fromUserName, offer }) => {
    console.log("📞 Llamada entrante de:", fromUserId);
    if (!fromUserId || !offer) return;
    
    setCaller({ fromUserId, fromUserName, offer });
    setCallIncoming(true);
    isInitiatorRef.current = false;
  };

  // Responder llamada
  const answerCall = () => {
    if (peerRef.current) {
      console.warn("⚠️ Peer ya existe");
      return;
    }

    console.log("📱 Contestando llamada como RECEPTOR...");
    isInitiatorRef.current = false;
    
    const peer = new Peer({ 
      initiator: false, 
      trickle: false, 
      stream: localStreamRef.current 
    });

    peer.on("signal", answer => {
      console.log("✅ Enviando answer a:", caller.fromUserId);
      socket.emit("call-accepted", { 
        toUserId: caller.fromUserId, 
        answer 
      });
    });

    peer.on("stream", remoteStream => {
      console.log("📹 Stream remoto recibido (receptor)");
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    });

    peer.on("error", err => {
      console.error("❌ Peer error (receptor):", err);
    });

    peer.signal(caller.offer);
    peerRef.current = peer;

    setCallIncoming(false);
    setCallAccepted(true);
  };

  // Iniciar llamada
  const callUser = () => {
    if (!targetUserId) {
      console.warn("⚠️ No hay targetUserId");
      return;
    }
    if (peerRef.current) {
      console.warn("⚠️ Peer ya existe");
      return;
    }
    if (!isMediaReady) {
      console.warn("⚠️ Media no está lista");
      return;
    }

    console.log("📞 Llamando a:", targetUserId, "como INICIADOR");
    isInitiatorRef.current = true;

    const peer = new Peer({ 
      initiator: true, 
      trickle: false, 
      stream: localStreamRef.current 
    });

    peer.on("signal", offer => {
      console.log("✅ Enviando offer a:", targetUserId);
      socket.emit("call-user", { toUserId: targetUserId, offer });
    });

    peer.on("stream", remoteStream => {
      console.log("📹 Stream remoto recibido (iniciador)");
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    });

    peer.on("error", err => {
      console.error("❌ Peer error (iniciador):", err);
    });

    peerRef.current = peer;
  };

  // Recibir answer
  const handleCallAccepted = ({ fromUserId, answer }) => {
    console.log("📩 Answer recibido de:", fromUserId, "| isInitiator:", isInitiatorRef.current);

    if (!isInitiatorRef.current) {
      console.log("⚠️ No soy el iniciador, ignorando answer");
      return;
    }

    if (!peerRef.current) {
      console.error("❌ No hay peer para aplicar answer");
      return;
    }

    if (callAccepted) {
      console.warn("⚠️ Ya está aceptada, ignorando answer duplicado");
      return;
    }

    try {
      console.log("✅ Aplicando answer (soy iniciador)...");
      peerRef.current.signal(answer);
      setCallAccepted(true);
    } catch (err) {
      console.error("❌ Error aplicando answer:", err);
    }
  };

  // Compartir pantalla
  const startScreenShare = async () => {
    if (!peerRef.current) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setSharingScreen(true);
      const screenTrack = screenStream.getVideoTracks()[0];

      const sender = peerRef.current._pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(screenTrack);
      }

      localVideoRef.current.srcObject = screenStream;
      screenTrack.onended = stopScreenShare;
    } catch (err) {
      console.error("Error compartiendo pantalla:", err);
    }
  };

  const stopScreenShare = () => {
    if (!peerRef.current) return;
    const originalTrack = localStreamRef.current.originalVideoTrack;
    if (!originalTrack) return;

    const sender = peerRef.current._pc.getSenders().find(s => s.track?.kind === 'video');
    if (sender) {
      sender.replaceTrack(originalTrack);
    }

    localVideoRef.current.srcObject = localStreamRef.current;
    setSharingScreen(false);
  };

  // ✅ Colgar sin matar el stream
  const endCall = () => {
    console.log("📴 Colgando llamada...");
    
    // ✅ NO detener los tracks, solo el peer
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    // ✅ Limpiar video remoto
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    setCallAccepted(false);
    setCallIncoming(false);
    setSharingScreen(false);
    isInitiatorRef.current = false;
    setCaller(null);

    // ✅ Mantener el video local activo
    console.log("✅ Llamada terminada, cámara sigue activa");
    
    onClose?.();
  };

  return (
    <div style={{ padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h3>
        {callIncoming && !callAccepted
          ? `📞 Llamada de ${caller?.fromUserName || caller?.fromUserId}`
          : callAccepted
          ? `✅ En llamada con ${caller?.fromUserName || targetUserId}`
          : "❌ Sin llamada"}
      </h3>

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <div>
          <p>Tu video:</p>
          <video 
            ref={localVideoRef} 
            muted 
            autoPlay 
            playsInline
            style={{ 
              width: "300px", 
              border: "2px solid blue",
              backgroundColor: "#000"
            }} 
          />
          
          {/* ✅ Controles de audio/video siempre visibles */}
          <div style={{ marginTop: "5px", display: "flex", gap: "5px" }}>
            <button 
              onClick={toggleCamera}
              style={{ 
                background: isCameraOn ? "#4CAF50" : "#f44336",
                color: "white",
                padding: "8px 12px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              {isCameraOn ? "📹 Cámara ON" : "📷 Cámara OFF"}
            </button>
            <button 
              onClick={toggleMicrophone}
              style={{ 
                background: isMicOn ? "#4CAF50" : "#f44336",
                color: "white",
                padding: "8px 12px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              {isMicOn ? "🎤 Mic ON" : "🔇 Mic OFF"}
            </button>
          </div>
        </div>
        
        <div>
          <p>Video remoto:</p>
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            style={{ 
              width: "300px", 
              border: "2px solid green",
              backgroundColor: "#000"
            }} 
          />
        </div>
      </div>

      {/* Botones de llamada */}
      {!callAccepted && !callIncoming && targetUserId && (
        <button 
          onClick={callUser}
          disabled={!isMediaReady}
          style={{
            background: isMediaReady ? "#2196F3" : "#ccc",
            color: "white",
            padding: "10px 20px",
            border: "none",
            borderRadius: "4px",
            cursor: isMediaReady ? "pointer" : "not-allowed",
            fontSize: "16px"
          }}
        >
          📞 Llamar
        </button>
      )}

      {callIncoming && !callAccepted && (
        <div style={{ marginTop: "10px" }}>
          <p>📞 Llamada de {caller?.fromUserName || caller?.fromUserId}</p>
          <button 
            onClick={answerCall} 
            style={{ 
              background: "green", 
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginRight: "10px"
            }}
          >
            ✅ Contestar
          </button>
          <button 
            onClick={endCall} 
            style={{ 
              background: "red", 
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            ❌ Declinar
          </button>
        </div>
      )}

      {callAccepted && (
        <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
          {!sharingScreen && (
            <button 
              onClick={startScreenShare}
              style={{
                background: "#FF9800",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              🖥️ Compartir Pantalla
            </button>
          )}
          {sharingScreen && (
            <button 
              onClick={stopScreenShare}
              style={{
                background: "#FF5722",
                color: "white",
                padding: "10px 20px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              🛑 Detener Pantalla
            </button>
          )}
          <button 
            onClick={endCall} 
            style={{ 
              background: "red", 
              color: "white",
              padding: "10px 20px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            📴 Colgar
          </button>
        </div>
      )}
    </div>
  );
};

export default Call;