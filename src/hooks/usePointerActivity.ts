import { useEffect, useState } from 'react';

/** True while the pointer has moved within the last `idleMs`. */
export function usePointerActivity(idleMs: number): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const onMove = () => {
      setActive(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setActive(false), idleMs);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onMove);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
    };
  }, [idleMs]);

  return active;
}
