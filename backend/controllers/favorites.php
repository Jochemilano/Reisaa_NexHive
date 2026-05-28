<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Request.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/verifyToken.php';

class FavoritesController {

    /**
     * POST /api/messages/:messageId/favorite
     */
    public function toggleFavorite($params) {
        $userId = verifyToken();
        $messageId = (int)$params['messageId'];

        try {
            $db = Database::getConnection();

            $stmtCheck = $db->prepare("SELECT 1 FROM favorites WHERE user_id = ? AND message_id = ?");
            $stmtCheck->execute([$userId, $messageId]);
            $existing = $stmtCheck->fetchAll();

            if (count($existing) > 0) {
                // Si ya es favorito, desmarcar
                $stmtDel = $db->prepare("DELETE FROM favorites WHERE user_id = ? AND message_id = ?");
                $stmtDel->execute([$userId, $messageId]);
                Response::json(["success" => true, "favorite" => false]);
            }

            // Marcar como favorito
            $stmtInsert = $db->prepare("INSERT INTO favorites (user_id, message_id) VALUES (?, ?)");
            $stmtInsert->execute([$userId, $messageId]);
            Response::json(["success" => true, "favorite" => true]);

        } catch (Exception $e) {
            error_log("❌ Error en toggleFavorite PHP: " . $e->getMessage());
            Response::error("Error al marcar/desmarcar favorito", 500);
        }
    }

    /**
     * GET /api/users/:userId/favorites
     */
    public function getFavorites($params) {
        $userIdParam = (int)$params['userId'];
        $userId = verifyToken();

        // Solo el mismo usuario puede ver sus favoritos
        if ($userIdParam !== $userId) {
            Response::error("No autorizado", 403);
        }

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("
                SELECT m.id, m.room_id, m.sender_id, m.type, m.content, m.created_at, u.name as sender_name
                FROM favorites f
                JOIN messages m ON m.id = f.message_id
                JOIN users u ON u.id = m.sender_id
                WHERE f.user_id = ?
                ORDER BY f.created_at DESC
            ");
            $stmt->execute([$userId]);
            $favorites = $stmt->fetchAll();

            Response::json($favorites);

        } catch (Exception $e) {
            error_log("❌ Error en getFavorites PHP: " . $e->getMessage());
            Response::error("Error obteniendo favoritos", 500);
        }
    }
}
