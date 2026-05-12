/**
 * Utilidades para la gestión de actividades vinculadas a proyectos.
 * Centraliza las llamadas al API para mantener la lógica de negocio aislada.
 */
import { apiFetch } from "./apiClient";

/**
 * Obtiene el detalle completo de una actividad específica.
 */
export const getActivityDetails = (activityId) =>
  apiFetch(`activities/${activityId}`);

/**
 * Actualiza los datos de una actividad (título, descripción, fechas, estado).
 */
export const updateActivity = (activityId, data) =>
  apiFetch(`activities/${activityId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

/**
 * Crea una nueva actividad dentro de un contexto de proyecto.
 */
export const createActivity = (data) =>
  apiFetch("activities", {
    method: "POST",
    body: JSON.stringify(data),
  });

/**
 * Lista todas las actividades pertenecientes a un proyecto.
 */
export const getActivities = (projectId) =>
  apiFetch(`projects/${projectId}/activities`);

/**
 * Obtiene el listado de usuarios (colaboradores) asignados a una actividad.
 */
export const fetchActivityUsers = (activityId) =>
  apiFetch(`activities/${activityId}/users`);

/**
 * Elimina de forma permanente una actividad.
 */
export const deleteActivity = (activityId) =>
  apiFetch(`activities/${activityId}`, {
    method: "DELETE",
  });