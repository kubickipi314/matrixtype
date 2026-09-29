import { useEffect, useState } from 'react';
import { usePointerActivity } from './usePointerActivity';

interface Options {
  idleHideMs: number;
  hideCursorWhenIdle: boolean;
  /** While true (e.g. a panel is open) the cursor is never hidden. */
  keepCursor: boolean;
}

/**
 * Visibility of the on-screen chrome (logo, options bar): shown while the
 * pointer moves and for `idleHideMs` after, and kept while hovered so it
 * doesn't vanish under the cursor before it can be clicked. Also hides the
 * cursor while the chrome is hidden.
 */
export function useChromeVisibility({ idleHideMs, hideCursorWhenIdle, keepCursor }: Options) {
  const pointerActive = usePointerActivity(idleHideMs);
  const [hovered, setHovered] = useState(false);
  const visible = pointerActive || hovered;

  const hideCursor = hideCursorWhenIdle && !visible && !keepCursor;
  useEffect(() => {
    document.body.classList.toggle('cursor-hidden', hideCursor);
  }, [hideCursor]);

  return {
    visible,
    hoverProps: { onPointerEnter: () => setHovered(true), onPointerLeave: () => setHovered(false) },
    /** Forget the hover state, e.g. when the hovered element is replaced by a panel. */
    resetHover: () => setHovered(false),
  };
}
