<?php

class Response {
    /**
     * Envía una respuesta estructurada en formato JSON al cliente
     *
     * @param mixed $data Datos a serializar en JSON
     * @param int $statusCode Código de estado HTTP (200, 201, etc.)
     */
    public static function json($data, $statusCode = 200) {
        // Asegurar que no se ha enviado salida previa para no romper cabeceras
        if (!headers_sent()) {
            http_response_code($statusCode);
            header('Content-Type: application/json; charset=utf-8');
        }

        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit();
    }

    /**
     * Envía un mensaje de error estandarizado en formato JSON
     *
     * @param string $message Mensaje explicativo del error
     * @param int $statusCode Código de estado HTTP de error (400, 401, 403, 404, 500)
     */
    public static function error($message, $statusCode = 500) {
        self::json([
            "message" => $message
        ], $statusCode);
    }
}
