const express = require("express");
const router = express.Router();
const query = require("../helpers/query");
const verifyToken = require("../middleware/verifyToken");

/**
 * NOTE: Persistencia de preferencias de usuario.
 * Utiliza un patrón de 'upsert' manual (verificación previa y luego UPDATE o INSERT).
 */
router.put("/preferences", verifyToken, async (req, res) => {
  const { language, theme, notifications_enabled } = req.body;
  const userId = req.userId;

  if (!language || !theme)
    return res.status(400).json({ message: "Datos incompletos" });

  try {
    const existing = await query(
      "SELECT * FROM user_preferences WHERE user_id = ?",
      [userId]
    );

    if (existing.length > 0) {
      await query(
        `UPDATE user_preferences 
         SET language=?, theme=?, notifications_enabled=? 
         WHERE user_id=?`,
        [language, theme, notifications_enabled, userId]
      );
    } else {
      await query(
        `INSERT INTO user_preferences 
         (user_id, language, theme, notifications_enabled) 
         VALUES (?, ?, ?, ?)`,
        [userId, language, theme, notifications_enabled]
      );
    }

    res.json({
      message: "Preferencias guardadas",
      preferences: {
        language,
        theme,
        notifications_enabled
      }
    });

  } catch (err) {
    console.error("ERROR DB PREFERENCES:", err);
    res.status(500).json({ message: "Error guardando preferencias" });
  }
});


// Obtener preferencias del usuario
router.get("/preferences", verifyToken, async (req, res) => {
  const userId = req.userId;

  try {
    const result = await query(
      "SELECT language, theme, notifications_enabled FROM user_preferences WHERE user_id = ?",
      [userId]
    );

    if (result.length === 0) {
      // No hay prefs, devolver valores por defecto
      return res.json({
        preferences: {
          language: "es",
          theme: "light",
          notifications_enabled: true,
        },
      });
    }

    res.json({
      preferences: result[0],
    });
  } catch (err) {
    console.error("ERROR DB GET PREFERENCES:", err);
    res.status(500).json({ message: "Error obteniendo preferencias" });
  }
});

module.exports = router;