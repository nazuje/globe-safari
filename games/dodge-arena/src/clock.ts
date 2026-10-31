/** A run's time as children read it: "47.3" or, past a minute, "1:07.3". */
export function formatTime(seconds: number): string {
  const tenths = Math.floor(Math.max(0, seconds) * 10);
  const whole = Math.floor(tenths / 10);
  const part = tenths % 10;
  if (whole < 60) return `${whole}.${part}`;
  const left = String(whole % 60).padStart(2, '0');
  return `${Math.floor(whole / 60)}:${left}.${part}`;
}
