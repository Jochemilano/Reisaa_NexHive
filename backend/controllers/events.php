<?php

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Request.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../middleware/verifyToken.php';

class EventsController {

    /**
     * POST /api/events
     */
    public function createEvent() {
        $userId = verifyToken();

        $title = Request::getParam('title');
        $description = Request::getParam('description') ?: null;
        $start = Request::getParam('start');
        $end = Request::getParam('end');
        $collaborators = Request::getParam('collaborators') ?: [];

        if (!$title || !$start || !$end) {
            Response::error("Datos incompletos", 400);
        }

        try {
            $db = Database::getConnection();
            $db->beginTransaction();

            $stmtEvent = $db->prepare("
                INSERT INTO calendar_events (title, description, start_datetime, end_datetime, type, owner_id)
                VALUES (?, ?, ?, ?, 'PERSONAL', ?)
            ");
            $stmtEvent->execute([$title, $description, $start, $end, $userId]);
            $eventId = (int)$db->lastInsertId();

            // Combinar y limpiar los IDs de colaboradores
            $collabIds = [$userId];
            if (is_array($collaborators)) {
                foreach ($collaborators as $cid) {
                    $cidInt = (int)$cid;
                    if ($cidInt > 0 && $cidInt !== $userId) {
                        $collabIds[] = $cidInt;
                    }
                }
            }
            $collabIds = array_values(array_unique($collabIds));

            if (count($collabIds) > 0) {
                $placeholders = [];
                $values = [];
                foreach ($collabIds as $uid) {
                    $placeholders[] = '(?, ?)';
                    $values[] = $uid;
                    $values[] = $eventId;
                }
                $stmtBulk = $db->prepare("INSERT INTO calendar_event_users (user_id, event_id) VALUES " . implode(', ', $placeholders));
                $stmtBulk->execute($values);
            }

            // Traer nombres de colaboradores creados
            $placeholders = implode(',', array_fill(0, count($collabIds), '?'));
            $stmtCollabs = $db->prepare("SELECT id, name FROM users WHERE id IN ($placeholders)");
            $stmtCollabs->execute($collabIds);
            $collaboratorRows = $stmtCollabs->fetchAll();

            $db->commit();

            Response::json([
                "id" => $eventId,
                "title" => $title,
                "description" => $description,
                "start" => $start,
                "end" => $end,
                "type" => "PERSONAL",
                "owner_id" => $userId,
                "collaborators" => $collaboratorRows
            ]);

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en createEvent PHP: " . $e->getMessage());
            Response::error("Error creando evento", 500);
        }
    }

    /**
     * GET /api/events
     */
    public function getEvents() {
        $userId = verifyToken();

        try {
            $db = Database::getConnection();

            // Traer todos los eventos del usuario (tanto personales como vinculados a grupos/actividades)
            $stmt = $db->prepare("
                SELECT DISTINCT e.id, e.title, e.description,
                       e.start_datetime AS start,
                       e.end_datetime AS end,
                       e.type,
                       e.owner_id,
                       cea.activity_id,
                       p.id AS project_id,
                       p.name AS project_name,
                       g.id AS group_id,
                       g.name AS group_name
                FROM calendar_events e
                LEFT JOIN calendar_event_users eu ON e.id = eu.event_id
                LEFT JOIN calendar_event_activities cea ON e.id = cea.event_id
                LEFT JOIN activities a ON cea.activity_id = a.id
                LEFT JOIN projects p ON a.project_id = p.id
                LEFT JOIN groups g ON p.group_id = g.id
                LEFT JOIN user_groups ug ON p.group_id = ug.group_id AND ug.user_id = ?
                WHERE eu.user_id = ? OR ug.user_id IS NOT NULL
                ORDER BY e.start_datetime ASC
            ");
            $stmt->execute([$userId, $userId]);
            $events = $stmt->fetchAll();

            if (count($events) === 0) {
                Response::json([]);
            }

            $eventIds = array_map(function($e) {
                return (int)$e['id'];
            }, $events);

            $placeholders = implode(',', array_fill(0, count($eventIds), '?'));
            $stmtParticipants = $db->prepare("
                SELECT eu.event_id, u.id AS user_id, u.name
                FROM calendar_event_users eu
                JOIN users u ON eu.user_id = u.id
                WHERE eu.event_id IN ($placeholders)
            ");
            $stmtParticipants->execute($eventIds);
            $participants = $stmtParticipants->fetchAll();

            // Mapear colaboradores por evento
            $eventsById = [];
            foreach ($events as $event) {
                $eid = (int)$event['id'];
                $eventsById[$eid] = array_merge($event, [
                    "id" => $eid,
                    "owner_id" => (int)$event['owner_id'],
                    "activity_id" => $event['activity_id'] ? (int)$event['activity_id'] : null,
                    "project_id" => $event['project_id'] ? (int)$event['project_id'] : null,
                    "group_id" => $event['group_id'] ? (int)$event['group_id'] : null,
                    "collaborators" => []
                ]);
            }

            foreach ($participants as $p) {
                $eid = (int)$p['event_id'];
                if (isset($eventsById[$eid])) {
                    $eventsById[$eid]['collaborators'][] = [
                        "id" => (int)$p['user_id'],
                        "name" => $p['name']
                    ];
                }
            }

            Response::json(array_values($eventsById));

        } catch (Exception $e) {
            error_log("❌ Error en getEvents PHP: " . $e->getMessage());
            Response::error("Error obteniendo eventos", 500);
        }
    }

    /**
     * PUT /api/events/:id
     */
    public function updateEvent($params) {
        $userId = verifyToken();
        $eventId = (int)$params['id'];

        $title = Request::getParam('title');
        $description = Request::getParam('description') ?: null;
        $start = Request::getParam('start');
        $end = Request::getParam('end');
        $collaborators = Request::getParam('collaborators') ?: [];

        try {
            $db = Database::getConnection();

            $stmtEvent = $db->prepare("SELECT owner_id FROM calendar_events WHERE id = ?");
            $stmtEvent->execute([$eventId]);
            $event = $stmtEvent->fetch();

            if (!$event) {
                Response::error("Evento no encontrado", 404);
            }

            $ownerId = (int)$event['owner_id'];
            if ($ownerId !== $userId) {
                Response::error("No tienes permiso para editar este evento", 403);
            }

            $db->beginTransaction();

            $stmtUpdate = $db->prepare("
                UPDATE calendar_events
                SET title = ?, description = ?, start_datetime = ?, end_datetime = ?
                WHERE id = ?
            ");
            $stmtUpdate->execute([$title, $description, $start, $end, $eventId]);

            // Sincronizar colaboradores
            $collabIds = [$ownerId];
            if (is_array($collaborators)) {
                foreach ($collaborators as $cid) {
                    $cidInt = (int)$cid;
                    if ($cidInt > 0 && $cidInt !== $ownerId) {
                        $collabIds[] = $cidInt;
                    }
                }
            }
            $collabIds = array_values(array_unique($collabIds));

            $stmtDel = $db->prepare("DELETE FROM calendar_event_users WHERE event_id = ?");
            $stmtDel->execute([$eventId]);

            if (count($collabIds) > 0) {
                $placeholders = [];
                $values = [];
                foreach ($collabIds as $uid) {
                    $placeholders[] = '(?, ?)';
                    $values[] = $uid;
                    $values[] = $eventId;
                }
                $stmtBulk = $db->prepare("INSERT INTO calendar_event_users (user_id, event_id) VALUES " . implode(', ', $placeholders));
                $stmtBulk->execute($values);
            }

            // Obtener colaboradores finales
            $placeholders = implode(',', array_fill(0, count($collabIds), '?'));
            $stmtCollabs = $db->prepare("SELECT id, name FROM users WHERE id IN ($placeholders)");
            $stmtCollabs->execute($collabIds);
            $collaboratorRows = $stmtCollabs->fetchAll();

            $db->commit();

            Response::json([
                "message" => "Evento actualizado correctamente",
                "collaborators" => $collaboratorRows
            ]);

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en updateEvent PHP: " . $e->getMessage());
            Response::error("Error actualizando evento", 500);
        }
    }

    /**
     * DELETE /api/events/:id
     */
    public function deleteEvent($params) {
        $userId = verifyToken();
        $eventId = (int)$params['id'];

        try {
            $db = Database::getConnection();

            $stmtEvent = $db->prepare("SELECT owner_id FROM calendar_events WHERE id = ?");
            $stmtEvent->execute([$eventId]);
            $event = $stmtEvent->fetch();

            if (!$event) {
                Response::error("Evento no encontrado", 404);
            }

            $ownerId = (int)$event['owner_id'];

            // Validar vinculación
            $stmtCheckLink = $db->prepare("SELECT 1 FROM calendar_event_users WHERE event_id = ? AND user_id = ?");
            $stmtCheckLink->execute([$eventId, $userId]);
            if (count($stmtCheckLink->fetchAll()) === 0) {
                Response::error("No tienes permiso para eliminar este evento", 403);
            }

            if ($ownerId === $userId) {
                $db->beginTransaction();
                
                $stmtDelUsers = $db->prepare("DELETE FROM calendar_event_users WHERE event_id = ?");
                $stmtDelUsers->execute([$eventId]);

                $stmtDelEvent = $db->prepare("DELETE FROM calendar_events WHERE id = ?");
                $stmtDelEvent->execute([$eventId]);

                $db->commit();
                Response::json(["message" => "Evento eliminado correctamente", "id" => $eventId]);
            } else {
                // Si no es el dueño, solo salirse
                $stmtExit = $db->prepare("DELETE FROM calendar_event_users WHERE event_id = ? AND user_id = ?");
                $stmtExit->execute([$eventId, $userId]);
                Response::json(["message" => "Has salido del evento", "id" => $eventId]);
            }

        } catch (Exception $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            error_log("❌ Error en deleteEvent PHP: " . $e->getMessage());
            Response::error("Error eliminando evento", 500);
        }
    }
}
