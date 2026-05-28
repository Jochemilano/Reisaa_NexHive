<?php

// Obtener origen de la petición
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = false;

if (empty($origin)) {
    // Petición directa (ej. Postman, llamadas curl entre servidores, móvil)
    $allowed = true;
} else {
    $allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ];
    
    $prodOrigin = getenv('ALLOWED_ORIGIN');
    if ($prodOrigin) {
        $allowedOrigins[] = $prodOrigin;
    }

    // Comprobación exacta
    foreach ($allowedOrigins as $o) {
        if ($o === $origin) {
            $allowed = true;
            break;
        }
    }

    // Comprobación por regex de redes locales 192.168.x.x o 10.x.x.x si no se validó antes
    if (!$allowed) {
        if (preg_match('#^http://192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$#', $origin) ||
            preg_match('#^http://10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$#', $origin)) {
            $allowed = true;
        }
    }
}

// Inyectar cabeceras CORS
if ($allowed) {
    header("Access-Control-Allow-Origin: " . ($origin ?: '*'));
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
    header("Access-Control-Allow-Credentials: true");
}

// Si es una petición de preflight (OPTIONS), retornar un estado 200 y salir inmediatamente
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
