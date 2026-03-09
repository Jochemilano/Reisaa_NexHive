// src/components/CalendarComponent.jsx
import "./CalendarComponent.css";
import React from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, getDay } from 'date-fns';
import { startOfWeek as dateFnsStartOfWeek } from 'date-fns';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { es };

// Localizador
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => dateFnsStartOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales
});

// Traducción de botones y textos
const messages = {
  allDay: 'Todo el día',
  previous: 'Atrás',
  next: 'Siguiente',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'No hay eventos en este rango.',
  showMore: total => `+ Ver más (${total})`,
};

const CalendarComponent = ({ events, onSelectSlot, onSelectEvent }) => {
  return (
    <div className='calendar-container'>
      <Calendar
        localizer={localizer}
        events={events || []}
        startAccessor="start"
        endAccessor="end"
        selectable
        onSelectSlot={onSelectSlot}
        onSelectEvent={onSelectEvent}
        messages={messages}
        style={{ height: '100%' }}
      />
    </div>
  );
};

export default CalendarComponent;