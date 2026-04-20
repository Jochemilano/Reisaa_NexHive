import { useParams } from "react-router-dom";
import Chat from "./chat";
import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiClient";
import { useCall } from "@/context/CallContext";

export default function ChatWrapper() {
  const { chatRoomId, groupId } = useParams(); // ← captura groupId si existe
  const userId = parseInt(localStorage.getItem("userId"));

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [targetUser, setTargetUser] = useState({ id: null, name: null, avatar: null });

  const { activeCall, setIsMinimized } = useCall();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        await apiFetch(`rooms/${chatRoomId}/messages`);
        setAuthorized(true);

        if (groupId) {
          // ── Chat grupal: traer info del grupo ──────────────────
          const group = await apiFetch(`groups/${groupId}/details`);
          setTargetUser({
            id: null,               // no hay un targetUser individual
            name: group.name,
            avatar: group.avatar,
          });
        } else {
          // ── Chat privado: traer el otro participante ────────────
          const participants = await apiFetch(`rooms/${chatRoomId}/participants`);
          const other = participants.find(p => p.id !== userId) ?? participants[0];
          if (other) {
            setTargetUser({
              id: other.id,
              name: other.name,
              avatar: other.profile_pic,
            });
            console.log("Target user for chat:", other);
          }
        }

      } catch (err) {
        console.error("Error:", err);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    if (chatRoomId) checkAccess();
  }, [chatRoomId, groupId]);

  useEffect(() => {
    return () => { if (activeCall) setIsMinimized(true); };
  }, [activeCall]);

  if (!chatRoomId)  return <p>Chat no encontrado</p>;
  if (loading)      return <p>Cargando...</p>;
  if (!authorized)  return <p>No tienes acceso a este chat</p>;

  return (
    <Chat
      roomId={chatRoomId}
      userId={userId}
      targetUserId={targetUser.id}
      targetUserName={targetUser.name}
      targetUserAvatar={targetUser.avatar}
    />
  );
}