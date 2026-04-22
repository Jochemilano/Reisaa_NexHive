import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/utils/protected-route";
import Layout from "@/components/layout/Layout";
import Calendar from "@/components/calendar/Calendar";
import Login from "@/pages/Login";
import Favorites from "@/components/favorites/Favorites";
import GroupPage from "@/components/groups/GroupPage";
import Home from "@/components/home/Home";
import ChatWrapper from "@/components/communication/ChatWrapper";
import VoiceRoomWrapper from "@/components/communication/VoiceRoomWrapper";
import { CallProvider } from "@/context/CallContext";
import IncomingCallModal from "@/components/communication/IncomingCallModal";
import FloatingCall from "@/components/communication/Floatingcall";
import { UnreadProvider } from "@/context/UnreadContext";

export default function AppRouter() {
  return (
    <UnreadProvider>
      <CallProvider>
        {/* Visible en CUALQUIER página */}
        <IncomingCallModal />
        <FloatingCall />

        <Routes>
          <Route path="/" element={<Navigate to="/home" />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/home"                                        element={<Home />} />
            <Route path="/favorites"                                   element={<Favorites />} />
            <Route path="/calendar"                                    element={<Calendar />} />
            <Route path="groups/:groupId"                              element={<GroupPage />} />
            <Route path="/groups/:groupId/chat/:chatRoomId"            element={<ChatWrapper />} />
            <Route path="/groups/:groupId/voice/:voiceRoomId"          element={<VoiceRoomWrapper />} />
            <Route path="/chat/:chatRoomId"                            element={<ChatWrapper />} />
          </Route>

          <Route path="/login" element={<Login />} />
        </Routes>
      </CallProvider>
    </UnreadProvider>
  );
}