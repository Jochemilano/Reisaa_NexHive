const express = require("express");
const router = express.Router();
const query = require("../helpers/query");
const verifyToken = require("../middleware/verifyToken");

// Crear grupo
router.post("/groups", verifyToken, async (req, res) => {
  const { name, collaborators = [], avatar = null } = req.body;
  const ownerId = req.userId;

  if (!name) return res.status(400).json({ message: "Nombre requerido" });

  try {
    const result = await query(
      "INSERT INTO groups (name, owner_id, avatar) VALUES (?, ?, ?)",
      [name, ownerId, avatar]
    );
    const groupId = result.insertId;

    // Agregar owner
    await query(
      "INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)",
      [ownerId, groupId]
    );

    // Agregar colaboradores excluyendo owner
    if (collaborators.length > 0) {
      const filtered = collaborators.filter(id => id !== ownerId);
      if (filtered.length > 0) {
        const values = filtered.map(id => [id, groupId]);
        await query("INSERT INTO user_groups (user_id, group_id) VALUES ?", [values]);
      }
    }

    const allUsers = [ownerId, ...collaborators.filter(id => id !== ownerId)];

    // Crear rooms
    const chatRoom = await query(
      "INSERT INTO rooms (name, type, owner_id) VALUES (?, ?, ?)",
      ["general-chat", "chat", ownerId]
    );
    const voiceRoom = await query(
      "INSERT INTO rooms (name, type, owner_id) VALUES (?, ?, ?)",
      ["general-voice", "voice", ownerId]
    );

    const chatRoomId = chatRoom.insertId;
    const voiceRoomId = voiceRoom.insertId;

    if (allUsers.length > 0) {
      const chatValues = allUsers.map(id => [chatRoomId, id]);
      const voiceValues = allUsers.map(id => [voiceRoomId, id]);
      await query("INSERT INTO room_participants (room_id, user_id) VALUES ?", [chatValues]);
      await query("INSERT INTO room_participants (room_id, user_id) VALUES ?", [voiceValues]);
    }

    await query(
      "INSERT INTO channels (group_id, voice_room_id, chat_room_id) VALUES (?, ?, ?)",
      [groupId, voiceRoomId, chatRoomId]
    );

    res.json({
      id: groupId,
      name,
      owner_id: ownerId,
      chat_room_id: chatRoomId,
      voice_room_id: voiceRoomId,
      collaborators,
    });
  } catch (err) {
    console.error("ERROR DB CREATE GROUP:", err);
    res.status(500).json({ message: "Error al crear grupo" });
  }
});

// Traer grupos del usuario
router.get("/groups", verifyToken, async (req, res) => {
  const userId = req.userId;

  try {
    const results = await query(
      `SELECT g.id, g.name, g.owner_id, g.avatar, c.chat_room_id
       FROM groups g
       JOIN user_groups ug ON g.id = ug.group_id
       LEFT JOIN channels c ON c.group_id = g.id
       WHERE ug.user_id = ?`,
      [userId]
    );
    res.json(results);
  } catch (err) {
    console.error("ERROR DB GET GROUPS:", err);
    res.status(500).json({ message: "Error al traer grupos" });
  }
});

// Detalles del grupo — solo canales y miembros
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

    // Info del grupo
    const groupInfo = await query(
      `SELECT g.id, g.name, g.avatar, g.owner_id, u.name AS owner_name
       FROM groups g
       JOIN users u ON u.id = g.owner_id
       WHERE g.id = ?`,
      [groupId]
    );

    // Canales
    const channels = await query(
      "SELECT id, chat_room_id, voice_room_id FROM channels WHERE group_id=?",
      [groupId]
    );

    // Miembros
    const members = await query(
      `SELECT u.id, u.name, u.profile_pic
       FROM users u
       JOIN user_groups ug ON u.id = ug.user_id
       WHERE ug.group_id = ?`,
      [groupId]
    );

    res.json({
      ...groupInfo[0],
      channels,
      members,
    });
  } catch (err) {
    console.error("ERROR DB GROUP DETAILS:", err);
    res.status(500).json({ message: "Error al traer detalles del grupo" });
  }
});

// Traer usuarios del grupo
router.get("/groups/:groupId/users", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    const userGroup = await query(
      "SELECT * FROM user_groups WHERE user_id=? AND group_id=?",
      [userId, groupId]
    );
    if (userGroup.length === 0)
      return res.status(403).json({ message: "No pertenece al grupo" });

    const users = await query(
      `SELECT u.id, u.name
       FROM users u
       JOIN user_groups ug ON u.id = ug.user_id
       WHERE ug.group_id = ?`,
      [groupId]
    );
    res.json(users);
  } catch (err) {
    console.error("ERROR DB GET GROUP USERS:", err);
    res.status(500).json({ message: "Error al traer usuarios del grupo" });
  }
});

