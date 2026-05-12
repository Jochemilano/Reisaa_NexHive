const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/verifyToken");

/**
 * NOTE: Lógica de conmutación (toggle) para mensajes favoritos.
 * Si el vínculo existe en la tabla 'favorites', lo elimina; de lo contrario, lo inserta.
 */
router.post("/messages/:messageId/favorite", verifyToken, async (req, res) => {
  const userId = req.userId; // viene del token
  const messageId = parseInt(req.params.messageId);

  try {
    const [existing] = await db.query(
      "SELECT * FROM favorites WHERE user_id = ? AND message_id = ?",
      [userId, messageId]
    );

    if (existing.length > 0) {
      // Si existe → desmarcar
      await db.query(
        "DELETE FROM favorites WHERE user_id = ? AND message_id = ?",
        [userId, messageId]
      );
      return res.json({ success: true, favorite: false });
    }

    // Si no existe → marcar
    await db.query(
      "INSERT INTO favorites (user_id, message_id) VALUES (?, ?)",
      [userId, messageId]
    );
    return res.json({ success: true, favorite: true });

  } catch (err) {
    console.error("ERROR TOGGLE FAVORITE:", err);
    return res.status(500).json({ message: "Error al marcar/desmarcar favorito" });
  }
});


// Obtener todos los favoritos de un usuario
router.get("/users/:userId/favorites", verifyToken, async (req, res) => {
  const userId = parseInt(req.params.userId);

  // Solo el mismo usuario puede ver sus favoritos
  if (userId !== req.userId) {
    return res.status(403).json({ message: "No autorizado" });
  }

  try {
    const [favorites] = await db.query(
      `SELECT m.id, m.room_id, m.sender_id, m.type, m.content, m.created_at, u.name as sender_name
       FROM favorites f
       JOIN messages m ON m.id = f.message_id
       JOIN users u ON u.id = m.sender_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return res.json(favorites);

  } catch (err) {
    console.error("ERROR GET FAVORITES:", err);
    return res.status(500).json({ message: "Error obteniendo favoritos" });
  }
});

module.exports = router;