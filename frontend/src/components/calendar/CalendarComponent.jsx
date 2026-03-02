// src/components/CalendarComponent.jsx
import "./CalendarComponent.css";
import React from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import es from 'date-fns/locale/es'; // opcional: para español

// Configuración de date-fns para react-big-calendar
const locales = { es }; // puedes agregar más locales si quieres

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
});

const CalendarComponent = ({ events, onSelectSlot, onSelectEvent }) => {
  return (
    <div className='calendar-container'>
      <Calendar
        localizer={localizer}
        events={events || []} // eventos vacíos por defecto
        startAccessor="start"
        endAccessor="end"
        selectable
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        style={{ height: '100%' }}
      />
    </div>
  );
};

export default CalendarComponent;