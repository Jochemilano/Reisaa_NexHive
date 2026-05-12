const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const query = require("../helpers/query");
const verifyToken = require("../middleware/verifyToken");
const { sendVerificationEmail } = require("../helpers/mailer");

/**
 * NOTE: Utilidad interna para generar códigos numéricos aleatorios.
 * Utilizado para verificación de correo y recuperación de contraseña.
 */
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// ============================================================
// REGISTER - Gestión de usuarios y verificación inicial
// ============================================================
router.post("/register", async (req, res) => {
  const { name, email, password, first_name, last_name, phone, bio, birthday } = req.body;

  // Validaciones básicas de integridad
  if (!name || !email || !password || !first_name || !last_name) {
    return res.status(400).json({ message: "Nickname, email, password, first name and last name are required" });
  }

  try {
    const existing = await query("SELECT id, is_verified FROM users WHERE email = ?", [email]);
    
    /**
     * NOTE: Lógica de re-registro.
     * Si el usuario existe pero no está verificado, permitimos actualizar sus datos
     * y reenviar el código. Esto evita el bloqueo de correos que no completaron el flujo.
     */
    if (existing.length) {
      if (!existing[0].is_verified) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const vCode = generateCode();

        await query(
          "UPDATE users SET name = ?, password = ?, verification_code = ?, first_name = ?, last_name = ?, phone = ?, bio = ?, birthday = ? WHERE email = ?",
          [name, hashedPassword, vCode, first_name, last_name, phone || null, bio || null, birthday || null, email]
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

    // Seguridad: Hasheo asíncrono de contraseñas
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const vCode = generateCode();

    const result = await query(
      "INSERT INTO users (name, email, password, rol, is_verified, verification_code, first_name, last_name, phone, bio, birthday) VALUES (?, ?, ?, 'user', 0, ?, ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, vCode, first_name, last_name, phone || null, bio || null, birthday || null]
    );

    // NOTE: El registro continúa aunque falle el envío del correo (side effect no bloqueante)
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

// ============================================================
// VERIFY CODE - Activación de cuenta
// ============================================================
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

    // Limpieza: El código de verificación se elimina una vez usado
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

// ============================================================
// LOGIN - Autenticación y generación de JWT
// ============================================================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const results = await query(
      "SELECT id, name, email, password, rol, is_verified, first_name, last_name, phone, bio, birthday, profile_pic FROM users WHERE email=?",
      [email]
    );

    if (results.length === 0) {
      return res.status(401).json({ message: "El correo no está registrado" });
    }

    const user = results[0];

    // WARNING: Bloqueo de acceso si la cuenta no ha sido activada vía correo
    if (!user.is_verified) {
      return res.status(403).json({ 
        message: "Cuenta no verificada. Revisa tu correo.",
        needsVerification: true,
        email: user.email
      });
    }

    // Validación de credenciales
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    // Emisión de Token (JWT) válido por 24 horas
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({
      token,
      user: {
        id: user.id,
        nombre: user.name, // NOTE: Se mapea 'name' como 'nombre' para compatibilidad con el frontend
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        rol: user.rol,
        profile_pic: user.profile_pic,
        phone: user.phone,
        bio: user.bio,
        birthday: user.birthday
      }
    });

  } catch (err) {
    console.error("ERROR DB LOGIN:", err);
    res.status(500).json({ message: "Error de servidor" });
  }
});

// ============================================================
// FORGOT PASSWORD - Inicio de recuperación
// ============================================================
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

// ============================================================
// RESET PASSWORD - Finalización de recuperación
// ============================================================
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

    // Reseteo de contraseña y limpieza de código de recuperación
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

// ============================================================
// PERFIL - Obtención de datos protegidos
// ============================================================
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