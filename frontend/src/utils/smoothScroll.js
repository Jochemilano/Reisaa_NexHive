/**
 * Utilidad para realizar un scroll suave (animado) dentro de un contenedor.
 * Utiliza requestAnimationFrame para un rendimiento óptimo y una función de easing para fluidez.
 * 
 * @param {HTMLElement} container - El elemento con scroll (ej: un div con overflow-y: auto).
 * @param {number} targetPos - La posición final de scrollTop deseada.
 * @param {Object} options - Opciones de configuración.
 * @param {number} options.maxDuration - Duración máxima de la animación en ms.
 * @param {Function} options.onComplete - Callback ejecutado al finalizar el scroll.
 */
export function smoothScroll(container, targetPos, options = {}) {
  if (!container) return;

  const { maxDuration = 800, onComplete } = options;

  const startPos = container.scrollTop;
  const distance = targetPos - startPos;

  if (distance === 0) {
    onComplete?.();
    return;
  }

  // NOTE: Calcula la duración proporcionalmente a la distancia, pero con un tope máximo.
  const baseSpeed = 0.5; // px por ms
  const duration = Math.min(Math.abs(distance) / baseSpeed, maxDuration);

  // Función de easing: easeInOutQuad (aceleración y desaceleración suave)
  const ease = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;

  let start = null;
  const step = timestamp => {
    if (!start) start = timestamp;
    const progress = timestamp - start;
    const percent = Math.min(progress / duration, 1);
    
    container.scrollTop = startPos + distance * ease(percent);
    
    if (percent < 1) {
      requestAnimationFrame(step);
    } else {
      onComplete?.();
    }
  };

  requestAnimationFrame(step);
}