// Editar grupo — solo owner
router.patch("/groups/:groupId", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const { name, avatar, collaborators } = req.body;
  const userId = req.userId;

  try {
    const groupRows = await query(
      "SELECT * FROM groups WHERE id=?",
      [groupId]
    );
    if (groupRows.length === 0)
      return res.status(404).json({ message: "Grupo no encontrado" });

    const [user] = await query("SELECT rol FROM users WHERE id=?", [userId]);
    const isAdmin = user?.rol === 'admin';
    const isOwner = groupRows[0].owner_id === userId;

    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "No tienes permisos (No eres owner ni admin)" });

    await query(
      `UPDATE groups 
       SET name = COALESCE(?, name),
           avatar = COALESCE(?, avatar)
       WHERE id = ?`,
      [name ?? null, avatar ?? null, groupId]
    );

    if (Array.isArray(collaborators)) {
      await query(
        "DELETE FROM user_groups WHERE group_id=? AND user_id != ?",
        [groupId, userId]
      );

      const channel = await query(
        "SELECT chat_room_id, voice_room_id FROM channels WHERE group_id=?",
        [groupId]
      );

      if (channel.length > 0) {
        const { chat_room_id, voice_room_id } = channel[0];

        await query(
          "DELETE FROM room_participants WHERE room_id IN (?, ?) AND user_id != ?",
          [chat_room_id, voice_room_id, userId]
        );

        if (collaborators.length > 0) {
          const filtered = collaborators.filter(id => id !== userId);
          if (filtered.length > 0) {
            const groupValues = filtered.map(id => [id, groupId]);
            const chatValues = filtered.map(id => [chat_room_id, id]);
            const voiceValues = filtered.map(id => [voice_room_id, id]);

            await query("INSERT INTO user_groups (user_id, group_id) VALUES ?", [groupValues]);
            await query("INSERT INTO room_participants (room_id, user_id) VALUES ?", [chatValues]);
            await query("INSERT INTO room_participants (room_id, user_id) VALUES ?", [voiceValues]);
          }
        }
      }
    }

    res.json({ message: "Grupo actualizado" });
  } catch (err) {
    console.error("ERROR DB UPDATE GROUP:", err);
    res.status(500).json({ message: "Error al actualizar grupo" });
  }
});

// Transferir ownership del grupo
router.patch("/groups/:groupId/transfer", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const { newOwnerId } = req.body;
  const userId = req.userId;

  try {
    const group = await query(
      "SELECT * FROM groups WHERE id=? AND owner_id=?",
      [groupId, userId]
    );
    if (group.length === 0)
      return res.status(403).json({ message: "No eres owner del grupo" });

    // Verificar que el nuevo owner es miembro del grupo
    const member = await query(
      "SELECT * FROM user_groups WHERE user_id=? AND group_id=?",
      [newOwnerId, groupId]
    );
    if (member.length === 0)
      return res.status(400).json({ message: "El usuario no pertenece al grupo" });

    await query(
      "UPDATE groups SET owner_id=? WHERE id=?",
      [newOwnerId, groupId]
    );

    res.json({ message: "Ownership transferido" });
  } catch (err) {
    console.error("ERROR DB TRANSFER GROUP:", err);
    res.status(500).json({ message: "Error al transferir ownership" });
  }
});

// Eliminar grupo — solo owner
router.delete("/groups/:groupId", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    const groupRows = await query(
      "SELECT * FROM groups WHERE id=?",
      [groupId]
    );
    if (groupRows.length === 0)
      return res.status(404).json({ message: "Grupo no encontrado" });

    const [user] = await query("SELECT rol FROM users WHERE id=?", [userId]);
    const isAdmin = user?.rol === 'admin';
    const isOwner = groupRows[0].owner_id === userId;

    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "No tienes permisos (No eres owner ni admin)" });

    // Traer canales para limpiar rooms y participantes
    const channels = await query("SELECT chat_room_id, voice_room_id FROM channels WHERE group_id=?", [groupId]);

    for (const channel of channels) {
      await query("DELETE FROM room_participants WHERE room_id IN (?, ?)", [channel.chat_room_id, channel.voice_room_id]);
      await query("DELETE FROM rooms WHERE id IN (?, ?)", [channel.chat_room_id, channel.voice_room_id]);
    }

    await query("DELETE FROM channels WHERE group_id=?", [groupId]);
    await query("DELETE FROM user_groups WHERE group_id=?", [groupId]);

    // Eliminar el grupo
    await query("DELETE FROM groups WHERE id=?", [groupId]);

    res.json({ message: "Grupo eliminado correctamente" });
  } catch (err) {
    console.error("ERROR DB DELETE GROUP:", err);
    res.status(500).json({ message: "Error al eliminar grupo" });
  }
});

// Salirse de un grupo
router.post("/groups/:groupId/leave", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    const groupRows = await query(
      "SELECT owner_id FROM groups WHERE id=?",
      [groupId]
    );
    if (groupRows.length === 0)
      return res.status(404).json({ message: "Grupo no encontrado" });

    if (groupRows[0].owner_id === userId) {
      return res.status(400).json({ 
        message: "No puedes salirte siendo el owner. Transfiere el mando antes de salir." 
      });
    }

    // Traer canales para limpiar participantes de los rooms asociados
    const channels = await query(
      "SELECT chat_room_id, voice_room_id FROM channels WHERE group_id=?",
      [groupId]
    );

    for (const channel of channels) {
      await query(
        "DELETE FROM room_participants WHERE room_id IN (?, ?) AND user_id = ?",
        [channel.chat_room_id, channel.voice_room_id, userId]
      );
    }

    // Eliminar de user_groups
    const result = await query(
      "DELETE FROM user_groups WHERE group_id = ? AND user_id = ?",
      [groupId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No eres miembro de este grupo" });
    }

    res.json({ success: true, message: "Has salido del grupo" });
  } catch (err) {
    console.error("ERROR LEAVE GROUP:", err);
    res.status(500).json({ message: "Error al salir del grupo" });
  }
});

module.exports = router;