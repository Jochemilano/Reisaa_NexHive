import { useParams } from "react-router-dom";
import Chat from "./chat";
import { useEffect, useState } from "react";
import { apiFetch } from "@/utils/apiClient";
import { useCall } from "@/context/CallContext";

export default function ChatWrapper() {
  const { chatRoomId, groupId } = useParams();
  const userId = parseInt(localStorage.getItem("userId"));

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
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
          const roomData = await apiFetch(`rooms/${chatRoomId}/details`);
          const participants = await apiFetch(`rooms/${chatRoomId}/participants`);

          // Es un grupo si el tipo es 'group' o si tiene un nombre que no sigue el patrón de DM
          const isGroup = roomData.type === 'group' || (roomData.name && !roomData.name.startsWith('chat-'));

          if (isGroup) {
            setTargetUser({
              id: null,
              name: roomData.name || "Grupo",
              avatar: roomData.avatar,
            });
          } else {
            // Es un DM
            if (participants.length > 0) {
              const other = participants[0];
              setTargetUser({
                id: other.id,
                name: other.name,
                avatar: other.profile_pic,
              });
            } else {
              // Caso donde el otro usuario se salió o no hay nadie más
              setTargetUser({
                id: null,
                name: "Chat vacío",
                avatar: null,
              });
            }
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

  if (!chatRoomId) return <p>Chat no encontrado</p>;
  if (!loading && !authorized) return <p>No tienes acceso a este chat</p>;

  return (
    <Chat
      roomId={chatRoomId}
      userId={userId}
      groupId={groupId}
      targetUserId={targetUser.id}
      targetUserName={targetUser.name}
      targetUserAvatar={targetUser.avatar}
      loadingHeader={loading}
    />
  );
}