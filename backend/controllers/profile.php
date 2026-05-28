<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Request.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/verifyToken.php';

class ProfileController {

    /**
     * GET /api/profile
     */
    public function getProfile() {
        $userId = verifyToken();

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare(
                "SELECT id, name, email, rol, profile_pic, first_name, last_name, phone, bio, birthday, created_at FROM users WHERE id = ?"
            );
            $stmt->execute([$userId]);
            $results = $stmt->fetchAll();

            if (count($results) === 0) {
                Response::error("Usuario no encontrado", 404);
            }

            Response::json($results[0]);

        } catch (Exception $e) {
            error_log("❌ Error en getProfile PHP: " . $e->getMessage());
            Response::error("Error al obtener perfil", 500);
        }
    }

    /**
     * GET /api/users (Traer usuarios activos)
     */
    public function getUsers() {
        try {
            $db = Database::getConnection();

            $stmt = $db->query("SELECT id, name, profile_pic FROM users");
            $results = $stmt->fetchAll();

            Response::json($results);

        } catch (Exception $e) {
            error_log("❌ Error en getUsers PHP: " . $e->getMessage());
            Response::error("Error obteniendo usuarios", 500);
        }
    }

    /**
     * GET /api/users/:id (Consulta de perfil de terceros con estado de amistad)
     */
    public function getUserById($params) {
        $userId = verifyToken();
        $targetId = (int)$params['id'];

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare(
                "SELECT u.id, u.name, u.email, u.rol, u.profile_pic, u.first_name, u.last_name, u.phone, u.bio, u.birthday, u.created_at,
                (SELECT status FROM friends WHERE (user_id = ? AND friend_id = u.id) OR (user_id = u.id AND friend_id = ?)) as friendship_status
                FROM users u WHERE u.id = ?"
            );
            $stmt->execute([$userId, $userId, $targetId]);
            $results = $stmt->fetchAll();

            if (count($results) === 0) {
                Response::error("Usuario no encontrado", 404);
            }

            Response::json($results[0]);

        } catch (Exception $e) {
            error_log("❌ Error en getUserById PHP: " . $e->getMessage());
            Response::error("Error al obtener perfil del usuario", 500);
        }
    }

    /**
     * GET /api/allusers (Traer todos los usuarios)
     */
    public function getAllUsers() {
        try {
            $db = Database::getConnection();

            $stmt = $db->query("SELECT id, name, email FROM users");
            $results = $stmt->fetchAll();

            Response::json($results);

        } catch (Exception $e) {
            error_log("❌ Error en getAllUsers PHP: " . $e->getMessage());
            Response::error("Error obteniendo usuarios", 500);
        }
    }

    /**
     * PUT /api/profile (Actualizar datos de perfil)
     */
    public function updateProfile() {
        $userId = verifyToken();

        $name       = Request::getParam('name');
        $first_name = Request::getParam('first_name');
        $last_name  = Request::getParam('last_name');
        $phone      = Request::getParam('phone');
        $bio        = Request::getParam('bio');
        $birthday   = Request::getParam('birthday');

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare(
                "UPDATE users SET name = ?, first_name = ?, last_name = ?, phone = ?, bio = ?, birthday = ? WHERE id = ?"
            );
            $stmt->execute([
                $name, $first_name, $last_name, 
                $phone ?: null, $bio ?: null, $birthday ?: null, 
                $userId
            ]);

            Response::json(["message" => "Perfil actualizado con éxito"]);

        } catch (Exception $e) {
            error_log("❌ Error en updateProfile PHP: " . $e->getMessage());
            Response::error("Error al actualizar perfil", 500);
        }
    }

    /**
     * PUT /api/profile/picture (Actualizar foto de perfil)
     */
    public function updateProfilePicture() {
        $userId = verifyToken();
        $profile_pic = Request::getParam('profile_pic');

        if (!$profile_pic) {
            Response::error("No se recibió la imagen", 400);
        }

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("UPDATE users SET profile_pic = ? WHERE id = ?");
            $stmt->execute([$profile_pic, $userId]);

            Response::json(["profile_pic" => $profile_pic]);

        } catch (Exception $e) {
            error_log("❌ Error en updateProfilePicture PHP: " . $e->getMessage());
            Response::error("Error al actualizar foto", 500);
        }
    }
}
