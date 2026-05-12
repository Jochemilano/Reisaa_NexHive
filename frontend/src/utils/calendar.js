/**
 * Utilidades para la gestión de eventos personales en el calendario.
 */
import { apiFetch } from './apiClient';

/**
 * Crea un nuevo evento personal.
 * @param {Object} eventData - Datos del evento (title, start, end, etc.)
 */
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

/**
 * Obtiene todos los eventos asociados al usuario actual.
 */
export const getPersonalEvents = async () => {
  return await apiFetch('events');
};

/**
 * Elimina un evento específico por su ID.
 */
export const deletePersonalEvent = async (eventId) => {
  return await apiFetch(`events/${eventId}`, { method: 'DELETE' });
};

/**
 * Actualiza la información de un evento existente.
 */
export const updatePersonalEvent = async (eventId, eventData) => {
  const payload = {
    title: eventData.title,
    description: eventData.description || null,
    start: eventData.start,
    end: eventData.end,
    // Solo incluir colaboradores si se proporcionan explícitamente
    ...(eventData.collaborators ? { collaborators: eventData.collaborators } : {}),
  };
  return await apiFetch(`events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};