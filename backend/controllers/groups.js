const express = require("express");
const router = express.Router();
const query = require("../helpers/query");
const verifyToken = require("../middleware/verifyToken");

// Crear grupo
router.post("/groups", verifyToken, async (req, res) => {
  const { name, collaborators = [], avatar = null } = req.body;
  const adminId = req.userId;

  if (!name) return res.status(400).json({ message: "Nombre requerido" });

  try {
    const result = await query(
      "INSERT INTO groups (name, admin_id, avatar) VALUES (?, ?, ?)",
      [name, adminId, avatar]
    );

    const groupId = result.insertId;

    await query(
      "INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)",
      [adminId, groupId]
    );

    if (collaborators.length > 0) {
      const values = collaborators.map(userId => [userId, groupId]);
      await query("INSERT INTO user_groups (user_id, group_id) VALUES ?", [values]);
    }

    const allUsers = [adminId, ...collaborators];

    const chatRoom = await query(
      "INSERT INTO rooms (name, type, created_by) VALUES (?, ?, ?)",
      ["general-chat", "chat", adminId]
    );
    const chatRoomId = chatRoom.insertId;

    const voiceRoom = await query(
      "INSERT INTO rooms (name, type, created_by) VALUES (?, ?, ?)",
      ["general-voice", "voice", adminId]
    );
    const voiceRoomId = voiceRoom.insertId;

    if (allUsers.length > 0) {
      const chatValues = allUsers.map(userId => [chatRoomId, userId]);
      await query("INSERT INTO room_participants (room_id, user_id) VALUES ?", [chatValues]);

      const voiceValues = allUsers.map(userId => [voiceRoomId, userId]);
      await query("INSERT INTO room_participants (room_id, user_id) VALUES ?", [voiceValues]);
    }

    await query(
      "INSERT INTO channels (group_id, voice_room_id, chat_room_id) VALUES (?, ?, ?)",
      [groupId, voiceRoomId, chatRoomId]
    );

    res.json({
      id: groupId,
      name,
      admin_id: adminId,
      chat_room_id: chatRoomId,
      voice_room_id: voiceRoomId,
      collaborators,
    });
  } catch (err) {
    console.error("ERROR DB GROUP:", err);
    res.status(500).json({ message: "Error al crear grupo" });
  }
});

// Traer grupos de usuario
router.get("/groups", verifyToken, async (req, res) => {
  const userId = req.userId;

  try {
    const results = await query(
      `SELECT g.id, g.name, g.admin_id, g.avatar
       FROM groups g
       JOIN user_groups ug ON g.id = ug.group_id
       WHERE ug.user_id = ?`,
      [userId]
    );
    res.json(results);
  } catch (err) {
    console.error("ERROR DB GET GROUPS:", err);
    res.status(500).json({ message: "Error al traer grupos" });
  }
});

// Detalles de grupo — incluye created_by_name en actividades
router.get("/groups/:groupId/details", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    const userGroup = await query(
      "SELECT * FROM user_groups WHERE user_id=? AND group_id=?",
      [userId, groupId]
    );

    if (userGroup.length === 0)
      return res.status(403).json({ message: "No pertenece al grupo" });

    const channels = await query(
      "SELECT id, chat_room_id, voice_room_id FROM channels WHERE group_id=?",
      [groupId]
    );

    const rows = await query(
      `SELECT
         p.id          AS project_id,
         p.name        AS project_name,
         a.id          AS activity_id,
         a.name        AS activity_name,
         a.description AS activity_description,
         a.status      AS activity_status,
         a.start_date,
         a.deadline,
         a.created_by  AS activity_created_by,
         u.name        AS created_by_name
       FROM projects p
       LEFT JOIN activities a ON a.project_id = p.id
       LEFT JOIN users u ON u.id = a.created_by
       WHERE p.group_id = ?
       ORDER BY p.id, a.id`,
      [groupId]
    );

    // Agrupar filas en proyectos con sus actividades
    const projectsMap = new Map();
    for (const row of rows) {
      if (!projectsMap.has(row.project_id)) {
        projectsMap.set(row.project_id, {
          id: row.project_id,
          name: row.project_name,
          activities: [],
        });
      }
      if (row.activity_id) {
        projectsMap.get(row.project_id).activities.push({
          id: row.activity_id,
          name: row.activity_name,
          description: row.activity_description,
          status: row.activity_status,
          start_date: row.start_date,
          deadline: row.deadline,
          created_by: row.activity_created_by,
          created_by_name: row.created_by_name,
        });
      }
    }

    res.json({ channels, projects: [...projectsMap.values()] });
  } catch (err) {
    console.error("ERROR DB GROUP DETAILS:", err);
    res.status(500).json({ message: "Error al traer detalles del grupo" });
  }
});

//Traer usuarios del gpo
router.get("/groups/:groupId/users", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    // Verificar que el usuario pertenece al grupo
    const userGroup = await query(
      "SELECT * FROM user_groups WHERE user_id=? AND group_id=?",
      [userId, groupId]
    );

    if (!userGroup || userGroup.length === 0) {
      return res.status(403).json({ message: "No pertenece al grupo" });
    }

    // Traer usuarios del grupo
    const users = await query(
      `SELECT u.id, u.name
      FROM users u
      JOIN user_groups ug ON u.id = ug.user_id
      WHERE ug.group_id = ?`,
      [groupId]
    );

    res.json(users || []);
  } catch (err) {
    console.error("ERROR DB GET GROUP USERS:", err);
    res.status(500).json({ message: "Error al traer usuarios del grupo" });
  }
});

//Editar gpo
router.patch("/groups/:groupId", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const { name, avatar, collaborators } = req.body;
  const userId = req.userId;

  try {
    // Verificar que el usuario es admin del grupo
    const group = await query(
      "SELECT * FROM groups WHERE id=? AND admin_id=?",
      [groupId, userId]
    );

    if (group.length === 0) {
      return res.status(403).json({ message: "No eres admin del grupo" });
    }

    // ACTUALIZAR GRUPO
    await query(
      `UPDATE groups 
       SET name = COALESCE(?, name),
           avatar = COALESCE(?, avatar)
       WHERE id = ?`,
      [name ?? null, avatar ?? null, groupId]
    );

    // ACTUALIZAR COLABORADORES
    if (Array.isArray(collaborators)) {
      // eliminar todos excepto admin
      await query(
        "DELETE FROM user_groups WHERE group_id=? AND user_id != ?",
        [groupId, userId]
      );

      // insertar nuevos
      if (collaborators.length > 0) {
        const values = collaborators.map(id => [id, groupId]);

        await query(
          "INSERT INTO user_groups (user_id, group_id) VALUES ?",
          [values]
        );
      }
    }

    res.json({ message: "Grupo actualizado" });

  } catch (err) {
    console.error("ERROR DB UPDATE GROUP:", err);
    res.status(500).json({ message: "Error al actualizar grupo" });
  }
});

module.exports = router;