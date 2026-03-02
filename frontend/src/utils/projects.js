// projectsAPI.js
import { apiFetch } from "./apiClient";

export const createProject = (name, description, groupId) =>
  apiFetch("projects", {
    method: "POST",
    body: JSON.stringify({ name, description, groupId }),
  });

export const getProjects = (groupId) =>
  apiFetch(`api/groups/${groupId}/projects`); 