require("dotenv").config();
const jwt = require("jsonwebtoken");

/**
 * NOTE: Middleware de autorización.
 * Extrae el Bearer Token del header Authorization, lo valida y adjunta 
 * el userId al objeto request para su uso en controladores protegidos.
 */
function verifyToken(req, res, next) {
  const auth = req.headers.authorization;

  // Validación de presencia del header
  if (!auth) return res.status(401).json({ message: "Token no proporcionado" });

  // Estructura esperada: "Bearer <token>"
  const token = auth.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Diferenciar expiración de firma inválida para depuración
      console.log("❌ JWT inválido:", err.message);
      return res.status(403).json({ message: "Token inválido" });
    }
    
    // Inyectar ID decodificado en el flujo de la petición
    req.userId = decoded.id;
    next();
  });
}

module.exports = verifyToken;