import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/utils/apiClient";
import { getPersonalEvents } from "@/utils/calendar";
import { getProfile } from "@/utils/profile";
import { getAvatarUrl } from "@/utils/media";
import { useGroups } from "@/hooks/useGroups";
import { useUnread } from "@/context/UnreadContext";
import { useGroup } from "@/context/GroupContext";
import Skeleton from "@/components/loading/Skeleton";
import CreateEventModal from '@/components/calendar/CreateEventModal';
import MediaModal from "@/components/communication/MediaModal";
import { getFileUrl } from "@/utils/chat";
import {
  FiMessageSquare, FiUsers, FiCalendar, FiActivity,
  FiStar, FiArrowRight, FiCheckCircle,
  FiFile, FiImage, FiChevronDown, FiChevronUp, FiPaperclip
} from "react-icons/fi";
import "./Home.css";

/* ── helpers ─────────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

function formatDate() {
  return new Date().toLocaleDateString("es-ES", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

function formatEventTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Hoy a las ${timeStr}`;
  if (isTomorrow) return `Mañana a las ${timeStr}`;
  return `${date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} a las ${timeStr}`;
}

function getRelativeTime(dateStr) {
  if (!dateStr) return "Reciente";
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Hace un momento";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Hace ${diffInHours} h`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Ayer";
  if (diffInDays < 7) return `Hace ${diffInDays} días`;
  
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

/* ── component ───────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const { groups, loading: loadingGroups } = useGroups();
  const { unreadByRoom } = useUnread();
  const { setSelectedProjectId } = useGroup();

  const [perfil, setPerfil] = useState(null);
  const [friends, setFriends] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activities, setActivities] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  // Multimedia
  const [recentMedia, setRecentMedia] = useState([]);
  const [activeMediaTab, setActiveMediaTab] = useState("gallery");
  const [isMediaExpanded, setIsMediaExpanded] = useState(false); // Nuevo: control de colapso
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, f, r, a, e] = await Promise.all([
        getProfile(),
        apiFetch("friends"),
        apiFetch("rooms"),
        apiFetch("my-activities"),
        getPersonalEvents(),
      ]);
      setPerfil(p);
      setFriends(f);
      setRooms(r);
      setActivities(a);
      setEvents(e);

      // Cargar multimedia automáticamente al inicio ya que ahora es una sección principal
      fetchMediaManual(r);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMediaManual = async (roomsList) => {
    setLoadingMedia(true);
    try {
      const targetRooms = (roomsList || rooms).slice(0, 20); // Escanear hasta 20 salas para encontrar contenido
      let allFiles = [];

      const results = await Promise.allSettled(
        targetRooms.map(room => apiFetch(`rooms/${room.id}/messages`))
      );

      results.forEach((res, index) => {
        if (res.status === 'fulfilled') {
          const msgs = res.value;
          const roomName = targetRooms[index].display_name;
          const files = msgs.filter(m => m.type === 'file' || m.type === 'image');
          allFiles = [...allFiles, ...files.map(f => ({ ...f, roomName }))];
        }
      });

      // Ordenar por fecha y limitar
      const sorted = allFiles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setRecentMedia(sorted);
    } catch (err) {
      console.error("Error fetching media:", err);
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalUnread = useMemo(
    () => Object.values(unreadByRoom).reduce((s, v) => s + v, 0),
    [unreadByRoom]
  );

  const stats = [
    { icon: <FiUsers />, label: "Amigos", value: friends.length, color: "stat-blue", path: "/social" },
    { icon: <FiMessageSquare />, label: "Mensajes", value: totalUnread, color: "stat-purple", path: "/social" },
    { icon: <FiActivity />, label: "Actividades", value: activities.length, color: "stat-green" },
  ];

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter(e => new Date(e.start) >= now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 4);
  }, [events]);

  return (
    <div className="dash-wrapper">
      <div className="dash-scroll">

        {/* ── Top Bar ────────────────────────────────────────── */}
        <div className="dash-top-bar">
          <header className="dash-greeting-minimal">
            <span className="dash-greeting-hi">
              {getGreeting()}{perfil?.name ? `, ${perfil.name.split(" ")[0]}` : ""}
            </span>
            <span className="dash-greeting-date">{formatDate()}</span>
          </header>

          <div className="dash-search-container">

            <input
              type="text"
              placeholder="Buscar en NexHive..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* ── Main Layout ────────────────────────────────────── */}
        <div className="dash-main-layout">

          {/* Column Left: Main Activity */}
          <div className="dash-col-left">

            {/* Stats Compact Row */}
            <section className="dash-stats-compact">
              {stats.map((s, i) => (
                <div key={i} className={`stat-mini ${s.color}`} onClick={() => s.path && navigate(s.path)}>
                  <span className="stat-mini-icon">{s.icon}</span>
                  <div className="stat-mini-info">
                    <span className="stat-mini-value">{loading ? "..." : s.value}</span>
                    <span className="stat-mini-label">{s.label}</span>
                  </div>
                </div>
              ))}
            </section>



            {/* Active Activities */}
            <section className="dash-card">
              <div className="dash-card-header">
                <div className="title-with-icon">
                  <FiActivity className="dash-card-icon" />
                  <h2 className="dash-card-title">Actividades en curso</h2>
                </div>
              </div>
              <div className="dash-card-body">
                {loading ? (
                  <Skeleton height="100px" />
                ) : (activities.filter(a => a.activity_name.toLowerCase().includes(searchTerm.toLowerCase()) || a.project_name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0) ? (
                  <div className="dash-empty-minimal">No hay actividades que coincidan</div>
                ) : (
                  activities
                    .filter(a => a.activity_name.toLowerCase().includes(searchTerm.toLowerCase()) || a.project_name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .slice(0, 4)
                    .map(act => (
                      <div key={act.id} className="dash-item-row" onClick={() => { setSelectedProjectId(act.project_id); navigate(`/groups/${act.group_id}`); }}>
                        <div className="dash-item-dot" />
                        <div className="dash-item-text">
                          <span className="dash-item-name">{act.activity_name}</span>
                          <span className="dash-item-sub">Proyecto: {act.project_name}</span>
                        </div>
                        <FiArrowRight className="dash-item-arrow" />
                      </div>
                    ))
                )}
              </div>
            </section>

            {/* Recent Chats Grid */}
            <section className="dash-card">
              <div className="dash-card-header">
                <div className="title-with-icon">
                  <FiMessageSquare className="dash-card-icon" />
                  <h2 className="dash-card-title">Conversaciones recientes</h2>
                </div>
                <button className="dash-card-link" onClick={() => navigate("/social")}>Ver todo</button>
              </div>
              <div className="dash-card-body-grid">
                {loading ? (
                  <Skeleton height="80px" />
                ) : (rooms.filter(r => r.display_name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0) ? (
                  <div className="dash-empty-minimal">Sin resultados</div>
                ) : (
                  rooms
                    .filter(r => r.display_name?.toLowerCase().includes(searchTerm.toLowerCase()))
                    .slice(0, 4)
                    .map(r => (
                      <div key={r.id} className="dash-chat-tile" onClick={() => navigate(`/chat/${r.id}`)}>
                        <div className="dash-tile-avatar">
                          {r.display_avatar ? (
                            <img src={getAvatarUrl(r.display_avatar)} alt="" />
                          ) : (
                            r.display_name?.[0]?.toUpperCase()
                          )}
                        </div>
                        <span className="dash-tile-name">{r.display_name}</span>
                        {unreadByRoom[r.id] > 0 && <span className="dash-tile-badge">{unreadByRoom[r.id]}</span>}
                      </div>
                    ))
                )}
              </div>
            </section>

            {/* Activity Wall */}
            <section className="dash-card activity-wall">
              <div className="dash-card-header">
                <div className="title-with-icon">
                  <FiActivity className="dash-card-icon" />
                  <h2 className="dash-card-title">Muro de Actividad</h2>
                </div>
              </div>
              <div className="dash-card-body">
                {loading ? (
                  <Skeleton height="200px" />
                ) : (
                  <div className="activity-feed">
                    {/* Mensajes sin leer */}
                    {rooms.filter(r => unreadByRoom[r.id] > 0).slice(0, 3).map(r => (
                      <div key={`msg-${r.id}`} className="activity-item" onClick={() => navigate(`/chat/${r.id}`)}>
                        <div className="activity-icon-circle purple"><FiMessageSquare /></div>
                        <div className="activity-content">
                          <p className="activity-text">Tienes <b>{unreadByRoom[r.id]}</b> mensajes nuevos en <b>{r.display_name}</b></p>
                          <span className="activity-time">{getRelativeTime(r.last_message_at || r.updated_at)}</span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Archivos compartidos */}
                    {recentMedia.slice(0, 3).map(m => (
                      <div key={`media-${m.id}`} className="activity-item" onClick={() => setSelectedMedia({ src: getFileUrl(m.content), type: m.type })}>
                        <div className={`activity-icon-circle ${m.type === 'image' ? 'blue' : 'green'}`}>
                          {m.type === 'image' ? <FiImage /> : <FiFile />}
                        </div>
                        <div className="activity-content">
                          <p className="activity-text">Se compartió un(a) <b>{m.type === 'image' ? 'imagen' : 'archivo'}</b> en <b>{m.roomName}</b></p>
                          <span className="activity-time">{getRelativeTime(m.created_at)}</span>
                        </div>
                      </div>
                    ))}

                    {/* Próximos eventos */}
                    {upcomingEvents.slice(0, 1).map(ev => (
                      <div key={`ev-${ev.id}`} className="activity-item" onClick={() => navigate("/calendar")}>
                        <div className="activity-icon-circle orange"><FiCalendar /></div>
                        <div className="activity-content">
                          <p className="activity-text">Próximo evento: <b>{ev.title}</b></p>
                          <span className="activity-time">{formatEventTime(ev.start)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Column Right: Side Info */}
          <div className="dash-col-right">

            {/* Events */}
            <section className="dash-card card-narrow">
              <div className="dash-card-header">
                <div className="title-with-icon">
                  <FiCalendar className="dash-card-icon" />
                  <h2 className="dash-card-title">Calendario</h2>
                </div>
                <button className="dash-card-btn-plus" onClick={() => setIsEventModalOpen(true)}>+</button>
              </div>
              <div className="dash-card-body">
                {loading ? (
                  <Skeleton height="150px" />
                ) : upcomingEvents.length === 0 ? (
                  <div className="dash-empty-minimal">Sin eventos próximos</div>
                ) : (
                  upcomingEvents.map(ev => (
                    <div key={ev.id} className="dash-event-compact" onClick={() => navigate("/calendar")}>
                      <div className="event-date-mini">
                        <span className="ev-day">{new Date(ev.start).getDate()}</span>
                        <span className="ev-month">{new Date(ev.start).toLocaleString("es-ES", { month: "short" })}</span>
                      </div>
                      <div className="event-info-mini">
                        <span className="ev-title">{ev.title}</span>
                        <span className="ev-time">{formatEventTime(ev.start)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Multimedia Mini-Widget */}
            <section className="dash-card card-narrow sidebar-media-widget">
              <div className="dash-card-header">
                <div className="title-with-icon">
                  <FiPaperclip className="dash-card-icon" />
                  <h2 className="dash-card-title">Multimedia</h2>
                </div>
                <button className="dash-card-link" onClick={() => fetchMediaManual()}>Refrescar</button>
              </div>
              <div className="dash-card-body">
                {loadingMedia ? (
                  <Skeleton height="80px" />
                ) : recentMedia.length === 0 ? (
                  <div className="dash-empty-minimal">Sin archivos</div>
                ) : (
                  <div className="sidebar-media-compact">
                    <div className="sidebar-media-grid">
                      {recentMedia.filter(m => m.type === 'image').slice(0, 4).map(m => (
                        <div key={m.id} className="sidebar-media-thumb" onClick={() => setSelectedMedia({ src: getFileUrl(m.content), type: m.type })}>
                          <img src={getFileUrl(m.content)} alt="" />
                        </div>
                      ))}
                    </div>
                    <div className="sidebar-files-list">
                      {recentMedia.filter(m => m.type === 'file').slice(0, 3).map(m => (
                        <div key={m.id} className="sidebar-file-row" onClick={() => setSelectedMedia({ src: getFileUrl(m.content), type: m.type })}>
                          <FiFile className="file-mini-icon" />
                          <span className="file-mini-name">{m.content.split("/").pop()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>

      </div>

      <CreateEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={() => {
          setIsEventModalOpen(false);
          loadData(); // Refresh events
        }}
      />

      {selectedMedia && (
        <MediaModal
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </div>
  );
}
