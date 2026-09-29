import type { CSSProperties } from 'react';
import type { MatrixConfig } from '../config/matrixConfig';

/**
 * The whole animation is this many times `durationMs`; the keyframes keep the
 * attack at ~80 ms for the default 1 s, so only the fade-out gets longer.
 */
const FADE_STRETCH = 2.5;

interface Props {
  /** Increment to fire a new flash; 0 renders nothing. */
  flashId: number;
  config: MatrixConfig['flash'];
}

export function ScreenFlash({ flashId, config }: Props) {
  if (!flashId) return null;
  const style = {
    '--flash-color': config.color,
    '--flash-opacity': config.maxOpacity,
    animationDuration: `${config.durationMs * FADE_STRETCH}ms`,
  } as CSSProperties;
  // Keyed so each flash restarts the CSS animation.
  return <div key={flashId} className="screen-flash" style={style} />;
}
