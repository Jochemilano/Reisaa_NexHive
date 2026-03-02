// src/utils/calendar-create-event.js
import { apiFetch } from './apiClient';

// ⚡ Crear evento (ya lo tienes)
export const createPersonalEvent = async (eventData) => {
  const payload = {
    title: eventData.title,
    description: eventData.description || null,
    start: eventData.start,
    end: eventData.end
  };
  return await apiFetch('events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// ⚡ Traer eventos (ya lo tienes)
export const getPersonalEvents = async () => {
  return await apiFetch('events');
};

// ⚡ Eliminar evento (ya lo tienes)
export const deletePersonalEvent = async (eventId) => {
  return await apiFetch(`events/${eventId}`, { method: 'DELETE' });
};

// ⚡ NUEVO: Actualizar evento
export const updatePersonalEvent = async (eventId, eventData) => {
  const payload = {
    title: eventData.title,
    description: eventData.description || null,
    start: eventData.start,
    end: eventData.end
  };
  return await apiFetch(`events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};