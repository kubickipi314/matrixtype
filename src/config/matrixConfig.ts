/**
 * Every tunable of the app. To add an option: add it to `MatrixConfig` and
 * `DEFAULT_CONFIG` here, then to `CONFIG_SCHEMA` (configSchema.ts) to show it
 * in the settings panel.
 */

export interface MatrixConfig {
  colors: {
    background: string;
    /** Body color of the trail glyphs. */
    primary: string;
    /** Leading (lowest) glyph of a stream. */
    head: string;
    /** Color used when a glyph randomly "shines" for a frame. */
    shine: string;
    /** Single color for all interface chrome: logo, options bar, settings panel, stats. */
    interface: string;
  };
  glyphs: {
    charset: string;
    fontFamily: string;
    fontWeight: number;
    /** Mirror glyphs horizontally, like in the film. */
    mirror: boolean;
    /** Vertical cell size as a multiple of font size. */
    lineHeight: number;
  };
  stream: {
    /** Number of tail glyphs following the head. */
    tailMin: number;
    tailMax: number;
    streamsPerKey: number;
    /** Oldest streams are dropped once this many are alive. */
    maxStreams: number;
    /** Spawn streams continuously, in addition to the ones created by typing. */
    steadyRain: boolean;
    steadyPerMinute: number;
  };
  motion: {
    /**
     * One frame tick, shared by every stream (each stream ticks on its own phase).
     * Per tick the tail jumps one cell and the head changes glyph, so fall speed
     * is proportional to glyph size.
     */
    frameMs: number;
    /** Head glides continuously; when off it jumps with the tail. */
    smoothHead: boolean;
  };
  depth: {
    fontSizeMin: number;
    fontSizeMax: number;
    /** >1 makes far streams more common, <1 near streams more common. */
    distributionBias: number;
    /** Depth is snapped to this many discrete layers (0 = continuous). Fewer = more cache hits. */
    layers: number;
    alphaFar: number;
    alphaNear: number;
    blurFar: number;
    blurNear: number;
  };
  trail: {
    /** Head font size as a multiple of its stream's tail font size. */
    headScale: number;
    /** Blur (px) of the head glyph; independent of depth blur. */
    headBlur: number;
    /**
     * Distance (in cells) from the head to the first tail glyph right after a tick.
     * The smooth head then pulls ahead by up to one more cell before the tail jumps.
     */
    headGap: number;
    /** Alpha of the head; the tail fades from here towards `tailAlpha`. */
    headAlpha: number;
    /** Alpha of the topmost glyph (relative, multiplied by depth alpha). */
    tailAlpha: number;
    /** Curve of the fade from head to tail (1 = linear). */
    fadeCurve: number;
    /** Extra blur (px) added at the topmost glyph. */
    tailBlur: number;
    blurCurve: number;
  };
  glow: {
    headGlow: number;
    glyphGlow: number;
    shineGlow: number;
  };
  shine: {
    /** Chance per tail glyph per tick to shine for that frame. */
    glyphChance: number;
    /** Chance per tick that the whole stream flares up. */
    streamChance: number;
    /** Alpha multiplier while a stream flares. */
    streamBoost: number;
  };
  flash: {
    durationMs: number;
    color: string;
    maxOpacity: number;
    /** Extra streams spawned when a flash fires. */
    burstStreams: number;
    /** Comma-separated words that trigger the flash when typed (case-insensitive). */
    keywords: string;
  };
  ui: {
    /** The options bar hides this long after the pointer stops (stays while hovered). */
    idleHideMs: number;
    hideCursorWhenIdle: boolean;
    /** Tick of the options-bar letter glitch; a glitched letter shows a new glyph each tick. */
    glitchTickMs: number;
    /** Real and glitched phases each last a random number of ticks in this range. */
    glitchMinTicks: number;
    glitchMaxTicks: number;
    /** Share of time a letter shows its real character (0.6 = 60% real, 40% random). */
    glitchRealRatio: number;
    /** Extra space between glitching letters, in em. */
    glitchSpacing: number;
  };
  performance: {
    /** Blur is quantized to this step (px) so sprites can be cached. */
    blurQuantum: number;
    /** Max cached head/shine glyph images; least recently used are evicted. */
    spriteCacheLimit: number;
    /** Render resolution cap; 1 on a hi-DPI screen draws 4x fewer pixels than 2. */
    maxDevicePixelRatio: number;
    showStats: boolean;
  };
}

export const MATRIX_KATAKANA =
  'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ012345789Z:・."=*+-<>¦｜╌ç';

export const DEFAULT_CONFIG: MatrixConfig = {
  colors: {
    background: '#000000',
    primary: '#27b94c',
    head: '#86fea4',
    shine: '#e1fee9',
    interface: '#86fea4',
  },
  glyphs: {
    charset: MATRIX_KATAKANA,
    fontFamily: '"MS Gothic", "Hiragino Kaku Gothic Pro", "Noto Sans JP", "Yu Gothic", monospace',
    fontWeight: 200,
    mirror: true,
    lineHeight: 1.05,
  },
  stream: {
    tailMin: 10,
    tailMax: 25,
    streamsPerKey: 1,
    maxStreams: 240,
    steadyRain: false,
    steadyPerMinute: 153,
  },
  motion: {
    frameMs: 260,
    smoothHead: true,
  },
  depth: {
    fontSizeMin: 15,
    fontSizeMax: 34,
    distributionBias: 1.6,
    layers: 8,
    alphaFar: 0.35,
    alphaNear: 0.57,
    blurFar: 0.5,
    blurNear: 0,
  },
  trail: {
    headScale: 1.15,
    headBlur: 0.3,
    headGap: 0.4,
    headAlpha: 1,
    tailAlpha: 0.44,
    fadeCurve: 1.6,
    tailBlur: 0.8,
    blurCurve: 0.5,
  },
  glow: {
    headGlow: 28,
    glyphGlow: 14,
    shineGlow: 21,
  },
  shine: {
    glyphChance: 0.09,
    streamChance: 0.1,
    streamBoost: 1.4,
  },
  flash: {
    durationMs: 1000,
    color: '#f0fff3',
    maxOpacity: 1,
    burstStreams: 10,
    keywords: 'matrix',
  },
  ui: {
    idleHideMs: 2000,
    hideCursorWhenIdle: true,
    glitchTickMs: 220,
    glitchMinTicks: 2,
    glitchMaxTicks: 5,
    glitchRealRatio: 0.7,
    glitchSpacing: 0.12,
  },
  performance: {
    blurQuantum: 0.5,
    spriteCacheLimit: 7000,
    maxDevicePixelRatio: 2,
    showStats: true,
  },
};
