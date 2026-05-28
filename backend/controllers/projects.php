<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Request.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/verifyToken.php';

class ProjectsController {

    /**
     * POST /api/projects
     */
    public function createProject() {
        $userId = verifyToken();

        $name = Request::getParam('name');
        $description = Request::getParam('description') ?: '';
        $groupId = Request::getParam('groupId');
        $start_date = Request::getParam('start_date');
        $deadline = Request::getParam('deadline');
        $status = Request::getParam('status') ?: 'in_progress';
        $collaborators = Request::getParam('collaborators') ?: [];

        if (!$name || !$groupId) {
            Response::error("Datos incompletos", 400);
        }

        try {
            $db = Database::getConnection();

            // Validar pertenencia al grupo antes de crear
            $stmtCheck = $db->prepare("SELECT 1 FROM user_groups WHERE user_id = ? AND group_id = ?");
            $stmtCheck->execute([$userId, $groupId]);
            if (count($stmtCheck->fetchAll()) === 0) {
                Response::error("No pertenece al grupo", 403);
            }

            $db->beginTransaction();

            $stmtInsert = $db->prepare("
                INSERT INTO projects (name, description, group_id, start_date, deadline, status, owner_id) 
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtInsert->execute([
                $name, $description, $groupId, 
                $start_date ?: null, $deadline ?: null, $status, 
                $userId
            ]);
            $projectId = (int)$db->lastInsertId();

            // Registrar al dueño en la tabla de relaciones de proyecto
            $stmtRel = $db->prepare("INSERT INTO users_projects (user_id, project_id) VALUES (?, ?)");
            $stmtRel->execute([$userId, $projectId]);

            // Registro masivo de colaboradores
            if (is_array($collaborators) && count($collaborators) > 0) {
                $filtered = array_filter($collaborators, function($id) use ($userId) {
                    return (int)$id !== $userId;
                });

                if (count($filtered) > 0) {
                    $placeholders = [];
                    $values = [];
                    foreach ($filtered as $id) {
                        $placeholders[] = '(?, ?)';
                        $values[] = (int)$id;
                        $values[] = $projectId;
                    }
                    $sqlBulk = "INSERT INTO users_projects (user_id, project_id) VALUES " . implode(', ', $placeholders);
                    $stmtBulk = $db->prepare($sqlBulk);
                    $stmtBulk->execute($values);
                }
            }

            $db->commit();

            Response::json([
                "id" => $projectId,
                "name" => $name,
                "description" => $description,
                "group_id" => $groupId,
                "start_date" => $start_date ?: null,
                "deadline" => $deadline ?: null,
                "status" => $status,
                "owner_id" => $userId,
                "collaborators" => $collaborators
            ]);

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en createProject PHP: " . $e->getMessage());
            Response::error("Error creando proyecto", 500);
        }
    }

    /**
     * GET /api/groups/:groupId/projects
     */
    public function getGroupProjects($params) {
        $userId = verifyToken();
        $groupId = (int)$params['groupId'];

        try {
            $db = Database::getConnection();

            // Verificar si pertenece al grupo
            $stmtCheck = $db->prepare("SELECT 1 FROM user_groups WHERE user_id = ? AND group_id = ?");
            $stmtCheck->execute([$userId, $groupId]);
            if (count($stmtCheck->fetchAll()) === 0) {
                Response::error("No pertenece al grupo", 403);
            }

            // Consultar rol y dueño del grupo
            $stmtGroup = $db->prepare("SELECT owner_id FROM groups WHERE id = ?");
            $stmtGroup->execute([$groupId]);
            $group = $stmtGroup->fetch();

            $stmtUser = $db->prepare("SELECT rol FROM users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $user = $stmtUser->fetch();

            $isGroupOwner = $group && (int)$group['owner_id'] === $userId;
            $isAdmin = $user && (strtolower($user['rol']) === 'admin');

            if ($isGroupOwner || $isAdmin) {
                // Owner del grupo o Admin ve todos los proyectos
                $stmt = $db->prepare("
                    SELECT p.id, p.name, p.description, p.start_date, p.deadline, p.status, p.owner_id, u.name AS owner_name
                    FROM projects p
                    LEFT JOIN users u ON u.id = p.owner_id
                    WHERE p.group_id = ?
                    ORDER BY p.id
                ");
                $stmt->execute([$groupId]);
            } else {
                // Usuario normal ve donde participa o es dueño
                $stmt = $db->prepare("
                    SELECT p.id, p.name, p.description, p.start_date, p.deadline, p.status, p.owner_id, u.name AS owner_name
                    FROM projects p
                    LEFT JOIN users u ON u.id = p.owner_id
                    WHERE p.group_id = ? 
                      AND (p.owner_id = ? OR p.id IN (SELECT project_id FROM users_projects WHERE user_id = ?))
                    ORDER BY p.id
                ");
                $stmt->execute([$groupId, $userId, $userId]);
            }

            $projects = $stmt->fetchAll();
            Response::json($projects);

        } catch (Exception $e) {
            error_log("❌ Error en getGroupProjects PHP: " . $e->getMessage());
            Response::error("Error al traer proyectos", 500);
        }
    }

    /**
     * GET /api/projects/:projectId
     */
    public function getProjectDetails($params) {
        $userId = verifyToken();
        $projectId = (int)$params['projectId'];

        try {
            $db = Database::getConnection();

            // Detalles del proyecto
            $stmtProject = $db->prepare("
                SELECT p.id, p.name, p.description, p.start_date, p.deadline, p.status, p.owner_id, p.group_id, u.name AS owner_name
                FROM projects p
                LEFT JOIN users u ON u.id = p.owner_id
                WHERE p.id = ?
            ");
            $stmtProject->execute([$projectId]);
            $project = $stmtProject->fetch();

            if (!$project) {
                Response::error("Proyecto no encontrado", 404);
            }

            // Validar si participa en el proyecto
            $stmtMem = $db->prepare("SELECT 1 FROM users_projects WHERE user_id = ? AND project_id = ?");
            $stmtMem->execute([$userId, $projectId]);
            $member = $stmtMem->fetchAll();

            $stmtUser = $db->prepare("SELECT rol FROM users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $user = $stmtUser->fetch();
            $isAdmin = $user && (strtolower($user['rol']) === 'admin');

            $stmtGroup = $db->prepare("SELECT owner_id FROM groups WHERE id = ?");
            $stmtGroup->execute([$project['group_id']]);
            $group = $stmtGroup->fetch();
            $isGroupOwner = $group && (int)$group['owner_id'] === $userId;

            if (count($member) === 0 && !$isAdmin && !$isGroupOwner) {
                Response::error("No pertenece al proyecto", 403);
            }

            // Actividades vinculadas
            $stmtActivities = $db->prepare("
                SELECT a.id, a.name, a.description, a.status, a.start_date, a.deadline, a.owner_id, u.name AS owner_name, u.profile_pic
                FROM activities a
                LEFT JOIN users u ON u.id = a.owner_id
                WHERE a.project_id = ?
                ORDER BY a.id
            ");
            $stmtActivities->execute([$projectId]);
            $activities = $stmtActivities->fetchAll();

            Response::json(array_merge($project, ["activities" => $activities]));

        } catch (Exception $e) {
            error_log("❌ Error en getProjectDetails PHP: " . $e->getMessage());
            Response::error("Error al traer proyecto", 500);
        }
    }

    /**
     * GET /api/projects/:projectId/users
     */
    public function getProjectUsers($params) {
        $userId = verifyToken();
        $projectId = (int)$params['projectId'];

        try {
            $db = Database::getConnection();

            $stmtProject = $db->prepare("SELECT group_id FROM projects WHERE id = ?");
            $stmtProject->execute([$projectId]);
            $project = $stmtProject->fetch();

            if (!$project) {
                Response::error("Proyecto no encontrado", 404);
            }

            $stmtMem = $db->prepare("SELECT 1 FROM users_projects WHERE user_id = ? AND project_id = ?");
            $stmtMem->execute([$userId, $projectId]);
            $member = $stmtMem->fetchAll();

            $stmtUser = $db->prepare("SELECT rol FROM users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $user = $stmtUser->fetch();
            $isAdmin = $user && (strtolower($user['rol']) === 'admin');

            $stmtGroup = $db->prepare("SELECT owner_id FROM groups WHERE id = ?");
            $stmtGroup->execute([$project['group_id']]);
            $group = $stmtGroup->fetch();
            $isGroupOwner = $group && (int)$group['owner_id'] === $userId;

            if (count($member) === 0 && !$isAdmin && !$isGroupOwner) {
                Response::error("No pertenece al proyecto", 403);
            }

            $stmtUsers = $db->prepare("
                SELECT u.id, u.name, u.email FROM users u
                JOIN users_projects up ON u.id = up.user_id
                WHERE up.project_id = ?
            ");
            $stmtUsers->execute([$projectId]);
            $users = $stmtUsers->fetchAll();

            Response::json($users);

        } catch (Exception $e) {
            error_log("❌ Error en getProjectUsers PHP: " . $e->getMessage());
            Response::error("Error al traer usuarios del proyecto", 500);
        }
    }

    /**
     * PATCH /api/projects/:projectId
     */
    public function updateProject($params) {
        $userId = verifyToken();
        $projectId = (int)$params['projectId'];

        $name = Request::getParam('name');
        $description = Request::getParam('description');
        $start_date = Request::getParam('start_date');
        $deadline = Request::getParam('deadline');
        $status = Request::getParam('status');
        $collaborators = Request::getParam('collaborators');

        try {
            $db = Database::getConnection();

            // Validar existencia
            $stmtProject = $db->prepare("SELECT owner_id, group_id FROM projects WHERE id = ?");
            $stmtProject->execute([$projectId]);
            $project = $stmtProject->fetch();

            if (!$project) {
                Response::error("Proyecto no encontrado", 404);
            }

            // Validar permisos (dueño del proyecto, admin o dueño del grupo)
            $stmtUser = $db->prepare("SELECT rol FROM users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $user = $stmtUser->fetch();
            $isAdmin = $user && (strtolower($user['rol']) === 'admin');
            
            $isOwner = (int)$project['owner_id'] === $userId;

            $stmtGroup = $db->prepare("SELECT owner_id FROM groups WHERE id = ?");
            $stmtGroup->execute([$project['group_id']]);
            $group = $stmtGroup->fetch();
            $isGroupOwner = $group && (int)$group['owner_id'] === $userId;

            if (!$isOwner && !$isAdmin && !$isGroupOwner) {
                Response::error("No tienes permisos (No eres owner del proyecto, admin ni owner del grupo)", 403);
            }

            $db->beginTransaction();

            $stmtUpdate = $db->prepare("
                UPDATE projects
                SET name = COALESCE(?, name),
                    description = COALESCE(?, description),
                    start_date = COALESCE(?, start_date),
                    deadline = COALESCE(?, deadline),
                    status = COALESCE(?, status)
                WHERE id = ?
            ");
            $stmtUpdate->execute([$name, $description, $start_date, $deadline, $status, $projectId]);

            // Sincronizar colaboradores
            if (is_array($collaborators)) {
                $stmtDel = $db->prepare("DELETE FROM users_projects WHERE project_id = ? AND user_id != ?");
                $stmtDel->execute([$projectId, $userId]);

                $filtered = array_filter($collaborators, function($id) use ($userId) {
                    return (int)$id !== $userId;
                });

                if (count($filtered) > 0) {
                    $placeholders = [];
                    $values = [];
                    foreach ($filtered as $id) {
                        $placeholders[] = '(?, ?)';
                        $values[] = (int)$id;
                        $values[] = $projectId;
                    }
                    $stmtBulk = $db->prepare("INSERT INTO users_projects (user_id, project_id) VALUES " . implode(', ', $placeholders));
                    $stmtBulk->execute($values);
                }
            }

            $db->commit();
            Response::json(["message" => "Proyecto actualizado"]);

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en updateProject PHP: " . $e->getMessage());
            Response::error("Error al actualizar proyecto", 500);
        }
    }

    /**
     * PATCH /api/projects/:projectId/transfer
     */
    public function transferProject($params) {
        $userId = verifyToken();
        $projectId = (int)$params['projectId'];
        $newOwnerId = Request::getParam('newOwnerId');

        try {
            $db = Database::getConnection();

            // Validar propiedad
            $stmtCheck = $db->prepare("SELECT 1 FROM projects WHERE id = ? AND owner_id = ?");
            $stmtCheck->execute([$projectId, $userId]);
            if (count($stmtCheck->fetchAll()) === 0) {
                Response::error("No eres owner del proyecto", 403);
            }

            // Validar membresía del nuevo dueño
            $stmtMem = $db->prepare("SELECT 1 FROM users_projects WHERE user_id = ? AND project_id = ?");
            $stmtMem->execute([$newOwnerId, $projectId]);
            if (count($stmtMem->fetchAll()) === 0) {
                Response::error("El usuario no pertenece al proyecto", 400);
            }

            $stmtUpdate = $db->prepare("UPDATE projects SET owner_id = ? WHERE id = ?");
            $stmtUpdate->execute([$newOwnerId, $projectId]);

            Response::json(["message" => "Ownership transferido"]);

        } catch (Exception $e) {
            error_log("❌ Error en transferProject PHP: " . $e->getMessage());
            Response::error("Error al transferir ownership", 500);
        }
    }

    /**
     * DELETE /api/projects/:projectId
     */
    public function deleteProject($params) {
        $userId = verifyToken();
        $projectId = (int)$params['projectId'];

        try {
            $db = Database::getConnection();

            $stmtProject = $db->prepare("SELECT owner_id, group_id FROM projects WHERE id = ?");
            $stmtProject->execute([$projectId]);
            $project = $stmtProject->fetch();

            if (!$project) {
                Response::error("Proyecto no encontrado", 404);
            }

            $stmtUser = $db->prepare("SELECT rol FROM users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $user = $stmtUser->fetch();
            $isAdmin = $user && (strtolower($user['rol']) === 'admin');

            $isOwner = (int)$project['owner_id'] === $userId;

            $stmtGroup = $db->prepare("SELECT owner_id FROM groups WHERE id = ?");
            $stmtGroup->execute([$project['group_id']]);
            $group = $stmtGroup->fetch();
            $isGroupOwner = $group && (int)$group['owner_id'] === $userId;

            if (!$isOwner && !$isAdmin && !$isGroupOwner) {
                Response::error("No tienes permisos (No eres owner del proyecto, admin ni owner del grupo)", 403);
            }

            $db->beginTransaction();

            $stmtDelRel = $db->prepare("DELETE FROM users_projects WHERE project_id = ?");
            $stmtDelRel->execute([$projectId]);

            $stmtDelProj = $db->prepare("DELETE FROM projects WHERE id = ?");
            $stmtDelProj->execute([$projectId]);

            $db->commit();
            Response::json(["message" => "Proyecto eliminado correctamente"]);

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en deleteProject PHP: " . $e->getMessage());
            Response::error("Error al eliminar proyecto", 500);
        }
    }
}
