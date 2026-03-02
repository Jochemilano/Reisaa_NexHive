// utils/activities.js
import { apiFetch } from "./apiClient";

// Obtener detalles de una actividad
export const getActivityDetails = (activityId) =>
  apiFetch(`activities/${activityId}`);

// Editar actividad
export const updateActivity = (activityId, data) =>
  apiFetch(`activities/${activityId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

// Crear actividad (ya existe)
export const createActivity = (data) =>
  apiFetch("activities", {
    method: "POST",
    body: JSON.stringify(data),
  });

// Obtener actividades de un proyecto (ya existe)
export const getActivities = (projectId) =>
  apiFetch(`projects/${projectId}/activities`);