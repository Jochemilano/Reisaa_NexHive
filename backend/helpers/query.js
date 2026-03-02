const db = require("../db"); // importa tu pool mysql2/promise

// helper para queries
async function query(sql, params = []) {
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (err) {
    console.error("DB ERROR:", err);
    throw err; // deja que el endpoint decida cómo responder
  }
}

module.exports = query;