<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Request.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/JWTHelper.php';
require_once __DIR__ . '/../helpers/MailerHelper.php';
require_once __DIR__ . '/../middleware/verifyToken.php';

class AuthController {

    private function generateCode() {
        return (string)rand(100000, 999999);
    }

    /**
     * POST /api/register
     */
    public function register() {
        $name       = Request::getParam('name');
        $email      = Request::getParam('email');
        $password   = Request::getParam('password');
        $first_name = Request::getParam('first_name');
        $last_name  = Request::getParam('last_name');
        $phone      = Request::getParam('phone');
        $bio        = Request::getParam('bio');
        $birthday   = Request::getParam('birthday');

        if (!$name || !$email || !$password || !$first_name || !$last_name) {
            Response::error("Nickname, email, password, first name and last name are required", 400);
        }

        try {
            $db = Database::getConnection();

            // Verificar si el correo ya está registrado
            $stmt = $db->prepare("SELECT id, is_verified FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $existing = $stmt->fetchAll();

            if (count($existing) > 0) {
                // Re-registro si no está verificado
                if (!(int)$existing[0]['is_verified']) {
                    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
                    $vCode = $this->generateCode();

                    $stmtUpdate = $db->prepare(
                        "UPDATE users SET name = ?, password = ?, verification_code = ?, first_name = ?, last_name = ?, phone = ?, bio = ?, birthday = ? WHERE email = ?"
                    );
                    $stmtUpdate->execute([
                        $name, $hashedPassword, $vCode, $first_name, $last_name, 
                        $phone ?: null, $bio ?: null, $birthday ?: null, $email
                    ]);

                    MailerHelper::sendVerificationEmail($email, $vCode);

                    Response::json([
                        "message" => "Registro actualizado. Por favor verifica tu correo.",
                        "email" => $email,
                        "needsVerification" => true
                    ], 201);
                }

                Response::error("El correo ya está registrado", 409);
            }

            // Hashing y creación de nuevo usuario
            $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
            $vCode = $this->generateCode();

            $stmtInsert = $db->prepare(
                "INSERT INTO users (name, email, password, rol, is_verified, verification_code, first_name, last_name, phone, bio, birthday) VALUES (?, ?, ?, 'user', 0, ?, ?, ?, ?, ?, ?)"
            );
            $stmtInsert->execute([
                $name, $email, $hashedPassword, $vCode, $first_name, $last_name, 
                $phone ?: null, $bio ?: null, $birthday ?: null
            ]);

            MailerHelper::sendVerificationEmail($email, $vCode);

            Response::json([
                "message" => "Registro exitoso. Por favor verifica tu correo.",
                "email" => $email,
                "needsVerification" => true
            ], 201);

        } catch (Exception $e) {
            error_log("❌ Error en Register PHP: " . $e->getMessage());
            Response::error("Error de servidor", 500);
        }
    }

    /**
     * POST /api/verify-code
     */
    public function verifyCode() {
        $email = Request::getParam('email');
        $code  = Request::getParam('code');

        if (!$email || !$code) {
            Response::error("Email y código son requeridos", 400);
        }

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("SELECT id FROM users WHERE email = ? AND verification_code = ?");
            $stmt->execute([$email, $code]);
            $results = $stmt->fetchAll();

            if (count($results) === 0) {
                Response::error("Código incorrecto", 401);
            }

            $userId = (int)$results[0]['id'];

            // Limpieza del código de verificación al completarse la activación
            $stmtUpdate = $db->prepare("UPDATE users SET is_verified = 1, verification_code = NULL WHERE email = ?");
            $stmtUpdate->execute([$email]);

            // Generar token JWT para la sesión
            $token = JWTHelper::sign(["id" => $userId]);

            Response::json([
                "message" => "Cuenta verificada con éxito",
                "token" => $token,
                "user" => [
                    "id" => $userId,
                    "email" => $email
                ]
            ]);

        } catch (Exception $e) {
            error_log("❌ Error en VerifyCode PHP: " . $e->getMessage());
            Response::error("Error de servidor", 500);
        }
    }

