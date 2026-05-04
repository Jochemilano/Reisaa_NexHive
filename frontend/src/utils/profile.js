import { apiFetch } from "./apiClient";

export const getProfile = () => apiFetch("profile");

export const updateProfilePic = (profile_pic) =>
  apiFetch("profile/picture", {
    method: "PUT",
    body: JSON.stringify({ profile_pic }),
  });

export const updateProfile = (data) =>
  apiFetch("profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });