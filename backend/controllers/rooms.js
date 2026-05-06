const express = require("express");
const router = express.Router();
const db = require("../db");
const query = require("../helpers/query");
const verifyToken = require("../middleware/verifyToken");

// Crear sala
router.post("/rooms", verifyToken, async (req, res) => {
  const { name, type, userIds, avatar = null } = req.body;
  const createdBy = req.userId;

  if (!type || !userIds || !Array.isArray(userIds))
    return res.status(400).json({ message: "Datos incompletos" });

  // Validaciones para Chat de Grupo (Discord style)
  if (userIds.length > 2) {
    if (userIds.length > 10) {
      return res.status(400).json({ message: "Máximo 10 participantes permitidos" });
    }
    if (!name) {
      return res.status(400).json({ message: "Nombre de grupo requerido" });
    }
  }

  try {
    const isGroup = userIds.length > 2;
    const roomType = isGroup ? 'group' : type;

    const roomResult = await query(
      "INSERT INTO rooms (name, type, owner_id, avatar) VALUES (?, ?, ?, ?)",
      [name || null, roomType, createdBy, avatar]
    );

    const roomId = roomResult.insertId;

    for (const userId of userIds) {
      await query("INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)", [roomId, userId]);
    }

    res.json({ success: true, roomId });

  } catch (err) {
    console.error("ERROR DB CREATE ROOM:", err);
    res.status(500).json({ message: "Error creando sala" });
  }
});

// Marcar sala como leída
router.put("/rooms/:roomId/read", verifyToken, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.userId;

  try {
    const result = await query(
      "UPDATE room_participants SET last_read_at = NOW() WHERE room_id = ? AND user_id = ?",
      [roomId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No se encontró participación en la sala" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("ERROR DB MARK ROOM READ:", err);
    res.status(500).json({ message: "Error marcando como leído" });
  }
});

// Listar salas del usuario con conteo de no leídos y metadata enriquecida
router.get("/rooms", verifyToken, async (req, res) => {
  const userId = req.userId;
  try {
    const [rooms] = await db.query(
      `SELECT 
          r.id, 
          r.name, 
          r.type,
          r.avatar,
          (SELECT COUNT(*) FROM room_participants WHERE room_id = r.id) as participant_count,
          (SELECT COUNT(*) FROM messages m 
           WHERE m.room_id = r.id 
             AND m.sender_id != ? 
             AND (rp.last_read_at IS NULL OR m.created_at > rp.last_read_at)
          ) as unread_count
       FROM rooms r
       JOIN room_participants rp ON r.id = rp.room_id
       LEFT JOIN channels c ON (r.id = c.chat_room_id OR r.id = c.voice_room_id)
       WHERE rp.user_id = ? AND c.id IS NULL AND (r.type = 'chat' OR r.type = 'group')`,
      [userId, userId]
    );

    // Enriquecer salas: si es DM (tipo chat y nombre chat-X-Y), buscar el nombre/avatar del otro
    const enrichedRooms = await Promise.all(rooms.map(async (room) => {
      const isDM = room.type === 'chat' && (room.name && room.name.startsWith('chat-'));
      
      if (isDM && room.participant_count === 2) {
        const [other] = await db.query(
          `SELECT u.id, u.name, u.profile_pic 
           FROM room_participants rp
           JOIN users u ON u.id = rp.user_id
           WHERE rp.room_id = ? AND rp.user_id != ?`,
          [room.id, userId]
        );
        if (other[0]) {
          return {
            ...room,
            display_name: other[0].name,
            display_avatar: other[0].profile_pic,
            display_id: other[0].id
          };
        }
      }
      // Para grupos (>2) o si no se encontró el otro, usar info de la sala
      return {
        ...room,
        display_name: room.name || "Grupo sin nombre",
        display_avatar: room.avatar
      };
    }));

    res.json(enrichedRooms);
  } catch (err) {
    console.error("ERROR GET USER ROOMS:", err);
    res.status(500).json({ message: "Error obteniendo salas" });
  }
});

router.get("/rooms/unread/total", verifyToken, async (req, res) => {
  const userId = req.userId;
  try {
    const [counts] = await db.query(
      `SELECT m.room_id, COUNT(*) as unread_count
       FROM messages m
       JOIN room_participants rp ON m.room_id = rp.room_id
       WHERE rp.user_id = ? 
         AND m.sender_id != ?
         AND (rp.last_read_at IS NULL OR m.created_at > rp.last_read_at)
       GROUP BY m.room_id`,
      [userId, userId]
    );

    const byRoom = {};
    let total = 0;
    counts.forEach(c => {
      byRoom[c.room_id] = c.unread_count;
      total += c.unread_count;
    });

    res.json({ total, byRoom });
  } catch (err) {
    console.error("ERROR GET UNREAD TOTAL:", err);
    res.status(500).json({ message: "Error obteniendo total de no leídos" });
  }
});

// Traer mensajes de sala
router.get("/rooms/:roomId/messages", verifyToken, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.userId;

  try {
    // Verificar que el usuario pertenece a la sala
    const [participants] = await db.query(
      "SELECT * FROM room_participants WHERE room_id=? AND user_id=?",
      [roomId, userId]
    );

    if (participants.length === 0) return res.status(403).json({ error: "No autorizado" });

    // Traer mensajes
    const [messages] = await db.query(
      `SELECT 
          m.id, 
          m.room_id, 
          m.sender_id, 
          m.type, 
          m.content,
          m.caption,                             -- 👈 caption del mensaje
          m.file_size,                           -- 👈 tamaño del archivo
          m.edited,
          m.reply_to_id,
          m.created_at,                          -- 👈 hora
          u.name AS sender_name,
          u.profile_pic AS profile_pic,
          rm.content  AS reply_content,          -- 👈 texto del mensaje citado
          rm.caption  AS reply_caption,          -- 👈 caption del mensaje citado
          ru.name     AS reply_sender_name,      -- 👈 autor del mensaje citado
          CASE WHEN f.id IS NULL THEN 0 ELSE 1 END AS favorite
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      LEFT JOIN messages rm ON rm.id = m.reply_to_id
      LEFT JOIN users    ru ON ru.id = rm.sender_id
      LEFT JOIN favorites f ON f.message_id = m.id AND f.user_id = ?
      WHERE m.room_id = ?
      ORDER BY m.created_at ASC`,
      [userId, roomId]
    );

    const [reads] = await db.query(
      "SELECT user_id, last_read_at FROM room_participants WHERE room_id = ?",
      [roomId]
    );

    const otherReaders = reads.filter(r => r.user_id !== userId);

    const messagesWithRead = messages.map((msg) => {
      const isSentByMe = Number(msg.sender_id) === Number(userId);
      const read = isSentByMe && otherReaders.length > 0 && otherReaders.every((reader) => {
        return reader.last_read_at && new Date(reader.last_read_at) >= new Date(msg.created_at);
      });
      return { ...msg, read };
    });

    res.json(messagesWithRead);

  } catch (err) {
    console.error("ERROR DB GET ROOM MESSAGES:", err);
    res.status(500).json({ message: "Error obteniendo mensajes" });
  }
});