    /**
     * POST /api/login
     */
    public function login() {
        $email    = Request::getParam('email');
        $password = Request::getParam('password');

        if (!$email || !$password) {
            Response::error("El correo y contraseña son requeridos", 400);
        }

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare(
                "SELECT id, name, email, password, rol, is_verified, first_name, last_name, phone, bio, birthday, profile_pic FROM users WHERE email = ?"
            );
            $stmt->execute([$email]);
            $results = $stmt->fetchAll();

            if (count($results) === 0) {
                Response::error("El correo no está registrado", 401);
            }

            $user = $results[0];

            // Validar si la cuenta está activada
            if (!(int)$user['is_verified']) {
                Response::json([
                    "message" => "Cuenta no verificada. Revisa tu correo.",
                    "needsVerification" => true,
                    "email" => $user['email']
                ], 403);
            }

            // Comparación de contraseña usando bcrypt nativo
            if (!password_verify($password, $user['password'])) {
                Response::error("Contraseña incorrecta", 401);
            }

            // Generar Token JWT válido por 24 horas
            $token = JWTHelper::sign(["id" => (int)$user['id']]);

            Response::json([
                "token" => $token,
                "user" => [
                    "id" => (int)$user['id'],
                    "nombre" => $user['name'], // Mapeo para frontend
                    "first_name" => $user['first_name'],
                    "last_name" => $user['last_name'],
                    "email" => $user['email'],
                    "rol" => $user['rol'],
                    "profile_pic" => $user['profile_pic'],
                    "phone" => $user['phone'],
                    "bio" => $user['bio'],
                    "birthday" => $user['birthday']
                ]
            ]);

        } catch (Exception $e) {
            error_log("❌ Error en Login PHP: " . $e->getMessage());
            Response::error("Error de servidor", 500);
        }
    }

    /**
     * POST /api/forgot-password
     */
    public function forgotPassword() {
        $email = Request::getParam('email');

        if (!$email) {
            Response::error("El correo es requerido", 400);
        }

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $results = $stmt->fetchAll();

            if (count($results) === 0) {
                Response::error("No existe una cuenta con ese correo", 404);
            }

            $resetCode = $this->generateCode();

            $stmtUpdate = $db->prepare("UPDATE users SET reset_code = ? WHERE email = ?");
            $stmtUpdate->execute([$resetCode, $email]);

            MailerHelper::sendResetEmail($email, $resetCode);

            Response::json([
                "message" => "Código de recuperación enviado al correo"
            ]);

        } catch (Exception $e) {
            error_log("❌ Error en ForgotPassword PHP: " . $e->getMessage());
            Response::error("Error de servidor", 500);
        }
    }

    /**
     * POST /api/reset-password
     */
    public function resetPassword() {
        $email       = Request::getParam('email');
        $code        = Request::getParam('code');
        $newPassword = Request::getParam('newPassword');

        if (!$email || !$code || !$newPassword) {
            Response::error("Todos los campos son requeridos", 400);
        }

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("SELECT id FROM users WHERE email = ? AND reset_code = ?");
            $stmt->execute([$email, $code]);
            $results = $stmt->fetchAll();

            if (count($results) === 0) {
                Response::error("Código de recuperación inválido", 401);
            }

            $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

            $stmtUpdate = $db->prepare("UPDATE users SET password = ?, reset_code = NULL WHERE email = ?");
            $stmtUpdate->execute([$hashedPassword, $email]);

            Response::json([
                "message" => "Contraseña actualizada correctamente"
            ]);

        } catch (Exception $e) {
            error_log("❌ Error en ResetPassword PHP: " . $e->getMessage());
            Response::error("Error de servidor", 500);
        }
    }

    /**
     * GET /api/perfil
     */
    public function perfil() {
        // Ejecutar middleware e inyectar userId
        $userId = verifyToken();

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("SELECT name, email FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $results = $stmt->fetchAll();

            if (count($results) === 0) {
                Response::error("Usuario no encontrado", 404);
            }

            Response::json($results[0]);

        } catch (Exception $e) {
            error_log("❌ Error en Perfil PHP: " . $e->getMessage());
            Response::error("Error en la base de datos", 500);
        }
    }
}
