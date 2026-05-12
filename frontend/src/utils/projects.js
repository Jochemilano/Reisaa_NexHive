/**
 * Utilidades para la gestión de proyectos dentro de grupos.
 */
import { apiFetch } from "./apiClient";

/**
 * Crea un nuevo proyecto con configuración inicial de fechas y estado.
 */
export const createProject = (name, description, groupId, start_date = null, deadline = null, status = 'pending', collaborators = []) =>
  apiFetch("projects", {
    method: "POST",
    body: JSON.stringify({ 
      name, 
      description, 
      groupId, 
      start_date, 
      deadline, 
      status,
      collaborators 
    }),
  });

/**
 * Obtiene proyectos asociados a un grupo (vía ruta de API específica).
 */
export const getProjects = (groupId) =>
  apiFetch(`api/groups/${groupId}/projects`);

/**
 * Recupera el listado de usuarios asignados a un proyecto.
 */
export const fetchProjectUsers = (projectId) =>
  apiFetch(`projects/${projectId}/users`);

/**
 * Actualiza los metadatos y colaboradores de un proyecto.
 */
export const updateProject = (projectId, name, description, start_date, deadline, status, collaboratorIds = []) =>
  apiFetch(`projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({ name, description, start_date, deadline, status, collaborators: collaboratorIds }),
  });

/**
 * Lista los proyectos de un grupo.
 */
export const fetchGroupProjects = (groupId) =>
  apiFetch(`groups/${groupId}/projects`);

/**
 * Obtiene el detalle completo de un proyecto.
 */
export const fetchProjectDetails = (projectId) =>
  apiFetch(`projects/${projectId}`);

/**
 * Elimina un proyecto permanentemente.
 */
export const deleteProject = (projectId) =>
  apiFetch(`projects/${projectId}`, {
    method: "DELETE",
  });