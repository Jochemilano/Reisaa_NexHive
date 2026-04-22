import React, { useState } from 'react';
import CalendarComponent from '@/components/calendar/CalendarComponent';
import CreateEventModal from '@/components/calendar/CreateEventModal';
import { createPersonalEvent } from '@/utils/calendar';
import EditPersonalEventModal from '@/components/calendar/EditPersonalEventModal';
import EditActivityModal from '@/components/groups/EditActivityModal';
import { useCalendar } from '@/context/CalendarContext';
import '@/styles.css';

const Calendar = () => {
  const { filteredEvents, refreshEvents, currentUserId } = useCalendar();
  const [selectedPersonalEvent, setSelectedPersonalEvent] = useState(null);
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [isEditActivityOpen, setIsEditActivityOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [initialDate, setInitialDate] = useState(null);

  //Guardar evento nuevo
  const handleSaveEvent = async (newEvent) => {
    try {
      await createPersonalEvent(newEvent);
      refreshEvents();
      setIsCreateOpen(false);
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

  const getEventStyle = (event) => {
    if (!event.isActivity) {
      const isMine = event.owner_id === currentUserId;
      return {
        backgroundColor: isMine ? '#3B82F6' : 'rgba(59, 130, 246, 0.1)',
        borderColor: '#3B82F6',
        borderStyle: isMine ? 'solid' : 'dashed',
        borderWidth: '1px',
        color: isMine ? 'white' : '#60A5FA',
        fontWeight: isMine ? '600' : '400',
      };
    }
    const index = event.project_id
      ? Math.abs(event.project_id) % PROJECT_COLORS.length
      : 0;
    const color = PROJECT_COLORS[index];
    return { 
      backgroundColor: color, 
      borderColor: color,
      color: 'white',
      fontWeight: '600'
    };
  };

  return (
    <div>
      <CalendarComponent
        events={filteredEvents}
        eventPropGetter={(event) => ({
          style: getEventStyle(event)
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
        onUpdated={refreshEvents}
        onDeleted={async (eventId) => {
          refreshEvents();
          setIsPersonalModalOpen(false);
        }}
      />
      <EditActivityModal
        isOpen={isEditActivityOpen}
        onClose={() => setIsEditActivityOpen(false)}
        activityId={editingActivityId}
        onUpdated={refreshEvents}
      />
    </div>
  );
};

export default Calendar;
