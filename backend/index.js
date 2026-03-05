const express = require("express");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const db = require("./db");
const query = require("./helpers/query");
//--------------------
const http = require("http");
const { Server } = require("socket.io");
//-------------------
const app = express();
app.use(cors());
app.use(express.json());

//------------------------------------------------------------Servidor----------------------------------------------------------------
app.get("/", (req, res) => res.send("Servidor corriendo"));

// Endpoint de prueba DB
app.get("/test-db", async (req, res) => {
  try {
    const results = await query("SELECT 1+1 AS resultado");
    res.json(results);
  } catch (err) {
    console.error("ERROR DB TEST:", err);
    res.status(500).json({ message: "Error de conexión con la DB" });
  }
});

//-----------------------------------------------------------Verificar token-------------------------------------------------------------
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  //console.log("💬 Header Authorization:", auth);

  if (!auth) return res.sendStatus(401);

  const token = auth.split(" ")[1];

  jwt.verify(token, "SECRETO_SUPER_SEGURO", (err, decoded) => {
    if (err) {
      console.log("❌ JWT inválido:", err.message);
      return res.sendStatus(403);
    }
    req.userId = decoded.id;
    next();
  });
}

//-----------------------------------------------------------Login--------------------------------------------------------------------
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const results = await query(
      "SELECT id, name, email, status, rol FROM users WHERE email=? AND password=?",
      [email, password]
    );

    if (results.length === 0) {
      return res.status(401).json({ message: "Usuario no encontrado" });
    }

    const user = results[0];

    // 🔑 Crear token
    const token = jwt.sign({ id: user.id }, "SECRETO_SUPER_SEGURO", { expiresIn: "1d" });

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.name,
        email: user.email,
        estado: user.status,
        rol: user.rol
      }
    });

  } catch (err) {
    console.error("ERROR DB LOGIN:", err);
    res.status(500).json({ message: "Error de servidor" });
  }
});

//-----------------------------------------------------------Traer datos perfil-----------------------------------------------------------
app.get("/api/perfil", verifyToken, async (req, res) => {
  try {
    const results = await query(
      "SELECT name, email, status FROM users WHERE id=?",
      [req.userId]
    );

    if (!results[0]) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json(results[0]);
  } catch (err) {
    console.error("ERROR DB PERFIL:", err);
    res.status(500).json({ message: "Error en la base de datos" });
  }
});

//-----------------------------------------------------------Groups-----------------------------------------------------------
app.post("/api/groups", verifyToken, async (req, res) => {
  const { name } = req.body;
  const adminId = req.userId;

  if (!name) return res.status(400).json({ message: "Nombre requerido" });

  try {
    // 1️⃣ Insertar grupo
    const result = await query(
      "INSERT INTO groups (name, admin_id) VALUES (?, ?)",
      [name, adminId]
    );

    const groupId = result.insertId;

    // 2️⃣ Asignar usuario al grupo
    await query(
      "INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)",
      [adminId, groupId]
    );

    // 3️⃣ Responder con los datos del grupo
    res.json({
      id: groupId,
      name,
      admin_id: adminId
    });

  } catch (err) {
    console.error("ERROR DB GROUP:", err);
    res.status(500).json({ message: "Error al crear grupo" });
  }
});
//---------------------------------------------------Traer grupos de un usuario
app.get("/api/groups", verifyToken, async (req, res) => {
  const userId = req.userId;

  const sql = `
    SELECT g.id, g.name, g.admin_id
    FROM groups g
    JOIN user_groups ug ON g.id = ug.group_id
    WHERE ug.user_id = ?
  `;

  try {
    const results = await query(sql, [userId]);
    res.json(results);
  } catch (err) {
    console.error("ERROR DB GET GROUPS:", err);
    res.status(500).json({ message: "Error al traer grupos" });
  }
});

//---------------------------------------------------Detalles de un grupo
app.get("/api/groups/:groupId/details", verifyToken, async (req, res) => {
  const { groupId } = req.params;
  const userId = req.userId;

  try {
    // 1️⃣ Verificar que el usuario pertenece al grupo
    const userGroup = await query(
      "SELECT * FROM user_groups WHERE user_id=? AND group_id=?",
      [userId, groupId]
    );

    if (userGroup.length === 0) {
      return res.status(403).json({ message: "No pertenece al grupo" });
    }

    // 2️⃣ Traer canales
    const channels = await query(
      "SELECT id FROM channels WHERE group_id=?",
      [groupId]
    );

    // 3️⃣ Traer proyectos con actividades
    const projects = await query(
      `
      SELECT
        p.id AS project_id,
        p.name AS project_name,
        a.id AS activity_id,
        a.name AS activity_name,
        a.description AS activity_description,
        a.status AS activity_status,
        a.start_date,
        a.deadline
      FROM projects p
      LEFT JOIN activities a ON a.project_id = p.id
      WHERE p.group_id = ?
      ORDER BY p.id, a.id
      `,
      [groupId]
    );

    res.json({ channels, projects });

  } catch (err) {
    console.error("ERROR DB GROUP DETAILS:", err);
    res.status(500).json({ message: "Error al traer detalles del grupo" });
  }
});

