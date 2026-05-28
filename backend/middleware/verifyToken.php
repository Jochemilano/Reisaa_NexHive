<?php

require_once __DIR__ . '/../helpers/Request.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/JWTHelper.php';

/**
 * Middleware para validar el Bearer JWT en rutas protegidas.
 * Si el token es inválido o no existe, detiene la ejecución retornando
 * el código HTTP correspondiente y un mensaje en JSON.
 *
 * @return int ID del usuario autenticado
 */
function verifyToken() {
    $authHeader = Request::getHeader('Authorization');

    if (!$authHeader) {
        Response::error("Token no proporcionado", 401);
    }

    // El formato esperado es "Bearer <token>"
    $parts = explode(' ', $authHeader);
    if (count($parts) !== 2 || strtolower($parts[0]) !== 'bearer') {
        Response::error("Formato de token inválido", 401);
    }

    $token = $parts[1];
    $decoded = JWTHelper::verify($token);

    if (!$decoded || !isset($decoded['id'])) {
        Response::error("Token inválido o expirado", 403);
    }

    // Inyectar el ID de usuario decodificado en el ámbito global de la petición
    $GLOBALS['userId'] = (int)$decoded['id'];

    return $GLOBALS['userId'];
}
