const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/verifyToken");

// Traer datos del usuario autenticado
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT id, name, email, rol, profile_pic FROM users WHERE id = ?`,
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

// Traer datos de un usuario específico por ID
router.get("/users/:id", async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT id, name, email, rol, profile_pic FROM users WHERE id = ?`,
      [req.params.id]
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