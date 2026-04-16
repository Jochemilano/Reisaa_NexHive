import { apiFetch } from './apiClient';

// Crear evento
export const createPersonalEvent = async (eventData) => {
  const payload = {
    title: eventData.title,
    description: eventData.description || null,
    start: eventData.start,
    end: eventData.end,
    collaborators: eventData.collaborators || [],
  };
  return await apiFetch('events', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// Obtener eventos
export const getPersonalEvents = async () => {
  return await apiFetch('events');
};

// Eliminar evento
export const deletePersonalEvent = async (eventId) => {
  return await apiFetch(`events/${eventId}`, { method: 'DELETE' });
};

// Actualizar evento
export const updatePersonalEvent = async (eventId, eventData) => {
  const payload = {
    title: eventData.title,
    description: eventData.description || null,
    start: eventData.start,
    end: eventData.end,
    ...(eventData.collaborators ? { collaborators: eventData.collaborators } : {}),
  };
  return await apiFetch(`events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};