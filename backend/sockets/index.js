const jwt = require("jsonwebtoken");
const db = require("../db");

module.exports = (io, connectedUsers) => {
  const voiceRooms = new Map();

  io.on("connection", async (socket) => {
    const token = socket.handshake.auth?.token;
    if (!token) return socket.disconnect();

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.id;

      // traer datos del usuario
      const [rows] = await db.query(
        "SELECT id, name, profile_pic FROM users WHERE id = ?",
        [payload.id]
      );

      const userData = rows[0];

      socket.userInfo = userData;
      connectedUsers.set(socket.userId, { socketId: socket.id, userData });

      socket.join(socket.userId.toString());

      console.log("Usuario conectado:", socket.userId);

      // enviar info completa
      io.emit("usuarios:lista", [...connectedUsers.values()].map(v => v.userData));

      // Permitir que el cliente pida la lista (ej: al volver a Home)
      socket.on("get-online-users", () => {
        socket.emit("usuarios:lista", [...connectedUsers.values()].map(v => v.userData));
      });

    } catch (err) {
      console.log("❌ JWT inválido en socket:", err.message);
      return socket.disconnect();
    }

    // Unirse a sala de chat
    socket.on("join-room", (roomId) => {
      socket.join(roomId.toString());
      console.log("Usuario", socket.userId, "se unió a sala", roomId);
    });

    // Salir de sala de chat
    socket.on("leave-room", (roomId) => {
      socket.leave(roomId.toString());
      console.log("Usuario", socket.userId, "salió de sala", roomId);
    });

    // Indicador de escritura (Modificado para ser 100% fiable con el nombre)
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

    // Marcar sala como leída vía socket
    socket.on("mark-room-read", async ({ roomId }) => {
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

    // Enviar mensaje
    socket.on("send-message", async ({ roomId, type, content, replyToId }) => {
      console.log("Received send-message:", { roomId, type, content, replyToId, userId: socket.userId });
      try {
        // 1️⃣ Insertar el mensaje en la base de datos
        const [result] = await db.query(
          "INSERT INTO messages (room_id, sender_id, type, content, reply_to_id) VALUES (?, ?, ?, ?, ?)",
          [roomId, socket.userId, type, content, replyToId || null]
        );

        // 2️⃣ Obtener el nombre y foto de perfil del remitente
        const [user] = await db.query("SELECT name, profile_pic FROM users WHERE id=?", [socket.userId]);

        // 3️⃣ Preparar datos de mensaje original si es una respuesta
        let replyContent = null;
        let replySenderName = null;

        if (replyToId) {
          const [replyMsg] = await db.query(
            "SELECT content, sender_id FROM messages WHERE id = ?",
            [replyToId]
          );

          if (replyMsg?.[0]) {
            replyContent = replyMsg[0].content;

            const [replyUser] = await db.query(
              "SELECT name FROM users WHERE id = ?",
              [replyMsg[0].sender_id]
            );

            replySenderName = replyUser?.[0]?.name || "Usuario";
          }
        }

        // 4️⃣ Construir el mensaje completo para enviar por socket
        const messageData = {
          id: result.insertId,
          room_id: roomId,
          sender_id: socket.userId,
          sender_name: user?.[0]?.name || "Usuario",
          sender_avatar: user?.[0]?.avatar || null,
          type,
          content,
          reply_to_id: replyToId || null,
          reply_content: replyContent,
          reply_sender_name: replySenderName,
          created_at: new Date(),
          edited: 0,
          favorite: 0,
          read: false,
        };

        // 5️⃣ Emitir mensaje a la sala de chat (para useChat)
        io.to(roomId.toString()).emit("receive-message", messageData);

        // 6️⃣ Notificar a cada participante individualmente (para UnreadContext)
        const [participants] = await db.query(
          "SELECT user_id FROM room_participants WHERE room_id = ?",
          [roomId]
        );

        participants.forEach(p => {
          // No notificar al remitente
          if (p.user_id === socket.userId) return;
          io.to(p.user_id.toString()).emit("new-message-notification", {
            room_id: roomId,
            sender_id: socket.userId,
          });
        });

      } catch (err) {

        console.error("ERROR SOCKET MESSAGE:", err);
      }
    });

    // Llamadas 1 a 1
    socket.on("call-user", async ({ toUserId, offer }) => {
      console.log("Received call-user from", socket.userId, "to", toUserId);
      const target = connectedUsers.get(toUserId);
      if (!target) {
        console.log("Target not connected:", toUserId);
        return;
      }

      try {
        const [user] = await db.query("SELECT name FROM users WHERE id=?", [socket.userId]);
        console.log("Emitting incoming-call to", target.socketId);
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

    // ── Sala de voz grupal (mesh) ──────────────────────────────────────────

    socket.on("join-voice-room", async ({ voiceRoomId }) => {
      // Evitar doble entrada del mismo usuario
      const roomKey = `voice-${voiceRoomId}`;
      if (!voiceRooms.has(roomKey)) voiceRooms.set(roomKey, new Map()); // userId -> userName
      const room = voiceRooms.get(roomKey);

      if (room.has(socket.userId)) return; // ya está, ignorar duplicado

      const [user] = await db.query("SELECT name FROM users WHERE id=?", [socket.userId]);
      const userName = user?.[0]?.name || "Usuario";

      // Decirle al recién llegado quiénes ya están
      const existingUsers = Array.from(room.entries()).map(([uid, uname]) => ({
        userId: uid,
        userName: uname,
      }));
      socket.emit("voice-room-users", { users: existingUsers });

      // Avisar a los que ya están que llegó alguien nuevo
      room.forEach((_, existingUserId) => {
        const existing = connectedUsers.get(existingUserId);
        if (existing) {
          io.to(existing.socketId).emit("voice-user-joined", {
            userId: socket.userId,
            userName,
          });
        }
      });

      // Agregar al recién llegado
      room.set(socket.userId, userName);
      socket.join(roomKey);
      console.log(`Usuario ${socket.userId} (${userName}) entró a sala de voz ${voiceRoomId}`);
    });

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

    socket.on("disconnect", () => {
      voiceRooms.forEach((room, roomKey) => {
        if (room.has(socket.userId)) {
          room.delete(socket.userId);
          socket.to(roomKey).emit("voice-user-left", { userId: socket.userId });
          if (room.size === 0) voiceRooms.delete(roomKey);
        }
      });

      connectedUsers.delete(socket.userId);
      console.log("Usuario desconectado:", socket.userId);
      io.emit("usuarios:lista", [...connectedUsers.values()].map(v => v.userData)); // ← fuera del forEach y con .values()
    });
  });
};