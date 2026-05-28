<?php

class Router {
    private $routes = [];

    /**
     * Registra una ruta para el método GET
     */
    public function get($path, $handler) {
        $this->addRoute('GET', $path, $handler);
    }

    /**
     * Registra una ruta para el método POST
     */
    public function post($path, $handler) {
        $this->addRoute('POST', $path, $handler);
    }

    /**
     * Registra una ruta para el método PUT
     */
    public function put($path, $handler) {
        $this->addRoute('PUT', $path, $handler);
    }

    /**
     * Registra una ruta para el método PATCH
     */
    public function patch($path, $handler) {
        $this->addRoute('PATCH', $path, $handler);
    }

    /**
     * Registra una ruta para el método DELETE
     */
    public function delete($path, $handler) {
        $this->addRoute('DELETE', $path, $handler);
    }

    /**
     * Agrega una ruta de forma interna al listado
     */
    private function addRoute($method, $path, $handler) {
        // Normalizar la ruta removiendo diagonales extremas
        $path = '/' . trim($path, '/');
        $this->routes[] = [
            'method'  => $method,
            'path'    => $path,
            'handler' => $handler
        ];
    }

    /**
     * Despacha la solicitud HTTP actual haciendo match con las rutas registradas.
     */
    public function dispatch() {
        $requestMethod = $_SERVER['REQUEST_METHOD'];
        $requestUri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

        // Si el script está en una subcarpeta (ej. /backend/index.php), remover la subcarpeta de la URI
        $scriptName = dirname($_SERVER['SCRIPT_NAME']);
        if ($scriptName !== '/' && $scriptName !== '\\') {
            $scriptName = str_replace('\\', '/', $scriptName);
            $requestUri = substr($requestUri, strlen($scriptName));
        }

        $requestUri = '/' . trim($requestUri, '/');

        // Manejar solicitud preflight de CORS (OPTIONS)
        if ($requestMethod === 'OPTIONS') {
            http_response_code(200);
            exit();
        }

        foreach ($this->routes as $route) {
            if ($route['method'] !== $requestMethod) {
                continue;
            }

            // Convertir /api/groups/:groupId/projects a regex
            // El patrón buscará parámetros dinámicos con formato :nombreParametro
            $pattern = preg_replace('/:([a-zA-Z0-9_]+)/', '(?P<$1>[^/]+)', $route['path']);
            $pattern = '#^' . $pattern . '$#';

            if (preg_match($pattern, $requestUri, $matches)) {
                // Filtrar solo las llaves string (los parámetros capturados por regex)
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);

                // Llamar al handler. Soporta funciones anónimas o formato "Controlador@metodo"
                $handler = $route['handler'];
                if (is_callable($handler)) {
                    call_user_func_array($handler, [$params]);
                } elseif (is_string($handler) && strpos($handler, '@') !== false) {
                    list($controllerName, $methodName) = explode('@', $handler);
                    
                    // Incluir el archivo del controlador automáticamente
                    $controllerFile = __DIR__ . '/../controllers/' . strtolower(str_replace('Controller', '', $controllerName)) . '.php';
                    if (file_exists($controllerFile)) {
                        require_once $controllerFile;
                        if (class_exists($controllerName)) {
                            $controllerInstance = new $controllerName();
                            call_user_func_array([$controllerInstance, $methodName], [$params]);
                        } else {
                            $this->sendError(500, "Error Interno: Clase {$controllerName} no encontrada.");
                        }
                    } else {
                        $this->sendError(500, "Error Interno: Archivo controlador no encontrado para {$controllerName}.");
                    }
                }
                return;
            }
        }

        // Si no hace match con ninguna ruta, retornar 404
        $this->sendError(404, "Endpoint no encontrado o método no permitido ({$requestMethod} {$requestUri})");
    }

    private function sendError($code, $message) {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(["message" => $message]);
        exit();
    }
}
