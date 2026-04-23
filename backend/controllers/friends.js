const express = require("express");
const router = express.Router();
const query = require("../helpers/query");
const verifyToken = require("../middleware/verifyToken");

// GET /api/friends - Obtener lista de amigos aceptados
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

// POST /api/friends - Agregar un amigo
router.post("/friends", verifyToken, async (req, res) => {
  const { friendId } = req.body;

  if (!friendId) {
    return res.status(400).json({ message: "ID del amigo es requerido" });
  }

  if (parseInt(friendId) === req.userId) {
    return res.status(400).json({ message: "No puedes agregarte a ti mismo" });
  }

  try {
    // Verificar si ya son amigos o hay solicitud
    const existing = await query(
      "SELECT id FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)",
      [req.userId, friendId, friendId, req.userId]
    );

    if (existing.length) {
      return res.status(400).json({ message: "Ya existe una relación o solicitud" });
    }

    await query(
      "INSERT INTO friends (user_id, friend_id, status) VALUES (?, ?, 'accepted')",
      [req.userId, friendId]
    );

    res.json({ message: "Amigo agregado correctamente" });
  } catch (err) {
    console.error("ERROR ADD FRIEND:", err);
    res.status(500).json({ message: "Error al agregar amigo" });
  }
});

module.exports = router;
