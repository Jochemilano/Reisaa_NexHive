<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Request.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/verifyToken.php';

class GroupsController {

    /**
     * POST /api/groups
     */
    public function createGroup() {
        $ownerId = verifyToken();
        $name = Request::getParam('name');
        $collaborators = Request::getParam('collaborators') ?: [];
        $avatar = Request::getParam('avatar');

        if (!$name) {
            Response::error("Nombre requerido", 400);
        }

        try {
            $db = Database::getConnection();
            $db->beginTransaction();

            // 1. Insertar el grupo base
            $stmtGroup = $db->prepare("INSERT INTO groups (name, owner_id, avatar) VALUES (?, ?, ?)");
            $stmtGroup->execute([$name, $ownerId, $avatar ?: null]);
            $groupId = (int)$db->lastInsertId();

            // 2. Registrar al dueño como miembro primario
            $stmtMember = $db->prepare("INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)");
            $stmtMember->execute([$ownerId, $groupId]);

            // 3. Registro masivo de colaboradores
            $filteredCollaborators = [];
            if (is_array($collaborators) && count($collaborators) > 0) {
                // Evitar duplicar al dueño
                $filtered = array_filter($collaborators, function($id) use ($ownerId) {
                    return (int)$id !== $ownerId;
                });

                if (count($filtered) > 0) {
                    $placeholders = [];
                    $values = [];
                    foreach ($filtered as $id) {
                        $placeholders[] = '(?, ?)';
                        $values[] = (int)$id;
                        $values[] = $groupId;
                        $filteredCollaborators[] = (int)$id;
                    }
                    $sqlBulk = "INSERT INTO user_groups (user_id, group_id) VALUES " . implode(', ', $placeholders);
                    $stmtBulk = $db->prepare($sqlBulk);
                    $stmtBulk->execute($values);
                }
            }

            $allUsers = array_merge([$ownerId], $filteredCollaborators);

            // 4. Generación de salas por defecto para el grupo
            $stmtRoom = $db->prepare("INSERT INTO rooms (name, type, owner_id) VALUES (?, ?, ?)");
            
            $stmtRoom->execute(["general-chat", "chat", $ownerId]);
            $chatRoomId = (int)$db->lastInsertId();

            $stmtRoom->execute(["general-voice", "voice", $ownerId]);
            $voiceRoomId = (int)$db->lastInsertId();

            // 5. Sincronización de participantes en las salas
            if (count($allUsers) > 0) {
                // Participantes del chat
                $chatPlaceholders = [];
                $chatValues = [];
                foreach ($allUsers as $id) {
                    $chatPlaceholders[] = '(?, ?)';
                    $chatValues[] = $chatRoomId;
                    $chatValues[] = $id;
                }
                $sqlChatBulk = "INSERT INTO room_participants (room_id, user_id) VALUES " . implode(', ', $chatPlaceholders);
                $stmtChatBulk = $db->prepare($sqlChatBulk);
                $stmtChatBulk->execute($chatValues);

                // Participantes de voz
                $voicePlaceholders = [];
                $voiceValues = [];
                foreach ($allUsers as $id) {
                    $voicePlaceholders[] = '(?, ?)';
                    $voiceValues[] = $voiceRoomId;
                    $voiceValues[] = $id;
                }
                $sqlVoiceBulk = "INSERT INTO room_participants (room_id, user_id) VALUES " . implode(', ', $voicePlaceholders);
                $stmtVoiceBulk = $db->prepare($sqlVoiceBulk);
                $stmtVoiceBulk->execute($voiceValues);
            }

            // 6. Vinculación final del canal principal del grupo
            $stmtChannel = $db->prepare("INSERT INTO channels (group_id, voice_room_id, chat_room_id) VALUES (?, ?, ?)");
            $stmtChannel->execute([$groupId, $voiceRoomId, $chatRoomId]);

            $db->commit();

            Response::json([
                "id" => $groupId,
                "name" => $name,
                "owner_id" => $ownerId,
                "chat_room_id" => $chatRoomId,
                "voice_room_id" => $voiceRoomId,
                "collaborators" => $collaborators
            ]);

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en createGroup PHP: " . $e->getMessage());
            Response::error("Error al crear grupo", 500);
        }
    }

