// backend/middleware/uploadConfig.js
const multer = require("multer");
const path = require("path");

/**
 * NOTE: Configuración de almacenamiento local para archivos.
 * Se utiliza diskStorage para tener control total sobre el nombre del archivo
 * y evitar colisiones usando un prefijo de timestamp.
 */
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../uploads"),
  filename: (req, file, cb) => {
    // Generar nombre único: <timestamp>-<nombre_original>
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

/**
 * NOTE: Filtro de seguridad por tipo MIME.
 * Restringe las subidas a formatos específicos de imagen, video, audio y documentos.
 * Previene la ejecución de scripts maliciosos (ej: .php, .js) en el servidor.
 */
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Imágenes
    "image/jpeg", "image/png", "image/webp", "image/gif",
    // Videos
    "video/mp4", "video/quicktime", "video/x-msvideo", "video/webm",
    // Audios
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4",
    // Documentos
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed",
    "application/x-rar-compressed"
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Rechazo explícito de tipos no permitidos
    cb(new Error("Tipo de archivo no permitido"));
  }
};

/**
 * NOTE: Instancia de Multer configurada.
 * Límite de tamaño: 100MB (Ajustable según necesidad de almacenamiento).
 */
const upload = multer({ storage, fileFilter, limits: { fileSize: 100 * 1024 * 1024 } });

module.exports = upload;