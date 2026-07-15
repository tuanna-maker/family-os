/** Light haptic — works on iOS (Vibration API) and many Android browsers. */
export function hapticLight() {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(10);
  } catch {
    /* ignore */
  }
}

export function hapticMedium() {
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate([12, 40, 12]);
  } catch {
    /* ignore */
  }
}
