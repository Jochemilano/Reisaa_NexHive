import Sidebar from "@/components/sidebar/Sidebar";
import SecondSidebar from "@/components/secondsidebar/SecondSidebar";
import { Outlet } from "react-router-dom";
import { GroupProvider } from "@/context/GroupContext";
import { CalendarProvider } from "@/context/CalendarContext";
import "./Layout.css";

export default function Layout() {
  return (
    <GroupProvider>
      {/* CalendarProvider se anida dentro de GroupProvider para permitir que el calendario reaccione a cambios en el contexto de grupos si fuera necesario en el futuro */}
      <CalendarProvider>
        <div className="layout">
          <Sidebar />
          <SecondSidebar />
          <div className="content-area">
            <main className="main-content">
              <Outlet />
            </main>
          </div>
        </div>
      </CalendarProvider>
    </GroupProvider>
  );
}