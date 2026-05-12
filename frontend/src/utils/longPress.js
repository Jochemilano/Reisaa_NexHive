/**
 * Registra un evento de pulsación larga (Long Press) en un elemento DOM.
 * Soporta eventos de ratón y táctiles.
 * 
 * @param {HTMLElement} element - El elemento donde se aplicará el listener.
 * @param {Function} callback - Función a ejecutar tras la pulsación larga.
 * @param {number} duration - Tiempo en ms para considerar la pulsación como "larga".
 */
export function addLongPress(element, callback, duration = 500) {
  let timer = null;

  const start = () => {
    timer = setTimeout(() => {
      callback();
    }, duration);
  };

  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  // Inicio de interacción
  element.addEventListener("mousedown", start);
  element.addEventListener("touchstart", start);

  // Cancelación por fin de interacción o movimiento fuera del área
  element.addEventListener("mouseup", cancel);
  element.addEventListener("mouseleave", cancel);
  element.addEventListener("touchend", cancel);
}