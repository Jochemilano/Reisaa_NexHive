import { useParams } from "react-router-dom";
import Chat from "./chat";
import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiClient";
import { useCall } from "@/context/CallContext";

export default function ChatWrapper() {
  const { chatRoomId, groupId } = useParams();
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
          const group = await apiFetch(`groups/${groupId}/details`);
          setTargetUser({
            id: null,
            name: group.name,
            avatar: group.avatar,
          });
        } else {
          const participants = await apiFetch(`rooms/${chatRoomId}/participants`);
          
          if (participants.length > 1) {
            // Es un grupo pequeño (room group)
            const roomData = await apiFetch(`rooms/${chatRoomId}/details`);
            setTargetUser({
              id: null,
              name: roomData.name || "Grupo",
              avatar: roomData.avatar,
            });
          } else if (participants.length === 1) {
            // Es un DM
            const other = participants[0];
            setTargetUser({
              id: other.id,
              name: other.name,
              avatar: other.profile_pic,
            });
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
  }, [chatRoomId, groupId, userId]);

  useEffect(() => {
    return () => { if (activeCall) setIsMinimized(true); };
  }, [activeCall, setIsMinimized]);

  if (!chatRoomId)  return <p>Chat no encontrado</p>;
  if (loading)      return <p>Cargando...</p>;
  if (!authorized)  return <p>No tienes acceso a este chat</p>;

  return (
    <Chat
      roomId={chatRoomId}
      userId={userId}
      groupId={groupId}
      targetUserId={targetUser.id}
      targetUserName={targetUser.name}
      targetUserAvatar={targetUser.avatar}
    />
  );
}