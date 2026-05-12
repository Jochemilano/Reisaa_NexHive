const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/verifyToken");

function formatDateForSQL(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d)) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

// Obtener mis actividades (trabajando)
router.get("/my-activities", verifyToken, async (req, res) => {
  const userId = req.userId;
  try {
    const [activities] = await db.query(
      `SELECT a.id, a.name AS activity_name, a.status, a.description,
              p.id AS project_id, p.name AS project_name, 
              g.id AS group_id, g.name AS group_name
       FROM activities a
       JOIN projects p ON a.project_id = p.id
       JOIN groups g ON p.group_id = g.id
       JOIN user_activities ua ON a.id = ua.activity_id
       WHERE ua.user_id = ? 
         AND a.status IN ('in_progress', 'in-progress')
       ORDER BY a.id DESC`,
      [userId]
    );
    res.json(activities);
  } catch (err) {
    console.error("ERROR DB GET MY ACTIVITIES:", err);
    res.status(500).json({ message: "Error al obtener tus actividades", error: err.message });
  }
});

// Crear actividad
router.post("/activities", verifyToken, async (req, res) => {
  const { name, projectId, description, status, start_date, deadline, collaborators } = req.body;
  const userId = req.userId;

  if (!name || !projectId)
    return res.status(400).json({ message: "Datos incompletos" });

  try {
    const [check] = await db.query(
      "SELECT * FROM users_projects WHERE user_id=? AND project_id=?",
      [userId, projectId]
    );
    if (check.length === 0)
      return res.status(403).json({ message: "No tiene acceso a este proyecto" });

    const startDateTime = start_date ? new Date(start_date) : null;
    const deadlineDateTime = deadline ? new Date(deadline) : null;

    const startSQL = startDateTime ? formatDateForSQL(startDateTime) : null;
    const deadlineSQL = deadlineDateTime ? formatDateForSQL(deadlineDateTime) : null;

    const [activityResult] = await db.query(
      `INSERT INTO activities (name, project_id, description, status, start_date, deadline, owner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, projectId, description || "", status || "pending",
        startSQL,
        deadlineSQL,
        userId]
    );
    const activityId = activityResult.insertId;

    // Agregar owner a user_activities
    await db.query(
      "INSERT INTO user_activities (user_id, activity_id) VALUES (?, ?)",
      [userId, activityId]
    );

    // Agregar colaboradores
    if (Array.isArray(collaborators) && collaborators.length > 0) {
      const filtered = collaborators.filter(id => id !== userId);
      if (filtered.length > 0) {
        const values = filtered.map(id => [id, activityId]);
        await db.query(
          "INSERT INTO user_activities (user_id, activity_id) VALUES ?",
          [values]
        );
      }
    }

    // Calendario
    const [eventResult] = await db.query(
      `INSERT INTO calendar_events (title, description, start_datetime, end_datetime, type, owner_id)
       VALUES (?, ?, ?, ?, 'ACTIVITY', ?)`,
      [name, description || "", formatDateForSQL(startDateTime), formatDateForSQL(deadlineDateTime), userId]
    );
    await db.query(
      "INSERT INTO calendar_event_activities (event_id, activity_id) VALUES (?, ?)",
      [eventResult.insertId, activityId]
    );

    const [userRows] = await db.query("SELECT name FROM users WHERE id = ?", [userId]);

    res.json({
      id: activityId,
      name,
      project_id: projectId,
      description: description || "",
      status: status || "pending",
      start_date: startDateTime ? startDateTime.toISOString() : null,
      deadline: deadlineDateTime ? deadlineDateTime.toISOString() : null,
      owner_id: userId,
      owner_name: userRows[0]?.name ?? null,
      calendar_event: {
        id: eventResult.insertId,
        title: name,
        description: description || "",
        start: startDateTime ? startDateTime.toISOString() : null,
        end: deadlineDateTime ? deadlineDateTime.toISOString() : null,
      },
    });
  } catch (err) {
    console.error("ERROR DB CREATE ACTIVITY:", err);
    res.status(500).json({ message: "Error creando actividad", error: err.message });
  }
});

// Traer detalle de actividad
router.get("/activities/:id", verifyToken, async (req, res) => {
  const activityId = req.params.id;
  const userId = req.userId;

  try {
    const [rows] = await db.query(
      `SELECT a.id, a.name, a.description, a.status, a.start_date, a.deadline,
              a.project_id, a.owner_id, u.name AS owner_name, u.profile_pic AS owner_avatar, p.group_id
       FROM activities a
       JOIN projects p ON a.project_id = p.id
       LEFT JOIN users u ON u.id = a.owner_id
       WHERE a.id = ?`,
      [activityId]
    );

    const activity = rows[0];
    if (!activity)
      return res.status(404).json({ message: "Actividad no encontrada" });

    const [check] = await db.query(
      "SELECT * FROM user_groups WHERE user_id=? AND group_id=?",
      [userId, activity.group_id]
    );
    if (check.length === 0)
      return res.status(403).json({ message: "No tiene acceso a esta actividad" });

    res.json({
      id: activity.id,
      name: activity.name,
      description: activity.description,
      status: activity.status,
      start_date: activity.start_date,
      deadline: activity.deadline,
      project_id: activity.project_id,
      owner_id: activity.owner_id,
      owner_name: activity.owner_name,
      owner_avatar: activity.owner_avatar,
    });
  } catch (err) {
    console.error("ERROR DB GET ACTIVITY:", err);
    res.status(500).json({ message: "Error al obtener actividad", error: err.message });
  }
});

// Traer usuarios de una actividad
router.get("/activities/:id/users", verifyToken, async (req, res) => {
  const activityId = req.params.id;
  const userId = req.userId;

  try {
    const [activityRows] = await db.query(
      `SELECT p.group_id FROM activities a
       JOIN projects p ON a.project_id = p.id
       WHERE a.id = ?`,
      [activityId]
    );

    if (activityRows.length === 0) {
      return res.status(404).json({ message: "Actividad no encontrada" });
    }

    const [check] = await db.query(
      "SELECT * FROM user_groups WHERE user_id=? AND group_id=?",
      [userId, activityRows[0].group_id]
    );
    if (check.length === 0)
      return res.status(403).json({ message: "No tiene acceso a esta actividad" });

    const [users] = await db.query(
      `SELECT u.id, u.name, u.email, u.profile_pic AS avatar FROM users u
       JOIN user_activities ua ON u.id = ua.user_id
       WHERE ua.activity_id = ?`,
      [activityId]
    );
    res.json(users);
  } catch (err) {
    console.error("ERROR DB GET ACTIVITY USERS:", err);
    res.status(500).json({ message: "Error al traer usuarios de la actividad" });
  }
});

// Editar actividad — solo owner
router.put("/activities/:id", verifyToken, async (req, res) => {
  const activityId = req.params.id;
  const { name, description, status, start_date, deadline, collaborators } = req.body;
  const userId = req.userId;

  if (!name) return res.status(400).json({ message: "Nombre requerido" });

  try {
    const [rows] = await db.query(
      `SELECT a.id, a.owner_id, a.project_id, p.group_id
       FROM activities a
       JOIN projects p ON a.project_id = p.id
       WHERE a.id = ?`,
      [activityId]
    );

    const activity = rows[0];
    if (!activity)
      return res.status(404).json({ message: "Actividad no encontrada" });

    await db.query(
      `UPDATE activities SET name=?, description=?, status=?, start_date=?, deadline=? WHERE id=?`,
      [name, description || "", status || "pending",
        formatDateForSQL(start_date), formatDateForSQL(deadline), activityId]
    );

    await db.query(
      `UPDATE calendar_events e
       JOIN calendar_event_activities cea ON e.id = cea.event_id
       SET e.title=?, e.description=?, e.start_datetime=?, e.end_datetime=?
       WHERE cea.activity_id=?`,
      [name, description || "", formatDateForSQL(start_date), formatDateForSQL(deadline), activityId]
    );

    // Actualizar colaboradores
    if (Array.isArray(collaborators)) {
      // Eliminar todos excepto al owner
      await db.query(
        "DELETE FROM user_activities WHERE activity_id=? AND user_id != ?",
        [activityId, activity.owner_id]
      );

      if (collaborators.length > 0) {
        // Filtrar al owner de los nuevos colaboradores para no duplicar
        const filtered = collaborators.filter(id => Number(id) !== Number(activity.owner_id));
        if (filtered.length > 0) {
          const values = filtered.map(id => [id, activityId]);
          await db.query(
            "INSERT INTO user_activities (user_id, activity_id) VALUES ?",
            [values]
          );
        }
      }
    }

    res.json({
      id: activityId,
      name,
      description: description || "",
      status: status || "pending",
      start_date: start_date || null,
      deadline: deadline || null,
    });
  } catch (err) {
    console.error("ERROR DB UPDATE ACTIVITY:", err);
    res.status(500).json({ message: "Error actualizando actividad", error: err.message });
  }
});

// Transferir ownership de actividad
router.patch("/activities/:id/transfer", verifyToken, async (req, res) => {
  const activityId = req.params.id;
  const { newOwnerId } = req.body;
  const userId = req.userId;

  try {
    const [rows] = await db.query(
      "SELECT * FROM activities WHERE id=? AND owner_id=?",
      [activityId, userId]
    );
    if (rows.length === 0)
      return res.status(403).json({ message: "No eres owner de esta actividad" });

    const [member] = await db.query(
      "SELECT * FROM user_activities WHERE user_id=? AND activity_id=?",
      [newOwnerId, activityId]
    );
    if (member.length === 0)
      return res.status(400).json({ message: "El usuario no pertenece a la actividad" });

    await db.query(
      "UPDATE activities SET owner_id=? WHERE id=?",
      [newOwnerId, activityId]
    );

    res.json({ message: "Ownership transferido" });
  } catch (err) {
    console.error("ERROR DB TRANSFER ACTIVITY:", err);
    res.status(500).json({ message: "Error al transferir ownership" });
  }
});

// Eliminar actividad — solo owner
router.delete("/activities/:id", verifyToken, async (req, res) => {
  const activityId = req.params.id;
  const userId = req.userId;

  try {
    const [rows] = await db.query(
      "SELECT * FROM activities WHERE id=?",
      [activityId]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Actividad no encontrada" });

    // 1. Obtener IDs de eventos vinculados
    const [events] = await db.query(
      "SELECT event_id FROM calendar_event_activities WHERE activity_id = ?",
      [activityId]
    );

    // 2. Limpiar tabla pivot
    await db.query("DELETE FROM calendar_event_activities WHERE activity_id=?", [activityId]);

    // 3. Limpiar eventos de calendario
    if (events.length > 0) {
      const eventIds = events.map(e => e.event_id);
      await db.query("DELETE FROM calendar_events WHERE id IN (?)", [eventIds]);
    }

    // 4. Limpiar usuarios
    await db.query("DELETE FROM user_activities WHERE activity_id=?", [activityId]);

    // 5. Eliminar actividad
    await db.query("DELETE FROM activities WHERE id=?", [activityId]);

    res.json({ message: "Actividad eliminada correctamente" });
  } catch (err) {
    console.error("ERROR DB DELETE ACTIVITY:", err);
    res.status(500).json({ message: "Error al eliminar actividad", error: err.message });
  }
});

module.exports = router;