//-----------------------------------------------------------Crear proyecto
app.post("/api/projects", verifyToken, async (req, res) => {
  const { name, description, groupId } = req.body;
  const userId = req.userId;

  if (!name || !groupId) {
    return res.status(400).json({ message: "Datos incompletos" });
  }

  try {
    // 1️⃣ Verificar que el usuario pertenece al grupo
    const userGroup = await query(
      "SELECT * FROM user_groups WHERE user_id=? AND group_id=?",
      [userId, groupId]
    );

    if (userGroup.length === 0) {
      return res.status(403).json({ message: "No pertenece al grupo" });
    }

    // 2️⃣ Insertar proyecto
    const result = await query(
      "INSERT INTO projects (name, description, group_id) VALUES (?, ?, ?)",
      [name, description, groupId]
    );

    res.json({
      id: result.insertId,
      name,
      description,
      group_id: groupId
    });

  } catch (err) {
    console.error("ERROR DB CREATE PROJECT:", err);
    res.status(500).json({ message: "Error creando proyecto" });
  }
});
//-----------------------------------------------------------Crear actividad
app.post("/api/activities", verifyToken, async (req, res) => {
  const { name, projectId, description, status, start_date, deadline } = req.body;

  if (!name || !projectId) return res.status(400).json({ message: "Datos incompletos" });

  // 🔹 Función para convertir fecha a formato SQL DATETIME
  function formatDateForSQL(date) {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().slice(0, 19).replace("T", " ");
  }

  try {
    // 1️⃣ Verificar que el usuario pertenece al grupo del proyecto
    const check = await query(
      `
      SELECT g.id
      FROM projects p
      JOIN groups g ON p.group_id = g.id
      JOIN user_groups ug ON g.id = ug.group_id
      WHERE p.id = ? AND ug.user_id = ?
      `,
      [projectId, req.userId]
    );

    if (check.length === 0) return res.status(403).json({ message: "No tiene acceso a este proyecto" });

    // 2️⃣ Convertir fechas
    const startDateTime = start_date ? new Date(start_date) : null;
    const deadlineDateTime = deadline ? new Date(deadline) : null;

    // 3️⃣ Insertar actividad
    const activityResult = await query(
      `
      INSERT INTO activities
        (name, project_id, description, status, start_date, deadline)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        projectId,
        description || "",
        status || "pending",
        formatDateForSQL(startDateTime),
        formatDateForSQL(deadlineDateTime)
      ]
    );

    const activityId = activityResult.insertId;

    // 4️⃣ Insertar evento en calendar_events
    const eventResult = await query(
      `
      INSERT INTO calendar_events
        (title, description, start_datetime, end_datetime, type, created_by)
      VALUES (?, ?, ?, ?, 'ACTIVITY', ?)
      `,
      [
        name,
        description || "",
        formatDateForSQL(startDateTime),
        formatDateForSQL(deadlineDateTime),
        req.userId
      ]
    );

    const eventId = eventResult.insertId;

    // 5️⃣ Insertar relación evento-actividad
    await query(
      `INSERT INTO calendar_event_activities (event_id, activity_id) VALUES (?, ?)`,
      [eventId, activityId]
    );

    // ✅ Responder con datos combinados y fechas en ISO
    res.json({
      id: activityId,
      name,
      project_id: projectId,
      description: description || "",
      status: status || "pending",
      start_date: startDateTime ? startDateTime.toISOString() : null,
      deadline: deadlineDateTime ? deadlineDateTime.toISOString() : null,
      calendar_event: {
        id: eventId,
        title: name,
        description: description || "",
        start: startDateTime ? startDateTime.toISOString() : null,
        end: deadlineDateTime ? deadlineDateTime.toISOString() : null
      }
    });

  } catch (err) {
    console.error("ERROR DB CREATE ACTIVITY:", err);
    res.status(500).json({ message: "Error creando actividad" });
  }
});

//-----------------------------------------------------------GET actividad por id
app.get("/api/activities/:id", verifyToken, async (req, res) => {
  const activityId = req.params.id;

  try {
    // 1️⃣ Traer la actividad y su grupo
    const [activity] = await query(
      `
      SELECT a.id, a.name, a.description, a.status, a.start_date, a.deadline, a.project_id,
             p.group_id
      FROM activities a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = ?
      `,
      [activityId]
    );

    if (!activity) return res.status(404).json({ message: "Actividad no encontrada" });

    // 2️⃣ Verificar que el usuario pertenece al grupo
    const check = await query(
      "SELECT * FROM user_groups WHERE user_id=? AND group_id=?",
      [req.userId, activity.group_id]
    );

    if (check.length === 0) return res.status(403).json({ message: "No tiene acceso a esta actividad" });

    res.json({
      id: activity.id,
      name: activity.name,
      description: activity.description,
      status: activity.status,
      start_date: activity.start_date,
      deadline: activity.deadline,
      project_id: activity.project_id
    });

  } catch (err) {
    console.error("ERROR DB GET ACTIVITY:", err);
    res.status(500).json({ message: "Error al obtener actividad" });
  }
});

//-----------------------------------------------------------EDIT actividad
app.put("/api/activities/:id", verifyToken, async (req, res) => {
  const activityId = req.params.id;
  const { name, description, status, start_date, deadline } = req.body;

  if (!name) return res.status(400).json({ message: "Nombre requerido" });

  try {
    // 1️⃣ Traer actividad y su grupo
    const [activity] = await query(
      `
      SELECT a.id, a.project_id, p.group_id
      FROM activities a
      JOIN projects p ON a.project_id = p.id
      WHERE a.id = ?
      `,
      [activityId]
    );

    if (!activity) return res.status(404).json({ message: "Actividad no encontrada" });

    // 2️⃣ Verificar que el usuario pertenece al grupo
    const check = await query(
      "SELECT * FROM user_groups WHERE user_id=? AND group_id=?",
      [req.userId, activity.group_id]
    );

    if (check.length === 0) return res.status(403).json({ message: "No tiene acceso a esta actividad" });

    // 3️⃣ Actualizar actividad
    await query(
      `
      UPDATE activities
      SET name=?, description=?, status=?, start_date=?, deadline=?
      WHERE id=?
      `,
      [name, description || "", status || "pending", start_date || null, deadline || null, activityId]
    );

    // 4️⃣ Actualizar evento asociado
    await query(
      `
      UPDATE calendar_events e
      JOIN calendar_event_activities cea ON e.id = cea.event_id
      SET e.title=?, e.description=?, e.start_datetime=?, e.end_datetime=?
      WHERE cea.activity_id=?
      `,
      [name, description || "", start_date || null, deadline || null, activityId]
    );

    res.json({
      id: activityId,
      name,
      description: description || "",
      status: status || "pending",
      start_date: start_date || null,
      deadline: deadline || null
    });

  } catch (err) {
    console.error("ERROR DB UPDATE ACTIVITY:", err);
    res.status(500).json({ message: "Error actualizando actividad" });
  }
});

//-----------------------------------------------------------Crear evento personal
app.post("/api/events", verifyToken, async (req, res) => {
  const { title, description, start, end } = req.body;
  const userId = req.userId;

  if (!title || !start || !end) return res.status(400).json({ message: "Datos incompletos" });

  try {
    // 1️⃣ Insertar evento
    const eventResult = await query(
      `
      INSERT INTO calendar_events
        (title, description, start_datetime, end_datetime, type, created_by)
      VALUES (?, ?, ?, ?, 'PERSONAL', ?)
      `,
      [title, description || null, start, end, userId]
    );

    const eventId = eventResult.insertId;

    // 2️⃣ Insertar relación con el usuario
    await query(
      `INSERT INTO calendar_event_users (user_id, event_id) VALUES (?, ?)`,
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

//-----------------------------------------------------------Obtener eventos del usuario
app.get("/api/events", verifyToken, async (req, res) => {
  const userId = req.userId;

  try {
    const results = await query(
      `
      SELECT e.id, e.title, e.description,
             e.start_datetime AS start,
             e.end_datetime AS end,
             e.type,
             cea.activity_id
      FROM calendar_events e
      LEFT JOIN calendar_event_users eu ON e.id = eu.event_id
      LEFT JOIN calendar_event_activities cea ON e.id = cea.event_id
      WHERE eu.user_id = ? OR cea.activity_id IS NOT NULL
      ORDER BY e.start_datetime ASC
      `,
      [userId]
    );

    res.json(results);

  } catch (err) {
    console.error("ERROR DB GET EVENTS:", err);
    res.status(500).json({ message: "Error obteniendo eventos" });
  }
});

//-----------------------------------------------------------Eliminar evento personal
app.delete("/api/events/:id", verifyToken, async (req, res) => {
  const eventId = req.params.id;
  const userId = req.userId;

  try {
    // Verificar que el usuario pertenece al evento
    const check = await query(
      "SELECT * FROM calendar_event_users WHERE event_id=? AND user_id=?",
      [eventId, userId]
    );

    if (check.length === 0)
      return res.status(403).json({ message: "No tienes permiso para eliminar este evento" });

    // Borrar relación usuario-evento
    await query(
      "DELETE FROM calendar_event_users WHERE event_id=? AND user_id=?",
      [eventId, userId]
    );

    // Borrar evento
    await query("DELETE FROM calendar_events WHERE id=?", [eventId]);

    res.json({ message: "Evento eliminado correctamente", id: eventId });

  } catch (err) {
    console.error("ERROR DB DELETE EVENT:", err);
    res.status(500).json({ message: "Error eliminando evento" });
  }
});

//-----------------------------------------------------------Editar evento personal
app.put("/api/events/:id", verifyToken, async (req, res) => {
  const eventId = req.params.id;
  const userId = req.userId;
  const { title, description, start, end } = req.body;

  try {
    // Verificar que el usuario pertenece al evento
    const check = await query(
      "SELECT * FROM calendar_event_users WHERE event_id=? AND user_id=?",
      [eventId, userId]
    );

    if (check.length === 0)
      return res.status(403).json({ message: "No tienes permiso para editar este evento" });

    // Actualizar evento
    await query(
      `
      UPDATE calendar_events
      SET title=?, description=?, start_datetime=?, end_datetime=?
      WHERE id=?
      `,
      [title, description || null, start, end, eventId]
    );

    res.json({ message: "Evento actualizado correctamente" });

  } catch (err) {
    console.error("ERROR DB UPDATE EVENT:", err);
    res.status(500).json({ message: "Error actualizando evento" });
  }
});

//-----------------------------------------------------------Crear sala (rooms)
app.post("/api/rooms", verifyToken, async (req, res) => {
  const { name, type, userIds } = req.body;
  const createdBy = req.userId;

  if (!name || !type || !userIds || !Array.isArray(userIds))
    return res.status(400).json({ message: "Datos incompletos" });

  try {
    // Crear sala
    const roomResult = await query(
      "INSERT INTO rooms (name, type, created_by) VALUES (?, ?, ?)",
      [name, type, createdBy]
    );

    const roomId = roomResult.insertId;

    // Insertar participantes
    for (const userId of userIds) {
      await query(
        "INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)",
        [roomId, userId]
      );
    }

    res.json({ success: true, roomId });

  } catch (err) {
    console.error("ERROR DB CREATE ROOM:", err);
    res.status(500).json({ message: "Error creando sala" });
  }
});
//-----------------------------------------------------------Mensajes de sala
app.get("/api/rooms/:roomId/messages", verifyToken, async (req, res) => {
  const { roomId } = req.params;
  const userId = req.userId; // del token

  // 1️⃣ Verificar que el usuario pertenece a la sala
  const [participants] = await db.query(
    "SELECT * FROM room_participants WHERE room_id=? AND user_id=?",
    [roomId, userId]
  );

  if (participants.length === 0) {
    return res.status(403).json({ error: "No autorizado" });
  }

  // 2️⃣ Traer mensajes
  const [messages] = await db.query(
    `SELECT messages.id, messages.room_id, messages.sender_id, messages.type, messages.content, messages.created_at,
            users.name as sender_name
     FROM messages
     JOIN users ON users.id = messages.sender_id
     WHERE room_id = ?
     ORDER BY created_at ASC`,
    [roomId]
  );

  res.json(messages);
});

//-----------------------------------------------------------Enviar mensaje por POST (opcional)
app.post("/api/messages", verifyToken, async (req, res) => {
  const { roomId, type, content } = req.body;
  const senderId = req.userId;

  if (!roomId || !type || !content)
    return res.status(400).json({ message: "Datos incompletos" });

  try {
    const result = await query(
      "INSERT INTO messages (room_id, sender_id, type, content) VALUES (?, ?, ?, ?)",
      [roomId, senderId, type, content]
    );

    res.json({ success: true, messageId: result.insertId });

  } catch (err) {
    console.error("ERROR POST MESSAGE:", err);
    res.status(500).json({ message: "Error enviando mensaje" });
  }
});

//------------------------------------------------------------------------Consulta genérica--------------------------------------------------------------
app.post("/api/getById", verifyToken, async (req, res) => {
  const { tabla, id } = req.body;
  const tablasPermitidas = ["users", "productos", "ordenes"];

  if (!tablasPermitidas.includes(tabla))
    return res.status(400).json({ error: "Tabla no permitida" });

  try {
    const results = await query(`SELECT * FROM ?? WHERE id = ?`, [tabla, id]);
    res.json(results);
  } catch (err) {
    console.error("ERROR GET BY ID:", err);
    res.status(500).json({ error: "Error en la consulta" });
  }
});

//------------------------------------------------------------------------Traer usuarios--------------------------------------------------------------
app.get("/api/users", async (req, res) => {
  try {
    const [results] = await db.query(`SELECT id, name FROM users WHERE status = 1`);
    res.json(results);
  } catch (err) {
    console.error("Error obteniendo usuarios:", err);
    res.status(500).json({ message: "Error obteniendo usuarios" });
  }
});
//---------------------------------------------------------------------------Servidor + Socket.io-----------------------------------------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const connectedUsers = new Map();

io.on("connection", (socket) => {
  const token = socket.handshake.auth?.token;
  if (!token) return socket.disconnect();

  try {
    const payload = jwt.verify(token, "SECRETO_SUPER_SEGURO");
    socket.userId = payload.id;
    connectedUsers.set(socket.userId, socket.id);
    socket.join(socket.userId.toString());
    console.log("Usuario conectado:", socket.userId);
  } catch (err) {
    return socket.disconnect();
  }

  // ---------------------------------------------
  // 1️⃣ UNIRSE A SALA DE CHAT
  socket.on("join-room", (roomId) => {
    socket.join(roomId.toString());
    console.log("Usuario", socket.userId, "se unió a sala", roomId);
  });

  // ---------------------------------------------
  // 2️⃣ ENVIAR MENSAJE
  socket.on("send-message", async ({ roomId, type, content }) => {
    console.log("Mensaje recibido:", roomId, content);

    try {
      // Guardar en la base de datos
      const result = await query(
        "INSERT INTO messages (room_id, sender_id, type, content) VALUES (?, ?, ?, ?)",
        [roomId, socket.userId, type, content]
      );

      const messageId = result.insertId;

      // Obtener nombre del usuario
      const [user] = await query(
        "SELECT name FROM users WHERE id=?",
        [socket.userId]
      );

      const messageData = {
        id: messageId,
        room_id: roomId,
        sender_id: socket.userId,
        sender_name: user?.name || "Usuario",
        type,
        content,
        created_at: new Date()
      };

      // Emitir a todos en la sala
      io.to(roomId.toString()).emit("receive-message", messageData);
    } catch (err) {
      console.error("ERROR SOCKET MESSAGE:", err);
    }
  });

  // ---------------------------------------------
  // LLAMADAS SIMPLE-PEER
  socket.on("call-user", async ({ toUserId, offer }) => {
    console.log("call-user recibido:", toUserId, "de", socket.userId);
    const targetSocketId = connectedUsers.get(toUserId);
    console.log("socket.id objetivo:", targetSocketId);
    if (!targetSocketId) return console.log("Usuario no conectado");

    try {
      const [user] = await query("SELECT name FROM users WHERE id=?", [socket.userId]);

      io.to(targetSocketId).emit("incoming-call", {
        fromUserId: socket.userId,
        fromUserName: user?.name || "Usuario",
        offer
      });
    } catch (err) {
      console.error("Error obteniendo nombre de usuario:", err);
    }
  });

  socket.on("call-accepted", ({ toUserId, answer }) => {
    console.log("✅ call-accepted recibido. De:", socket.userId, "→ Para:", toUserId);
    const targetSocketId = connectedUsers.get(toUserId);
    if (!targetSocketId) {
      console.log("❌ Usuario", toUserId, "no está conectado");
      return;
    }
    console.log("📨 Reenviando answer a socket:", targetSocketId);
    io.to(targetSocketId).emit("call-accepted", {
      fromUserId: socket.userId,
      answer
    });
  });

  // ---------------------------------------------
  // DESCONECTAR
  socket.on("disconnect", () => {
    console.log("Usuario desconectado:", socket.userId);
    connectedUsers.delete(socket.userId);
  });
});

//----------------------------------------------------------------------------- Arrancar servidor-----------------------------------------------------
const PORT = 3001;
server.listen(PORT, () =>
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
);