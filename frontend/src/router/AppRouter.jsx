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

/**
 * Enrutador Principal de la Aplicación.
 * Orquesta la jerarquía de Context Providers y define las reglas de navegación
 * mediante guardias de ruta (Protected vs Public).
 */
export default function AppRouter() {
  return (
    <SidebarProvider>
      <SocketProvider>
        <UnreadProvider>
          <CallProvider>
            <UserDetailProvider>
            {/* Componentes globales de comunicación persistentes en toda la sesión */}
            <IncomingCallModal />
            <FloatingCall />

            <Routes>
              {/* Redirección inicial: El usuario siempre intenta ir al Home al entrar en la raíz */}
              <Route path="/" element={<Navigate to="/home" replace />} />
              
              {/* RUTAS PRIVADAS: Envueltas en ProtectedRoute para validar sesión activa */}
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

              {/* RUTAS PÚBLICAS: Envueltas en PublicRoute para evitar doble login */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

              {/* Manejo de rutas inexistentes: Fallback al Home */}
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
            </UserDetailProvider>
          </CallProvider>
        </UnreadProvider>
      </SocketProvider>
    </SidebarProvider>
  );
}