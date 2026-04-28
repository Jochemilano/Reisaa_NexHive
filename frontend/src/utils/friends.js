import { apiFetch } from "./apiClient";

export const fetchFriends = () => apiFetch("friends");

export const addFriend = (friendId) => 
  apiFetch("friends", {
    method: "POST",
    body: JSON.stringify({ friendId }),
  });
