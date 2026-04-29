const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const query = require("../helpers/query");
const verifyToken = require("../middleware/verifyToken");
const { sendVerificationEmail } = require("../helpers/mailer");

// Generar código de 6 dígitos
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// REGISTER
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Nombre, correo y contraseña son requeridos" });
  }

  try {
    const existing = await query("SELECT id, is_verified FROM users WHERE email = ?", [email]);
    if (existing.length) {
      if (!existing[0].is_verified) {
        // Re-generate code and update user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const vCode = generateCode();

        await query(
          "UPDATE users SET name = ?, password = ?, verification_code = ? WHERE email = ?",
          [name, hashedPassword, vCode, email]
        );
        await sendVerificationEmail(email, vCode);

        return res.status(201).json({
          message: "Registro actualizado. Por favor verifica tu correo.",
          email: email,
          needsVerification: true
        });
      }
      return res.status(409).json({ message: "El correo ya está registrado" });
    }

    // Hash de contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Código de verificación
    const vCode = generateCode();

    const result = await query(
      "INSERT INTO users (name, email, password, rol, is_verified, verification_code) VALUES (?, ?, ?, 'user', 0, ?)",
      [name, email, hashedPassword, vCode]
    );

    // Enviar correo (no bloqueamos el registro si falla el correo, pero el usuario no estará verificado)
    await sendVerificationEmail(email, vCode);

    res.status(201).json({
      message: "Registro exitoso. Por favor verifica tu correo.",
      email: email,
      needsVerification: true
    });
  } catch (err) {
    console.error("ERROR DB REGISTER:", err);
    res.status(500).json({ message: "Error de servidor" });
  }
});

// VERIFY CODE
router.post("/verify-code", async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: "Email y código son requeridos" });
  }

  try {
    const results = await query(
      "SELECT id FROM users WHERE email = ? AND verification_code = ?",
      [email, code]
    );

    if (results.length === 0) {
      return res.status(401).json({ message: "Código incorrecto" });
    }

    await query(
      "UPDATE users SET is_verified = 1, verification_code = NULL WHERE email = ?",
      [email]
    );

    const user = results[0];
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({
      message: "Cuenta verificada con éxito",
      token,
      user: { id: user.id, email }
    });
  } catch (err) {
    console.error("ERROR VERIFY CODE:", err);
    res.status(500).json({ message: "Error de servidor" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const results = await query(
      "SELECT id, name, email, password, rol, is_verified FROM users WHERE email=?",
      [email]
    );

    if (results.length === 0) {
      return res.status(401).json({ message: "El correo no está registrado" });
    }

    const user = results[0];

    // Verificar si está verificado
    if (!user.is_verified) {
      return res.status(403).json({ 
        message: "Cuenta no verificada. Revisa tu correo.",
        needsVerification: true,
        email: user.email
      });
    }

    // Comparar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.name,
        email: user.email,
        rol: user.rol
      }
    });

  } catch (err) {
    console.error("ERROR DB LOGIN:", err);
    res.status(500).json({ message: "Error de servidor" });
  }
});

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "El correo es requerido" });
  }

  try {
    const results = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (results.length === 0) {
      return res.status(404).json({ message: "No existe una cuenta con ese correo" });
    }

    const resetCode = generateCode();
    await query("UPDATE users SET reset_code = ? WHERE email = ?", [resetCode, email]);

    const { sendResetEmail } = require("../helpers/mailer");
    await sendResetEmail(email, resetCode);

    res.json({ message: "Código de recuperación enviado al correo" });
  } catch (err) {
    console.error("ERROR FORGOT PASSWORD:", err);
    res.status(500).json({ message: "Error de servidor" });
  }
});

// RESET PASSWORD
router.post("/reset-password", async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: "Todos los campos son requeridos" });
  }

  try {
    const results = await query(
      "SELECT id FROM users WHERE email = ? AND reset_code = ?",
      [email, code]
    );

    if (results.length === 0) {
      return res.status(401).json({ message: "Código de recuperación inválido" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await query(
      "UPDATE users SET password = ?, reset_code = NULL WHERE email = ?",
      [hashedPassword, email]
    );

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("ERROR RESET PASSWORD:", err);
    res.status(500).json({ message: "Error de servidor" });
  }
});

// PERFIL
router.get("/perfil", verifyToken, async (req, res) => {
  try {
    const results = await query(
      "SELECT name, email FROM users WHERE id=?",
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