    /**
     * GET /api/groups
     */
    public function getGroups() {
        $userId = verifyToken();

        try {
            $db = Database::getConnection();

            // Retorna grupos calculando contador de no leídos comparando con la tabla de mensajería
            $stmt = $db->prepare("
                SELECT 
                    g.id, 
                    g.name, 
                    g.owner_id, 
                    g.avatar, 
                    c.chat_room_id,
                    (SELECT COUNT(*) FROM messages m
                     JOIN room_participants rp ON m.room_id = rp.room_id
                     WHERE m.room_id = c.chat_room_id 
                       AND rp.user_id = ? 
                       AND m.sender_id != ?
                       AND (rp.last_read_at IS NULL OR m.created_at > rp.last_read_at)
                    ) as unread_count
                FROM groups g
                JOIN user_groups ug ON g.id = ug.group_id
                LEFT JOIN channels c ON c.group_id = g.id
                WHERE ug.user_id = ?
            ");
            $stmt->execute([$userId, $userId, $userId]);
            $results = $stmt->fetchAll();

            // Convertir contador a entero
            foreach ($results as &$row) {
                $row['unread_count'] = (int)$row['unread_count'];
            }

            Response::json($results);

        } catch (Exception $e) {
            error_log("❌ Error en getGroups PHP: " . $e->getMessage());
            Response::error("Error al traer grupos", 500);
        }
    }

    /**
     * GET /api/groups/:groupId/details
     */
    public function getGroupDetails($params) {
        $userId = verifyToken();
        $groupId = (int)$params['groupId'];

        try {
            $db = Database::getConnection();

            // Verificar pertenencia al grupo
            $stmtCheck = $db->prepare("SELECT 1 FROM user_groups WHERE user_id = ? AND group_id = ?");
            $stmtCheck->execute([$userId, $groupId]);
            if (count($stmtCheck->fetchAll()) === 0) {
                Response::error("No pertenece al grupo", 403);
            }

            // Información del grupo
            $stmtInfo = $db->prepare("
                SELECT g.id, g.name, g.avatar, g.owner_id, u.name AS owner_name
                FROM groups g
                JOIN users u ON u.id = g.owner_id
                WHERE g.id = ?
            ");
            $stmtInfo->execute([$groupId]);
            $groupInfo = $stmtInfo->fetch();

            if (!$groupInfo) {
                Response::error("Grupo no encontrado", 404);
            }

            // Canales
            $stmtChannels = $db->prepare("SELECT id, chat_room_id, voice_room_id FROM channels WHERE group_id = ?");
            $stmtChannels->execute([$groupId]);
            $channels = $stmtChannels->fetchAll();

            // Miembros
            $stmtMembers = $db->prepare("
                SELECT u.id, u.name, u.profile_pic
                FROM users u
                JOIN user_groups ug ON u.id = ug.user_id
                WHERE ug.group_id = ?
            ");
            $stmtMembers->execute([$groupId]);
            $members = $stmtMembers->fetchAll();

            Response::json(array_merge($groupInfo, [
                "channels" => $channels,
                "members" => $members
            ]));

        } catch (Exception $e) {
            error_log("❌ Error en getGroupDetails PHP: " . $e->getMessage());
            Response::error("Error al traer detalles del grupo", 500);
        }
    }

    /**
     * GET /api/groups/:groupId/users
     */
    public function getGroupUsers($params) {
        $userId = verifyToken();
        $groupId = (int)$params['groupId'];

        try {
            $db = Database::getConnection();

            $stmtCheck = $db->prepare("SELECT 1 FROM user_groups WHERE user_id = ? AND group_id = ?");
            $stmtCheck->execute([$userId, $groupId]);
            if (count($stmtCheck->fetchAll()) === 0) {
                Response::error("No pertenece al grupo", 403);
            }

            $stmtUsers = $db->prepare("
                SELECT u.id, u.name
                FROM users u
                JOIN user_groups ug ON u.id = ug.user_id
                WHERE ug.group_id = ?
            ");
            $stmtUsers->execute([$groupId]);
            $users = $stmtUsers->fetchAll();

            Response::json($users);

        } catch (Exception $e) {
            error_log("❌ Error en getGroupUsers PHP: " . $e->getMessage());
            Response::error("Error al traer usuarios del grupo", 500);
        }
    }

    /**
     * PATCH /api/groups/:groupId
     */
    public function updateGroup($params) {
        $userId = verifyToken();
        $groupId = (int)$params['groupId'];

        $name = Request::getParam('name');
        $avatar = Request::getParam('avatar');
        $collaborators = Request::getParam('collaborators');

        try {
            $db = Database::getConnection();

            // Validar existencia
            $stmtGroup = $db->prepare("SELECT owner_id FROM groups WHERE id = ?");
            $stmtGroup->execute([$groupId]);
            $group = $stmtGroup->fetch();

            if (!$group) {
                Response::error("Grupo no encontrado", 404);
            }

            // Validar rol de admin/dueño
            $stmtUser = $db->prepare("SELECT rol FROM users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $user = $stmtUser->fetch();

            $isAdmin = $user && (strtolower($user['rol']) === 'admin');
            $isOwner = (int)$group['owner_id'] === $userId;

            if (!$isOwner && !$isAdmin) {
                Response::error("No tienes permisos (No eres owner ni admin)", 403);
            }

            $db->beginTransaction();

            // Actualizar datos del grupo
            $stmtUpdate = $db->prepare("
                UPDATE groups 
                SET name = COALESCE(?, name),
                    avatar = COALESCE(?, avatar)
                WHERE id = ?
            ");
            $stmtUpdate->execute([$name, $avatar, $groupId]);

            // Sincronizar miembros si se especifica la lista
            if (is_array($collaborators)) {
                $stmtDel = $db->prepare("DELETE FROM user_groups WHERE group_id = ? AND user_id != ?");
                $stmtDel->execute([$groupId, $userId]);

                // Canales
                $stmtChan = $db->prepare("SELECT chat_room_id, voice_room_id FROM channels WHERE group_id = ?");
                $stmtChan->execute([$groupId]);
                $channel = $stmtChan->fetch();

                if ($channel) {
                    $chatRoomId = (int)$channel['chat_room_id'];
                    $voiceRoomId = (int)$channel['voice_room_id'];

                    $stmtDelPart = $db->prepare("DELETE FROM room_participants WHERE room_id IN (?, ?) AND user_id != ?");
                    $stmtDelPart->execute([$chatRoomId, $voiceRoomId, $userId]);

                    // Filtrar duplicados del dueño
                    $filtered = array_filter($collaborators, function($id) use ($userId) {
                        return (int)$id !== $userId;
                    });

                    if (count($filtered) > 0) {
                        // Re-asociar miembros
                        $groupPlaceholders = [];
                        $chatPlaceholders = [];
                        $voicePlaceholders = [];
                        $groupValues = [];
                        $chatValues = [];
                        $voiceValues = [];

                        foreach ($filtered as $id) {
                            $groupPlaceholders[] = '(?, ?)';
                            $groupValues[] = (int)$id;
                            $groupValues[] = $groupId;

                            $chatPlaceholders[] = '(?, ?)';
                            $chatValues[] = $chatRoomId;
                            $chatValues[] = (int)$id;

                            $voicePlaceholders[] = '(?, ?)';
                            $voiceValues[] = $voiceRoomId;
                            $voiceValues[] = (int)$id;
                        }

                        $stmtBulkGroup = $db->prepare("INSERT INTO user_groups (user_id, group_id) VALUES " . implode(', ', $groupPlaceholders));
                        $stmtBulkGroup->execute($groupValues);

                        $stmtBulkChat = $db->prepare("INSERT INTO room_participants (room_id, user_id) VALUES " . implode(', ', $chatPlaceholders));
                        $stmtBulkChat->execute($chatValues);

                        $stmtBulkVoice = $db->prepare("INSERT INTO room_participants (room_id, user_id) VALUES " . implode(', ', $voicePlaceholders));
                        $stmtBulkVoice->execute($voiceValues);
                    }
                }
            }

            $db->commit();
            Response::json(["message" => "Grupo actualizado"]);

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en updateGroup PHP: " . $e->getMessage());
            Response::error("Error al actualizar grupo", 500);
        }
    }

    /**
     * PATCH /api/groups/:groupId/transfer
     */
    public function transferGroup($params) {
        $userId = verifyToken();
        $groupId = (int)$params['groupId'];
        $newOwnerId = Request::getParam('newOwnerId');

        try {
            $db = Database::getConnection();

            // Validar pertenencia y propiedad
            $stmtGroup = $db->prepare("SELECT owner_id FROM groups WHERE id = ? AND owner_id = ?");
            $stmtGroup->execute([$groupId, $userId]);
            if (count($stmtGroup->fetchAll()) === 0) {
                Response::error("No eres owner del grupo", 403);
            }

            // Validar que el nuevo dueño pertenezca al grupo
            $stmtMem = $db->prepare("SELECT 1 FROM user_groups WHERE user_id = ? AND group_id = ?");
            $stmtMem->execute([$newOwnerId, $groupId]);
            if (count($stmtMem->fetchAll()) === 0) {
                Response::error("El usuario no pertenece al grupo", 400);
            }

            $stmtUpdate = $db->prepare("UPDATE groups SET owner_id = ? WHERE id = ?");
            $stmtUpdate->execute([$newOwnerId, $groupId]);

            Response::json(["message" => "Ownership transferido"]);

        } catch (Exception $e) {
            error_log("❌ Error en transferGroup PHP: " . $e->getMessage());
            Response::error("Error al transferir ownership", 500);
        }
    }

    /**
     * DELETE /api/groups/:groupId
     */
    public function deleteGroup($params) {
        $userId = verifyToken();
        $groupId = (int)$params['groupId'];

        try {
            $db = Database::getConnection();

            // Validar existencia
            $stmtGroup = $db->prepare("SELECT owner_id FROM groups WHERE id = ?");
            $stmtGroup->execute([$groupId]);
            $group = $stmtGroup->fetch();

            if (!$group) {
                Response::error("Grupo no encontrado", 404);
            }

            // Validar admin/dueño
            $stmtUser = $db->prepare("SELECT rol FROM users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $user = $stmtUser->fetch();

            $isAdmin = $user && (strtolower($user['rol']) === 'admin');
            $isOwner = (int)$group['owner_id'] === $userId;

            if (!$isOwner && !$isAdmin) {
                Response::error("No tienes permisos (No eres owner ni admin)", 403);
            }

            $db->beginTransaction();

            // Canales y salas asociadas
            $stmtChannels = $db->prepare("SELECT chat_room_id, voice_room_id FROM channels WHERE group_id = ?");
            $stmtChannels->execute([$groupId]);
            $channels = $stmtChannels->fetchAll();

            foreach ($channels as $channel) {
                $chatRoomId  = (int)$channel['chat_room_id'];
                $voiceRoomId = (int)$channel['voice_room_id'];

                $stmtDelPart = $db->prepare("DELETE FROM room_participants WHERE room_id IN (?, ?)");
                $stmtDelPart->execute([$chatRoomId, $voiceRoomId]);

                $stmtDelRoom = $db->prepare("DELETE FROM rooms WHERE id IN (?, ?)");
                $stmtDelRoom->execute([$chatRoomId, $voiceRoomId]);
            }

            $stmtDelChan = $db->prepare("DELETE FROM channels WHERE group_id = ?");
            $stmtDelChan->execute([$groupId]);

            $stmtDelGroupMem = $db->prepare("DELETE FROM user_groups WHERE group_id = ?");
            $stmtDelGroupMem->execute([$groupId]);

            $stmtDelGroup = $db->prepare("DELETE FROM groups WHERE id = ?");
            $stmtDelGroup->execute([$groupId]);

            $db->commit();
            Response::json(["message" => "Grupo eliminado correctamente"]);

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en deleteGroup PHP: " . $e->getMessage());
            Response::error("Error al eliminar grupo", 500);
        }
    }

    /**
     * POST /api/groups/:groupId/leave
     */
    public function leaveGroup($params) {
        $userId = verifyToken();
        $groupId = (int)$params['groupId'];

        try {
            $db = Database::getConnection();

            $stmtGroup = $db->prepare("SELECT owner_id FROM groups WHERE id = ?");
            $stmtGroup->execute([$groupId]);
            $group = $stmtGroup->fetch();

            if (!$group) {
                Response::error("Grupo no encontrado", 404);
            }

            if ((int)$group['owner_id'] === $userId) {
                Response::error("No puedes salirte siendo el owner. Transfiere el mando antes de salir.", 400);
            }

            $db->beginTransaction();

            // Salirse de las salas vinculadas
            $stmtChan = $db->prepare("SELECT chat_room_id, voice_room_id FROM channels WHERE group_id = ?");
            $stmtChan->execute([$groupId]);
            $channels = $stmtChan->fetchAll();

            foreach ($channels as $channel) {
                $chatRoomId  = (int)$channel['chat_room_id'];
                $voiceRoomId = (int)$channel['voice_room_id'];

                $stmtDelPart = $db->prepare("DELETE FROM room_participants WHERE room_id IN (?, ?) AND user_id = ?");
                $stmtDelPart->execute([$chatRoomId, $voiceRoomId, $userId]);
            }

            $stmtDelMem = $db->prepare("DELETE FROM user_groups WHERE group_id = ? AND user_id = ?");
            $stmtDelMem->execute([$groupId, $userId]);

            if ($stmtDelMem->rowCount() === 0) {
                $db->rollBack();
                Response::error("No eres miembro de este grupo", 404);
            }

            $db->commit();
            Response::json(["success" => true, "message" => "Has salido del grupo"]);

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en leaveGroup PHP: " . $e->getMessage());
            Response::error("Error al salir del grupo", 500);
        }
    }
}
