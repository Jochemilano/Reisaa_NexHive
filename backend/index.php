<?php

// ============================================================
// FRONT CONTROLLER - NexHive PHP Backend
// ============================================================

// Cargar variables de entorno
require_once __DIR__ . '/helpers/Env.php';
Env::load(__DIR__ . '/.env');

// Cargar middleware CORS (debe ir antes que cualquier salida)
require_once __DIR__ . '/middleware/cors.php';

// Cargar el enrutador
require_once __DIR__ . '/helpers/Router.php';
require_once __DIR__ . '/helpers/Request.php';
require_once __DIR__ . '/helpers/Response.php';

$router = new Router();

// ============================================================
// RUTA RAÍZ
// ============================================================
$router->get('/', function() {
    Response::json(["message" => "Servidor PHP corriendo ✅"]);
});

// ============================================================
// RUTAS DE AUTENTICACIÓN
// ============================================================
$router->post('/api/register',        'AuthController@register');
$router->post('/api/verify-code',     'AuthController@verifyCode');
$router->post('/api/login',           'AuthController@login');
$router->post('/api/forgot-password', 'AuthController@forgotPassword');
$router->post('/api/reset-password',  'AuthController@resetPassword');
$router->get('/api/perfil',           'AuthController@perfil');

// ============================================================
// RUTAS DE PERFIL Y USUARIOS
// ============================================================
$router->get('/api/profile',          'ProfileController@getProfile');
$router->get('/api/users',            'ProfileController@getUsers');
$router->get('/api/users/:id',        'ProfileController@getUserById');
$router->get('/api/allusers',         'ProfileController@getAllUsers');
$router->put('/api/profile',          'ProfileController@updateProfile');
$router->put('/api/profile/picture',  'ProfileController@updateProfilePicture');

// ============================================================
// RUTAS DE AMIGOS
// ============================================================
$router->get('/api/friends',                    'FriendsController@getFriends');
$router->get('/api/friends/requests',           'FriendsController@getFriendRequests');
$router->get('/api/users/search',               'FriendsController@searchUsers');
$router->post('/api/friends',                   'FriendsController@sendFriendRequest');
$router->post('/api/friends/accept',            'FriendsController@acceptFriendRequest');
$router->delete('/api/friends/reject/:requestId', 'FriendsController@rejectFriendRequest');

// ============================================================
// RUTAS DE GRUPOS
// ============================================================
$router->post('/api/groups',                     'GroupsController@createGroup');
$router->get('/api/groups',                      'GroupsController@getGroups');
$router->get('/api/groups/:groupId/details',     'GroupsController@getGroupDetails');
$router->get('/api/groups/:groupId/users',       'GroupsController@getGroupUsers');
$router->patch('/api/groups/:groupId',           'GroupsController@updateGroup');
$router->patch('/api/groups/:groupId/transfer',  'GroupsController@transferGroup');
$router->delete('/api/groups/:groupId',          'GroupsController@deleteGroup');
$router->post('/api/groups/:groupId/leave',      'GroupsController@leaveGroup');

// ============================================================
// RUTAS DE PROYECTOS
// ============================================================
$router->post('/api/projects',                        'ProjectsController@createProject');
$router->get('/api/groups/:groupId/projects',         'ProjectsController@getGroupProjects');
$router->get('/api/projects/:projectId',              'ProjectsController@getProjectDetails');
$router->get('/api/projects/:projectId/users',        'ProjectsController@getProjectUsers');
$router->patch('/api/projects/:projectId',            'ProjectsController@updateProject');
$router->patch('/api/projects/:projectId/transfer',   'ProjectsController@transferProject');
$router->delete('/api/projects/:projectId',           'ProjectsController@deleteProject');

// ============================================================
// RUTAS DE ACTIVIDADES
// ============================================================
$router->get('/api/my-activities',                  'ActivitiesController@getMyActivities');
$router->post('/api/activities',                    'ActivitiesController@createActivity');
$router->get('/api/activities/:id',                 'ActivitiesController@getActivityDetails');
$router->get('/api/activities/:id/users',           'ActivitiesController@getActivityUsers');
$router->put('/api/activities/:id',                 'ActivitiesController@updateActivity');
$router->patch('/api/activities/:id/transfer',      'ActivitiesController@transferActivity');
$router->delete('/api/activities/:id',              'ActivitiesController@deleteActivity');

