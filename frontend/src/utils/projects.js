import { apiFetch } from "./apiClient";

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

export const getProjects = (groupId) =>
  apiFetch(`api/groups/${groupId}/projects`);

export const fetchProjectUsers = (projectId) =>
  apiFetch(`projects/${projectId}/users`);

export const updateProject = (projectId, name, description, start_date, deadline, status, collaboratorIds = []) =>
  apiFetch(`projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({ name, description, start_date, deadline, status, collaborators: collaboratorIds }),
  });

  export const fetchGroupProjects = (groupId) =>
  apiFetch(`groups/${groupId}/projects`);

  export const fetchProjectDetails = (projectId) =>
  apiFetch(`projects/${projectId}`);

// Eliminar proyecto
export const deleteProject = (projectId) =>
  apiFetch(`projects/${projectId}`, {
    method: "DELETE",
  });