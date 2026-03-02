const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: '127.0.0.1',        // ✅ Importante: usar IP, no 'localhost'
  user: 'root',              // ✅ Usuario por defecto de XAMPP
  password: '',              // ✅ Sin contraseña por defecto en XAMPP
  database: 'nexhive',
  port: 3306,                // ✅ O 3307 si es el caso
  socketPath: undefined,     // ✅ Forzar TCP en lugar de socket Unix
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error conectando a XAMPP MySQL:', err.message);
    console.error('Código de error:', err.code);
    
    if (err.code === 'ETIMEDOUT') {
      console.error('→ Verifica que MySQL esté corriendo en XAMPP');
      console.error('→ Prueba cambiando el puerto a 3307');
    }
    if (err.code === 'ECONNREFUSED') {
      console.error('→ MySQL rechazó la conexión. Verifica el puerto.');
    }
  } else {
    console.log('✅ Conectado a XAMPP MySQL');
    console.log('Host:', connection.config.host);
    console.log('Puerto:', connection.config.port);
    connection.release();
  }
});

module.exports = db;