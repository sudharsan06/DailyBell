import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Ticks once per second, aligned to the wall clock, only while the app is
 * foregrounded. Nothing runs in the background — the OS owns background bells.
 */
export const useNow = (onTick?: (now: Date) => void) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const d = new Date();
      setNow(d);
      onTick?.(d);
      timer = setTimeout(tick, 1000 - (d.getTime() % 1000) + 5);
    };
    const start = () => {
      if (timer) clearTimeout(timer);
      tick();
    };
    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };
    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', s =>
      s === 'active' ? start() : stop(),
    );
    return () => {
      stop();
      sub.remove();
    };
    // onTick is expected to be stable (module-level function).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return now;
};
