# Guía de Colaboración - NexHive 🐝

Bienvenido al equipo de desarrollo de **NexHive**. Este documento establece las normas y estándares necesarios para mantener la calidad, consistencia y escalabilidad de nuestro código.

---

## 🏛️ Contexto Técnico
NexHive utiliza un stack **MERN (MySQL, Express, React, Node)**. Antes de empezar, familiarízate con la estructura actual:

- **Frontend**: React 19, custom hooks para lógica, CSS modular por componente.
- **Backend**: Express con arquitectura Controller-Route, WebSockets (Socket.io) para tiempo real.
- **Base de Datos**: MySQL (utilizando `mysql2`).

---

## 🎯 Reglas Generales
La calidad de NexHive depende de la disciplina individual.
- **Código Limpio (Clean Code)**: Escribe código que se explique por sí solo. Si un bloque es difícil de entender, refactorízalo.
- **Evitar la Sobreingeniería**: No implementes soluciones complejas para problemas simples (KISS - Keep It Simple, Stupid).
- **Priorizar Legibilidad**: El código se lee muchas más veces de las que se escribe. Usa nombres descriptivos.
- **Consistencia**: Sigue los patrones de diseño ya establecidos en el proyecto. No mezcles estilos de programación.

---

## 🛠️ Convenciones de Código

### Naming Conventions
- **Componentes React**: `PascalCase` (ej. `KanbanBoard.jsx`).
- **Archivos de Estilo**: Deben coincidir con el componente (ej. `KanbanBoard.css`).
- **Funciones y Variables**: `camelCase` (ej. `const fetchActivities = ...`).
- **Constantes/Enums**: `UPPER_SNAKE_CASE` (ej. `const MAX_RETRY_ATTEMPTS = 3`).

### Estructura y Responsabilidades
- **Separación de Intereses**: La lógica de negocio pesada debe vivir en **Hooks Personalizados** o **Servicios**, no dentro del JSX del componente.
- **Componentes Atómicos**: Divide componentes grandes en piezas pequeñas y reutilizables en `frontend/src/components`.
- **Manejo de Imports**:
    1. React y librerías externas.
    2. Componentes internos.
    3. Hooks y utilidades.
    4. Estilos (siempre al final).

### Documentación
- Usa **JSDoc** para documentar funciones complejas, hooks y props de componentes.
- Explica el "por qué", no el "qué" (el código ya dice qué hace).

---

## 🌿 Branching Strategy
Utilizamos un flujo basado en **GitFlow** simplificado:

- **`main`**: Código en producción. Siempre estable.
- **`develop`**: Rama de integración para nuevas funcionalidades.
- **`feature/*`**: Ramas temporales para tareas específicas (ej. `feature/rtc-video-call`).
- **`hotfix/*`**: Correcciones urgentes que van directo a `main`.

> [!TIP]
> Nunca trabajes directamente sobre `main` o `develop`. Crea siempre una rama desde `develop`.

---

## 💾 Convención de Commits
Usamos **Conventional Commits** para mantener un historial legible:

- `feat:` Nueva funcionalidad para el usuario.
- `fix:` Corrección de un error.
- `refactor:` Cambio en el código que no añade features ni arregla bugs.
- `docs:` Cambios solo en la documentación.
- `chore:` Tareas de mantenimiento, actualización de dependencias, etc.
- `test:` Añadir o modificar pruebas.

*Ejemplo: `feat: implementar drag and drop en el tablero kanban`*

---

## 🔄 Pull Requests (PRs)
El proceso de integración es sagrado para evitar bugs en producción.

1. **Descripción Clara**: Explica qué cambia y por qué.
2. **Screenshots/Videos**: Obligatorios si hay cambios visuales en el Frontend.
3. **Tamaño del PR**: Evita "PRs Gigantes". Si tu cambio afecta a más de 20 archivos, considera dividirlo.
4. **Testing Obligatorio**: Asegúrate de que el código corre localmente y no rompe funcionalidades existentes.

---

## 🔍 Code Review
Al revisar el código de un compañero:
- Sé amable y constructivo.
- Enfócate en la lógica, seguridad y performance.
- Si ves algo mejorable, sugiere una alternativa con un ejemplo de código.
- No apruebes un PR que no entiendas completamente.

---

## 🧪 Testing
- **Frontend**: Prueba tus componentes en diferentes tamaños de pantalla (Responsividad).
- **Backend**: Verifica los casos de error (400, 401, 404, 500) en los nuevos endpoints.
- **Manual**: Antes de enviar un PR, realiza el "Happy Path" completo de la funcionalidad.

---

## ⚡ Performance y Seguridad
- **Performance**: Evita re-renders innecesarios en React (usa `useMemo` o `useCallback` solo cuando sea necesario).
- **Seguridad**:
    - Nunca subas secretos (`.env`) al repositorio.
    - Valida siempre los datos de entrada en el Backend (evita inyecciones).
    - Usa siempre el middleware de autenticación para rutas protegidas.

---

## 💬 Comunicación del Equipo
- **Dudas Técnicas**: Usa los canales de Slack/Discord establecidos.
- **Bloqueos**: Si estás bloqueado por más de 2 horas, pide ayuda. No sufras en silencio.
- **Actualizaciones**: Notifica cuando una rama importante sea mergeada a `develop`.

---

*“Escribe código como si la persona que lo fuera a mantener fuera un psicópata violento que sabe dónde vives.”* — **Filosofía NexHive**