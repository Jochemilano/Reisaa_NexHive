<?php

class Request {
    private static $body = null;

    /**
     * Obtiene todos los campos del cuerpo de la petición (JSON o Form)
     *
     * @return array
     */
    public static function getBody() {
        if (self::$body === null) {
            $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';

            if (strpos($contentType, 'application/json') !== false) {
                $rawInput = file_get_contents('php://input');
                self::$body = json_decode($rawInput, true) ?: [];
            } else {
                // Soporte para peticiones estándar form-urlencoded / multipart
                self::$body = array_merge($_POST, $_FILES);
            }
        }

        return self::$body;
    }

    /**
     * Obtiene un parámetro específico del cuerpo de la petición
     *
     * @param string $key Clave del parámetro
     * @param mixed $default Valor por defecto si no existe
     * @return mixed
     */
    public static function getParam($key, $default = null) {
        $body = self::getBody();
        return $body[$key] ?? $default;
    }

    /**
     * Obtiene un parámetro de la consulta URL (Query Params, $_GET)
     *
     * @param string $key Clave de la variable
     * @param mixed $default Valor por defecto
     * @return mixed
     */
    public static function getQuery($key, $default = null) {
        return $_GET[$key] ?? $default;
    }

    /**
     * Obtiene una cabecera de la petición actual
     *
     * @param string $headerName Nombre de la cabecera
     * @return string|null
     */
    public static function getHeader($headerName) {
        $formattedName = 'HTTP_' . strtoupper(str_replace('-', '_', $headerName));
        if (isset($_SERVER[$formattedName])) {
            return $_SERVER[$formattedName];
        }
        if (isset($_SERVER[$headerName])) {
            return $_SERVER[$headerName];
        }
        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            foreach ($headers as $key => $val) {
                if (strtolower($key) === strtolower($headerName)) {
                    return $val;
                }
            }
        }
        return null;
    }
}
