const NOTIFICATION_SOUND_BASE64 = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU5LjI3LjEwMAAAAAAAAAAAAAAA//tQxAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQxOAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQxOAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQxOAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tQxOAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq"; 

let ringtoneInterval = null;
let sharedAudioCtx = null;
let currentRingtoneSession = 0;

const getAudioCtx = () => {
  if (!sharedAudioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) sharedAudioCtx = new AudioContext();
  }
  return sharedAudioCtx;
};

const resumeAudio = async () => {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') await ctx.resume();
  return ctx;
};

export const stopRingtone = () => {
  currentRingtoneSession++;
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
};

const createOscPulse = (ctx, freq, vol, duration, now, oscType = 'sine') => {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = oscType;
  osc.frequency.setValueAtTime(freq, now);
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(vol, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
};

export const playNotificationSound = async (type = "crystal") => {
  try {
    const ctx = await resumeAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    switch (type) {
      case "bubble":
        createOscPulse(ctx, 400, 0.1, 0.15, now);
        setTimeout(() => createOscPulse(getAudioCtx(), 600, 0.08, 0.1, getAudioCtx().currentTime), 50);
        break;
      case "pop": createOscPulse(ctx, 500, 0.15, 0.1, now); break;
      case "chime":
        createOscPulse(ctx, 523, 0.1, 0.6, now);
        setTimeout(() => createOscPulse(getAudioCtx(), 783, 0.07, 0.4, getAudioCtx().currentTime), 100);
        break;
      case "echo":
        createOscPulse(ctx, 440, 0.1, 0.3, now);
        setTimeout(() => createOscPulse(getAudioCtx(), 554, 0.05, 0.2, getAudioCtx().currentTime), 150);
        break;
      case "zap": createOscPulse(ctx, 800, 0.1, 0.1, now, 'square'); break;
      case "tink":
        const dripOsc = ctx.createOscillator();
        const dripGain = ctx.createGain();
        dripOsc.frequency.setValueAtTime(600, now);
        dripOsc.frequency.exponentialRampToValueAtTime(1500, now + 0.1);
        dripGain.gain.setValueAtTime(0, now);
        dripGain.gain.linearRampToValueAtTime(0.1, now + 0.01);
        dripGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        dripOsc.connect(dripGain);
        dripGain.connect(ctx.destination);
        dripOsc.start(now);
        dripOsc.stop(now + 0.15);
        break;
      case "bloop": createOscPulse(ctx, 300, 0.1, 0.2, now); break;
      case "crystal":
      default:
        createOscPulse(ctx, 880, 0.1, 0.5, now);
        createOscPulse(ctx, 1320, 0.07, 0.4, now);
        break;
    }
  } catch (e) { console.warn("Audio Error:", e); }
};

// Función para tocar una melodía (una sola vez)
const playMelody = async (type, mySession) => {
  const ctx = await resumeAudio();
  if (!ctx || mySession !== currentRingtoneSession) return;

  const playNote = (freq, vol, duration, delay, oscType = 'sine') => {
    setTimeout(() => {
      if (mySession === currentRingtoneSession) {
        const c = getAudioCtx();
        createOscPulse(c, freq, vol, duration, c.currentTime, oscType);
      }
    }, delay);
  };

  if (type === "retro") {
    playNote(523.25, 0.1, 0.1, 0, 'square'); // C5
    playNote(659.25, 0.1, 0.1, 100, 'square'); // E5
    playNote(783.99, 0.1, 0.1, 200, 'square'); // G5
    playNote(1046.50, 0.1, 0.2, 300, 'square'); // C6
  } else if (type === "zen") {
    playNote(440.00, 0.08, 0.8, 0); // A4
    playNote(554.37, 0.06, 0.7, 400); // C#5
    playNote(659.25, 0.05, 0.6, 800); // E5
    playNote(880.00, 0.04, 1.0, 1200); // A5
  } else {
    // Modern Pulse (default)
    playNote(880, 0.1, 0.05, 0, 'triangle');
    playNote(880, 0.1, 0.05, 150, 'triangle');
    playNote(1320, 0.08, 0.2, 300, 'triangle');
    playNote(440, 0.1, 0.1, 450, 'triangle');
  }
};

export const playRingtoneOnce = async (type = "retro") => {
  const mySession = ++currentRingtoneSession;
  playMelody(type, mySession);
};

export const playRingtone = async (type = "retro") => {
  stopRingtone();
  const mySession = currentRingtoneSession;
  
  const loop = () => {
    if (mySession === currentRingtoneSession) {
      playMelody(type, mySession);
    }
  };

  loop();
  ringtoneInterval = setInterval(loop, type === "zen" ? 2500 : 1500);
};