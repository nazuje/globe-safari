export interface WakeLock {
  hold(): void;
  release(): void;
}

/**
 * Keeps the screen on during play, since nobody touches the tablet. The browser
 * drops the lock when the page is hidden, so hold() again when it comes back.
 * Everything fails silently: without it, the screen simply sleeps as usual.
 */
export function createWakeLock(): WakeLock {
  let lock: WakeLockSentinel | null = null;
  let wanted = false;

  async function acquire(): Promise<void> {
    if (!('wakeLock' in navigator) || lock) return;
    try {
      const granted = await navigator.wakeLock.request('screen');
      if (wanted) {
        lock = granted;
        granted.addEventListener('release', () => {
          if (lock === granted) lock = null;
        });
      } else {
        await granted.release();
      }
    } catch {
      // Refused or unsupported. The game plays on.
    }
  }

  return {
    hold() {
      wanted = true;
      void acquire();
    },
    release() {
      wanted = false;
      lock?.release().catch(() => undefined);
      lock = null;
    },
  };
}
