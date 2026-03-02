import React, { useState, useEffect } from 'react';
import CalendarComponent from 'components/calendar/CalendarComponent';
import CreateEventModal from 'components/calendar/CreateEventModal';
import { createPersonalEvent, getPersonalEvents, deletePersonalEvent } from 'utils/calendar-create-event';
import EditPersonalEventModal from 'components/calendar/EditPersonalEventModal';
import EditActivityModal from 'components/groups/EditActivityModal';

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [selectedPersonalEvent, setSelectedPersonalEvent] = useState(null);
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [isEditActivityOpen, setIsEditActivityOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [initialDate, setInitialDate] = useState(null); 


  // ⚡ Traer eventos cuando carga el componente
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getPersonalEvents();
        // Convertir fechas de string a Date
        const eventsWithDate = data.map(e => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end),
          isActivity: !!e.activity_id // true si es una actividad
        }));
        setEvents(eventsWithDate);
      } catch (err) {
        console.error(err);
      }
    };
    fetchEvents();
  }, []);

  // ⚡ Guardar evento nuevo
  const handleSaveEvent = async (newEvent) => {
    try {
      const savedEvent = await createPersonalEvent(newEvent);
      setEvents([...events, {
        ...savedEvent,
        start: new Date(savedEvent.start),
        end: new Date(savedEvent.end)
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


  const handleConfirmDelete = async () => {
    try {
      await deletePersonalEvent(eventToDelete.id);
      setEvents(events.filter(e => e.id !== eventToDelete.id));
      setEventToDelete(null);
    } catch (err) {
      alert("Error al eliminar evento");
      console.error(err);
    }
  };



  return (
    <div>
      <button onClick={() => setIsCreateOpen(true)}>Crear evento</button>
      <CalendarComponent
        events={events}
        onSelectSlot={(slotInfo) => console.log('Seleccionaste un día', slotInfo)}
        onSelectEvent={handleSelectEvent} // ahora abre modal
      />
      <CreateEventModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleSaveEvent}
      />
      <EditPersonalEventModal
        isOpen={isPersonalModalOpen}
        onClose={() => setIsPersonalModalOpen(false)}
        event={selectedPersonalEvent}
        onUpdated={async () => {
          const data = await getPersonalEvents();
          setEvents(data.map(e => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end),
            isActivity: !!e.activity_id
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
            isActivity: !!e.activity_id
          }));
          setEvents(eventsWithDate);
        }}
      />

    </div>
  );
};

export default Calendar;
