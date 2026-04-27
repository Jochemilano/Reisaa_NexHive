// src/components/CalendarComponent.jsx
import "./CalendarComponent.css";
import React, { useState } from 'react';
import { useCalendar } from '@/context/CalendarContext';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, getDay } from 'date-fns';
import { startOfWeek as dateFnsStartOfWeek } from 'date-fns';
import es from 'date-fns/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { es };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => dateFnsStartOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales
});

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

const CalendarComponent = ({ events, onSelectSlot, onSelectEvent, eventPropGetter }) => {
  const { currentDate, setCurrentDate } = useCalendar();
  const [view, setView] = useState('month');

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
        eventPropGetter={eventPropGetter}
        messages={messages}
        view={view}
        onView={setView}
        date={currentDate}
        onNavigate={setCurrentDate}
        style={{ height: '80vh' }}
      />
    </div>
  );
};

export default CalendarComponent;