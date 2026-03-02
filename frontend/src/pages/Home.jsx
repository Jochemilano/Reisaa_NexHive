import Chat from "components/chat/chat"

export default function Home() {
  const roomId = 1; // Por ejemplo
  const userId = 1; // Tu usuario actual

  return (
    <div>
      <h1>Chat en tiempo real</h1>
      <Chat roomId={roomId} userId={userId} />
    </div>
  );
  
}