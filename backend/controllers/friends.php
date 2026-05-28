<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Request.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/verifyToken.php';

class FriendsController {

    /**
     * GET /api/friends
     */
    public function getFriends() {
        $userId = verifyToken();

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("
                SELECT u.id, u.name, u.email, u.profile_pic 
                FROM users u
                JOIN friends f ON (u.id = f.friend_id OR u.id = f.user_id)
                WHERE (f.user_id = ? OR f.friend_id = ?) 
                AND u.id != ?
                AND f.status = 'accepted'
            ");
            $stmt->execute([$userId, $userId, $userId]);
            $results = $stmt->fetchAll();

            Response::json($results);

        } catch (Exception $e) {
            error_log("❌ Error en getFriends PHP: " . $e->getMessage());
            Response::error("Error al obtener amigos", 500);
        }
    }

    /**
     * GET /api/friends/requests
     */
    public function getFriendRequests() {
        $userId = verifyToken();

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("
                SELECT f.id as request_id, u.id, u.name, u.email, u.profile_pic 
                FROM friends f
                JOIN users u ON u.id = f.user_id
                WHERE f.friend_id = ? AND f.status = 'pending'
            ");
            $stmt->execute([$userId]);
            $results = $stmt->fetchAll();

            Response::json($results);

        } catch (Exception $e) {
            error_log("❌ Error en getFriendRequests PHP: " . $e->getMessage());
            Response::error("Error al obtener solicitudes", 500);
        }
    }

    /**
     * GET /api/users/search
     */
    public function searchUsers() {
        verifyToken();
        $userId = $GLOBALS['userId'];
        $q = Request::getQuery('q');

        if (!$q) {
            Response::json([]);
        }

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("
                SELECT id, name, email, profile_pic 
                FROM users 
                WHERE (name LIKE ? OR email LIKE ?) 
                AND id != ?
                LIMIT 10
            ");
            $searchQuery = "%{$q}%";
            $stmt->execute([$searchQuery, $searchQuery, $userId]);
            $results = $stmt->fetchAll();

            Response::json($results);

        } catch (Exception $e) {
            error_log("❌ Error en searchUsers PHP: " . $e->getMessage());
            Response::error("Error al buscar usuarios", 500);
        }
    }

    /**
     * POST /api/friends
     */
    public function sendFriendRequest() {
        $userId = verifyToken();
        $friendId = Request::getParam('friendId');

        if (!$friendId) {
            Response::error("ID del amigo es requerido", 400);
        }

        if ((int)$friendId === $userId) {
            Response::error("No puedes agregarte a ti mismo", 400);
        }

        try {
            $db = Database::getConnection();

            // Verificación previa para evitar redundancias
            $stmtCheck = $db->prepare("
                SELECT status FROM friends 
                WHERE (user_id = ? AND friend_id = ?) 
                OR (user_id = ? AND friend_id = ?)
            ");
            $stmtCheck->execute([$userId, $friendId, $friendId, $userId]);
            $existing = $stmtCheck->fetchAll();

            if (count($existing) > 0) {
                if ($existing[0]['status'] === 'accepted') {
                    Response::error("Ya son amigos", 400);
                } else {
                    Response::error("Ya existe una solicitud pendiente", 400);
                }
            }

            $stmtInsert = $db->prepare("INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')");
            $stmtInsert->execute([$userId, $friendId]);

            Response::json(["message" => "Solicitud enviada correctamente"]);

        } catch (Exception $e) {
            error_log("❌ Error en sendFriendRequest PHP: " . $e->getMessage());
            Response::error("Error al enviar solicitud", 500);
        }
    }

    /**
     * POST /api/friends/accept
     */
    public function acceptFriendRequest() {
        $userId = verifyToken();
        $requestId = Request::getParam('requestId');

        if (!$requestId) {
            Response::error("ID de solicitud es requerido", 400);
        }

        try {
            $db = Database::getConnection();

            $stmtUpdate = $db->prepare("UPDATE friends SET status = 'accepted' WHERE id = ? AND friend_id = ?");
            $stmtUpdate->execute([$requestId, $userId]);

            if ($stmtUpdate->rowCount() === 0) {
                Response::error("Solicitud no encontrada", 404);
            }

            Response::json(["message" => "Solicitud aceptada"]);

        } catch (Exception $e) {
            error_log("❌ Error en acceptFriendRequest PHP: " . $e->getMessage());
            Response::error("Error al aceptar solicitud", 500);
        }
    }

    /**
     * DELETE /api/friends/reject/:requestId
     */
    public function rejectFriendRequest($params) {
        $userId = verifyToken();
        $requestId = (int)$params['requestId'];

        try {
            $db = Database::getConnection();

            $stmtDelete = $db->prepare("DELETE FROM friends WHERE id = ? AND (user_id = ? OR friend_id = ?)");
            $stmtDelete->execute([$requestId, $userId, $userId]);

            if ($stmtDelete->rowCount() === 0) {
                Response::error("Relación no encontrada", 404);
            }

            Response::json(["message" => "Solicitud rechazada/Amigo eliminado"]);

        } catch (Exception $e) {
            error_log("❌ Error en rejectFriendRequest PHP: " . $e->getMessage());
            Response::error("Error al procesar acción", 500);
        }
    }
}
