const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/verifyToken");

/**
 * NOTE: Recuperación de datos del perfil autenticado.
 * Retorna información sensible y metadatos del usuario actual.
 */
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT id, name, email, rol, profile_pic, first_name, last_name, phone, bio, birthday, created_at FROM users WHERE id = ?`,
      [req.userId]
    );
    if (!results.length) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(results[0]);
  } catch (err) {
    console.error("ERROR GET PROFILE:", err);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

//Traer usuarios activos
router.get("/users", async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT id, name, profile_pic FROM users`
    );
    res.json(results);
  } catch (err) {
    console.error("ERROR GET USERS:", err);
    res.status(500).json({ message: "Error obteniendo usuarios" });
  }
});

/**
 * NOTE: Consulta de perfil de terceros.
 * Incluye un subquery para determinar el estado de amistad entre el usuario que consulta
 * y el usuario consultado (pending, accepted, etc.).
 */
router.get("/users/:id", verifyToken, async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT u.id, u.name, u.email, u.rol, u.profile_pic, u.first_name, u.last_name, u.phone, u.bio, u.birthday, u.created_at,
      (SELECT status FROM friends WHERE (user_id = ? AND friend_id = u.id) OR (user_id = u.id AND friend_id = ?)) as friendship_status
      FROM users u WHERE u.id = ?`,
      [req.userId, req.userId, req.params.id]
    );
    if (!results.length) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(results[0]);
  } catch (err) {
    console.error("ERROR GET USER BY ID:", err);
    res.status(500).json({ error: "Error al obtener perfil del usuario" });
  }
});

// Traer todos los usuarios
router.get("/allusers", async (req, res) => {
  try {
    const [results] = await db.query(`SELECT id, name, email FROM users`);
    res.json(results);
  } catch (err) {
    console.error("ERROR GET USERS:", err);
    res.status(500).json({ message: "Error obteniendo usuarios" });
  }
});

// PUT /api/profile — actualizar datos del perfil
router.put("/profile", verifyToken, async (req, res) => {
  const { name, first_name, last_name, phone, bio, birthday } = req.body;

  try {
    await db.query(
      `UPDATE users SET name = ?, first_name = ?, last_name = ?, phone = ?, bio = ?, birthday = ? WHERE id = ?`,
      [name, first_name, last_name, phone || null, bio || null, birthday || null, req.userId]
    );
    res.json({ message: "Perfil actualizado con éxito" });
  } catch (err) {
    console.error("ERROR UPDATE PROFILE:", err);
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
});

// PUT /api/profile/picture — actualiza foto de perfil
router.put("/profile/picture", verifyToken, async (req, res) => {
  const { profile_pic } = req.body;
  if (!profile_pic) return res.status(400).json({ error: "No se recibió la imagen" });

  try {
    await db.query(`UPDATE users SET profile_pic = ? WHERE id = ?`, [profile_pic, req.userId]);
    res.json({ profile_pic });
  } catch (err) {
    console.error("ERROR UPDATE PICTURE:", err);
    res.status(500).json({ error: "Error al actualizar foto" });
  }
});

module.exports = router;