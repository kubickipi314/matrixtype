import { useEffect, useMemo, useState } from 'react';
import type { GlitchOptions } from './glitchOptions';

interface Props {
  text: string;
  /**
   * Showing: blank -> random -> real -> random -> real ...
   * Hiding:  real -> random -> blank (each letter at its own moment).
   */
  visible: boolean;
  options: GlitchOptions;
}

type Phase = 'blank' | 'random' | 'real';

interface Letter {
  phase: Phase;
  glyph: string;
  ticksLeft: number;
}

const randTicks = (min: number, max: number) => {
  const lo = Math.max(1, Math.round(Math.min(min, max)));
  const hi = Math.max(lo, Math.round(Math.max(min, max)));
  return lo + Math.floor(Math.random() * (hi - lo + 1));
};

function nextPhase(phase: Phase, visible: boolean): Phase {
  if (visible) return phase === 'random' ? 'real' : 'random';
  return phase === 'real' ? 'random' : 'blank';
}

const blankLetters = (text: string): Letter[] => Array.from(text, () => ({ phase: 'blank', glyph: '', ticksLeft: 0 }));

export function GlitchText({ text, visible, options }: Props) {
  const { charset, tickMs, minTicks, maxTicks, realRatio, mirror } = options;
  const [letters, setLetters] = useState(() => blankLetters(text));
  const chars = useMemo(() => Array.from(charset), [charset]);

  // The timer only runs while something is (or is becoming) visible.
  const running = visible || letters.some((l) => l.phase !== 'blank');

  // Restart per-letter countdowns whenever the direction changes, so letters
  // appear / vanish at staggered random moments rather than in unison.
  useEffect(() => {
    setLetters((prev) =>
      Array.from(text, (_, i) => ({
        phase: prev[i]?.phase ?? 'blank',
        glyph: prev[i]?.glyph ?? '',
        ticksLeft: randTicks(1, maxTicks),
      })),
    );
  }, [visible, text, maxTicks]);

  useEffect(() => {
    if (!running) return;
    const randomGlyph = () => (chars.length ? chars[(Math.random() * chars.length) | 0] : '');
    // Real phases are stretched relative to random ones so time splits realRatio : 1 - realRatio.
    const ratio = Math.min(0.95, Math.max(0.05, realRatio));
    const realStretch = ratio / (1 - ratio);
    const phaseTicks = (phase: Phase) => {
      const ticks = randTicks(minTicks, maxTicks);
      return phase === 'real' ? Math.max(1, Math.round(ticks * realStretch)) : ticks;
    };

    const id = window.setInterval(() => {
      setLetters((prev) =>
        prev.map((l) => {
          if (l.ticksLeft > 1) {
            return { ...l, ticksLeft: l.ticksLeft - 1, glyph: l.phase === 'random' ? randomGlyph() : l.glyph };
          }
          const phase = nextPhase(l.phase, visible);
          return { phase, glyph: phase === 'random' ? randomGlyph() : '', ticksLeft: phaseTicks(phase) };
        }),
      );
    }, tickMs);
    return () => window.clearInterval(id);
  }, [running, visible, chars, tickMs, minTicks, maxTicks, realRatio]);

  return (
    <span className="glitch-text">
      {Array.from(text, (ch, i) => {
        const letter = letters[i];
        const phase = letter?.phase ?? 'blank';
        return (
          <span key={i} aria-hidden className="glitch-char">
            {/* The real letter always keeps its slot so the word never shifts. */}
            <span className={phase === 'real' ? 'glitch-real' : 'glitch-real hidden'}>{ch}</span>
            {phase === 'random' && (
              <span className={mirror ? 'glitch-glyph mirrored' : 'glitch-glyph'}>{letter.glyph}</span>
            )}
          </span>
        );
      })}
    </span>
  );
}
