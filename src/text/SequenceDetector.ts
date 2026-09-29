export interface SequenceTrigger<E extends string = string> {
  id: string;
  /** Plain string (matched at the end of the typed text) or a RegExp tested against the tail. */
  pattern: string | RegExp;
  caseSensitive?: boolean;
  /** Event emitted when the pattern completes. */
  event: E;
}

export interface SequenceMatch<E extends string = string> {
  trigger: SequenceTrigger<E>;
  text: string;
}

/** How much typed text a RegExp trigger can look back at. */
const REGEX_WINDOW = 256;

interface CompiledTrigger<E extends string> {
  trigger: SequenceTrigger<E>;
  window: number;
  /** Returns the matched text if the trigger completes at the end of `tail`. */
  match: (tail: string) => string | null;
}

function compile<E extends string>(trigger: SequenceTrigger<E>): CompiledTrigger<E> {
  const { pattern, caseSensitive } = trigger;
  if (typeof pattern === 'string') {
    const needle = caseSensitive ? pattern : pattern.toLowerCase();
    return {
      trigger,
      window: needle.length,
      match: (tail) => {
        if (!needle) return null;
        const end = tail.slice(-needle.length);
        return (caseSensitive ? end : end.toLowerCase()) === needle ? end : null;
      },
    };
  }
  const flags = pattern.flags.replace('g', '') + (caseSensitive || pattern.flags.includes('i') ? '' : 'i');
  const anchored = new RegExp(`(?:${pattern.source})$`, flags);
  return { trigger, window: REGEX_WINDOW, match: (tail) => anchored.exec(tail)?.[0] ?? null };
}

/**
 * Watches the tail of the typed text and reports triggers that were
 * completed by the latest keystroke. A trigger fires once per completion:
 * typing "matrix" fires, typing more letters afterwards does not re-fire.
 */
export class SequenceDetector<E extends string = string> {
  private compiled: CompiledTrigger<E>[] = [];
  private window = 0;

  constructor(triggers: SequenceTrigger<E>[] = []) {
    this.setTriggers(triggers);
  }

  /** Replaces all triggers (e.g. after the user edits keyword settings). */
  setTriggers(triggers: SequenceTrigger<E>[]) {
    const byId = new Map(triggers.map((t) => [t.id, t]));
    this.compiled = [...byId.values()].map(compile);
    this.window = Math.max(0, ...this.compiled.map((c) => c.window));
  }

  /** Call after a character was appended to `text`. */
  check(text: string): SequenceMatch<E>[] {
    const tail = text.slice(-this.window);
    const matches: SequenceMatch<E>[] = [];
    for (const { trigger, match } of this.compiled) {
      const matched = match(tail);
      if (matched !== null) matches.push({ trigger, text: matched });
    }
    return matches;
  }
}
