const NOTIFICATION_SOUND_BASE64 = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU5LjI3LjEwMAAAAAAAAAAAAAAA//tQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQxOAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQxOAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQxOAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQxOAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"; // NOTA: He puesto una cabecera de MP3 genérica y vacía.

export const playNotificationSound = (type = "crystal") => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;

    const createOsc = (freq, vol, duration, sweep = false, type = 'sine') => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (sweep) {
        osc.frequency.exponentialRampToValueAtTime(freq * 1.8, now + duration);
      }

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(vol, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    };

    switch (type) {
      case "bubble":
        createOsc(400, 0.1, 0.15, true);
        setTimeout(() => createOsc(600, 0.08, 0.1, true), 50);
        break;
      case "pop":
        createOsc(500, 0.15, 0.1);
        break;
      case "chime":
        createOsc(523.25, 0.1, 0.6);
        setTimeout(() => createOsc(783.99, 0.07, 0.4), 100);
        break;
      case "echo":
        // Sonido tipo Radar
        createOsc(440, 0.1, 0.3);
        setTimeout(() => createOsc(554.37, 0.05, 0.2), 150);
        break;
      case "zap":
        createOsc(800, 0.1, 0.1, true, 'square');
        break;
      case "tink":
        // Sonido de Gota (barrido rápido hacia arriba)
        const dripFreq = 600;
        const dripOsc = ctx.createOscillator();
        const dripGain = ctx.createGain();
        dripOsc.frequency.setValueAtTime(dripFreq, now);
        dripOsc.frequency.exponentialRampToValueAtTime(dripFreq * 2.5, now + 0.1);
        dripGain.gain.setValueAtTime(0, now);
        dripGain.gain.linearRampToValueAtTime(0.1, now + 0.01);
        dripGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        dripOsc.connect(dripGain);
        dripGain.connect(ctx.destination);
        dripOsc.start(now);
        dripOsc.stop(now + 0.15);
        break;
      case "bloop":
        createOsc(300, 0.1, 0.2, true);
        break;

      case "crystal":
      default:
        createOsc(880.00, 0.1, 0.5);
        createOsc(1320.00, 0.07, 0.4);
        break;
    }


  } catch (e) {
    console.warn("No se pudo reproducir el sonido:", e);
  }
};