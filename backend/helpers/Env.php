<?php

class Env {
    /**
     * Carga las variables de entorno desde un archivo .env
     *
     * @param string $path Ruta absoluta o relativa al archivo .env
     */
    public static function load($path) {
        if (!file_exists($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            // Ignorar comentarios
            $line = trim($line);
            if (empty($line) || strpos($line, '#') === 0) {
                continue;
            }

            // Separar llave y valor
            if (strpos($line, '=') !== false) {
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim($value);

                // Eliminar comillas dobles o simples que envuelvan al valor
                if (preg_match('/^"([^"]*)"$/', $value, $matches)) {
                    $value = $matches[1];
                } elseif (preg_match('/^\'([^\']*)\'$/', $value, $matches)) {
                    $value = $matches[1];
                }

                // Definir en putenv, $_ENV y $_SERVER
                putenv(sprintf('%s=%s', $name, $value));
                $_ENV[$name] = $value;
                $_SERVER[$name] = $value;
            }
        }
    }
}
