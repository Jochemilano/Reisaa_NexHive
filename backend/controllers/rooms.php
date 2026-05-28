<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Request.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/verifyToken.php';

class RoomsController {

    /**
     * POST /api/rooms
     */
    public function createRoom() {
        $createdBy = verifyToken();

        $name = Request::getParam('name');
        $type = Request::getParam('type');
        $userIds = Request::getParam('userIds') ?: [];
        $avatar = Request::getParam('avatar');

        if (!$type || !is_array($userIds)) {
            Response::error("Datos incompletos", 400);
        }

        if (count($userIds) > 2) {
            if (count($userIds) > 10) {
                Response::error("Máximo 10 participantes permitidos", 400);
            }
            if (!$name) {
                Response::error("Nombre de grupo requerido", 400);
            }
        }

        try {
            $db = Database::getConnection();
            $db->beginTransaction();

            $isGroup = count($userIds) > 2;
            $roomType = $isGroup ? 'group' : $type;

            $stmtRoom = $db->prepare("INSERT INTO rooms (name, type, owner_id, avatar) VALUES (?, ?, ?, ?)");
            $stmtRoom->execute([$name ?: null, $roomType, $createdBy, $avatar ?: null]);
            $roomId = (int)$db->lastInsertId();

            // Vincular participantes
            $stmtPart = $db->prepare("INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)");
            foreach ($userIds as $uid) {
                $stmtPart->execute([$roomId, (int)$uid]);
            }

            $db->commit();
            Response::json(["success" => true, "roomId" => $roomId]);

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en createRoom PHP: " . $e->getMessage());
            Response::error("Error creando sala", 500);
        }
    }

