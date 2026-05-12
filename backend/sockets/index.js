const jwt = require("jsonwebtoken");
const db = require("../db");

/**
 * NOTE: Lógica central de WebSockets (Socket.io).
 * Gestiona la comunicación en tiempo real, incluyendo chat, notificaciones,
 * señalización WebRTC para llamadas y estados de conexión.
 */
module.exports = (io, connectedUsers) => {
  // NOTE: Almacena el estado de las salas de voz activas en memoria (userId -> userName)
  const voiceRooms = new Map();

  io.on("connection", async (socket) => {
    // Seguridad: Verificación de token en el handshake inicial
    const token = socket.handshake.auth?.token;
    if (!token) return socket.disconnect();

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id;

      // Obtención de metadata del usuario para identificarlo en eventos
      const [rows] = await db.query(
        "SELECT id, name, profile_pic FROM users WHERE id = ?",
        [payload.id]
      );

      const userData = rows[0];

      socket.userInfo = userData;
      // Registrar usuario en el Map global de conexiones activas
      connectedUsers.set(socket.userId, { socketId: socket.id, userData });

      // Unirse a una sala privada propia basada en su ID para recibir notificaciones directas
      socket.join(socket.userId.toString());

      console.log("Usuario conectado:", socket.userId);

      // Notificar a todos los clientes el cambio en la lista de usuarios online
      io.emit("usuarios:lista", [...connectedUsers.values()].map(v => v.userData));

      // Sincronización bajo demanda de usuarios conectados
      socket.on("get-online-users", () => {
        socket.emit("usuarios:lista", [...connectedUsers.values()].map(v => v.userData));
      });

    } catch (err) {
      console.log("❌ JWT inválido en socket:", err.message);
      return socket.disconnect();
    }

    // ──────────────────────────────────────────────────────────────────────
    // GESTIÓN DE SALAS DE CHAT
    // ──────────────────────────────────────────────────────────────────────

    socket.on("join-room", (roomId) => {
      socket.join(roomId.toString());
      console.log("Usuario", socket.userId, "se unió a sala", roomId);
    });

    socket.on("leave-room", (roomId) => {
      socket.leave(roomId.toString());
      console.log("Usuario", socket.userId, "salió de sala", roomId);
    });

    /**
     * NOTE: Indicadores de escritura.
     * Se emite a otros miembros de la sala para feedback visual inmediato (UX).
     */
    socket.on("typing", ({ roomId }) => {
      const userName = socket.userInfo?.name || "Usuario";
      socket.to(roomId.toString()).emit("user-typing", { 
        roomId, 
        userId: socket.userId, 
        userName: userName 
      });
    });

    socket.on("stop-typing", ({ roomId }) => {
      socket.to(roomId.toString()).emit("user-stop-typing", { roomId, userId: socket.userId });
    });

    /**
     * NOTE: Marcado de lectura en tiempo real.
     * Sincroniza el estado de la base de datos y avisa a los demás participantes.
     */
    socket.on("mark-room-read", async ({ roomId }) => {
      if (!roomId) return;
      try {
        await db.query(
          "UPDATE room_participants SET last_read_at = NOW() WHERE room_id = ? AND user_id = ?",
          [roomId, socket.userId]
        );
        socket.to(roomId.toString()).emit("room-read", {
          roomId,
          userId: socket.userId,
          lastReadAt: new Date()
        });
      } catch (err) {
        console.error("ERROR SOCKET MARK ROOM READ:", err);
      }
    });

    /**
     * NOTE: Flujo de envío de mensajes.
     * 1. Persistencia en DB.
     * 2. Recuperación de metadata (usuario, respuestas).
     * 3. Emisión a la sala activa.
     * 4. Notificaciones push-like a cada participante (para contadores de no leídos).
     */
    socket.on("send-message", async ({ roomId, type, content, caption, fileSize, replyToId }) => {
      try {
        const [result] = await db.query(
          "INSERT INTO messages (room_id, sender_id, type, content, caption, file_size, reply_to_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [roomId, socket.userId, type, content, caption || null, fileSize || null, replyToId || null]
        );

        const [user] = await db.query("SELECT name, profile_pic FROM users WHERE id=?", [socket.userId]);

        let replyContent = null;
        let replyCaption = null;
        let replySenderName = null;

        // Gestión de lógica de respuestas (replies)
        if (replyToId) {
          const [replyMsgRows] = await db.query(
            "SELECT content, caption, sender_id FROM messages WHERE id = ?",
            [replyToId]
          );

          if (replyMsgRows?.[0]) {
            replyContent = replyMsgRows[0].content;
            replyCaption = replyMsgRows[0].caption;

            const [replyUser] = await db.query(
              "SELECT name FROM users WHERE id = ?",
              [replyMsgRows[0].sender_id]
            );

            replySenderName = replyUser?.[0]?.name || "Usuario";
          }
        }

        const messageData = {
          id: result.insertId,
          room_id: roomId,
          sender_id: socket.userId,
          sender_name: user?.[0]?.name || "Usuario",
          sender_avatar: user?.[0]?.profile_pic || null,
          type,
          content,
          caption: caption || null,
          file_size: fileSize || null,
          reply_to_id: replyToId || null,
          reply_content: replyContent,
          reply_caption: replyCaption,
          reply_sender_name: replySenderName,
          created_at: new Date(),
          edited: 0,
          favorite: 0,
          read: false,
        };

        // Emitir el mensaje a todos en la sala de chat
        io.to(roomId.toString()).emit("receive-message", messageData);

        // Notificar a cada participante fuera de la sala actual para actualizar contadores de mensajes no leídos
        const [participants] = await db.query(
          "SELECT user_id FROM room_participants WHERE room_id = ?",
          [roomId]
        );

        participants.forEach(p => {
          if (String(p.user_id) === String(socket.userId)) return;
          
          io.to(p.user_id.toString()).emit("new-message-notification", {
            room_id: roomId,
            sender_id: socket.userId,
          });
        });

      } catch (err) {
        console.error("ERROR SOCKET MESSAGE:", err);
      }
    });

    // ──────────────────────────────────────────────────────────────────────
    // LLAMADAS 1 A 1 (WebRTC Signaling)
    // ──────────────────────────────────────────────────────────────────────

    socket.on("call-user", async ({ toUserId, offer }) => {
      const target = connectedUsers.get(toUserId);
      if (!target) return;

      try {
        const [user] = await db.query("SELECT name FROM users WHERE id=?", [socket.userId]);
        io.to(target.socketId).emit("incoming-call", {
          fromUserId: socket.userId,
          fromUserName: user?.[0]?.name || "Usuario",
          offer
        });
      } catch (err) {
        console.error("Error obteniendo nombre de usuario:", err);
      }
    });

    socket.on("call-accepted", ({ toUserId, answer }) => {
      const target = connectedUsers.get(toUserId);
      if (!target) return;
      io.to(target.socketId).emit("call-accepted", { fromUserId: socket.userId, answer });
    });

    socket.on("call-declined", ({ toUserId }) => {
      const target = connectedUsers.get(toUserId);
      if (target) io.to(target.socketId).emit("call-declined");
    });

    socket.on("call-ended", ({ toUserId }) => {
      const target = connectedUsers.get(toUserId);
      if (target) io.to(target.socketId).emit("call-ended");
    });

    // ──────────────────────────────────────────────────────────────────────
    // SALA DE VOZ GRUPAL (Mesh Architecture)
    // ──────────────────────────────────────────────────────────────────────

    socket.on("join-voice-room", async ({ voiceRoomId }) => {
      const roomKey = `voice-${voiceRoomId}`;
      if (!voiceRooms.has(roomKey)) voiceRooms.set(roomKey, new Map());
      const room = voiceRooms.get(roomKey);

      // Evitar entradas duplicadas por reconexión rápida
      if (room.has(socket.userId)) return;

      const [user] = await db.query("SELECT name FROM users WHERE id=?", [socket.userId]);
      const userName = user?.[0]?.name || "Usuario";

      // 1. Informar al nuevo integrante quiénes están presentes para iniciar negociación WebRTC
      const existingUsers = Array.from(room.entries()).map(([uid, uname]) => ({
        userId: uid,
        userName: uname,
      }));
      socket.emit("voice-room-users", { users: existingUsers });

      // 2. Notificar a los actuales que hay un nuevo integrante
      room.forEach((_, existingUserId) => {
        const existing = connectedUsers.get(existingUserId);
        if (existing) {
          io.to(existing.socketId).emit("voice-user-joined", {
            userId: socket.userId,
            userName,
          });
        }
      });

      room.set(socket.userId, userName);
      socket.join(roomKey);
      console.log(`Usuario ${socket.userId} (${userName}) entró a sala de voz ${voiceRoomId}`);
    });

    /**
     * NOTE: Intercambio de señales (signals) para WebRTC mesh.
     * Permite que los clientes establezcan conexiones P2P directas para el audio.
     */
    socket.on("voice-signal", ({ toUserId, signal }) => {
      const target = connectedUsers.get(toUserId);
      if (target) {
        io.to(target.socketId).emit("voice-signal", {
          fromUserId: socket.userId,
          signal,
        });
      }
    });

    socket.on("leave-voice-room", ({ voiceRoomId }) => {
      const roomKey = `voice-${voiceRoomId}`;
      const room = voiceRooms.get(roomKey);
      if (room) {
        room.delete(socket.userId);
        if (room.size === 0) voiceRooms.delete(roomKey);
      }
      socket.leave(roomKey);
      socket.to(roomKey).emit("voice-user-left", { userId: socket.userId });
      console.log(`Usuario ${socket.userId} salió de sala de voz ${voiceRoomId}`);
    });

    // ──────────────────────────────────────────────────────────────────────
    // DESCONEXIÓN Y LIMPIEZA
    // ──────────────────────────────────────────────────────────────────────

    socket.on("disconnect", () => {
      // Limpiar rastro del usuario en salas de voz activas
      voiceRooms.forEach((room, roomKey) => {
        if (room.has(socket.userId)) {
          room.delete(socket.userId);
          socket.to(roomKey).emit("voice-user-left", { userId: socket.userId });
          if (room.size === 0) voiceRooms.delete(roomKey);
        }
      });

      // Eliminar de la lista global de conectados
      connectedUsers.delete(socket.userId);
      console.log("Usuario desconectado:", socket.userId);
      
      // Notificar a todos que el usuario se ha desconectado
      io.emit("usuarios:lista", [...connectedUsers.values()].map(v => v.userData));
    });
  });
};