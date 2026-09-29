import type { SequenceTrigger } from './SequenceDetector';

/** Events the app knows how to react to. Extend this union for new effects. */
export type AppEvent = 'flash';

/** Parses a comma-separated keyword list ("matrix, neo, zion") into trimmed, unique words. */
export function parseKeywords(list: string): string[] {
  return [...new Set(list.split(',').map((k) => k.trim()).filter(Boolean))];
}

export function flashTriggers(keywords: string): SequenceTrigger<AppEvent>[] {
  return parseKeywords(keywords).map((keyword) => ({
    id: `flash:${keyword.toLowerCase()}`,
    pattern: keyword,
    event: 'flash',
  }));
}
