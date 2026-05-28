<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Request.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/verifyToken.php';

class RealtimeController {

    /**
     * GET /api/sse
     * Flujo continuo de eventos para tiempo real.
     */
    public function sse() {
        // Deshabilitar límites de tiempo y buffers para mantener conexión abierta
        @set_time_limit(0);
        if (function_exists('ini_set')) {
            @ini_set('max_execution_time', '0');
            @ini_set('zlib.output_compression', '0');
        }

        // Cabeceras obligatorias para Server-Sent Events
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');
        header('X-Accel-Buffering: no'); // Evita buffer en Nginx/Apache

        // Limpiar buffers de salida previos
        while (ob_get_level() > 0) {
            ob_end_flush();
        }
        ob_implicit_flush(true);

        // Extraer el token de los parámetros query (EventSource no soporta cabeceras personalizadas de forma nativa)
        $token = $_GET['token'] ?? '';
        if (!$token) {
            echo "event: error\n";
            echo "data: " . json_encode(["message" => "Token no proporcionado"]) . "\n\n";
            exit();
        }

        require_once __DIR__ . '/../helpers/JWTHelper.php';
        $decoded = JWTHelper::verify($token);
        if (!$decoded || !isset($decoded['id'])) {
            echo "event: error\n";
            echo "data: " . json_encode(["message" => "Token inválido o expirado"]) . "\n\n";
            exit();
        }

        $userId = (int)$decoded['id'];
        $db = Database::getConnection();

        // Registrar al usuario en línea actualizando last_seen
        $db->prepare("UPDATE users SET last_seen = NOW() WHERE id = ?")->execute([$userId]);

        $lastPingTime = time();
        $lastSeenUpdateTime = time();
        $lastOnlineIds = [];

        // Bucle infinito de transmisión de eventos
        while (true) {
            if (connection_aborted()) {
                break;
            }

            // Actualizar last_seen periódicamente (cada 5 segundos)
            if (time() - $lastSeenUpdateTime >= 5) {
                $db->prepare("UPDATE users SET last_seen = NOW() WHERE id = ?")->execute([$userId]);
                $lastSeenUpdateTime = time();
            }

            // Enviar un ping de keep-alive periódicamente (cada 10 segundos)
            if (time() - $lastPingTime >= 10) {
                echo ": ping\n\n";
                $lastPingTime = time();
            }

            // Limpieza de miembros inactivos en salas de voz (que se desconectaron de forma abrupta)
            // Ejecutado por cualquier conexión activa cada 5 segundos
            if (time() - $lastSeenUpdateTime >= 5 || !isset($cleanupDone)) {
                $cleanupDone = true;
                
                // Obtener participantes de sala de voz cuyo last_seen es mayor a 15 segundos o es nulo
                $staleStmt = $db->query("
                    SELECT vm.voice_room_id, vm.user_id 
                    FROM voice_room_members vm
                    JOIN users u ON vm.user_id = u.id
                    WHERE u.last_seen < NOW() - INTERVAL 15 SECOND OR u.last_seen IS NULL
                ");
                $staleMembers = $staleStmt->fetchAll();
                
                foreach ($staleMembers as $sm) {
                    $db->prepare("DELETE FROM voice_room_members WHERE voice_room_id = ? AND user_id = ?")
                       ->execute([$sm['voice_room_id'], $sm['user_id']]);
                    
                    // Notificar a los otros miembros del canal de voz
                    $othersStmt = $db->prepare("SELECT user_id FROM voice_room_members WHERE voice_room_id = ?");
                    $othersStmt->execute([$sm['voice_room_id']]);
                    $others = $othersStmt->fetchAll();
                    
                    foreach ($others as $other) {
                        $db->prepare("
                            INSERT INTO realtime_events (sender_id, receiver_id, event_type, payload) 
                            VALUES (?, ?, 'voice-user-left', ?)
                        ")->execute([$sm['user_id'], $other['user_id'], json_encode(['userId' => $sm['user_id']])]);
                    }
                }
            }

            // Consultar y transmitir nuevos eventos pendientes para este usuario
            $stmt = $db->prepare("
                SELECT id, sender_id, event_type, payload 
                FROM realtime_events 
                WHERE receiver_id = ? AND processed = 0 
                ORDER BY id ASC
            ");
            $stmt->execute([$userId]);
            $events = $stmt->fetchAll();

            if (count($events) > 0) {
                foreach ($events as $event) {
                    echo "event: " . $event['event_type'] . "\n";
                    echo "data: " . $event['payload'] . "\n\n";

                    // Marcar evento como procesado
                    $db->prepare("UPDATE realtime_events SET processed = 1 WHERE id = ?")->execute([$event['id']]);
                }
            }

            // Detección en tiempo real de cambios en la lista de usuarios online
            $onlineStmt = $db->query("
                SELECT id, name, profile_pic 
                FROM users 
                WHERE last_seen >= NOW() - INTERVAL 15 SECOND
            ");
            $onlineUsers = $onlineStmt->fetchAll();
            $currentOnlineIds = array_column($onlineUsers, 'id');
            sort($currentOnlineIds);

            if ($currentOnlineIds !== $lastOnlineIds) {
                echo "event: usuarios:lista\n";
                echo "data: " . json_encode($onlineUsers) . "\n\n";
                $lastOnlineIds = $currentOnlineIds;
            }

            // Esperar 0.5 segundos para no saturar CPU
            usleep(500000);
        }
    }

    /**
     * POST /api/emit
     * Recibe señales/eventos emitidos por el frontend y los distribuye a los destinatarios.
     */
    public function emit() {
        $senderId = verifyToken();

        $event = Request::getParam('event');
        $data  = Request::getParam('data');

        if (!$event) {
            Response::error("Evento no especificado", 400);
        }

        try {
            $db = Database::getConnection();

            switch ($event) {
                case 'join-room':
                case 'leave-room':
                    // Acciones de control de socket nativas de Express. En SSE son no-op o lógicas menores.
                    Response::json(["success" => true]);
                    break;

                case 'typing':
                case 'stop-typing':
                    $roomId = $data['roomId'] ?? null;
                    if (!$roomId) Response::error("roomId requerido", 400);

                    // Obtener nombre del usuario que escribe
                    $userStmt = $db->prepare("SELECT name FROM users WHERE id = ?");
                    $userStmt->execute([$senderId]);
                    $userData = $userStmt->fetch();
                    $userName = $userData['name'] ?? 'Usuario';

                    // Encontrar participantes
                    $partStmt = $db->prepare("SELECT user_id FROM room_participants WHERE room_id = ? AND user_id != ?");
                    $partStmt->execute([$roomId, $senderId]);
                    $participants = $partStmt->fetchAll();

                    $eventType = ($event === 'typing') ? 'user-typing' : 'user-stop-typing';
                    $payload = ($event === 'typing') 
                        ? ['roomId' => $roomId, 'userId' => $senderId, 'userName' => $userName]
                        : ['roomId' => $roomId, 'userId' => $senderId];

                    $stmtInsert = $db->prepare("
                        INSERT INTO realtime_events (sender_id, receiver_id, event_type, payload) 
                        VALUES (?, ?, ?, ?)
                    ");

                    foreach ($participants as $p) {
                        $stmtInsert->execute([$senderId, (int)$p['user_id'], $eventType, json_encode($payload)]);
                    }

                    Response::json(["success" => true]);
                    break;

                case 'mark-room-read':
                    $roomId = $data['roomId'] ?? null;
                    if (!$roomId) Response::error("roomId requerido", 400);

                    // Actualizar DB
                    $updateStmt = $db->prepare("UPDATE room_participants SET last_read_at = NOW() WHERE room_id = ? AND user_id = ?");
                    $updateStmt->execute([$roomId, $senderId]);

                    // Notificar a los demás participantes
                    $partStmt = $db->prepare("SELECT user_id FROM room_participants WHERE room_id = ? AND user_id != ?");
                    $partStmt->execute([$roomId, $senderId]);
                    $participants = $partStmt->fetchAll();

                    $payload = [
                        'roomId' => $roomId,
                        'userId' => $senderId,
                        'lastReadAt' => date('c')
                    ];

                    $stmtInsert = $db->prepare("
                        INSERT INTO realtime_events (sender_id, receiver_id, event_type, payload) 
                        VALUES (?, ?, 'room-read', ?)
                    ");

                    foreach ($participants as $p) {
                        $stmtInsert->execute([$senderId, (int)$p['user_id'], json_encode($payload)]);
                    }

                    Response::json(["success" => true]);
                    break;

                case 'send-message':
                    $roomId    = $data['roomId'] ?? null;
                    $type      = $data['type'] ?? null;
                    $content   = $data['content'] ?? null;
                    $caption   = $data['caption'] ?? null;
                    $fileSize  = $data['fileSize'] ?? null;
                    $replyToId = $data['replyToId'] ?? null;

                    if (!$roomId || !$type || !$content) {
                        Response::error("Datos incompletos para mensaje", 400);
                    }

                    // 1. Guardar mensaje en DB
                    $stmtMsg = $db->prepare("
                        INSERT INTO messages (room_id, sender_id, type, content, caption, file_size, reply_to_id) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ");
                    $stmtMsg->execute([
                        $roomId, $senderId, $type, $content,
                        $caption ?: null, $fileSize ?: null, $replyToId ?: null
                    ]);
                    $messageId = (int)$db->lastInsertId();

                    // 2. Obtener metadata del emisor
                    $stmtUser = $db->prepare("SELECT name, profile_pic FROM users WHERE id = ?");
                    $stmtUser->execute([$senderId]);
                    $user = $stmtUser->fetch();

                    // 3. Gestionar respuesta (reply) si existe
                    $replyContent = null;
                    $replyCaption = null;
                    $replySenderName = null;

                    if ($replyToId) {
                        $stmtReplyMsg = $db->prepare("SELECT content, caption, sender_id FROM messages WHERE id = ?");
                        $stmtReplyMsg->execute([$replyToId]);
                        $replyMsgRows = $stmtReplyMsg->fetch();

                        if ($replyMsgRows) {
                            $replyContent = $replyMsgRows['content'];
                            $replyCaption = $replyMsgRows['caption'];

                            $stmtReplyUser = $db->prepare("SELECT name FROM users WHERE id = ?");
                            $stmtReplyUser->execute([$replyMsgRows['sender_id']]);
                            $replyUser = $stmtReplyUser->fetch();
                            $replySenderName = $replyUser['name'] ?? "Usuario";
                        }
                    }

                    $messageData = [
                        "id" => $messageId,
                        "room_id" => (int)$roomId,
                        "sender_id" => $senderId,
                        "sender_name" => $user['name'] ?? "Usuario",
                        "sender_avatar" => $user['profile_pic'] ?? null,
                        "type" => $type,
                        "content" => $content,
                        "caption" => $caption ?: null,
                        "file_size" => $fileSize ?: null,
                        "reply_to_id" => $replyToId ? (int)$replyToId : null,
                        "reply_content" => $replyContent,
                        "reply_caption" => $replyCaption,
                        "reply_sender_name" => $replySenderName,
                        "created_at" => date('Y-m-d H:i:s'),
                        "edited" => 0,
                        "favorite" => 0,
                        "read" => false
                    ];

                    // 4. Obtener todos los participantes del room
                    $stmtParts = $db->prepare("SELECT user_id FROM room_participants WHERE room_id = ?");
                    $stmtParts->execute([$roomId]);
                    $participants = $stmtParts->fetchAll();

                    // 5. Insertar eventos en realtime_events
                    $stmtEvent = $db->prepare("
                        INSERT INTO realtime_events (sender_id, receiver_id, event_type, payload) 
                        VALUES (?, ?, ?, ?)
                    ");

                    foreach ($participants as $p) {
                        $pid = (int)$p['user_id'];
                        // Emitir receive-message a todos (incluyendo el sender para actualizar su UI de forma consistente)
                        $stmtEvent->execute([$senderId, $pid, 'receive-message', json_encode($messageData)]);

                        // Emitir new-message-notification solo a los demás participantes (para los contadores de no leídos)
                        if ($pid !== $senderId) {
                            $stmtEvent->execute([
                                $senderId, 
                                $pid, 
                                'new-message-notification', 
                                json_encode(['room_id' => (int)$roomId, 'sender_id' => $senderId])
                            ]);
                        }
                    }

                    Response::json(["success" => true, "messageId" => $messageId]);
                    break;

                case 'get-online-users':
                    // Retornar lista de conectados solo para el solicitante
                    $onlineStmt = $db->query("
                        SELECT id, name, profile_pic 
                        FROM users 
                        WHERE last_seen >= NOW() - INTERVAL 15 SECOND
                    ");
                    $onlineUsers = $onlineStmt->fetchAll();

                    $stmtEvent = $db->prepare("
                        INSERT INTO realtime_events (sender_id, receiver_id, event_type, payload) 
                        VALUES (?, ?, 'usuarios:lista', ?)
                    ");
                    $stmtEvent->execute([$senderId, $senderId, json_encode($onlineUsers)]);

                    Response::json(["success" => true]);
                    break;

                case 'call-user':
                    $toUserId = (int)($data['toUserId'] ?? 0);
                    $offer    = $data['offer'] ?? null;
                    if (!$toUserId || !$offer) Response::error("toUserId y offer requeridos", 400);

                    // Obtener nombre del llamador
                    $stmtUser = $db->prepare("SELECT name FROM users WHERE id = ?");
                    $stmtUser->execute([$senderId]);
                    $user = $stmtUser->fetch();
                    $fromUserName = $user['name'] ?? "Usuario";

                    $payload = [
                        "fromUserId" => $senderId,
                        "fromUserName" => $fromUserName,
                        "offer" => $offer
                    ];

                    $db->prepare("
                        INSERT INTO realtime_events (sender_id, receiver_id, event_type, payload) 
                        VALUES (?, ?, 'incoming-call', ?)
                    ")->execute([$senderId, $toUserId, json_encode($payload)]);

                    Response::json(["success" => true]);
                    break;

                case 'call-accepted':
                    $toUserId = (int)($data['toUserId'] ?? 0);
                    $answer   = $data['answer'] ?? null;
                    if (!$toUserId || !$answer) Response::error("toUserId y answer requeridos", 400);

                    $payload = [
                        "fromUserId" => $senderId,
                        "answer" => $answer
                    ];

                    $db->prepare("
                        INSERT INTO realtime_events (sender_id, receiver_id, event_type, payload) 
                        VALUES (?, ?, 'call-accepted', ?)
                    ")->execute([$senderId, $toUserId, json_encode($payload)]);

                    Response::json(["success" => true]);
                    break;

                case 'call-declined':
                case 'call-ended':
                    $toUserId = (int)($data['toUserId'] ?? 0);
                    if (!$toUserId) Response::error("toUserId requerido", 400);

                    $db->prepare("
                        INSERT INTO realtime_events (sender_id, receiver_id, event_type, payload) 
                        VALUES (?, ?, ?, '{}')
                    ")->execute([$senderId, $toUserId, $event]);

                    Response::json(["success" => true]);
                    break;

                case 'join-voice-room':
                    $voiceRoomId = $data['voiceRoomId'] ?? null;
                    if (!$voiceRoomId) Response::error("voiceRoomId requerido", 400);

                    // Limpieza proactiva de inactivos
                    $db->query("
                        DELETE FROM voice_room_members 
                        WHERE user_id IN (
                            SELECT id FROM users 
                            WHERE last_seen < NOW() - INTERVAL 15 SECOND OR last_seen IS NULL
                        )
                    ");

                    // Obtener nombre del participante
                    $stmtUser = $db->prepare("SELECT name FROM users WHERE id = ?");
                    $stmtUser->execute([$senderId]);
                    $user = $stmtUser->fetch();
                    $userName = $user['name'] ?? "Usuario";

                    // Insertar membresía en el canal de voz
                    $db->prepare("
                        INSERT INTO voice_room_members (voice_room_id, user_id, user_name) 
                        VALUES (?, ?, ?) 
                        ON DUPLICATE KEY UPDATE joined_at = NOW()
                    ")->execute([$voiceRoomId, $senderId, $userName]);

                    // 1. Obtener miembros existentes
                    $stmtMembers = $db->prepare("SELECT user_id, user_name FROM voice_room_members WHERE voice_room_id = ? AND user_id != ?");
                    $stmtMembers->execute([$voiceRoomId, $senderId]);
                    $existing = $stmtMembers->fetchAll();

                    $existingUsers = [];
                    foreach ($existing as $ex) {
                        $existingUsers[] = [
                            "userId" => (int)$ex['user_id'],
                            "userName" => $ex['user_name']
                        ];
                    }

                    // Enviar lista de usuarios presentes al nuevo integrante
                    $db->prepare("
                        INSERT INTO realtime_events (sender_id, receiver_id, event_type, payload) 
                        VALUES (?, ?, 'voice-room-users', ?)
                    ")->execute([$senderId, $senderId, json_encode(['users' => $existingUsers])]);

                    // 2. Notificar a los miembros actuales que entró uno nuevo
                    $stmtEvent = $db->prepare("
                        INSERT INTO realtime_events (sender_id, receiver_id, event_type, payload) 
                        VALUES (?, ?, 'voice-user-joined', ?)
                    ");
                    foreach ($existing as $ex) {
                        $stmtEvent->execute([
                            $senderId, 
                            (int)$ex['user_id'], 
                            json_encode(['userId' => $senderId, 'userName' => $userName])
                        ]);
                    }

                    Response::json(["success" => true]);
                    break;

                case 'leave-voice-room':
                    $voiceRoomId = $data['voiceRoomId'] ?? null;
                    if (!$voiceRoomId) Response::error("voiceRoomId requerido", 400);

                    // Eliminar de voice_room_members
                    $db->prepare("DELETE FROM voice_room_members WHERE voice_room_id = ? AND user_id = ?")
                       ->execute([$voiceRoomId, $senderId]);

                    // Obtener otros participantes de la sala de voz
                    $stmtOthers = $db->prepare("SELECT user_id FROM voice_room_members WHERE voice_room_id = ?");
                    $stmtOthers->execute([$voiceRoomId]);
                    $others = $stmtOthers->fetchAll();

                    // Notificar a todos que el usuario se retiró
                    $stmtEvent = $db->prepare("
                        INSERT INTO realtime_events (sender_id, receiver_id, event_type, payload) 
                        VALUES (?, ?, 'voice-user-left', ?)
                    ");
                    foreach ($others as $other) {
                        $stmtEvent->execute([
                            $senderId, 
                            (int)$other['user_id'], 
                            json_encode(['userId' => $senderId])
                        ]);
                    }

                    Response::json(["success" => true]);
                    break;

                case 'voice-signal':
                    $toUserId = (int)($data['toUserId'] ?? 0);
                    $signal   = $data['signal'] ?? null;
                    if (!$toUserId || !$signal) Response::error("toUserId y signal requeridos", 400);

                    $payload = [
                        "fromUserId" => $senderId,
                        "signal" => $signal
                    ];

                    $db->prepare("
                        INSERT INTO realtime_events (sender_id, receiver_id, event_type, payload) 
                        VALUES (?, ?, 'voice-signal', ?)
                    ")->execute([$senderId, $toUserId, json_encode($payload)]);

                    Response::json(["success" => true]);
                    break;

                default:
                    Response::error("Evento no reconocido: {$event}", 400);
            }

        } catch (Exception $e) {
            error_log("❌ Error en emit PHP: " . $e->getMessage());
            Response::error("Error procesando emisión de evento", 500);
        }
    }
}
