# NexHive 🐝

**NexHive** es una plataforma integral de gestión de proyectos y colaboración en tiempo real, diseñada para equipos que buscan centralizar su flujo de trabajo en una sola herramienta potente y fluida.

---

## 🚀 Features
- **Gestión de Proyectos**: Creación, edición y seguimiento de proyectos y grupos de trabajo.
- **Tablero Kanban**: Visualización ágil de tareas con sistema Drag & Drop para cambios de estado.
- **Comunicación en Tiempo Real**: Chat integrado y sistema de notificaciones vía WebSockets.
- **Videollamadas**: Implementación de llamadas de video directamente en la plataforma mediante WebRTC.
- **Calendario y Gantt**: Gestión visual de cronogramas y fechas límite.
- **Pizarra Colaborativa**: Espacio interactivo utilizando Canvas para lluvia de ideas.
- **Gestión de Archivos**: Subida y compartición de documentos relevantes por proyecto.

---

## 🛠️ Stack Tecnológico
- **Frontend**: React 19, React Router DOM, Socket.io Client, Simple-peer (WebRTC), Fabric.js, CSS Modular.
- **Backend**: Node.js, Express, MySQL (Driver mysql2).
- **Autenticación**: JSON Web Tokens (JWT) y Bcryptjs para encriptación.
- **Comunicación**: Socket.io para mensajería y eventos en tiempo real.

---

## 💻 Instalación

### Requisitos previos
- Node.js (v18 o superior)
- MySQL Server

### Pasos
1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/Jochemilano/Reisaa_NexHive.git
   ```

2. **Configurar el Backend**:
   ```bash
   cd backend
   npm install
   # Configura el archivo .env (ver sección Variables de Entorno)
   npm start
   ```

3. **Configurar el Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm start
   ```

---

## 🔑 Variables de Entorno
Crea un archivo `.env` en la carpeta `/backend` con los siguientes campos:

```env
PORT=5000
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=nexhive_db
JWT_SECRET=tu_secreto_super_seguro
```

---

## 📜 Scripts Disponibles

### Frontend
- `npm start`: Inicia el servidor de desarrollo en `http://localhost:3000`.
- `npm run build`: Crea la versión de producción optimizada.

### Backend
- `npm start`: Inicia el servidor de la API en el puerto configurado.

---

## 📂 Estructura del Proyecto
```text
NexHive/
├── frontend/           # Aplicación React
│   ├── src/
│   │   ├── components/ # Componentes reutilizables
│   │   ├── pages/      # Vistas principales
│   │   ├── hooks/      # Lógica compartida
│   │   └── utils/      # Funciones auxiliares
├── backend/            # Servidor Express
│   ├── routes/         # Definición de Endpoints
│   ├── controllers/    # Lógica de negocio
│   ├── middleware/     # Validaciones y seguridad
│   └── config/         # Conexión a DB
└── COLLABORATORS.md    # Guía de estándares de código
```

---

## 📡 API Endpoints (Principales)
- `POST /api/auth/login`: Autenticación de usuarios.
- `GET /api/projects`: Listado de proyectos del usuario.
- `POST /api/activities`: Creación de nuevas tareas.
- `PUT /api/activities/:id`: Actualización de estado (usado en Kanban).

---

## ⚙️ Flujo de la Aplicación
1. El usuario se autentica y recibe un **JWT**.
2. React mantiene el estado global y se comunica con la **API REST** para persistencia.
3. **Socket.io** gestiona eventos transversales como mensajes de chat y alertas de actualización.
4. Para videollamadas, se establece una conexión **P2P** directa entre navegadores.

---

## ✅ Buenas Prácticas
Para mantener la calidad del proyecto, es obligatorio seguir las pautas detalladas en el archivo [COLLABORATORS.md](./COLLABORATORS.md), que incluye:
- Convenciones de nombres.
- Estructura de commits (Conventional Commits).
- Flujo de trabajo con ramas (GitFlow).

---

## 🚢 Deployment
- **Frontend**: Recomendado en Vercel o Netlify.
- **Backend**: Puede desplegarse en Railway, Render o servicios tipo VPS (DigitalOcean/AWS).
- **DB**: MySQL gestionado (Aiven, PlanetScale o AWS RDS).

---

## 📝 TODO / Mejoras Futuras
- [ ] Implementar Tests Unitarios y de Integración (Jest/React Testing Library).
- [ ] Soporte para Modo Oscuro persistente.
- [ ] App móvil nativa utilizando React Native.
- [ ] Integración con servicios de almacenamiento en la nube (S3/Cloudinary).

---

## 📄 Licencia
Este proyecto está bajo la licencia [MIT](LICENSE).
