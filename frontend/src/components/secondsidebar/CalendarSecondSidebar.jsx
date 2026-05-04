import React, { useState, useMemo } from 'react';
import { useCalendar } from '@/context/CalendarContext';
import { format, isSameDay, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { FaEye, FaEyeSlash, FaSearch, FaPlus, FaCalendarDay, FaHistory } from 'react-icons/fa';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import Skeleton from '@/components/loading/Skeleton';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './SecondSidebar.css';

const CalendarSecondSidebar = () => {
  const { 
    events, 
    filters, 
    setFilters, 
    projects, 
    currentDate, 
    setCurrentDate,
    setIsCreateOpen,
    setInitialDate,
    setHighlightedEventId,
    loading
  } = useCalendar();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  // Filtrar eventos para la lista
  const now = new Date();
  const upcomingEvents = useMemo(() => {
    return events
      .filter(e => {
        const isDone = e.status === 'done' || e.status === 'completed';
        if (!showCompleted && (isDone || (isPast(e.end) && !isSameDay(e.end, now)))) return false;

        const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (e.project_name && e.project_name.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSearch;
      })
      .sort((a, b) => a.start - b.start)
      .slice(0, 15);
  }, [events, searchTerm, showCompleted]);

  const todayEvents = events.filter(e => isSameDay(e.start, now));

  const togglePersonal = () => setFilters(f => ({ ...f, showPersonal: !f.showPersonal }));
  const toggleActivities = () => setFilters(f => ({ ...f, showActivities: !f.showActivities }));
  
  const toggleProject = (projectId) => {
    setFilters(f => {
      const isHidden = f.hiddenProjects.includes(projectId);
      const hiddenProjects = isHidden
        ? f.hiddenProjects.filter(id => id !== projectId) // mostrar
        : [...f.hiddenProjects, projectId];               // ocultar
      return { ...f, hiddenProjects };
    });
  };

  const PROJECT_COLORS = [
    '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626', '#DB2777', '#65A30D',
  ];

  const getProjectColor = (projectId) => {
    const index = projectId ? Math.abs(projectId) % PROJECT_COLORS.length : 0;
    return PROJECT_COLORS[index];
  };

  const handleQuickCreate = () => {
    setInitialDate(new Date());
    setIsCreateOpen(true);
  };

  const handleJumpToToday = () => {
    setCurrentDate(new Date());
  };

  const handleCardClick = (event) => {
    setCurrentDate(new Date(event.start));
    setHighlightedEventId(event.id);
    
    // Quitar el resalte después de unos segundos
    setTimeout(() => {
      setHighlightedEventId(null);
    }, 3000);
  };

  return (
    <div className="calendar-sidebar">
      {/* 1. BOTÓN NUEVO EVENTO (HASTA ARRIBA) */}
      <div className="sidebar-section quick-actions-top">
        <button className="quick-create-btn" onClick={handleQuickCreate}>
          <FaPlus /> Nuevo Evento
        </button>
      </div>

      {/* 2. MINI CALENDARIO */}
      <div className="sidebar-section mini-calendar-section">
        <div className="mini-calendar-header">
          <h3>Calendario</h3>
          <button className="jump-today-btn" onClick={handleJumpToToday}>Hoy</button>
        </div>
        <div className="mini-calendar-wrapper">
          <Calendar 
            onChange={(date) => setCurrentDate(date)} 
            value={currentDate}
            locale="es-MX"
            className="custom-mini-calendar"
            prev2Label={null}
            next2Label={null}
          />
        </div>
      </div>

      {/* 3. HOY SUMMARY */}
      <div className="sidebar-section today-summary">
        <div className="today-header-minimal">
          <FaCalendarDay />
          <span>Hoy: <strong>{todayEvents.length}</strong> eventos</span>
        </div>
      </div>

      {/* 4. FILTROS */}
      <div className="sidebar-section filters-section">
        <h3>Filtros</h3>
        <div className="filter-list-minimal">
          <div className={`filter-item-minimal ${filters.showPersonal ? 'active' : ''}`} onClick={togglePersonal}>
            <div className="status-dot personal"></div>
            <span>Mis Eventos</span>
            {filters.showPersonal ? <FiEye /> : <FiEyeOff className="muted" />}
          </div>
          
          <div className={`filter-item-minimal ${filters.showActivities ? 'active' : ''}`} onClick={toggleActivities}>
            <div className="status-dot activities"></div>
            <span>Actividades</span>
            {filters.showActivities ? <FiEye /> : <FiEyeOff className="muted" />}
          </div>

          {filters.showActivities && projects.length > 0 && (
            <div className="project-sublist-minimal">
              {projects.map(p => {
                const isHidden = filters.hiddenProjects.includes(p.id);
                return (
                  <div
                    key={p.id}
                    className={`project-item-minimal ${isHidden ? 'hidden' : 'visible'}`}
                    onClick={() => toggleProject(p.id)}
                    title={isHidden ? `Mostrar actividades de ${p.name}` : `Ocultar actividades de ${p.name}`}
                  >
                    <span
                      className="project-dot-small"
                      style={{ backgroundColor: getProjectColor(p.id), opacity: isHidden ? 0.3 : 1 }}
                    />
                    <span className={`project-name-small ${isHidden ? 'project-name-hidden' : ''}`}>
                      {p.name}
                    </span>
                    <span className="project-eye-icon">
                      {isHidden ? <FiEyeOff className="muted" /> : <FiEye />}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. SECCIÓN EVENTOS (CON BUSCADOR DENTRO) */}
      <div className="sidebar-section events-section-main">
        <div className="events-section-header">
          <h3>Eventos</h3>
          <div className="history-toggle" onClick={() => setShowCompleted(!showCompleted)}>
            <FaHistory className={showCompleted ? 'active' : ''} />
            <span>Ver anteriores</span>
          </div>
        </div>

        <div className="sidebar-search-wrapper-minimal">
          <FaSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Buscar..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="events-list">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`event-skeleton-${i}`} className="event-card-minimal">
                <div className="card-indicator" style={{ backgroundColor: 'var(--bg-active)' }}></div>
                <div className="card-content">
                  <div className="card-top">
                    <Skeleton width="40px" height="12px" />
                    <Skeleton width="30px" height="12px" />
                  </div>
                  <Skeleton width="100%" height="16px" />
                  <Skeleton width="60px" height="12px" />
                </div>
              </div>
            ))
          ) : upcomingEvents.length === 0 ? (
            <div className="empty-state">
              <p>{searchTerm ? 'Sin coincidencias' : 'Nada pendiente'}</p>
            </div>
          ) : (
            upcomingEvents.map(event => {
              const isDone = event.status === 'done' || event.status === 'completed';
              return (
                <div 
                  key={event.id} 
                  className={`event-card-minimal ${isDone ? 'done' : ''}`}
                  onClick={() => handleCardClick(event)}
                >
                  <div 
                    className="card-indicator" 
                    style={{ backgroundColor: event.isActivity ? getProjectColor(event.project_id) : '#3B82F6' }}
                  ></div>
                  <div className="card-content">
                    <div className="card-top">
                      <span className="date-tag">{format(event.start, "d MMM", { locale: es })}</span>
                      <span className="time-tag">{format(event.start, 'HH:mm')}</span>
                    </div>
                    <h4 className="card-title">{event.title}</h4>
                    {event.project_name && <span className="project-tag-minimal">{event.project_name}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarSecondSidebar;
