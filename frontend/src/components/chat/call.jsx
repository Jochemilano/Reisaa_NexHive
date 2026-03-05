import React, { useEffect, useRef, useState } from "react";
import { socket } from "socket";
import Peer from "simple-peer";

const Call = ({ userId, targetUserId, onClose }) => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const localStreamRef = useRef();

  const [callIncoming, setCallIncoming] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);

  // Inicializar cámara/mic y listeners
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStreamRef.current = stream;
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // solo local
        localVideoRef.current.play().catch(() => {});

        // Guardamos la pista de video original para screen share
        localStreamRef.current.originalVideoTrack = stream.getVideoTracks()[0];

        // Listeners de socket
        socket.on("incoming-call", handleIncomingCall);
        socket.on("call-accepted", handleCallAccepted);
      })
      .catch(err => console.error("Error accediendo a mic/cámara:", err));

    return () => {
      socket.off("incoming-call");
      socket.off("call-accepted");
      peerRef.current?.destroy();
    };
  }, []);

  // Llamada entrante
  const handleIncomingCall = ({ fromUserId, offer }) => {
    if (!fromUserId || !offer) return;
    setCallIncoming(true);
    setCaller({ fromUserId, offer });
  };

  // Responder llamada
  const answerCall = () => {
    setCallAccepted(true);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: localStreamRef.current
    });

    peer.on("signal", answer => {
      socket.emit("call-accepted", { toUserId: caller.fromUserId, answer });
    });

    peer.on("stream", remoteStream => {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    });

    peer.signal(caller.offer);
    peerRef.current = peer;
    setCallIncoming(false);
  };

  // Iniciar llamada
  const callUser = () => {
    if (!targetUserId) return;

    const peer = new Peer({
      initiator: true,
      trickle: false,           // para simplificar ICE
      stream: localStreamRef.current
    });

    peer.on("signal", offer => {
      socket.emit("call-user", { toUserId: targetUserId, offer });
    });

    peer.on("stream", remoteStream => {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    });

    peerRef.current = peer;
  };

  // Recibir answer
  const handleCallAccepted = ({ fromUserId, answer }) => {
    if (peerRef.current) {
      peerRef.current.signal(answer);
    }
  };

  // Compartir pantalla
  const startScreenShare = async () => {
    if (!peerRef.current) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setSharingScreen(true);
      const screenTrack = screenStream.getVideoTracks()[0];

      const sender = peerRef.current.streams[0].getVideoTracks()[0];
      peerRef.current.replaceTrack(sender, screenTrack, peerRef.current.streams[0]);

      localVideoRef.current.srcObject = screenStream;

      screenTrack.onended = stopScreenShare;
    } catch (err) {
      console.error("Error compartiendo pantalla:", err);
    }
  };

  // Detener screen share
  const stopScreenShare = () => {
    if (!peerRef.current) return;
    const originalTrack = localStreamRef.current.originalVideoTrack;
    if (!originalTrack) return;

    const sender = peerRef.current.streams[0].getVideoTracks()[0];
    peerRef.current.replaceTrack(sender, originalTrack, peerRef.current.streams[0]);

    localVideoRef.current.srcObject = localStreamRef.current;
    setSharingScreen(false);
  };

  // Colgar
  const endCall = () => {
    peerRef.current?.destroy();
    onClose?.();
  };

  return (
    <div>
      <h3>
        {callIncoming && !callAccepted ? `Llamada de ${caller?.fromUserId}` :
         callAccepted ? `En llamada con ${targetUserId}` :
         "Sin llamada"}
      </h3>

      <div style={{ display: "flex", gap: "10px" }}>
        <video ref={localVideoRef} muted autoPlay style={{ width: "200px" }} />
        <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "200px" }} />
      </div>

      {!callAccepted && !callIncoming && targetUserId && (
        <button onClick={callUser}>Llamar</button>
      )}

      {callIncoming && !callAccepted && (
        <button onClick={answerCall}>Responder Llamada</button>
      )}

      {callAccepted && (
        <>
          {!sharingScreen && <button onClick={startScreenShare}>Compartir Pantalla</button>}
          {sharingScreen && <button onClick={stopScreenShare}>Detener Pantalla</button>}
          <button onClick={endCall}>Colgar</button>
        </>
      )}
    </div>
  );
};

export default Call;