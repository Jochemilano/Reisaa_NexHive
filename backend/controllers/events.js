const express = require("express");
const router = express.Router();
const query = require("../helpers/query");
const verifyToken = require("../middleware/verifyToken");

// Crear evento personal
router.post("/events", verifyToken, async (req, res) => {
  const { title, description, start, end } = req.body;
  const userId = req.userId;

  if (!title || !start || !end) return res.status(400).json({ message: "Datos incompletos" });

  try {
    const eventResult = await query(
      `INSERT INTO calendar_events
       (title, description, start_datetime, end_datetime, type, created_by)
       VALUES (?, ?, ?, ?, 'PERSONAL', ?)`,
      [title, description || null, start, end, userId]
    );

    const eventId = eventResult.insertId;

    await query(
      "INSERT INTO calendar_event_users (user_id, event_id) VALUES (?, ?)",
      [userId, eventId]
    );

    res.json({
      id: eventId,
      title,
      description: description || null,
      start,
      end,
      type: "PERSONAL",
      created_by: userId
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
    const results = await query(
      `SELECT e.id, e.title, e.description,
              e.start_datetime AS start,
              e.end_datetime AS end,
              e.type,
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

    res.json(results);

  } catch (err) {
    console.error("ERROR DB GET EVENTS:", err);
    res.status(500).json({ message: "Error obteniendo eventos" });
  }
});

// Editar evento personal
router.put("/events/:id", verifyToken, async (req, res) => {
  const eventId = req.params.id;
  const userId = req.userId;
  const { title, description, start, end } = req.body;

  try {
    const check = await query(
      "SELECT * FROM calendar_event_users WHERE event_id=? AND user_id=?",
      [eventId, userId]
    );
    if (check.length === 0)
      return res.status(403).json({ message: "No tienes permiso para editar este evento" });

    await query(
      `UPDATE calendar_events
       SET title=?, description=?, start_datetime=?, end_datetime=?
       WHERE id=?`,
      [title, description || null, start, end, eventId]
    );

    res.json({ message: "Evento actualizado correctamente" });

  } catch (err) {
    console.error("ERROR DB UPDATE EVENT:", err);
    res.status(500).json({ message: "Error actualizando evento" });
  }
});

// Eliminar evento personal
router.delete("/events/:id", verifyToken, async (req, res) => {
  const eventId = req.params.id;
  const userId = req.userId;

  try {
    const check = await query(
      "SELECT * FROM calendar_event_users WHERE event_id=? AND user_id=?",
      [eventId, userId]
    );
    if (check.length === 0)
      return res.status(403).json({ message: "No tienes permiso para eliminar este evento" });

    await query("DELETE FROM calendar_event_users WHERE event_id=? AND user_id=?", [eventId, userId]);
    await query("DELETE FROM calendar_events WHERE id=?", [eventId]);

    res.json({ message: "Evento eliminado correctamente", id: eventId });

  } catch (err) {
    console.error("ERROR DB DELETE EVENT:", err);
    res.status(500).json({ message: "Error eliminando evento" });
  }
});

module.exports = router;