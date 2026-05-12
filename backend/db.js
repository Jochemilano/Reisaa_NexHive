require("dotenv").config();
const mysql = require("mysql2/promise");

/**
 * NOTE: Configuración del Pool de conexiones de MySQL.
 * Se utiliza un pool para gestionar eficientemente múltiples conexiones concurrentes
 * y evitar la sobrecarga de abrir/cerrar conexiones en cada solicitud.
 */
const db = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "nexhive",
  port: process.env.DB_PORT || 3306,

  waitForConnections: true,
  connectionLimit: 10, // Máximo de conexiones simultáneas en el pool
  connectTimeout: 10000 // Tiempo de espera máximo para establecer conexión (10s)
});

/**
 * NOTE: Prueba de conexión inicial.
 * Verifica que el servidor de base de datos sea accesible al arrancar la aplicación.
 * Útil para detectar errores de configuración o servicios apagados (como MySQL en XAMPP).
 */
async function testConnection() {
  try {
    const connection = await db.getConnection();

    console.log("✅ MySQL conectado correctamente");
    console.log("📍 Host:", connection.config.host);
    console.log("📦 Base de datos:", connection.config.database);
    console.log("🔌 Puerto:", connection.config.port);

    connection.release(); // Importante: Liberar la conexión de vuelta al pool

  } catch (err) {
    // Manejo detallado de errores comunes de conexión
    console.error("❌ Error conectando a MySQL");
    console.error("Código:", err.code);
    console.error("Mensaje:", err.message);

    if (err.code === "ETIMEDOUT") {
      console.error("→ MySQL tardó demasiado en responder");
      console.error("→ Verifica que XAMPP tenga MySQL iniciado");
    }

    if (err.code === "ECONNREFUSED") {
      console.error("→ MySQL rechazó la conexión");
      console.error("→ Verifica el puerto (3306 o 3307)");
    }

    if (err.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("→ Usuario o contraseña incorrectos");
    }

    if (err.code === "ER_BAD_DB_ERROR") {
      console.error("→ La base de datos no existe");
    }
  }
}

testConnection();

module.exports = db;