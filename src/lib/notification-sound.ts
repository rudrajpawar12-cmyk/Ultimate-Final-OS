/**
 * Notification sound.
 *
 * A short two-note chime synthesised with the Web Audio API so no audio asset
 * ships in the bundle. The on/off preference is persisted per user in
 * localStorage (keyed by user id) so it survives reloads and is scoped to the
 * account on shared browsers.
 */
const PREF_KEY_PREFIX = "careeros:notification-sound:";
let currentUserId: string | null = null;
let enabledPref = true;

const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

/** Subscribe to preference changes (used by `useSyncExternalStore`). */
export function subscribeToNotificationSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Call once per session with the signed-in user's id (or null on sign-out). */
export function configureNotificationSound(userId: string | null): void {
  if (currentUserId === userId) return;
  currentUserId = userId;
  const next = readPref(userId);
  if (next !== enabledPref) {
    enabledPref = next;
    emit();
  }
}

export function isNotificationSoundEnabled(): boolean {
  return enabledPref;
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  if (enabledPref === enabled) return;
  enabledPref = enabled;
  writePref(currentUserId, enabled);
  emit();
}


function readPref(userId: string | null): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(PREF_KEY_PREFIX + (userId ?? "anonymous"));
    return raw === null ? true : raw === "on";
  } catch {
    return true;
  }
}

function writePref(userId: string | null, enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PREF_KEY_PREFIX + (userId ?? "anonymous"),
      enabled ? "on" : "off",
    );
  } catch {
    /* storage unavailable — preference simply won't persist */
  }
}

let audioContext: AudioContext | null = null;

/**
 * Play the chime. No-op when disabled, when AudioContext is unavailable,
 * or when the browser blocks playback before a user gesture.
 */
export function playNotificationSound(): void {
  if (!enabledPref || typeof window === "undefined") return;
  const Ctor = window.AudioContext;
  if (!Ctor) return;
  try {
    audioContext = audioContext ?? new Ctor();
    if (audioContext.state === "suspended") {
      void audioContext.resume();
    }
    const ctx = audioContext;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    gain.connect(ctx.destination);
    /* Gentle ascending two-note chime (E5 -> A5). */
    [659.25, 880].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      const start = now + index * 0.12;
      osc.connect(gain);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  } catch {
    /* audio blocked — stay silent rather than breaking realtime updates */
  }
}