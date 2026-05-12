const express = require("express");
const router = express.Router();
const query = require("../helpers/query");
const verifyToken = require("../middleware/verifyToken");

/**
 * NOTE: Recuperación de lista de amigos.
 * Realiza una unión simétrica para encontrar amigos independientemente de quién inició la solicitud.
 */
router.get("/friends", verifyToken, async (req, res) => {
  try {
    const results = await query(`
      SELECT u.id, u.name, u.email, u.profile_pic 
      FROM users u
      JOIN friends f ON (u.id = f.friend_id OR u.id = f.user_id)
      WHERE (f.user_id = ? OR f.friend_id = ?) 
      AND u.id != ?
      AND f.status = 'accepted'
    `, [req.userId, req.userId, req.userId]);
    
    res.json(results);
  } catch (err) {
    console.error("ERROR GET FRIENDS:", err);
    res.status(500).json({ message: "Error al obtener amigos" });
  }
});

// GET /api/friends/requests - Obtener solicitudes pendientes
router.get("/friends/requests", verifyToken, async (req, res) => {
  try {
    const results = await query(`
      SELECT f.id as request_id, u.id, u.name, u.email, u.profile_pic 
      FROM friends f
      JOIN users u ON u.id = f.user_id
      WHERE f.friend_id = ? AND f.status = 'pending'
    `, [req.userId]);
    
    res.json(results);
  } catch (err) {
    console.error("ERROR GET PENDING FRIENDS:", err);
    res.status(500).json({ message: "Error al obtener solicitudes" });
  }
});

// GET /api/users/search - Buscar usuarios por nombre o correo
router.get("/users/search", verifyToken, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  try {
    const results = await query(`
      SELECT id, name, email, profile_pic 
      FROM users 
      WHERE (name LIKE ? OR email LIKE ?) 
      AND id != ?
      LIMIT 10
    `, [`%${q}%`, `%${q}%`, req.userId]);
    
    res.json(results);
  } catch (err) {
    console.error("ERROR SEARCH USERS:", err);
    res.status(500).json({ message: "Error al buscar usuarios" });
  }
});

/**
 * NOTE: Envío de solicitud de amistad.
 * Valida que no exista una relación previa (pendiente o aceptada) para evitar duplicidad.
 */
router.post("/friends", verifyToken, async (req, res) => {
  const { friendId } = req.body;

  if (!friendId) {
    return res.status(400).json({ message: "ID del amigo es requerido" });
  }

  if (parseInt(friendId) === req.userId) {
    return res.status(400).json({ message: "No puedes agregarte a ti mismo" });
  }

  try {
    // Verificación de integridad: evita solicitudes redundantes
    const existing = await query(
      "SELECT status FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
      [req.userId, friendId, friendId, req.userId]
    );

    if (existing.length) {
      if (existing[0].status === 'accepted') {
        return res.status(400).json({ message: "Ya son amigos" });
      } else {
        return res.status(400).json({ message: "Ya existe una solicitud pendiente" });
      }
    }

    await query(
      "INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')",
      [req.userId, friendId]
    );

    res.json({ message: "Solicitud enviada correctamente" });
  } catch (err) {
    console.error("ERROR ADD FRIEND:", err);
    res.status(500).json({ message: "Error al enviar solicitud" });
  }
});

// POST /api/friends/accept - Aceptar solicitud
router.post("/friends/accept", verifyToken, async (req, res) => {
  const { requestId } = req.body;

  if (!requestId) {
    return res.status(400).json({ message: "ID de solicitud es requerido" });
  }

  try {
    const result = await query(
      "UPDATE friends SET status = 'accepted' WHERE id = ? AND friend_id = ?",
      [requestId, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Solicitud no encontrada" });
    }

    res.json({ message: "Solicitud aceptada" });
  } catch (err) {
    console.error("ERROR ACCEPT FRIEND:", err);
    res.status(500).json({ message: "Error al aceptar solicitud" });
  }
});

// DELETE /api/friends/reject/:requestId - Rechazar/Eliminar solicitud o amigo
router.delete("/friends/reject/:requestId", verifyToken, async (req, res) => {
  const { requestId } = req.params;

  try {
    const result = await query(
      "DELETE FROM friends WHERE id = ? AND (user_id = ? OR friend_id = ?)",
      [requestId, req.userId, req.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Relación no encontrada" });
    }

    res.json({ message: "Solicitud rechazada/Amigo eliminado" });
  } catch (err) {
    console.error("ERROR REJECT FRIEND:", err);
    res.status(500).json({ message: "Error al procesar acción" });
  }
});

module.exports = router;
