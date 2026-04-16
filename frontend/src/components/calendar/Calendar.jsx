import React, { useState, useEffect } from 'react';
import CalendarComponent from '@/components/calendar/CalendarComponent';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import { createPersonalEvent, getPersonalEvents, deletePersonalEvent } from '@/utils/calendar';
import EditPersonalEventModal from '@/components/calendar/EditPersonalEventModal';
import EditActivityModal from '@/components/groups/EditActivityModal';
import '@/styles.css';

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [selectedPersonalEvent, setSelectedPersonalEvent] = useState(null);
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [isEditActivityOpen, setIsEditActivityOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [initialDate, setInitialDate] = useState(null);

  const currentUserId = parseInt(localStorage.getItem('userId')) || null;

  // Traer eventos cuando carga el componente
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getPersonalEvents();
        const eventsWithDate = data.map(e => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end),
          isActivity: !!e.activity_id,
          project_id: e.project_id ?? null,
          owner_id: e.owner_id,
          collaborators: e.collaborators || [],
          isOwner: e.owner_id === currentUserId,
        }));
        setEvents(eventsWithDate);
      } catch (err) {
        console.error(err);
      }
    };
    fetchEvents();
  }, [currentUserId]);

  //Guardar evento nuevo
  const handleSaveEvent = async (newEvent) => {
    try {
      const savedEvent = await createPersonalEvent(newEvent);
      setEvents([...events, {
        ...savedEvent,
        start: new Date(savedEvent.start),
        end: new Date(savedEvent.end),
        isActivity: !!savedEvent.activity_id,
        project_id: savedEvent.project_id ?? null,
        owner_id: savedEvent.owner_id,
        collaborators: savedEvent.collaborators || [],
        isOwner: savedEvent.owner_id === currentUserId,
      }]);
    } catch (err) {
      alert('Error al guardar evento');
      console.error(err);
    }
  };

  const handleSelectEvent = (event) => {
    if (event.isActivity) {
      setEditingActivityId(event.activity_id);
      setIsEditActivityOpen(true);
    } else {
      setSelectedPersonalEvent(event);
      setIsPersonalModalOpen(true);
    }
  };

  // Paleta de colores para proyectos
  const PROJECT_COLORS = [
    '#7C3AED', // violeta
    '#0891B2', // cyan
    '#059669', // verde
    '#D97706', // naranja
    '#DC2626', // rojo
    '#DB2777', // rosa
    '#65A30D', // lima
  ];

  const getEventColor = (event) => {
    if (!event.isActivity) {
      return { backgroundColor: '#3B82F6', borderColor: '#2563EB' }; // azul — personal
    }
    const index = event.project_id
      ? Math.abs(event.project_id) % PROJECT_COLORS.length
      : 0;
    const color = PROJECT_COLORS[index];
    return { backgroundColor: color, borderColor: color };
  };

  return (
    <div>
      <CalendarComponent
        events={events}
        eventPropGetter={(event) => ({
          style: getEventColor(event)
        })}
        onSelectSlot={(slotInfo) => {
          setInitialDate(slotInfo.start);
          setIsCreateOpen(true);
        }}
        onSelectEvent={handleSelectEvent}
      />
      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleSaveEvent}
        initialDate={initialDate}
      />
      <EditPersonalEventModal
        isOpen={isPersonalModalOpen}
        onClose={() => setIsPersonalModalOpen(false)}
        event={selectedPersonalEvent}
        currentUserId={currentUserId}
        onUpdated={async () => {
          const data = await getPersonalEvents();
          setEvents(data.map(e => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end),
            isActivity: !!e.activity_id,
            project_id: e.project_id ?? null,
            owner_id: e.owner_id,
            collaborators: e.collaborators || [],
            isOwner: e.owner_id === currentUserId,
          })));
        }}
        onDeleted={async (eventId) => {
          setEvents(prev => prev.filter(e => e.id !== eventId));
          setIsPersonalModalOpen(false);
        }}
      />
      <EditActivityModal
        isOpen={isEditActivityOpen}
        onClose={() => setIsEditActivityOpen(false)}
        activityId={editingActivityId}
        onUpdated={async () => {
          const data = await getPersonalEvents();
          const eventsWithDate = data.map(e => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end),
            isActivity: !!e.activity_id,
            project_id: e.project_id ?? null,
            owner_id: e.owner_id,
            collaborators: e.collaborators || [],
            isOwner: e.owner_id === currentUserId,
          }));
          setEvents(eventsWithDate);
        }}
      />
    </div>
  );
};

export default Calendar;
