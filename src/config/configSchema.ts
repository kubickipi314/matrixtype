import type { MatrixConfig } from './matrixConfig';

/**
 * Describes the settings panel. Field keys are type-checked against
 * `MatrixConfig`, so a renamed or misspelled option fails to compile.
 */

export type Section = keyof MatrixConfig;
type KeyOf<S extends Section> = Extract<keyof MatrixConfig[S], string>;

export type FieldSpec<K extends string = string> =
  | { kind: 'number'; key: K; label: string; min: number; max: number; step: number }
  | { kind: 'color'; key: K; label: string }
  | { kind: 'boolean'; key: K; label: string }
  | { kind: 'text'; key: K; label: string };

/** Section as consumed by the settings panel. */
export interface SectionSpec {
  section: Section;
  title: string;
  /** Expanded when the panel opens. */
  open?: boolean;
  fields: FieldSpec[];
}

/** Same shape, but field keys must exist in `MatrixConfig[S]`. */
interface TypedSectionSpec<S extends Section> extends Omit<SectionSpec, 'section' | 'fields'> {
  section: S;
  fields: FieldSpec<KeyOf<S>>[];
}

const section = <S extends Section>(spec: TypedSectionSpec<S>): SectionSpec => spec;

const num = <K extends string>(key: K, label: string, min: number, max: number, step: number): FieldSpec<K> => ({
  kind: 'number',
  key,
  label,
  min,
  max,
  step,
});
const color = <K extends string>(key: K, label: string): FieldSpec<K> => ({ kind: 'color', key, label });
const bool = <K extends string>(key: K, label: string): FieldSpec<K> => ({ kind: 'boolean', key, label });
const text = <K extends string>(key: K, label: string): FieldSpec<K> => ({ kind: 'text', key, label });

export const CONFIG_SCHEMA: SectionSpec[] = [
  section({
    section: 'colors',
    title: 'Colors',
    fields: [
      color('background', 'Background'),
      color('primary', 'Glyph'),
      color('head', 'Head glyph'),
      color('shine', 'Shine'),
      color('interface', 'Interface'),
    ],
  }),
  section({
    section: 'ui',
    title: 'Interface',
    open: true,
    fields: [
      num('idleHideMs', 'Hide after idle ms', 50, 10000, 50),
      bool('hideCursorWhenIdle', 'Hide cursor when idle'),
      num('glitchTickMs', 'Glitch tick ms', 30, 2000, 10),
      num('glitchMinTicks', 'Glitch min ticks', 1, 30, 1),
      num('glitchMaxTicks', 'Glitch max ticks', 1, 30, 1),
      num('glitchRealRatio', 'Glitch real ratio', 0.05, 0.95, 0.05),
      num('glitchSpacing', 'Glitch letter spacing (em)', 0, 1, 0.01),
    ],
  }),
  section({
    section: 'stream',
    title: 'Stream',
    open: true,
    fields: [
      num('tailMin', 'Tail min', 0, 60, 1),
      num('tailMax', 'Tail max', 0, 60, 1),
      num('streamsPerKey', 'Streams per key', 1, 10, 1),
      num('maxStreams', 'Max streams', 10, 2000, 10),
      bool('steadyRain', 'Steady rain'),
      num('steadyPerMinute', 'Steady per minute', 1, 3000, 1),
    ],
  }),
  section({
    section: 'motion',
    title: 'Motion',
    open: true,
    fields: [num('frameMs', 'Frame ms', 16, 1000, 1), bool('smoothHead', 'Smooth head')],
  }),
  section({
    section: 'depth',
    title: 'Depth',
    fields: [
      num('fontSizeMin', 'Font size far', 4, 80, 1),
      num('fontSizeMax', 'Font size near', 4, 120, 1),
      num('distributionBias', 'Far bias', 0.2, 5, 0.1),
      num('layers', 'Depth layers', 0, 30, 1),
      num('alphaFar', 'Alpha far', 0, 1, 0.01),
      num('alphaNear', 'Alpha near', 0, 1, 0.01),
      num('blurFar', 'Blur far (px)', 0, 10, 0.1),
      num('blurNear', 'Blur near (px)', 0, 10, 0.1),
    ],
  }),
  section({
    section: 'trail',
    title: 'Trail',
    fields: [
      num('headScale', 'Head size (x tail)', 0.5, 3, 0.01),
      num('headBlur', 'Head blur (px)', 0, 10, 0.1),
      num('headGap', 'Head gap (cells)', 0, 3, 0.05),
      num('headAlpha', 'Head alpha', 0, 1, 0.01),
      num('tailAlpha', 'Tail alpha', 0, 1, 0.01),
      num('fadeCurve', 'Fade curve', 0.1, 5, 0.05),
      num('tailBlur', 'Tail blur (px)', 0, 12, 0.1),
      num('blurCurve', 'Blur curve', 0.1, 5, 0.05),
    ],
  }),
  section({
    section: 'glow',
    title: 'Glow',
    fields: [
      num('headGlow', 'Head glow', 0, 60, 1),
      num('glyphGlow', 'Glyph glow', 0, 60, 1),
      num('shineGlow', 'Shine glow', 0, 60, 1),
    ],
  }),
  section({
    section: 'shine',
    title: 'Shine',
    fields: [
      num('glyphChance', 'Glyph shine chance', 0, 1, 0.005),
      num('streamChance', 'Stream flare chance', 0, 1, 0.005),
      num('streamBoost', 'Flare boost', 1, 4, 0.05),
    ],
  }),
  section({
    section: 'glyphs',
    title: 'Glyphs',
    fields: [
      text('charset', 'Charset'),
      text('fontFamily', 'Font family'),
      num('fontWeight', 'Font weight', 100, 900, 100),
      bool('mirror', 'Mirror glyphs'),
      num('lineHeight', 'Line height', 0.6, 2.5, 0.01),
    ],
  }),
  section({
    section: 'flash',
    title: 'Flash',
    fields: [
      num('durationMs', 'Duration ms', 100, 5000, 50),
      color('color', 'Color'),
      num('maxOpacity', 'Max opacity', 0, 1, 0.01),
      num('burstStreams', 'Burst streams', 0, 400, 1),
      text('keywords', 'Keywords (comma separated)'),
    ],
  }),
  section({
    section: 'performance',
    title: 'Performance',
    fields: [
      num('blurQuantum', 'Blur quantum (px)', 0.1, 2, 0.1),
      num('spriteCacheLimit', 'Sprite cache limit', 500, 30000, 500),
      num('maxDevicePixelRatio', 'Max DPR', 0.5, 3, 0.25),
      bool('showStats', 'Show FPS stats'),
    ],
  }),
];
