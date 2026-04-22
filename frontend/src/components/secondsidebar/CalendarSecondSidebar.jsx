import React from 'react';
import { useCalendar } from '@/context/CalendarContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '@/context/GroupContext';
import './SecondSidebar.css';

const CalendarSecondSidebar = () => {
  const { events, filters, setFilters, projects } = useCalendar();
  const navigate = useNavigate();
  const { setSelectedProjectId } = useGroup();

  // Filtrar eventos para la lista (solo futuros o hoy)
  const now = new Date();
  const upcomingEvents = events
    .filter(e => e.end >= now)
    .sort((a, b) => a.start - b.start);

  const togglePersonal = () => setFilters(f => ({ ...f, showPersonal: !f.showPersonal }));
  const toggleActivities = () => setFilters(f => ({ ...f, showActivities: !f.showActivities }));
  
  const toggleProject = (projectId) => {
    setFilters(f => {
      const selected = f.selectedProjects.includes(projectId)
        ? f.selectedProjects.filter(id => id !== projectId)
        : [...f.selectedProjects, projectId];
      return { ...f, selectedProjects: selected };
    });
  };

  const handleEventClick = (event) => {
    if (event.isActivity && event.group_id) {
      if (event.project_id) {
        setSelectedProjectId(event.project_id);
      }
      navigate(`/groups/${event.group_id}`);
    }
  };

  const PROJECT_COLORS = [
    '#7C3AED', '#0891B2', '#059669', '#D97706', '#DC2626', '#DB2777', '#65A30D',
  ];

  const getProjectColor = (projectId) => {
    const index = projectId ? Math.abs(projectId) % PROJECT_COLORS.length : 0;
    return PROJECT_COLORS[index];
  };

  return (
    <div className="calendar-sidebar">
      <div className="sidebar-section">
        <h3>Filtros</h3>
        <div className="filter-group">
          <div className="user-item" onClick={togglePersonal}>
            {filters.showPersonal ? <FaEye className="eye-icon" /> : <FaEyeSlash className="eye-icon muted" />}
            <span className="filter-label">Mis Eventos</span>
            <div className="color-indicator" style={{ backgroundColor: '#3B82F6' }}></div>
          </div>
          
          <div className="user-item" onClick={toggleActivities}>
            {filters.showActivities ? <FaEye className="eye-icon" /> : <FaEyeSlash className="eye-icon muted" />}
            <span className="filter-label">Actividades</span>
          </div>

          {filters.showActivities && projects.length > 0 && (
            <div className="project-sublist">
              {projects.map(p => {
                const isSelected = filters.selectedProjects.length === 0 || filters.selectedProjects.includes(p.id);
                return (
                  <div key={p.id} className="activity-item" onClick={() => toggleProject(p.id)}>
                    <span className={`project-dot ${!isSelected ? 'muted' : ''}`} style={{ backgroundColor: getProjectColor(p.id) }}></span>
                    <span className={`filter-label project-name ${!isSelected ? 'muted' : ''}`}>{p.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-section upcoming-section">
        <h3>Próximos Eventos</h3>
        <div className="events-list">
          {upcomingEvents.length === 0 ? (
            <div className="empty-state">
              <p>No hay eventos próximos</p>
            </div>
          ) : (
            upcomingEvents.slice(0, 8).map(event => (
              <div 
                key={event.id} 
                className={`event-sidebar-card ${event.isActivity ? 'activity' : 'personal'}`}
                onClick={() => handleEventClick(event)}
              >
                <div 
                  className="card-accent" 
                  style={{ backgroundColor: event.isActivity ? getProjectColor(event.project_id) : '#3B82F6' }}
                ></div>
                <div className="card-body">
                  <div className="card-header">
                    <span className="event-date">
                      {format(event.start, "d 'de' MMM", { locale: es })}
                    </span>
                    <span className="event-time">
                      {format(event.start, 'HH:mm')}
                    </span>
                  </div>
                  <h4 className="event-title">{event.title}</h4>
                  {event.project_name && (
                    <div className="event-meta">
                      <span className="project-tag" style={{ color: getProjectColor(event.project_id) }}>
                        {event.project_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarSecondSidebar;