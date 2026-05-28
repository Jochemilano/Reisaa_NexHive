<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Request.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/verifyToken.php';

class ActivitiesController {

    private function formatDateForSQL($date) {
        if (!$date) return null;
        $time = strtotime($date);
        if ($time === false) return null;
        return date('Y-m-d H:i:s', $time);
    }

    /**
     * GET /api/my-activities
     */
    public function getMyActivities() {
        $userId = verifyToken();

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("
                SELECT a.id, a.name AS activity_name, a.status, a.description,
                       p.id AS project_id, p.name AS project_name, 
                       g.id AS group_id, g.name AS group_name
                FROM activities a
                JOIN projects p ON a.project_id = p.id
                JOIN groups g ON p.group_id = g.id
                JOIN user_activities ua ON a.id = ua.activity_id
                WHERE ua.user_id = ? 
                  AND a.status IN ('in_progress', 'in-progress')
                ORDER BY a.id DESC
            ");
            $stmt->execute([$userId]);
            $results = $stmt->fetchAll();

            Response::json($results);

        } catch (Exception $e) {
            error_log("❌ Error en getMyActivities PHP: " . $e->getMessage());
            Response::error("Error al obtener tus actividades", 500);
        }
    }

    /**
     * POST /api/activities
     */
    public function createActivity() {
        $userId = verifyToken();

        $name = Request::getParam('name');
        $projectId = Request::getParam('projectId');
        $description = Request::getParam('description') ?: '';
        $status = Request::getParam('status') ?: 'pending';
        $start_date = Request::getParam('start_date');
        $deadline = Request::getParam('deadline');
        $collaborators = Request::getParam('collaborators') ?: [];

        if (!$name || !$projectId) {
            Response::error("Datos incompletos", 400);
        }

        try {
            $db = Database::getConnection();

            // Validar acceso al proyecto
            $stmtCheck = $db->prepare("SELECT 1 FROM users_projects WHERE user_id = ? AND project_id = ?");
            $stmtCheck->execute([$userId, $projectId]);
            if (count($stmtCheck->fetchAll()) === 0) {
                Response::error("No tiene acceso a este proyecto", 403);
            }

            $db->beginTransaction();

            $startSQL = $this->formatDateForSQL($start_date);
            $deadlineSQL = $this->formatDateForSQL($deadline);

            $stmtInsert = $db->prepare("
                INSERT INTO activities (name, project_id, description, status, start_date, deadline, owner_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtInsert->execute([
                $name, $projectId, $description, $status,
                $startSQL, $deadlineSQL, $userId
            ]);
            $activityId = (int)$db->lastInsertId();

            // Registrar participación del creador
            $stmtUserAct = $db->prepare("INSERT INTO user_activities (user_id, activity_id) VALUES (?, ?)");
            $stmtUserAct->execute([$userId, $activityId]);

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
                        $values[] = $activityId;
                    }
                    $stmtBulk = $db->prepare("INSERT INTO user_activities (user_id, activity_id) VALUES " . implode(', ', $placeholders));
                    $stmtBulk->execute($values);
                }
            }

            // Integración automática con el Calendario global
            $stmtEvent = $db->prepare("
                INSERT INTO calendar_events (title, description, start_datetime, end_datetime, type, owner_id)
                VALUES (?, ?, ?, ?, 'ACTIVITY', ?)
            ");
            $stmtEvent->execute([
                $name, $description, $startSQL, $deadlineSQL, $userId
            ]);
            $eventId = (int)$db->lastInsertId();

            $stmtLink = $db->prepare("INSERT INTO calendar_event_activities (event_id, activity_id) VALUES (?, ?)");
            $stmtLink->execute([$eventId, $activityId]);

            $stmtUser = $db->prepare("SELECT name FROM users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $userRow = $stmtUser->fetch();

            $db->commit();

            Response::json([
                "id" => $activityId,
                "name" => $name,
                "project_id" => $projectId,
                "description" => $description,
                "status" => $status,
                "start_date" => $start_date ? date('c', strtotime($start_date)) : null,
                "deadline" => $deadline ? date('c', strtotime($deadline)) : null,
                "owner_id" => $userId,
                "owner_name" => $userRow ? $userRow['name'] : null,
                "calendar_event" => [
                    "id" => $eventId,
                    "title" => $name,
                    "description" => $description,
                    "start" => $start_date ? date('c', strtotime($start_date)) : null,
                    "end" => $deadline ? date('c', strtotime($deadline)) : null
                ]
            ]);

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en createActivity PHP: " . $e->getMessage());
            Response::error("Error creando actividad", 500);
        }
    }

    /**
     * GET /api/activities/:id
     */
    public function getActivityDetails($params) {
        $userId = verifyToken();
        $activityId = (int)$params['id'];

        try {
            $db = Database::getConnection();

            $stmt = $db->prepare("
                SELECT a.id, a.name, a.description, a.status, a.start_date, a.deadline,
                       a.project_id, a.owner_id, u.name AS owner_name, u.profile_pic AS owner_avatar, p.group_id
                FROM activities a
                JOIN projects p ON a.project_id = p.id
                LEFT JOIN users u ON u.id = a.owner_id
                WHERE a.id = ?
            ");
            $stmt->execute([$activityId]);
            $activity = $stmt->fetch();

            if (!$activity) {
                Response::error("Actividad no encontrada", 404);
            }

            // Validar acceso por pertenencia al grupo raíz
            $stmtCheck = $db->prepare("SELECT 1 FROM user_groups WHERE user_id = ? AND group_id = ?");
            $stmtCheck->execute([$userId, (int)$activity['group_id']]);
            if (count($stmtCheck->fetchAll()) === 0) {
                Response::error("No tiene acceso a esta actividad", 403);
            }

            Response::json([
                "id" => (int)$activity['id'],
                "name" => $activity['name'],
                "description" => $activity['description'],
                "status" => $activity['status'],
                "start_date" => $activity['start_date'],
                "deadline" => $activity['deadline'],
                "project_id" => (int)$activity['project_id'],
                "owner_id" => (int)$activity['owner_id'],
                "owner_name" => $activity['owner_name'],
                "owner_avatar" => $activity['owner_avatar']
            ]);

        } catch (Exception $e) {
            error_log("❌ Error en getActivityDetails PHP: " . $e->getMessage());
            Response::error("Error al obtener actividad", 500);
        }
    }

    /**
     * GET /api/activities/:id/users
     */
    public function getActivityUsers($params) {
        $userId = verifyToken();
        $activityId = (int)$params['id'];

        try {
            $db = Database::getConnection();

            $stmtGroup = $db->prepare("
                SELECT p.group_id FROM activities a
                JOIN projects p ON a.project_id = p.id
                WHERE a.id = ?
            ");
            $stmtGroup->execute([$activityId]);
            $activityRows = $stmtGroup->fetch();

            if (!$activityRows) {
                Response::error("Actividad no encontrada", 404);
            }

            $stmtCheck = $db->prepare("SELECT 1 FROM user_groups WHERE user_id = ? AND group_id = ?");
            $stmtCheck->execute([$userId, (int)$activityRows['group_id']]);
            if (count($stmtCheck->fetchAll()) === 0) {
                Response::error("No tiene acceso a esta actividad", 403);
            }

            $stmtUsers = $db->prepare("
                SELECT u.id, u.name, u.email, u.profile_pic AS avatar FROM users u
                JOIN user_activities ua ON u.id = ua.user_id
                WHERE ua.activity_id = ?
            ");
            $stmtUsers->execute([$activityId]);
            $users = $stmtUsers->fetchAll();

            Response::json($users);

        } catch (Exception $e) {
            error_log("❌ Error en getActivityUsers PHP: " . $e->getMessage());
            Response::error("Error al traer usuarios de la actividad", 500);
        }
    }

    /**
     * PUT /api/activities/:id
     */
    public function updateActivity($params) {
        $userId = verifyToken();
        $activityId = (int)$params['id'];

        $name = Request::getParam('name');
        $description = Request::getParam('description');
        $status = Request::getParam('status');
        $start_date = Request::getParam('start_date');
        $deadline = Request::getParam('deadline');
        $collaborators = Request::getParam('collaborators');

        if (!$name) {
            Response::error("Nombre requerido", 400);
        }

        try {
            $db = Database::getConnection();

            // Validar existencia
            $stmtAct = $db->prepare("SELECT owner_id FROM activities WHERE id = ?");
            $stmtAct->execute([$activityId]);
            $activity = $stmtAct->fetch();

            if (!$activity) {
                Response::error("Actividad no encontrada", 404);
            }

            $db->beginTransaction();

            $startSQL = $this->formatDateForSQL($start_date);
            $deadlineSQL = $this->formatDateForSQL($deadline);

            $stmtUpdate = $db->prepare("
                UPDATE activities 
                SET name = ?, description = ?, status = ?, start_date = ?, deadline = ? 
                WHERE id = ?
            ");
            $stmtUpdate->execute([
                $name, $description ?: '', $status ?: 'pending',
                $startSQL, $deadlineSQL, $activityId
            ]);

            // Actualizar evento de calendario
            $stmtCal = $db->prepare("
                UPDATE calendar_events e
                JOIN calendar_event_activities cea ON e.id = cea.event_id
                SET e.title = ?, e.description = ?, e.start_datetime = ?, e.end_datetime = ?
                WHERE cea.activity_id = ?
            ");
            $stmtCal->execute([
                $name, $description ?: '', $startSQL, $deadlineSQL, $activityId
            ]);

            // Sincronizar colaboradores
            if (is_array($collaborators)) {
                $ownerActId = (int)$activity['owner_id'];
                $stmtDel = $db->prepare("DELETE FROM user_activities WHERE activity_id = ? AND user_id != ?");
                $stmtDel->execute([$activityId, $ownerActId]);

                $filtered = array_filter($collaborators, function($id) use ($ownerActId) {
                    return (int)$id !== $ownerActId;
                });

                if (count($filtered) > 0) {
                    $placeholders = [];
                    $values = [];
                    foreach ($filtered as $id) {
                        $placeholders[] = '(?, ?)';
                        $values[] = (int)$id;
                        $values[] = $activityId;
                    }
                    $stmtBulk = $db->prepare("INSERT INTO user_activities (user_id, activity_id) VALUES " . implode(', ', $placeholders));
                    $stmtBulk->execute($values);
                }
            }

            $db->commit();

            Response::json([
                "id" => $activityId,
                "name" => $name,
                "description" => $description ?: '',
                "status" => $status ?: 'pending',
                "start_date" => $start_date ?: null,
                "deadline" => $deadline ?: null
            ]);

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en updateActivity PHP: " . $e->getMessage());
            Response::error("Error actualizando actividad", 500);
        }
    }

    /**
     * PATCH /api/activities/:id/transfer
     */
    public function transferActivity($params) {
        $userId = verifyToken();
        $activityId = (int)$params['id'];
        $newOwnerId = Request::getParam('newOwnerId');

        try {
            $db = Database::getConnection();

            // Validar propiedad
            $stmtAct = $db->prepare("SELECT 1 FROM activities WHERE id = ? AND owner_id = ?");
            $stmtAct->execute([$activityId, $userId]);
            if (count($stmtAct->fetchAll()) === 0) {
                Response::error("No eres owner de esta actividad", 403);
            }

            // Validar que el nuevo dueño participe en la actividad
            $stmtMem = $db->prepare("SELECT 1 FROM user_activities WHERE user_id = ? AND activity_id = ?");
            $stmtMem->execute([$newOwnerId, $activityId]);
            if (count($stmtMem->fetchAll()) === 0) {
                Response::error("El usuario no pertenece a la actividad", 400);
            }

            $stmtUpdate = $db->prepare("UPDATE activities SET owner_id = ? WHERE id = ?");
            $stmtUpdate->execute([$newOwnerId, $activityId]);

            Response::json(["message" => "Ownership transferido"]);

        } catch (Exception $e) {
            error_log("❌ Error en transferActivity PHP: " . $e->getMessage());
            Response::error("Error al transferir ownership", 500);
        }
    }

    /**
     * DELETE /api/activities/:id
     */
    public function deleteActivity($params) {
        $userId = verifyToken();
        $activityId = (int)$params['id'];

        try {
            $db = Database::getConnection();

            // Validar existencia
            $stmtAct = $db->prepare("SELECT 1 FROM activities WHERE id = ?");
            $stmtAct->execute([$activityId]);
            if (count($stmtAct->fetchAll()) === 0) {
                Response::error("Actividad no encontrada", 404);
            }

            $db->beginTransaction();

            // Buscar eventos vinculados
            $stmtLink = $db->prepare("SELECT event_id FROM calendar_event_activities WHERE activity_id = ?");
            $stmtLink->execute([$activityId]);
            $events = $stmtLink->fetchAll();

            $stmtDelLink = $db->prepare("DELETE FROM calendar_event_activities WHERE activity_id = ?");
            $stmtDelLink->execute([$activityId]);

            if (count($events) > 0) {
                $eventIds = array_map(function($e) {
                    return (int)$e['event_id'];
                }, $events);
                
                $placeholders = implode(',', array_fill(0, count($eventIds), '?'));
                $stmtDelEvents = $db->prepare("DELETE FROM calendar_events WHERE id IN ($placeholders)");
                $stmtDelEvents->execute($eventIds);
            }

            $stmtDelUserAct = $db->prepare("DELETE FROM user_activities WHERE activity_id = ?");
            $stmtDelUserAct->execute([$activityId]);

            $stmtDelAct = $db->prepare("DELETE FROM activities WHERE id = ?");
            $stmtDelAct->execute([$activityId]);

            $db->commit();
            Response::json(["message" => "Actividad eliminada correctamente"]);

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en deleteActivity PHP: " . $e->getMessage());
            Response::error("Error al eliminar actividad", 500);
        }
    }
}
