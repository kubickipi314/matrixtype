import type { MatrixConfig } from '../config/matrixConfig';

export interface GlitchOptions {
  charset: string;
  tickMs: number;
  /** Each phase of a letter lasts a random number of ticks in this range. */
  minTicks: number;
  maxTicks: number;
  /** Share of time (0..1) a visible letter shows its real character rather than random glyphs. */
  realRatio: number;
  /** Random glyphs are mirrored like the rain. */
  mirror: boolean;
}

export const glitchOptionsFromConfig = ({ glyphs, ui }: MatrixConfig): GlitchOptions => ({
  charset: glyphs.charset,
  tickMs: ui.glitchTickMs,
  minTicks: ui.glitchMinTicks,
  maxTicks: ui.glitchMaxTicks,
  realRatio: ui.glitchRealRatio,
  mirror: glyphs.mirror,
});
