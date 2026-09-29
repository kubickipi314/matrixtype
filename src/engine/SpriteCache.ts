import type { MatrixConfig } from '../config/matrixConfig';

export type Tone = 'primary' | 'head' | 'shine';

export interface Sprite {
  canvas: HTMLCanvasElement;
  /** Offset from the sprite's top-left corner to the glyph center. */
  cx: number;
  cy: number;
}

/** Glyph bounding box as a multiple of font size (wide enough for full-width glyphs). */
export const GLYPH_BOX_WIDTH = 1.3;
const GLYPH_BOX_HEIGHT = 1.4;

const supportsCanvasFilter = (() => {
  if (typeof document === 'undefined') return false;
  const ctx = document.createElement('canvas').getContext('2d');
  return !!ctx && 'filter' in ctx;
})();

/** Padding needed around a glyph so its blur and glow are not clipped. */
export const glyphPad = (blur: number, glow: number) => Math.ceil(blur * 3 + glow * 1.5) + 2;

const toneColor = (colors: MatrixConfig['colors'], tone: Tone) =>
  tone === 'head' ? colors.head : tone === 'shine' ? colors.shine : colors.primary;

export interface GlyphStyle {
  fontPx: number;
  blur: number;
  glow: number;
  tone: Tone;
  alpha?: number;
}

/** Paints one glyph centered at (cx, cy). Sizes in device px. Leaves ctx state untouched. */
export function paintGlyph(
  ctx: CanvasRenderingContext2D,
  config: MatrixConfig,
  ch: string,
  cx: number,
  cy: number,
  { fontPx, blur, glow, tone, alpha = 1 }: GlyphStyle,
) {
  const { glyphs } = config;
  const color = toneColor(config.colors, tone);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${glyphs.fontWeight} ${fontPx}px ${glyphs.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  if (blur > 0 && supportsCanvasFilter) ctx.filter = `blur(${blur}px)`;
  ctx.translate(cx, cy);
  if (glyphs.mirror) ctx.scale(-1, 1);
  if (glow > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
    ctx.fillText(ch, 0, 0);
    // Second pass without shadow keeps the core crisp and bright under the glow.
    ctx.shadowBlur = 0;
  }
  ctx.fillText(ch, 0, 0);
  ctx.restore();
}

/**
 * Pre-rendered single glyphs (blur + glow baked in) for the parts of a stream
 * that change every tick: the head and shining tail glyphs. LRU-evicted.
 */
export class SpriteCache {
  private sprites = new Map<string, Sprite>();

  constructor(private config: MatrixConfig) {}

  get size() {
    return this.sprites.size;
  }

  setConfig(config: MatrixConfig) {
    const prev = this.config;
    this.config = config;
    const { colors: a, glyphs: g } = prev;
    const { colors: b, glyphs: h } = config;
    const bakedChanged =
      a.primary !== b.primary ||
      a.head !== b.head ||
      a.shine !== b.shine ||
      g.fontFamily !== h.fontFamily ||
      g.fontWeight !== h.fontWeight ||
      g.mirror !== h.mirror;
    if (bakedChanged) this.sprites.clear();
  }

  get(ch: string, style: GlyphStyle): Sprite {
    const { fontPx, blur, glow, tone } = style;
    const key = `${tone}|${fontPx}|${blur}|${glow}|${ch}`;
    let sprite = this.sprites.get(key);
    if (sprite) {
      // Map keeps insertion order; re-inserting marks it most recently used.
      this.sprites.delete(key);
    } else {
      sprite = this.render(ch, style);
    }
    this.sprites.set(key, sprite);
    this.evict();
    return sprite;
  }

  private evict() {
    const limit = Math.max(50, this.config.performance.spriteCacheLimit);
    if (this.sprites.size <= limit) return;
    // Evict in chunks so we don't pay the check on every insert near the limit.
    let excess = this.sprites.size - Math.floor(limit * 0.9);
    for (const key of this.sprites.keys()) {
      if (excess-- <= 0) break;
      this.sprites.delete(key);
    }
  }

  private render(ch: string, style: GlyphStyle): Sprite {
    const pad = glyphPad(style.blur, style.glow);
    const w = Math.ceil(style.fontPx * GLYPH_BOX_WIDTH) + pad * 2;
    const h = Math.ceil(style.fontPx * GLYPH_BOX_HEIGHT) + pad * 2;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    paintGlyph(canvas.getContext('2d')!, this.config, ch, w / 2, h / 2, { ...style, alpha: 1 });
    return { canvas, cx: w / 2, cy: h / 2 };
  }
}
