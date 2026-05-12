const db = require("../db"); // importa tu pool mysql2/promise

/**
 * NOTE: Helper asíncrono para ejecutar sentencias SQL.
 * Encapsula la obtención de la conexión y la extracción de resultados (rows) del array de respuesta.
 */
async function query(sql, params = []) {
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (err) {
    console.error("DB ERROR:", err);
    throw err; // El error se propaga para ser manejado por el controlador (status 500)
  }
}

module.exports = query;