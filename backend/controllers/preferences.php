<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Request.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/verifyToken.php';

class PreferencesController {

    /**
     * PUT /api/preferences
     */
    public function updatePreferences() {
        $userId = verifyToken();

        $language = Request::getParam('language');
        $theme = Request::getParam('theme');
        $notifications_enabled = Request::getParam('notifications_enabled');

        if (!$language || !$theme) {
            Response::error("Datos incompletos", 400);
        }

        try {
            $db = Database::getConnection();

            $stmtCheck = $db->prepare("SELECT 1 FROM user_preferences WHERE user_id = ?");
            $stmtCheck->execute([$userId]);
            $existing = $stmtCheck->fetchAll();

            if (count($existing) > 0) {
                $stmt = $db->prepare("
                    UPDATE user_preferences 
                    SET language = ?, theme = ?, notifications_enabled = ? 
                    WHERE user_id = ?
                ");
                $stmt->execute([$language, $theme, $notifications_enabled ? 1 : 0, $userId]);
            } else {
                $stmt = $db->prepare("
                    INSERT INTO user_preferences (user_id, language, theme, notifications_enabled) 
                    VALUES (?, ?, ?, ?)
                ");
                $stmt->execute([$userId, $language, $theme, $notifications_enabled ? 1 : 0]);
            }

            Response::json([
                "message" => "Preferencias guardadas",
                "preferences" => [
                    "language" => $language,
                    "theme" => $theme,
                    "notifications_enabled" => (bool)$notifications_enabled
                ]
            ]);

        } catch (Exception $e) {
            error_log("❌ Error en updatePreferences PHP: " . $e->getMessage());
            Response::error("Error guardando preferencias", 500);
        }
    }

    /**
     * GET /api/preferences
     */
    public function getPreferences() {
        $userId = verifyToken();

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("SELECT language, theme, notifications_enabled FROM user_preferences WHERE user_id = ?");
            $stmt->execute([$userId]);
            $result = $stmt->fetch();

            if (!$result) {
                // Si no hay preferencias guardadas, devolver valores por defecto
                Response::json([
                    "preferences" => [
                        "language" => "es",
                        "theme" => "light",
                        "notifications_enabled" => true
                    ]
                ]);
            }

            Response::json([
                "preferences" => [
                    "language" => $result['language'],
                    "theme" => $result['theme'],
                    "notifications_enabled" => (bool)$result['notifications_enabled']
                ]
            ]);

        } catch (Exception $e) {
            error_log("❌ Error en getPreferences PHP: " . $e->getMessage());
            Response::error("Error obteniendo preferencias", 500);
        }
    }
}
