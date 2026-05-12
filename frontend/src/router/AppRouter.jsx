import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "@/utils/protected-route";
import PublicRoute from "@/utils/public-route";
import Layout from "@/components/layout/Layout";
import Calendar from "@/components/calendar/Calendar";
import Login from "@/pages/Login";
import Favorites from "@/components/favorites/Favorites";
import GroupPage from "@/components/groups/GroupPage";
import Home from "@/components/home/Home";
import Social from "@/components/social/Social";
import ChatWrapper from "@/components/communication/ChatWrapper";
import VoiceRoomWrapper from "@/components/communication/VoiceRoomWrapper";
import { CallProvider } from "@/context/CallContext";
import IncomingCallModal from "@/components/communication/IncomingCallModal";
import FloatingCall from "@/components/communication/Floatingcall";
import { UnreadProvider } from "@/context/UnreadContext";
import { SocketProvider } from "@/context/SocketContext";
import { UserDetailProvider } from "@/context/UserDetailContext";
import { SidebarProvider } from "@/context/SidebarContext";

export default function AppRouter() {
  return (
    <SidebarProvider>
      <SocketProvider>
        <UnreadProvider>
          <CallProvider>
            <UserDetailProvider>
            {/* Visible en CUALQUIER página */}
            <IncomingCallModal />
            <FloatingCall />

            <Routes>
              {/* Ruta raíz redirige al home, que está protegido */}
              <Route path="/" element={<Navigate to="/home" replace />} />
              
              {/* Rutas Protegidas (Requieren sesión válida) */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/home"                                        element={<Home />} />
                <Route path="/social"                                      element={<Social />} />
                <Route path="/favorites"                                   element={<Favorites />} />
                <Route path="/calendar"                                    element={<Calendar />} />
                <Route path="groups/:groupId"                              element={<GroupPage />} />
                <Route path="/groups/:groupId/chat/:chatRoomId"            element={<ChatWrapper />} />
                <Route path="/groups/:groupId/voice/:voiceRoomId"          element={<VoiceRoomWrapper />} />
                <Route path="/chat/:chatRoomId"                            element={<ChatWrapper />} />
              </Route>

              {/* Rutas Públicas (No accesibles si ya hay sesión válida) */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

              {/* Catch-all: cualquier otra ruta redirige al home */}
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
            </UserDetailProvider>
          </CallProvider>
        </UnreadProvider>
      </SocketProvider>
    </SidebarProvider>
  );
}