const mysql = require('mysql2');

console.log('🔍 Probando conexión a XAMPP MySQL...\n');

// Probar diferentes configuraciones
const configs = [
  { host: '127.0.0.1', port: 3306, name: 'Config 1: 127.0.0.1:3306' },
  { host: '127.0.0.1', port: 3307, name: 'Config 2: 127.0.0.1:3307' },
  { host: 'localhost', port: 3306, name: 'Config 3: localhost:3306' },
  { host: 'localhost', port: 3307, name: 'Config 4: localhost:3307' }
];

configs.forEach((config, index) => {
  const db = mysql.createConnection({
    host: config.host,
    port: config.port,
    user: 'root',
    password: '',
    connectTimeout: 5000
  });

  db.connect((err) => {
    if (err) {
      console.log(`❌ ${config.name}: ${err.code}`);
    } else {
      console.log(`✅ ${config.name}: ¡FUNCIONA!`);
      
      // Probar si existe la base de datos
      db.query("SHOW DATABASES LIKE 'nexhive'", (err2, results) => {
        if (err2) {
          console.log(`   ⚠️  Error verificando base de datos`);
        } else if (results.length > 0) {
          console.log(`   ✅ Base de datos 'nexhive' existe`);
        } else {
          console.log(`   ⚠️  Base de datos 'nexhive' NO existe`);
        }
        db.end();
      });
    }
  });
});

setTimeout(() => {
  console.log('\n🏁 Pruebas completadas');
  process.exit(0);
}, 8000);