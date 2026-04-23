# Guía de Colaboradores - NexHive 🐝

Bienvenido al equipo de **NexHive**. Este documento detalla la estructura del proyecto, las tecnologías utilizadas y las pautas para colaborar de manera efectiva.

---

## 🏛️ Arquitectura del Proyecto

El proyecto sigue una arquitectura de **Cliente-Servidor (MERN Stack simplificado con MySQL)**.

### Flujo de Renderizado (Frontend)
1. **`index.js`**: Punto de entrada principal. Renderiza el componente raíz `<App />`.
2. **`App.js`**: Contenedor principal que incluye el `<AppRouter />`.
3. **`AppRouter.jsx`**: Gestiona todas las rutas de la aplicación.
4. **`pages/`**: Contiene las vistas completas (ej. `Home.jsx`).
5. **`components/`**: Piezas reutilizables de UI utilizadas dentro de las páginas.

---

## 📁 Estructura de Carpetas

### Frontend (`/frontend`)
- **`components/`**: Componentes atómicos y reutilizables (Botones, Inputs, Modales).
- **`pages/`**: Páginas principales que integran múltiples componentes.
- **`router/`**: Configuración centralizada de rutas.
- **`hooks/`**: Custom hooks para lógica reutilizable (ej. manejo de estados globales).
- **`utils/`**: Funciones auxiliares de procesamiento y formateo.
- **`assets/`**: Imágenes, iconos y recursos estáticos.

### Backend (`/backend`)
- **`index.js`**: Servidor Express y configuración de Sockets.
- **`routes/`**: Definición de endpoints de la API.
- **`controllers/`**: Lógica de negocio y manejo de peticiones.
- **`middleware/`**: Funciones de validación y seguridad (Auth, Multer).
- **`config/`**: Conexiones a base de datos y variables de entorno.

---

## 🛠️ Stack Tecnológico

### Frontend (React)
| Librería | Propósito |
| :--- | :--- |
| **React 19** | Biblioteca principal de UI. |
| **React Router DOM** | Manejo de navegación y rutas. |
| **Socket.io Client** | Comunicación en tiempo real (Chat/Notificaciones). |
| **Simple-peer** | Implementación de WebRTC para videollamadas. |
| **React Big Calendar** | Visualización y gestión de calendarios. |
| **Date-fns** | Manipulación y formateo de fechas. |
| **React Icons** | Librería de iconos vectoriales. |
| **Fabric.js** | Manipulación de canvas interactivos. |
| **Craco** | Configuración personalizada de Create React App. |

### Backend (Node.js & Express)
| Librería | Propósito |
| :--- | :--- |
| **Express** | Framework para el servidor web. |
| **MySQL2** | Driver para conexión con la base de datos MySQL. |
| **JSONWebToken (JWT)** | Autenticación basada en tokens. |
| **Socket.io** | Servidor de WebSockets para tiempo real. |
| **Bcryptjs** | Encriptación de contraseñas. |
| **Nodemailer** | Envío de correos electrónicos (Verificación/Reset). |
| **Multer** | Middleware para subida de archivos/imágenes. |
| **Dotenv** | Gestión de variables de entorno sensibles. |
| **CORS** | Configuración de intercambio de recursos entre orígenes. |

---

## 🎨 Estándares de Estilo (CSS)

- **`index.css`**: Contiene el reset global, estilos de `html` y `body`. **No modificar sin previo aviso.**
- **`App.css`**: Variables globales (colores, fuentes), temas y layout general.
- **Componentes**: Cada página o componente debe tener su propio archivo CSS (ej. `Navbar.css`, `Home.css`) para mantener el encapsulamiento.

---

## 🚀 Cómo Empezar

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/Jochemilano/NexHive.git
   ```
2. **Instalar dependencias**:
   ```bash
   # En /frontend
   npm install
   # En /backend
   npm install
   ```
3. **Configurar variables de entorno**:
   - Crear un archivo `.env` en `/backend` basado en el ejemplo proporcionado.
4. **Ejecutar en desarrollo**:
   ```bash
   # Frontend
   npm start
   # Backend
   npm start
   ```

---

## 🤝 Reglas de Colaboración
- **Ramas**: Crear ramas descriptivas (ej: `feat/login-system` o `fix/navbar-mobile`).
- **Commits**: Mensajes claros y en español/inglés consistentes.
- **Código**: Mantener el código limpio, comentado donde sea necesario y seguir la estructura de carpetas establecida.