import { SequenceDetector, type SequenceMatch, type SequenceTrigger } from './SequenceDetector';

export interface TypingStats {
  keystrokes: number;
  corrections: number;
  startedAt: number | null;
  lastKeyAt: number | null;
}

const emptyStats = (): TypingStats => ({ keystrokes: 0, corrections: 0, startedAt: null, lastKeyAt: null });

/**
 * Holds everything typed so far. Kept separate from rendering so it can later
 * drive WPM, accuracy, prompts to retype, etc.
 */
export class TypingSession<E extends string = string> {
  text = '';
  stats = emptyStats();
  private detector: SequenceDetector<E>;

  constructor(
    triggers: SequenceTrigger<E>[] = [],
    private maxLength = 10_000,
  ) {
    this.detector = new SequenceDetector(triggers);
  }

  setTriggers(triggers: SequenceTrigger<E>[]) {
    this.detector.setTriggers(triggers);
  }

  /** Appends a character and returns the triggers it completed. */
  type(ch: string): SequenceMatch<E>[] {
    const now = performance.now();
    this.stats.startedAt ??= now;
    this.stats.lastKeyAt = now;
    this.stats.keystrokes++;
    this.text += ch;
    if (this.text.length > this.maxLength) this.text = this.text.slice(-this.maxLength);
    return this.detector.check(this.text);
  }

  backspace() {
    if (!this.text) return;
    this.text = this.text.slice(0, -1);
    this.stats.corrections++;
  }

  reset() {
    this.text = '';
    this.stats = emptyStats();
  }
}
