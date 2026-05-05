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
import {
  FiMessageSquare, FiUsers, FiCalendar, FiActivity,
  FiStar, FiArrowRight, FiClock, FiZap, FiCheckCircle,
  FiTrendingUp, FiGrid
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

function formatEventDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

function formatEventTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

/* ── component ───────────────────────────────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const { groups, loading: loadingGroups } = useGroups();
  const { unreadTotal, unreadByRoom } = useUnread();
  const { setSelectedProjectId } = useGroup();

  const [perfil, setPerfil] = useState(null);
  const [friends, setFriends] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [activities, setActivities] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
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
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // rooms with unread, sorted by unread desc, take top 5
  const recentRooms = useMemo(() => {
    return [...rooms]
      .sort((a, b) => (unreadByRoom[b.id] || 0) - (unreadByRoom[a.id] || 0))
      .slice(0, 5);
  }, [rooms, unreadByRoom]);

  // upcoming events (today + future), sorted by start asc, top 4
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter(e => new Date(e.start) >= now)
      .sort((a, b) => new Date(a.start) - new Date(b.start))
      .slice(0, 4);
  }, [events]);

  const totalUnread = useMemo(
    () => Object.values(unreadByRoom).reduce((s, v) => s + v, 0),
    [unreadByRoom]
  );

  const stats = [
    {
      icon: <FiUsers />,
      label: "Amigos",
      value: loading ? null : friends.length,
      color: "stat-blue",
      path: "/social",
    },
    {
      icon: <FiMessageSquare />,
      label: "Sin leer",
      value: loading ? null : totalUnread,
      color: "stat-purple",
      path: "/social",
      highlight: totalUnread > 0,
    },
    {
      icon: <FiActivity />,
      label: "Actividades",
      value: loading ? null : activities.length,
      color: "stat-green",
      path: null,
    },
    {
      icon: <FiGrid />,
      label: "Grupos",
      value: loadingGroups ? null : groups.length,
      color: "stat-orange",
      path: null,
    },
  ];

  const quickActions = [
    { icon: <FiMessageSquare />, label: "Social", path: "/social", color: "qa-purple" },
    { icon: <FiCalendar />, label: "Calendario", path: "/calendar", color: "qa-blue" },
    { icon: <FiStar />, label: "Favoritos", path: "/favorites", color: "qa-yellow" },
  ];

  return (
    <div className="dash-wrapper">
      <div className="dash-scroll">

        {/* ── Greeting ───────────────────────────────────────── */}
        <header className="dash-greeting">
          <div className="dash-greeting-text">
            <span className="dash-greeting-hi">
              {getGreeting()}{perfil?.name ? `, ${perfil.name.split(" ")[0]}` : ""}
            </span>
            <span className="dash-greeting-sub">Este es el resumen de tu actividad en NexHive</span>
          </div>
          <div className="dash-greeting-date">
            <FiClock className="dash-date-icon" />
            <span>{formatDate()}</span>
          </div>
        </header>

        {/* ── Stats ──────────────────────────────────────────── */}
        <section className="dash-stats">
          {stats.map((s, i) => (
            <div
              key={i}
              className={`dash-stat-card ${s.color} ${s.path ? "clickable" : ""} ${s.highlight ? "highlighted" : ""}`}
              onClick={() => s.path && navigate(s.path)}
            >
              <div className="dash-stat-icon">{s.icon}</div>
              <div className="dash-stat-body">
                <div className="dash-stat-value">
                  {s.value === null ? <Skeleton width="40px" height="28px" /> : s.value}
                </div>
                <div className="dash-stat-label">{s.label}</div>
              </div>
              {s.path && <FiArrowRight className="dash-stat-arrow" />}
            </div>
          ))}
        </section>

        {/* ── Main grid ──────────────────────────────────────── */}
        <div className="dash-grid">

          {/* Recent chats */}
          <section className="dash-card">
            <div className="dash-card-header">
              <FiMessageSquare className="dash-card-icon" />
              <h2 className="dash-card-title">Chats recientes</h2>
              <button className="dash-card-link" onClick={() => navigate("/social")}>
                Ver todos <FiArrowRight />
              </button>
            </div>
            <div className="dash-card-body">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="dash-chat-row">
                    <Skeleton width="36px" height="36px" borderRadius="50%" />
                    <div style={{ flex: 1 }}>
                      <Skeleton width="60%" height="14px" />
                    </div>
                  </div>
                ))
              ) : recentRooms.length === 0 ? (
                <div className="dash-empty">
                  <FiMessageSquare />
                  <span>No tienes chats aún</span>
                </div>
              ) : (
                recentRooms.map(r => {
                  const unread = unreadByRoom[r.id] || 0;
                  const avatar = getAvatarUrl(r.display_avatar);
                  return (
                    <div key={r.id} className="dash-chat-row" onClick={() => navigate(`/chat/${r.id}`)}>
                      <div className="dash-chat-avatar">
                        {avatar
                          ? <img src={avatar} alt="" onError={e => { e.target.style.display = "none"; }} />
                          : <span>{r.display_name?.[0]?.toUpperCase() || "?"}</span>
                        }
                      </div>
                      <div className="dash-chat-info">
                        <span className="dash-chat-name">{r.display_name}</span>
                        {r.participant_count > 2 && (
                          <span className="dash-chat-sub">{r.participant_count} miembros</span>
                        )}
                      </div>
                      {unread > 0 && <span className="dash-unread-badge">{unread}</span>}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Active activities */}
          <section className="dash-card">
            <div className="dash-card-header">
              <FiActivity className="dash-card-icon" />
              <h2 className="dash-card-title">Actividades en curso</h2>
            </div>
            <div className="dash-card-body">
              {loading ? (
                [1, 2, 3].map(i => <Skeleton key={i} height="60px" style={{ marginBottom: 8 }} />)
              ) : activities.length === 0 ? (
                <div className="dash-empty">
                  <FiCheckCircle />
                  <span>¡Sin actividades pendientes!</span>
                </div>
              ) : (
                activities.slice(0, 5).map(act => (
                  <div
                    key={act.id}
                    className="dash-activity-row"
                    onClick={() => {
                      setSelectedProjectId(act.project_id);
                      navigate(`/groups/${act.group_id}`);
                    }}
                  >
                    <div className="dash-activity-dot" />
                    <div className="dash-activity-info">
                      <span className="dash-activity-name">{act.activity_name}</span>
                      <span className="dash-activity-meta">{act.project_name} · {act.group_name}</span>
                    </div>
                    <FiArrowRight className="dash-activity-arrow" />
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Upcoming events */}
          <section className="dash-card">
            <div className="dash-card-header">
              <FiCalendar className="dash-card-icon" />
              <h2 className="dash-card-title">Próximos eventos</h2>
              <button className="dash-card-link" onClick={() => navigate("/calendar")}>
                Calendario <FiArrowRight />
              </button>
            </div>
            <div className="dash-card-body">
              {loading ? (
                [1, 2].map(i => <Skeleton key={i} height="64px" style={{ marginBottom: 8 }} />)
              ) : upcomingEvents.length === 0 ? (
                <div className="dash-empty">
                  <FiCalendar />
                  <span>Sin eventos próximos</span>
                </div>
              ) : (
                upcomingEvents.map(ev => (
                  <div key={ev.id} className="dash-event-row" onClick={() => navigate("/calendar")}>
                    <div className="dash-event-date-block">
                      <span className="dash-event-day">{new Date(ev.start).getDate()}</span>
                      <span className="dash-event-month">
                        {new Date(ev.start).toLocaleString("es-ES", { month: "short" })}
                      </span>
                    </div>
                    <div className="dash-event-info">
                      <span className="dash-event-title">{ev.title}</span>
                      <span className="dash-event-time">
                        {formatEventTime(ev.start)}
                        {ev.end ? ` – ${formatEventTime(ev.end)}` : ""}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Groups overview */}
          <section className="dash-card">
            <div className="dash-card-header">
              <FiTrendingUp className="dash-card-icon" />
              <h2 className="dash-card-title">Mis grupos</h2>
            </div>
            <div className="dash-card-body">
              {loadingGroups ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="dash-chat-row">
                    <Skeleton width="36px" height="36px" borderRadius="8px" />
                    <Skeleton width="60%" height="14px" />
                  </div>
                ))
              ) : groups.length === 0 ? (
                <div className="dash-empty">
                  <FiGrid />
                  <span>Todavía no perteneces a ningún grupo</span>
                </div>
              ) : (
                groups.slice(0, 5).map(g => {
                  const avatar = getAvatarUrl(g.avatar);
                  const unread = unreadByRoom[String(g.chat_room_id)] || 0;
                  return (
                    <div key={g.id} className="dash-chat-row" onClick={() => navigate(`/groups/${g.id}`)}>
                      <div className="dash-group-avatar">
                        {avatar
                          ? <img src={avatar} alt="" onError={e => { e.target.style.display = "none"; }} />
                          : <span>{g.name?.[0]?.toUpperCase() || "?"}</span>
                        }
                      </div>
                      <div className="dash-chat-info">
                        <span className="dash-chat-name">{g.name}</span>
                      </div>
                      {unread > 0 && <span className="dash-unread-badge">{unread}</span>}
                    </div>
                  );
                })
              )}
            </div>
          </section>

        </div>

        {/* ── Quick actions ─────────────────────────────────── */}
        <section className="dash-quick">
          <h2 className="dash-section-title">
            <FiZap /> Acciones rápidas
          </h2>
          <div className="dash-quick-grid">
            {quickActions.map((qa, i) => (
              <button key={i} className={`dash-qa-btn ${qa.color}`} onClick={() => navigate(qa.path)}>
                <span className="dash-qa-icon">{qa.icon}</span>
                <span className="dash-qa-label">{qa.label}</span>
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