    /**
     * PUT /api/rooms/:roomId/read
     */
    public function markRoomRead($params) {
        $userId = verifyToken();
        $roomId = (int)$params['roomId'];

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("UPDATE room_participants SET last_read_at = NOW() WHERE room_id = ? AND user_id = ?");
            $stmt->execute([$roomId, $userId]);

            if ($stmt->rowCount() === 0) {
                Response::error("No se encontró participación en la sala", 404);
            }

            Response::json(["success" => true]);

        } catch (Exception $e) {
            error_log("❌ Error en markRoomRead PHP: " . $e->getMessage());
            Response::error("Error marcando como leído", 500);
        }
    }

    /**
     * GET /api/rooms
     */
    public function getRooms() {
        $userId = verifyToken();

        try {
            $db = Database::getConnection();

            // Listar salas con contadores de participantes y mensajes no leídos
            $stmt = $db->prepare("
                SELECT 
                    r.id, 
                    r.name, 
                    r.type,
                    r.avatar,
                    (SELECT COUNT(*) FROM room_participants WHERE room_id = r.id) as participant_count,
                    (SELECT COUNT(*) FROM messages m 
                     WHERE m.room_id = r.id 
                       AND m.sender_id != ? 
                       AND (rp.last_read_at IS NULL OR m.created_at > rp.last_read_at)
                    ) as unread_count
                FROM rooms r
                JOIN room_participants rp ON r.id = rp.room_id
                LEFT JOIN channels c ON (r.id = c.chat_room_id OR r.id = c.voice_room_id)
                WHERE rp.user_id = ? AND c.id IS NULL AND (r.type = 'chat' OR r.type = 'group')
            ");
            $stmt->execute([$userId, $userId]);
            $rooms = $stmt->fetchAll();

            $enrichedRooms = [];
            foreach ($rooms as $room) {
                $roomId = (int)$room['id'];
                $partCount = (int)$room['participant_count'];
                $isDM = ($room['type'] === 'chat') && ($room['name'] && strpos($room['name'], 'chat-') === 0);

                if ($isDM && $partCount === 2) {
                    // Buscar los datos de la otra persona en el DM
                    $stmtOther = $db->prepare("
                        SELECT u.id, u.name, u.profile_pic 
                        FROM room_participants rp
                        JOIN users u ON u.id = rp.user_id
                        WHERE rp.room_id = ? AND rp.user_id != ?
                    ");
                    $stmtOther->execute([$roomId, $userId]);
                    $other = $stmtOther->fetch();

                    if ($other) {
                        $enrichedRooms[] = array_merge($room, [
                            "id" => $roomId,
                            "participant_count" => $partCount,
                            "unread_count" => (int)$room['unread_count'],
                            "display_name" => $other['name'],
                            "display_avatar" => $other['profile_pic'],
                            "display_id" => (int)$other['id']
                        ]);
                        continue;
                    }
                }

                $enrichedRooms[] = array_merge($room, [
                    "id" => $roomId,
                    "participant_count" => $partCount,
                    "unread_count" => (int)$room['unread_count'],
                    "display_name" => $room['name'] ?: "Grupo sin nombre",
                    "display_avatar" => $room['avatar']
                ]);
            }

            Response::json($enrichedRooms);

        } catch (Exception $e) {
            error_log("❌ Error en getRooms PHP: " . $e->getMessage());
            Response::error("Error obteniendo salas", 500);
        }
    }

    /**
     * GET /api/rooms/unread/total
     */
    public function getTotalUnread() {
        $userId = verifyToken();

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("
                SELECT m.room_id, COUNT(*) as unread_count
                FROM messages m
                JOIN room_participants rp ON m.room_id = rp.room_id
                WHERE rp.user_id = ? 
                  AND m.sender_id != ?
                  AND (rp.last_read_at IS NULL OR m.created_at > rp.last_read_at)
                GROUP BY m.room_id
            ");
            $stmt->execute([$userId, $userId]);
            $counts = $stmt->fetchAll();

            $byRoom = [];
            $total = 0;
            foreach ($counts as $c) {
                $rid = (int)$c['room_id'];
                $uc = (int)$c['unread_count'];
                $byRoom[$rid] = $uc;
                $total += $uc;
            }

            Response::json([
                "total" => $total,
                "byRoom" => (object)$byRoom
            ]);

        } catch (Exception $e) {
            error_log("❌ Error en getTotalUnread PHP: " . $e->getMessage());
            Response::error("Error obteniendo total de no leídos", 500);
        }
    }

    /**
     * GET /api/rooms/:roomId/messages
     */
    public function getRoomMessages($params) {
        $userId = verifyToken();
        $roomId = (int)$params['roomId'];

        try {
            $db = Database::getConnection();

            // Validar acceso
            $stmtCheck = $db->prepare("SELECT 1 FROM room_participants WHERE room_id = ? AND user_id = ?");
            $stmtCheck->execute([$roomId, $userId]);
            if (count($stmtCheck->fetchAll()) === 0) {
                Response::error("No autorizado", 403);
            }

            // Consultar historial
            $stmtMsg = $db->prepare("
                SELECT 
                    m.id, 
                    m.room_id, 
                    m.sender_id, 
                    m.type, 
                    m.content,
                    m.caption,
                    m.file_size,
                    m.edited,
                    m.reply_to_id,
                    m.created_at,
                    u.name AS sender_name,
                    u.profile_pic AS profile_pic,
                    rm.content  AS reply_content,
                    rm.caption  AS reply_caption,
                    ru.name     AS reply_sender_name,
                    CASE WHEN f.id IS NULL THEN 0 ELSE 1 END AS favorite
                FROM messages m
                JOIN users u ON u.id = m.sender_id
                LEFT JOIN messages rm ON rm.id = m.reply_to_id
                LEFT JOIN users    ru ON ru.id = rm.sender_id
                LEFT JOIN favorites f ON f.message_id = m.id AND f.user_id = ?
                WHERE m.room_id = ?
                ORDER BY m.created_at ASC
            ");
            $stmtMsg->execute([$userId, $roomId]);
            $messages = $stmtMsg->fetchAll();

            // Consultar lecturas de otros participantes
            $stmtReads = $db->prepare("SELECT user_id, last_read_at FROM room_participants WHERE room_id = ?");
            $stmtReads->execute([$roomId]);
            $reads = $stmtReads->fetchAll();

            $otherReaders = array_filter($reads, function($r) use ($userId) {
                return (int)$r['user_id'] !== $userId;
            });

            $messagesWithRead = [];
            foreach ($messages as $msg) {
                $isSentByMe = (int)$msg['sender_id'] === $userId;
                
                $read = false;
                if ($isSentByMe && count($otherReaders) > 0) {
                    $read = true;
                    foreach ($otherReaders as $reader) {
                        if (!$reader['last_read_at'] || strtotime($reader['last_read_at']) < strtotime($msg['created_at'])) {
                            $read = false;
                            break;
                        }
                    }
                }

                $messagesWithRead[] = array_merge($msg, [
                    "id" => (int)$msg['id'],
                    "room_id" => (int)$msg['room_id'],
                    "sender_id" => (int)$msg['sender_id'],
                    "edited" => (int)$msg['edited'],
                    "reply_to_id" => $msg['reply_to_id'] ? (int)$msg['reply_to_id'] : null,
                    "favorite" => (int)$msg['favorite'],
                    "read" => $read
                ]);
            }

            Response::json($messagesWithRead);

        } catch (Exception $e) {
            error_log("❌ Error en getRoomMessages PHP: " . $e->getMessage());
            Response::error("Error obteniendo mensajes", 500);
        }
    }

    /**
     * POST /api/messages
     */
    public function createMessage() {
        $senderId = verifyToken();

        $roomId = Request::getParam('roomId');
        $type = Request::getParam('type');
        $content = Request::getParam('content');
        $caption = Request::getParam('caption');
        $replyToId = Request::getParam('replyToId');
        $fileSize = Request::getParam('fileSize');

        if (!$roomId || !$type || !$content) {
            Response::error("Datos incompletos", 400);
        }

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("
                INSERT INTO messages (room_id, sender_id, type, content, caption, file_size, reply_to_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $roomId, $senderId, $type, $content, 
                $caption ?: null, $fileSize ?: null, $replyToId ?: null
            ]);
            $messageId = (int)$db->lastInsertId();

            Response::json(["success" => true, "messageId" => $messageId]);

        } catch (Exception $e) {
            error_log("❌ Error en createMessage PHP: " . $e->getMessage());
            Response::error("Error enviando mensaje", 500);
        }
    }

    /**
     * GET /api/rooms/:roomId/details
     */
    public function getRoomDetails($params) {
        $userId = verifyToken();
        $roomId = (int)$params['roomId'];

        try {
            $db = Database::getConnection();

            $stmtRoom = $db->prepare("SELECT id, name, avatar, type, owner_id FROM rooms WHERE id = ?");
            $stmtRoom->execute([$roomId]);
            $room = $stmtRoom->fetch();

            if (!$room) {
                Response::error("Sala no encontrada", 404);
            }

            $stmtPart = $db->prepare("
                SELECT u.id, u.name, u.profile_pic
                FROM room_participants rp
                JOIN users u ON u.id = rp.user_id
                WHERE rp.room_id = ?
            ");
            $stmtPart->execute([$roomId]);
            $participants = $stmtPart->fetchAll();

            Response::json(array_merge($room, [
                "id" => (int)$room['id'],
                "owner_id" => $room['owner_id'] ? (int)$room['owner_id'] : null,
                "members" => $participants
            ]));

        } catch (Exception $e) {
            error_log("❌ Error en getRoomDetails PHP: " . $e->getMessage());
            Response::error("Error obteniendo detalles de la sala", 500);
        }
    }

    /**
     * GET /api/rooms/:roomId/participants
     */
    public function getRoomParticipants($params) {
        $userId = verifyToken();
        $roomId = (int)$params['roomId'];

        try {
            $db = Database::getConnection();

            $stmtCheck = $db->prepare("SELECT 1 FROM room_participants WHERE room_id = ? AND user_id = ?");
            $stmtCheck->execute([$roomId, $userId]);
            if (count($stmtCheck->fetchAll()) === 0) {
                Response::error("No autorizado", 403);
            }

            $stmtPart = $db->prepare("
                SELECT u.id, u.name, u.profile_pic
                FROM room_participants rp
                JOIN users u ON u.id = rp.user_id
                WHERE rp.room_id = ? AND rp.user_id != ?
            ");
            $stmtPart->execute([$roomId, $userId]);
            $participants = $stmtPart->fetchAll();

            Response::json($participants);

        } catch (Exception $e) {
            error_log("❌ Error en getRoomParticipants PHP: " . $e->getMessage());
            Response::error("Error obteniendo participantes", 500);
        }
    }

    /**
     * GET /api/rooms/direct/:otherUserId
     */
    public function getDirectRoom($params) {
        $userId = verifyToken();
        $otherUserId = (int)$params['otherUserId'];

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("
                SELECT r.id
                FROM rooms r
                WHERE (r.name = ? OR r.name = ?)
                  AND (
                    SELECT COUNT(*) FROM room_participants WHERE room_id = r.id
                  ) = 2
                LIMIT 1
            ");
            $stmt->execute([
                "chat-{$userId}-{$otherUserId}",
                "chat-{$otherUserId}-{$userId}"
            ]);
            $row = $stmt->fetch();

            if (!$row) {
                Response::error("No existe sala directa", 404);
            }

            Response::json(["roomId" => (int)$row['id']]);

        } catch (Exception $e) {
            error_log("❌ Error en getDirectRoom PHP: " . $e->getMessage());
            Response::error("Error buscando sala", 500);
        }
    }

    /**
     * PUT /api/messages/:messageId
     */
    public function updateMessage($params) {
        $userId = verifyToken();
        $messageId = (int)$params['messageId'];
        $content = Request::getParam('content');

        if (!$content) {
            Response::error("Contenido vacío", 400);
        }

        try {
            $db = Database::getConnection();

            $stmtCheck = $db->prepare("SELECT 1 FROM messages WHERE id = ? AND sender_id = ?");
            $stmtCheck->execute([$messageId, $userId]);
            if (count($stmtCheck->fetchAll()) === 0) {
                Response::error("No autorizado", 403);
            }

            $stmtUpdate = $db->prepare("UPDATE messages SET content = ?, edited = 1 WHERE id = ?");
            $stmtUpdate->execute([$content, $messageId]);

            Response::json(["success" => true]);

        } catch (Exception $e) {
            error_log("❌ Error en updateMessage PHP: " . $e->getMessage());
            Response::error("Error editando mensaje", 500);
        }
    }

    /**
     * DELETE /api/messages/:messageId
     */
    public function deleteMessage($params) {
        $userId = verifyToken();
        $messageId = (int)$params['messageId'];

        try {
            $db = Database::getConnection();

            $stmtCheck = $db->prepare("SELECT 1 FROM messages WHERE id = ? AND sender_id = ?");
            $stmtCheck->execute([$messageId, $userId]);
            if (count($stmtCheck->fetchAll()) === 0) {
                Response::error("No autorizado", 403);
            }

            $stmtDel = $db->prepare("DELETE FROM messages WHERE id = ?");
            $stmtDel->execute([$messageId]);

            Response::json(["success" => true]);

        } catch (Exception $e) {
            error_log("❌ Error en deleteMessage PHP: " . $e->getMessage());
            Response::error("Error borrando mensaje", 500);
        }
    }

    /**
     * PATCH /api/rooms/:roomId/transfer
     */
    public function transferRoom($params) {
        $userId = verifyToken();
        $roomId = (int)$params['roomId'];
        $newOwnerId = Request::getParam('newOwnerId');

        try {
            $db = Database::getConnection();

            // Propiedad
            $stmtCheck = $db->prepare("SELECT 1 FROM rooms WHERE id = ? AND owner_id = ?");
            $stmtCheck->execute([$roomId, $userId]);
            if (count($stmtCheck->fetchAll()) === 0) {
                Response::error("No eres owner de la sala", 403);
            }

            // Membresía
            $stmtMem = $db->prepare("SELECT 1 FROM room_participants WHERE user_id = ? AND room_id = ?");
            $stmtMem->execute([$newOwnerId, $roomId]);
            if (count($stmtMem->fetchAll()) === 0) {
                Response::error("El usuario no pertenece a la sala", 400);
            }

            $stmtUpdate = $db->prepare("UPDATE rooms SET owner_id = ? WHERE id = ?");
            $stmtUpdate->execute([$newOwnerId, $roomId]);

            Response::json(["success" => true, "message" => "Ownership transferido"]);

        } catch (Exception $e) {
            error_log("❌ Error en transferRoom PHP: " . $e->getMessage());
            Response::error("Error al transferir ownership", 500);
        }
    }

    /**
     * POST /api/rooms/:roomId/leave
     */
    public function leaveRoom($params) {
        $userId = verifyToken();
        $roomId = (int)$params['roomId'];

        try {
            $db = Database::getConnection();

            $stmtRoom = $db->prepare("SELECT owner_id FROM rooms WHERE id = ?");
            $stmtRoom->execute([$roomId]);
            $room = $stmtRoom->fetch();

            if (!$room) {
                Response::error("Sala no encontrada", 404);
            }

            if ((int)$room['owner_id'] === $userId) {
                Response::error("No puedes salirte siendo el owner. Transfiere el mando o elimina la sala.", 400);
            }

            $stmtDel = $db->prepare("DELETE FROM room_participants WHERE room_id = ? AND user_id = ?");
            $stmtDel->execute([$roomId, $userId]);

            if ($stmtDel->rowCount() === 0) {
                Response::error("No eres participante de esta sala", 404);
            }

            Response::json(["success" => true, "message" => "Has salido de la sala"]);

        } catch (Exception $e) {
            error_log("❌ Error en leaveRoom PHP: " . $e->getMessage());
            Response::error("Error al salir de la sala", 500);
        }
    }

    /**
     * DELETE /api/rooms/:roomId
     */
    public function deleteRoom($params) {
        $userId = verifyToken();
        $roomId = (int)$params['roomId'];

        try {
            $db = Database::getConnection();

            $stmtRoom = $db->prepare("SELECT owner_id FROM rooms WHERE id = ?");
            $stmtRoom->execute([$roomId]);
            $room = $stmtRoom->fetch();

            if (!$room) {
                Response::error("Sala no encontrada", 404);
            }

            $stmtUser = $db->prepare("SELECT rol FROM users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $user = $stmtUser->fetch();
            $isAdmin = $user && (strtolower($user['rol']) === 'admin');

            $isOwner = (int)$room['owner_id'] === $userId;

            if (!$isOwner && !$isAdmin) {
                Response::error("No tienes permisos para eliminar esta sala", 403);
            }

            $db->beginTransaction();

            $stmtDelMsg = $db->prepare("DELETE FROM messages WHERE room_id = ?");
            $stmtDelMsg->execute([$roomId]);

            $stmtDelPart = $db->prepare("DELETE FROM room_participants WHERE room_id = ?");
            $stmtDelPart->execute([$roomId]);

            $stmtDelRoom = $db->prepare("DELETE FROM rooms WHERE id = ?");
            $stmtDelRoom->execute([$roomId]);

            $db->commit();
            Response::json(["success" => true, "message" => "Sala eliminada correctamente"]);

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en deleteRoom PHP: " . $e->getMessage());
            Response::error("Error al eliminar la sala", 500);
        }
    }
}
