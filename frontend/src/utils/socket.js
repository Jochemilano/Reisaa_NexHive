import { CONFIG } from "./config";

/**
 * Cliente de Tiempo Real basado en Server-Sent Events (SSE).
 * Simula la API de Socket.io utilizando EventSource nativo para la recepción
 * de eventos y peticiones HTTP POST (fetch) para la emisión.
 */
class SSERealtimeClient {
  constructor() {
    this.listeners = {};
    this.eventSource = null;
    this.connected = false;
    this.disconnected = true;
    this.auth = {
      token: localStorage.getItem("token") || ""
    };
    this.id = Math.random().toString(36).substring(2, 15);
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!event) {
      this.listeners = {};
      return;
    }
    if (!callback) {
      delete this.listeners[event];
      return;
    }
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  once(event, callback) {
    const tempCallback = (...args) => {
      this.off(event, tempCallback);
      callback(...args);
    };
    this.on(event, tempCallback);
  }

  emit(event, data) {
    const token = this.auth.token;
    if (!token) {
      console.warn("⚠️ [Realtime Mock] Intentando emitir sin token:", event);
      return;
    }

    // Emitimos el evento mediante una petición HTTP POST a /api/emit
    fetch(`${CONFIG.API_URL}/emit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ event, data })
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      return res.json();
    })
    .catch(err => {
      console.error(`❌ [Realtime Mock] Error emitiendo evento ${event}:`, err);
    });
  }

  connect() {
    if (this.eventSource) {
      this.disconnect();
    }

    const token = this.auth.token;
    if (!token) {
      console.error("❌ [Realtime Mock] No se puede conectar sin token.");
      return;
    }

    console.log("🔌 [Realtime Mock] Conectando canal en tiempo real (SSE)...");
    
    // Pasamos el token en la query porque EventSource nativo no permite cabeceras personalizadas
    const sseUrl = `${CONFIG.API_URL}/sse?token=${encodeURIComponent(token)}&t=${Date.now()}`;
    
    this.eventSource = new EventSource(sseUrl);

    this.eventSource.onopen = () => {
      console.log("✅ [Realtime Mock] Canal SSE conectado.");
      this.connected = true;
      this.disconnected = false;
      this._trigger("connect");
    };

    this.eventSource.onerror = (err) => {
      console.warn("⚠️ [Realtime Mock] Desconexión o error en SSE:", err);
      // EventSource se reconectará de forma automática.
      // Modificamos el estado temporal para que la UI responda.
      this.connected = false;
      this.disconnected = true;
      this._trigger("disconnect", "error");
      this._trigger("connect_error", new Error("SSE connection error"));
    };

    // Listado de tipos de eventos que el cliente escuchará de SSE
    const eventTypes = [
      'receive-message',
      'new-message-notification',
      'user-typing',
      'user-stop-typing',
      'room-read',
      'usuarios:lista',
      'incoming-call',
      'call-accepted',
      'call-declined',
      'call-ended',
      'voice-room-users',
      'voice-user-joined',
      'voice-user-left',
      'voice-signal'
    ];

    eventTypes.forEach(type => {
      this.eventSource.addEventListener(type, (e) => {
        try {
          const payload = JSON.parse(e.data);
          this._trigger(type, payload);
        } catch (err) {
          console.error(`[Realtime Mock] Error parseando datos del evento [${type}]:`, err);
        }
      });
    });
  }

  disconnect() {
    if (this.eventSource) {
      console.log("🔌 [Realtime Mock] Cerrando canal en tiempo real (SSE)...");
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connected = false;
    this.disconnected = true;
    this._trigger("disconnect", "manual");
    return this; // Permite encadenamiento como en socket.disconnect().connect()
  }

  _trigger(event, data) {
    if (this.listeners[event]) {
      const list = [...this.listeners[event]];
      list.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error en listener de evento '${event}':`, e);
        }
      });
    }
  }
}

const socket = new SSERealtimeClient();

/**
 * Fuerza la reconexión utilizando un nuevo token de autenticación.
 */
const connectWithToken = (token) => {
  if (token) {
    socket.auth.token = token;
    if (socket.disconnected) {
      socket.connect();
    } else {
      socket.disconnect().connect();
    }
  }
};

/**
 * Notifica al servidor que el usuario se une a una sala de chat específica.
 */
const joinRoom = (roomId) => {
  if (socket.connected) {
    socket.emit("join-room", roomId);
  } else {
    socket.once("connect", () => socket.emit("join-room", roomId));
  }
};

/**
 * Envía un mensaje en tiempo real a través de la simulación.
 */
const sendMessage = (message) => {
  socket.emit("send-message", message);
};

/**
 * Notifica que todos los mensajes de una sala han sido leídos.
 */
const markRoomRead = (roomId) => {
  if (socket.connected) {
    socket.emit("mark-room-read", { roomId });
  } else {
    socket.once("connect", () => socket.emit("mark-room-read", { roomId }));
  }
};

export { socket, joinRoom, sendMessage, markRoomRead, connectWithToken };