// ============================================================
// RUTAS DE EVENTOS (CALENDARIO)
// ============================================================
$router->post('/api/events',      'EventsController@createEvent');
$router->get('/api/events',       'EventsController@getEvents');
$router->put('/api/events/:id',   'EventsController@updateEvent');
$router->delete('/api/events/:id','EventsController@deleteEvent');

// ============================================================
// RUTAS DE SALAS Y MENSAJES
// ============================================================
$router->post('/api/rooms',                           'RoomsController@createRoom');
$router->get('/api/rooms',                            'RoomsController@getRooms');
$router->get('/api/rooms/unread/total',               'RoomsController@getTotalUnread');
$router->get('/api/rooms/direct/:otherUserId',        'RoomsController@getDirectRoom');
$router->put('/api/rooms/:roomId/read',               'RoomsController@markRoomRead');
$router->get('/api/rooms/:roomId/messages',           'RoomsController@getRoomMessages');
$router->get('/api/rooms/:roomId/details',            'RoomsController@getRoomDetails');
$router->get('/api/rooms/:roomId/participants',       'RoomsController@getRoomParticipants');
$router->patch('/api/rooms/:roomId/transfer',         'RoomsController@transferRoom');
$router->post('/api/rooms/:roomId/leave',             'RoomsController@leaveRoom');
$router->delete('/api/rooms/:roomId',                 'RoomsController@deleteRoom');

$router->post('/api/messages',                        'RoomsController@createMessage');
$router->put('/api/messages/:messageId',              'RoomsController@updateMessage');
$router->delete('/api/messages/:messageId',           'RoomsController@deleteMessage');

// ============================================================
// RUTAS DE FAVORITOS
// ============================================================
$router->post('/api/messages/:messageId/favorite',    'FavoritesController@toggleFavorite');
$router->get('/api/users/:userId/favorites',          'FavoritesController@getFavorites');

// ============================================================
// RUTAS DE PREFERENCIAS
// ============================================================
$router->put('/api/preferences',  'PreferencesController@updatePreferences');
$router->get('/api/preferences',  'PreferencesController@getPreferences');

// ============================================================
// RUTAS DE TIEMPO REAL (SSE)
// ============================================================
$router->get('/api/sse',   'RealtimeController@sse');
$router->post('/api/emit',  'RealtimeController@emit');

// ============================================================
// RUTA DE SUBIDA DE ARCHIVOS
// ============================================================
$router->post('/upload', function() {
    require_once __DIR__ . '/middleware/verifyToken.php';

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        Response::error("Archivo no recibido", 400);
    }

    $file = $_FILES['file'];

    // Filtro de seguridad por tipo MIME
    $allowedTypes = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip', 'application/x-zip-compressed', 'application/x-rar-compressed'
    ];

    if (!in_array($file['type'], $allowedTypes)) {
        Response::error("Tipo de archivo no permitido", 400);
    }

    // Generar nombre único
    $uniqueName = time() . '-' . basename($file['name']);
    $destination = __DIR__ . '/uploads/' . $uniqueName;

    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        Response::error("Error al guardar el archivo", 500);
    }

    Response::json([
        "url" => "/uploads/" . $uniqueName,
        "size" => $file['size']
    ]);
});

// ============================================================
// SERVIR ARCHIVOS ESTÁTICOS DE /uploads
// ============================================================
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$scriptDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
if ($scriptDir !== '/' && $scriptDir !== '\\') {
    $relativePath = substr($requestUri, strlen($scriptDir));
} else {
    $relativePath = $requestUri;
}

if (preg_match('#^/uploads/(.+)$#', $relativePath, $matches)) {
    $filePath = __DIR__ . '/uploads/' . $matches[1];
    if (file_exists($filePath)) {
        $mimeType = mime_content_type($filePath);
        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
        exit();
    }
}

// ============================================================
// DESPACHAR LA SOLICITUD
// ============================================================
$router->dispatch();