// Enviar mensaje a sala
router.post("/messages", verifyToken, async (req, res) => {
  const { roomId, type, content, caption, replyToId } = req.body; // 👈 agrega caption y replyToId
  const senderId = req.userId;

  if (!roomId || !type || !content)
    return res.status(400).json({ message: "Datos incompletos" });

  try {
    const result = await query(
      "INSERT INTO messages (room_id, sender_id, type, content, caption, file_size, reply_to_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [roomId, senderId, type, content, caption || null, fileSize || null, replyToId || null]
    );

    res.json({ success: true, messageId: result.insertId });
  } catch (err) {
    console.error("ERROR DB POST MESSAGE:", err);
    res.status(500).json({ message: "Error enviando mensaje" });
  }
});

// Traer detalles de una sala (nombre, avatar y participantes)
router.get("/rooms/:roomId/details", verifyToken, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.userId;

  try {
    const [rooms] = await db.query(
      "SELECT id, name, avatar, type, owner_id FROM rooms WHERE id = ?",
      [roomId]
    );
    if (rooms.length === 0) return res.status(404).json({ error: "Sala no encontrada" });
    const room = rooms[0];

    const [participants] = await db.query(
      `SELECT u.id, u.name, u.profile_pic
       FROM room_participants rp
       JOIN users u ON u.id = rp.user_id
       WHERE rp.room_id = ?`,
      [roomId]
    );

    res.json({
      ...room,
      members: participants
    });

  } catch (err) {
    console.error("ERROR GET ROOM DETAILS:", err);
    res.status(500).json({ message: "Error obteniendo detalles de la sala" });
  }
});

// Traer participantes de una sala (excluyendo al usuario que consulta)
router.get("/rooms/:roomId/participants", verifyToken, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.userId;

  try {
    // Verificar que el usuario pertenece a la sala
    const [access] = await db.query(
      "SELECT * FROM room_participants WHERE room_id = ? AND user_id = ?",
      [roomId, userId]
    );
    if (access.length === 0) return res.status(403).json({ error: "No autorizado" });

    // Traer los otros participantes (no el que consulta)
    const [participants] = await db.query(
      `SELECT u.id, u.name, u.profile_pic
       FROM room_participants rp
       JOIN users u ON u.id = rp.user_id
       WHERE rp.room_id = ? AND rp.user_id != ?`,
      [roomId, userId]
    );

    res.json(participants);

  } catch (err) {
    console.error("ERROR GET PARTICIPANTS:", err);
    res.status(500).json({ message: "Error obteniendo participantes" });
  }
});

