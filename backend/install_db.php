<?php

require_once __DIR__ . '/config/database.php';

try {
    $db = Database::getConnection();
    echo "🔍 Conectado correctamente a la base de datos...\n";

    // 1. Crear tabla realtime_events
    $sqlEvents = "CREATE TABLE IF NOT EXISTS realtime_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        payload TEXT NOT NULL,
        processed TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_receiver_processed (receiver_id, processed)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $db->exec($sqlEvents);
    echo "✅ Tabla 'realtime_events' creada o verificada correctamente.\n";

    // 2. Crear tabla voice_room_members
    $sqlVoiceMembers = "CREATE TABLE IF NOT EXISTS voice_room_members (
        voice_room_id VARCHAR(100) NOT NULL,
        user_id INT NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (voice_room_id, user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $db->exec($sqlVoiceMembers);
    echo "✅ Tabla 'voice_room_members' creada o verificada correctamente.\n";

    // 3. Añadir columna last_seen a la tabla users si no existe
    $checkColumn = $db->query("SHOW COLUMNS FROM users LIKE 'last_seen'");
    $columnExists = $checkColumn->fetch();

    if (!$columnExists) {
        $db->exec("ALTER TABLE users ADD COLUMN last_seen TIMESTAMP NULL DEFAULT NULL;");
        echo "✅ Columna 'last_seen' añadida a la tabla 'users'.\n";
    } else {
        echo "ℹ️ La columna 'last_seen' ya existe en la tabla 'users'.\n";
    }

    echo "\n🎉 ¡Instalación de base de datos completada con éxito!\n";

} catch (Exception $e) {
    echo "❌ ERROR: No se pudo instalar la base de datos: " . $e->getMessage() . "\n";
}

