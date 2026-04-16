const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const query = require("../helpers/query");
const verifyToken = require("../middleware/verifyToken");

// REGISTER
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Nombre, correo y contraseña son requeridos" });
  }

  try {
    const existing = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length) {
      return res.status(409).json({ message: "El correo ya está registrado" });
    }

    const result = await query(
      "INSERT INTO users (name, email, password, status, rol) VALUES (?, ?, ?, 1, 'user')",
      [name, email, password]
    );

    const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.status(201).json({
      token,
      user: {
        id: result.insertId,
        nombre: name,
        email,
        estado: 1,
        rol: "user"
      }
    });
  } catch (err) {
    console.error("ERROR DB REGISTER:", err);
    res.status(500).json({ message: "Error de servidor" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
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
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1d" });

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

// PERFIL
router.get("/perfil", verifyToken, async (req, res) => {
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

module.exports = router;