// Buscar sala directa (tipo "direct") entre el usuario autenticado y otro usuario
router.get("/rooms/direct/:otherUserId", verifyToken, async (req, res) => {
  const userId = req.userId;
  const otherUserId = parseInt(req.params.otherUserId);

  try {
    const [rows] = await db.query(
      `SELECT r.id
       FROM rooms r
       WHERE (r.name = ? OR r.name = ?)
         AND (
           SELECT COUNT(*) FROM room_participants WHERE room_id = r.id
         ) = 2
       LIMIT 1`,
      [
        `chat-${userId}-${otherUserId}`,
        `chat-${otherUserId}-${userId}`
      ]
    );

    if (rows.length === 0) return res.status(404).json({ message: "No existe sala directa" });

    res.json({ roomId: rows[0].id });
  } catch (err) {
    console.error("ERROR GET DIRECT ROOM:", err);
    res.status(500).json({ message: "Error buscando sala" });
  }
});

// Editar mensaje
router.put("/messages/:messageId", verifyToken, async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const userId = req.userId;

  if (!content) return res.status(400).json({ message: "Contenido vacío" });

  try {
    const [msg] = await db.query(
      "SELECT * FROM messages WHERE id = ? AND sender_id = ?",
      [messageId, userId]
    );
    if (msg.length === 0) return res.status(403).json({ error: "No autorizado" });

    await query(
      "UPDATE messages SET content = ?, edited = 1 WHERE id = ?",
      [content, messageId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("ERROR EDIT MESSAGE:", err);
    res.status(500).json({ message: "Error editando mensaje" });
  }
});

// Borrar mensaje
router.delete("/messages/:messageId", verifyToken, async (req, res) => {
  const { messageId } = req.params;
  const userId = req.userId;

  try {
    const [msg] = await db.query(
      "SELECT * FROM messages WHERE id = ? AND sender_id = ?",
      [messageId, userId]
    );
    if (msg.length === 0) return res.status(403).json({ error: "No autorizado" });

    await query("DELETE FROM messages WHERE id = ?", [messageId]);

    res.json({ success: true });
  } catch (err) {
    console.error("ERROR DELETE MESSAGE:", err);
    res.status(500).json({ message: "Error borrando mensaje" });
  }
});

// Transferir ownership de la sala
router.patch("/rooms/:roomId/transfer", verifyToken, async (req, res) => {
  const { roomId } = req.params;
  const { newOwnerId } = req.body;
  const userId = req.userId;

  try {
    const room = await query(
      "SELECT * FROM rooms WHERE id=? AND owner_id=?",
      [roomId, userId]
    );
    if (room.length === 0)
      return res.status(403).json({ message: "No eres owner de la sala" });

    // Verificar que el nuevo owner es participante
    const participant = await query(
      "SELECT * FROM room_participants WHERE user_id=? AND room_id=?",
      [newOwnerId, roomId]
    );
    if (participant.length === 0)
      return res.status(400).json({ message: "El usuario no pertenece a la sala" });

    await query(
      "UPDATE rooms SET owner_id=? WHERE id=?",
      [newOwnerId, roomId]
    );

    res.json({ success: true, message: "Ownership transferido" });
  } catch (err) {
    console.error("ERROR DB TRANSFER ROOM:", err);
    res.status(500).json({ message: "Error al transferir ownership" });
  }
});

// Salirse de una sala
router.post("/rooms/:roomId/leave", verifyToken, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.userId;

  try {
    const room = await query("SELECT owner_id FROM rooms WHERE id = ?", [roomId]);
    if (room.length === 0) return res.status(404).json({ message: "Sala no encontrada" });

    if (room[0].owner_id === userId) {
      return res.status(400).json({
        message: "No puedes salirte siendo el owner. Transfiere el mando o elimina la sala."
      });
    }

    const result = await query(
      "DELETE FROM room_participants WHERE room_id = ? AND user_id = ?",
      [roomId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "No eres participante de esta sala" });
    }

    res.json({ success: true, message: "Has salido de la sala" });
  } catch (err) {
    console.error("ERROR LEAVE ROOM:", err);
    res.status(500).json({ message: "Error al salir de la sala" });
  }
});

// Eliminar sala (incluyendo chats de 10 personas)
router.delete("/rooms/:roomId", verifyToken, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.userId;

  try {
    const room = await query("SELECT owner_id FROM rooms WHERE id = ?", [roomId]);
    if (room.length === 0) return res.status(404).json({ message: "Sala no encontrada" });

    const [user] = await query("SELECT rol FROM users WHERE id=?", [userId]);
    const isAdmin = user?.rol === 'admin';
    const isOwner = room[0].owner_id === userId;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "No tienes permisos para eliminar esta sala" });
    }

    // Limpiar mensajes y participantes
    await query("DELETE FROM messages WHERE room_id = ?", [roomId]);
    await query("DELETE FROM room_participants WHERE room_id = ?", [roomId]);
    await query("DELETE FROM rooms WHERE id = ?", [roomId]);

    res.json({ success: true, message: "Sala eliminada correctamente" });
  } catch (err) {
    console.error("ERROR DELETE ROOM:", err);
    res.status(500).json({ message: "Error al eliminar la sala" });
  }
});

module.exports = router;
