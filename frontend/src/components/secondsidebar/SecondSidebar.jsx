import { useLocation, useParams } from "react-router-dom";
import { useSidebar } from "@/context/SidebarContext";
import "./SecondSidebar.css";
import GroupSecondSidebar from "./GroupSecondSidebar";
import HomeSecondSidebar from "./HomeSecondSidebar";
import CalendarSecondSidebar from "./CalendarSecondSidebar";

const SecondSidebar = () => {
  const location = useLocation();
  const { groupId } = useParams();
  const { isMinimized } = useSidebar();

  const renderContent = () => {
    if (location.pathname.startsWith("/groups")) return <GroupSecondSidebar groupId={groupId} />;
    if (location.pathname.startsWith("/home")) return <HomeSecondSidebar />;
    if (location.pathname.startsWith("/chat")) return <HomeSecondSidebar />;
    if (location.pathname.startsWith("/calendar")) return <CalendarSecondSidebar />;
    return null;
  };

  const content = renderContent();
  if (!content) return null;

  return (
    <aside className={`second-sidebar ${isMinimized ? "minimized" : ""}`}>
      <div className="sidebar-content">
        {content}
      </div>
    </aside>
  );
};

export default SecondSidebar;