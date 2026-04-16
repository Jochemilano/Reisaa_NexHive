const express = require("express");
const router = express.Router();
const query = require("../helpers/query");
const verifyToken = require("../middleware/verifyToken");

// Crear evento personal
router.post("/events", verifyToken, async (req, res) => {
  const { title, description, start, end, collaborators = [] } = req.body;
  const userId = req.userId;

  if (!title || !start || !end) return res.status(400).json({ message: "Datos incompletos" });

  try {
    const eventResult = await query(
      `INSERT INTO calendar_events
       (title, description, start_datetime, end_datetime, type, owner_id)
       VALUES (?, ?, ?, ?, 'PERSONAL', ?)`,
      [title, description || null, start, end, userId]
    );

    const eventId = eventResult.insertId;
    const collaboratorIds = [userId, ...new Set(
      (Array.isArray(collaborators) ? collaborators : [])
        .map(id => parseInt(id))
        .filter(id => !Number.isNaN(id) && id !== userId)
    )];

    if (collaboratorIds.length > 0) {
      const values = collaboratorIds.map(uid => [uid, eventId]);
      await query(
        "INSERT INTO calendar_event_users (user_id, event_id) VALUES ?",
        [values]
      );
    }

    const collaboratorRows = await query(
      `SELECT id, name FROM users WHERE id IN (?)`,
      [collaboratorIds]
    );

    res.json({
      id: eventId,
      title,
      description: description || null,
      start,
      end,
      type: "PERSONAL",
      owner_id: userId,
      collaborators: collaboratorRows
    });

  } catch (err) {
    console.error("ERROR DB CREATE EVENT:", err);
    res.status(500).json({ message: "Error creando evento" });
  }
});

// Obtener eventos del usuario
router.get("/events", verifyToken, async (req, res) => {
  const userId = req.userId;

  try {
    const events = await query(
      `SELECT DISTINCT e.id, e.title, e.description,
              e.start_datetime AS start,
              e.end_datetime AS end,
              e.type,
              e.owner_id,
              cea.activity_id
       FROM calendar_events e
       LEFT JOIN calendar_event_users eu ON e.id = eu.event_id
       LEFT JOIN calendar_event_activities cea ON e.id = cea.event_id
       LEFT JOIN activities a ON cea.activity_id = a.id
       LEFT JOIN projects p ON a.project_id = p.id
       LEFT JOIN user_groups ug ON p.group_id = ug.group_id AND ug.user_id = ?
       WHERE eu.user_id = ? OR ug.user_id IS NOT NULL
       ORDER BY e.start_datetime ASC`,
      [userId, userId]
    );

    if (events.length === 0) {
      return res.json([]);
    }

    const eventIds = events.map(e => e.id);
    const participants = await query(
      `SELECT eu.event_id,
              u.id AS user_id,
              u.name
       FROM calendar_event_users eu
       JOIN users u ON eu.user_id = u.id
       WHERE eu.event_id IN (?)`,
      [eventIds]
    );

    const eventsById = events.reduce((acc, event) => {
      acc[event.id] = {
        ...event,
        collaborators: [],
      };
      return acc;
    }, {});

    participants.forEach((row) => {
      if (eventsById[row.event_id]) {
        eventsById[row.event_id].collaborators.push({
          id: row.user_id,
          name: row.name,
        });
      }
    });

    res.json(Object.values(eventsById));

  } catch (err) {
    console.error("ERROR DB GET EVENTS:", err);
    res.status(500).json({ message: "Error obteniendo eventos" });
  }
});

// Editar evento personal
router.put("/events/:id", verifyToken, async (req, res) => {
  const eventId = req.params.id;
  const userId = req.userId;
  const { title, description, start, end, collaborators = [] } = req.body;

  try {
    const eventRows = await query(
      "SELECT owner_id FROM calendar_events WHERE id = ?",
      [eventId]
    );
    if (eventRows.length === 0)
      return res.status(404).json({ message: "Evento no encontrado" });

    const ownerId = eventRows[0].owner_id;
    if (ownerId !== userId)
      return res.status(403).json({ message: "No tienes permiso para editar este evento" });

    await query(
      `UPDATE calendar_events
       SET title=?, description=?, start_datetime=?, end_datetime=?
       WHERE id=?`,
      [title, description || null, start, end, eventId]
    );

    const collaboratorIds = [ownerId, ...new Set(
      (Array.isArray(collaborators) ? collaborators : [])
        .map(id => parseInt(id))
        .filter(id => !Number.isNaN(id) && id !== ownerId)
    )];

    await query("DELETE FROM calendar_event_users WHERE event_id = ?", [eventId]);
    if (collaboratorIds.length > 0) {
      const values = collaboratorIds.map(uid => [uid, eventId]);
      await query(
        "INSERT INTO calendar_event_users (user_id, event_id) VALUES ?",
        [values]
      );
    }

    const collaboratorRows = await query(
      `SELECT id, name FROM users WHERE id IN (?)`,
      [collaboratorIds]
    );

    res.json({
      message: "Evento actualizado correctamente",
      collaborators: collaboratorRows
    });

  } catch (err) {
    console.error("ERROR DB UPDATE EVENT:", err);
    res.status(500).json({ message: "Error actualizando evento" });
  }
});

// Eliminar evento personal o salirse de él
router.delete("/events/:id", verifyToken, async (req, res) => {
  const eventId = req.params.id;
  const userId = req.userId;

  try {
    const eventRows = await query(
      "SELECT owner_id FROM calendar_events WHERE id=?",
      [eventId]
    );
    if (eventRows.length === 0)
      return res.status(404).json({ message: "Evento no encontrado" });

    const ownerId = eventRows[0].owner_id;
    const userLink = await query(
      "SELECT * FROM calendar_event_users WHERE event_id=? AND user_id=?",
      [eventId, userId]
    );
    if (userLink.length === 0)
      return res.status(403).json({ message: "No tienes permiso para eliminar este evento" });

    if (ownerId === userId) {
      await query("DELETE FROM calendar_event_users WHERE event_id=?", [eventId]);
      await query("DELETE FROM calendar_events WHERE id=?", [eventId]);
      return res.json({ message: "Evento eliminado correctamente", id: eventId });
    }

    await query("DELETE FROM calendar_event_users WHERE event_id=? AND user_id=?", [eventId, userId]);
    res.json({ message: "Has salido del evento", id: eventId });

  } catch (err) {
    console.error("ERROR DB DELETE EVENT:", err);
    res.status(500).json({ message: "Error eliminando evento" });
  }
});

module.exports = router;