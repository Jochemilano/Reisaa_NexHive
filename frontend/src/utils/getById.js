const API_URL = "http://localhost:3000/api/getById";

export const getById = async (tabla, id) => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tabla, id }),
  });

  if (!response.ok) {
    throw new Error("Error al consultar datos");
  }

  return response.json();
};