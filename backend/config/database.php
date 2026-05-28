<?php

require_once __DIR__ . '/../helpers/Env.php';

// Cargar variables de entorno del archivo .env
Env::load(dirname(__DIR__) . '/.env');

class Database {
    private static $connection = null;

    /**
     * Retorna una instancia única de conexión PDO (Patrón Singleton)
     * utilizando persistencia de conexiones para rendimiento óptimo.
     *
     * @return PDO
     */
    public static function getConnection() {
        if (self::$connection === null) {
            $host     = getenv('DB_HOST') ?: '127.0.0.1';
            $user     = getenv('DB_USER') ?: 'root';
            $password = getenv('DB_PASSWORD') ?: '';
            $dbName   = getenv('DB_NAME') ?: 'nexhive';
            $port     = getenv('DB_PORT') ?: '3306';

            $dsn = "mysql:host={$host};dbname={$dbName};port={$port};charset=utf8mb4";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false, // Consultas preparadas reales para evitar inyección SQL
                PDO::ATTR_PERSISTENT         => true,  // Conexión persistente simulando pool en cPanel
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ];

            try {
                self::$connection = new PDO($dsn, $user, $password, $options);
            } catch (PDOException $e) {
                // Registrar error y retornar respuesta HTTP 500
                error_log("❌ Error de Conexión PDO: " . $e->getMessage());
                http_response_code(500);
                header('Content-Type: application/json');
                echo json_encode([
                    "message" => "Error de conexión con la base de datos de NexHive.",
                    "error" => $e->getCode()
                ]);
                exit();
            }
        }

        return self::$connection;
    }
}
