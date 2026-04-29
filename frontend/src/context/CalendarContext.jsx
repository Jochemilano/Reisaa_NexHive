import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getPersonalEvents } from '@/utils/calendar';

const CalendarContext = createContext();

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) throw new Error('useCalendar must be used within a CalendarProvider');
  return context;
};

export const CalendarProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    showPersonal: true,
    showActivities: true,
    hiddenProjects: [], // IDs de proyectos cuyas actividades están ocultas
  });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [initialDate, setInitialDate] = useState(null);
  const [highlightedEventId, setHighlightedEventId] = useState(null);

  const currentUserId = parseInt(localStorage.getItem('userId')) || null;

  const refreshEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPersonalEvents();
      const processed = data.map(e => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
        isActivity: e.type === 'ACTIVITY' || !!e.activity_id,
        isOwner: e.owner_id === currentUserId,
      }));
      setEvents(processed);
    } catch (err) {
      console.error("Error fetching calendar events:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  const filteredEvents = events.filter(event => {
    if (event.isActivity) {
      if (!filters.showActivities) return false;
      // Si el proyecto está en hiddenProjects, ocultar sus actividades
      if (filters.hiddenProjects.includes(event.project_id)) return false;
      return true;
    } else {
      return filters.showPersonal;
    }
  });

  // Obtener proyectos únicos para los filtros
  const projects = Array.from(new Set(
    events
      .filter(e => e.isActivity && e.project_id)
      .map(e => JSON.stringify({ id: e.project_id, name: e.project_name }))
  )).map(s => JSON.parse(s));

  const value = {
    events,
    filteredEvents,
    loading,
    filters,
    setFilters,
    refreshEvents,
    projects,
    currentUserId,
    currentDate,
    setCurrentDate,
    isCreateOpen,
    setIsCreateOpen,
    initialDate,
    setInitialDate,
    highlightedEventId,
    setHighlightedEventId
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};
