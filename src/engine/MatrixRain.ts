import type { MatrixConfig } from '../config/matrixConfig';
import { CanvasPool } from './CanvasPool';
import { GLYPH_BOX_WIDTH, SpriteCache, glyphPad, paintGlyph } from './SpriteCache';

/**
 * A stream is a head glyph followed by a fixed tail. Every frame tick the tail
 * jumps down one cell and the head swaps its glyph; the head itself glides
 * continuously at the same average speed (one cell per tick).
 *
 * Tail glyphs never change, so the whole tail (with per-glyph blur, glow and
 * fade) is rendered once into its own canvas and drawn with a single
 * drawImage per frame. Only the head and shining glyphs use per-glyph sprites.
 */
interface Stream {
  /** Horizontal center in device px. */
  x: number;
  /** 0 = farthest, 1 = nearest. */
  depth: number;
  fontPx: number;
  cellPx: number;
  /** Rows (cells) travelled since spawn; the integer part is the tick count. */
  progress: number;
  tick: number;
  head: string;
  /** Index 0 is the tail glyph right behind the head. */
  tail: string[];
  shining: boolean[];
  flare: boolean;
  depthAlpha: number;
  depthBlur: number;
  tailImage: { canvas: HTMLCanvasElement; pad: number } | null;
}

export interface SpawnOptions {
  /** Horizontal position 0..1 of the screen; random if omitted. */
  x?: number;
  /** Initial tick phase 0..1 so simultaneously spawned streams don't tick together. */
  phase?: number;
}

/** Head row at spawn: fully above the top edge, with the tail stacked above it. */
const START_ROW = -1;
/** Longest frame delta we simulate, so a hidden tab doesn't teleport streams. */
const MAX_DT_MS = 100;
const MIN_FONT_PX = 4;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const randInt = (min: number, max: number) => {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
};

/** Everything baked into tail images; when it changes, tails are re-rendered. */
const tailBakeSignature = ({ colors, glyphs, trail, glow, performance }: MatrixConfig) =>
  JSON.stringify([
    colors.primary,
    glyphs.fontFamily,
    glyphs.fontWeight,
    glyphs.mirror,
    trail.headAlpha,
    trail.tailAlpha,
    trail.fadeCurve,
    trail.tailBlur,
    trail.blurCurve,
    glow.glyphGlow,
    performance.blurQuantum,
  ]);

/**
 * Canvas renderer for the Matrix rain. Framework-agnostic: React only mounts
 * the canvas and forwards config / spawn calls.
 */
export class MatrixRain {
  private ctx: CanvasRenderingContext2D;
  private sprites: SpriteCache;
  private pool = new CanvasPool();
  private streams: Stream[] = [];
  /** Charset split by code point so astral-plane characters stay intact. */
  private chars: string[];
  private tailSignature: string;

  private raf = 0;
  private lastFrame = 0;
  private fps = 60;
  /** Fractional streams owed by steady rain; spawns once it reaches 1. */
  private steadyDebt = 0;
  private dirty = true;

  private dpr = 1;
  private width = 0;
  private height = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private config: MatrixConfig,
  ) {
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.chars = Array.from(config.glyphs.charset);
    this.tailSignature = tailBakeSignature(config);
    this.sprites = new SpriteCache(config);
    this.resize();
  }

  // ------------------------------------------------------------- lifecycle

  start() {
    const loop = (now: number) => {
      this.frame(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  setConfig(config: MatrixConfig) {
    const prev = this.config;
    this.config = config;
    this.sprites.setConfig(config);

    if (prev.glyphs.charset !== config.glyphs.charset) this.chars = Array.from(config.glyphs.charset);

    const signature = tailBakeSignature(config);
    if (signature !== this.tailSignature) {
      this.tailSignature = signature;
      for (const s of this.streams) this.releaseTail(s);
    }

    if (prev.performance.maxDevicePixelRatio !== config.performance.maxDevicePixelRatio) this.resize();
    this.dirty = true;
  }

  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, this.config.performance.maxDevicePixelRatio);
    const oldWidth = this.width;
    this.width = Math.round((this.canvas.clientWidth || window.innerWidth) * this.dpr);
    this.height = Math.round((this.canvas.clientHeight || window.innerHeight) * this.dpr);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    if (oldWidth > 0 && oldWidth !== this.width) {
      const scale = this.width / oldWidth;
      for (const s of this.streams) s.x *= scale;
    }
    this.dirty = true;
  }

  // ---------------------------------------------------------------- streams

  spawn(opts: SpawnOptions = {}) {
    const { stream: sc, depth: dc, glyphs: gc } = this.config;

    let depth = Math.pow(Math.random(), dc.distributionBias);
    if (dc.layers > 1) depth = Math.round(depth * (dc.layers - 1)) / (dc.layers - 1);
    const fontPx = Math.max(MIN_FONT_PX, Math.round(lerp(dc.fontSizeMin, dc.fontSizeMax, depth) * this.dpr));
    const tailLength = randInt(sc.tailMin, sc.tailMax);
    const progress = opts.phase ?? Math.random();

    this.insertByDepth({
      x: (opts.x ?? Math.random()) * this.width,
      depth,
      fontPx,
      cellPx: fontPx * gc.lineHeight,
      progress,
      tick: Math.floor(progress),
      head: this.randomGlyph(),
      tail: Array.from({ length: tailLength }, () => this.randomGlyph()),
      shining: new Array(tailLength).fill(false),
      flare: false,
      depthAlpha: lerp(dc.alphaFar, dc.alphaNear, depth),
      depthBlur: lerp(dc.blurFar, dc.blurNear, depth),
      tailImage: null,
    });

    const overflow = this.streams.length - sc.maxStreams;
    if (overflow > 0) this.dropOldest(overflow);
    this.dirty = true;
  }

  burst(count: number) {
    for (let i = 0; i < count; i++) this.spawn();
  }

  clear() {
    for (const s of this.streams) this.releaseTail(s);
    this.streams = [];
    this.dirty = true;
  }

  /** Keeps streams sorted far -> near so nearer ones are painted on top. */
  private insertByDepth(stream: Stream) {
    let i = this.streams.length;
    while (i > 0 && this.streams[i - 1].depth > stream.depth) i--;
    this.streams.splice(i, 0, stream);
  }

  /** Oldest = furthest travelled. Usually n is 1, so avoid sorting in that case. */
  private dropOldest(n: number) {
    const drop =
      n === 1
        ? new Set([this.streams.reduce((a, b) => (b.progress > a.progress ? b : a))])
        : new Set([...this.streams].sort((a, b) => b.progress - a.progress).slice(0, n));
    for (const s of drop) this.releaseTail(s);
    this.streams = this.streams.filter((s) => !drop.has(s));
  }

  private releaseTail(s: Stream) {
    if (s.tailImage) this.pool.release(s.tailImage.canvas);
    s.tailImage = null;
  }

  private randomGlyph(): string {
    const { chars } = this;
    return chars.length ? chars[(Math.random() * chars.length) | 0] : ' ';
  }

  // ------------------------------------------------------------- simulation

  private frame(now: number) {
    const rawDt = now - this.lastFrame;
    const dt = Math.min(rawDt, MAX_DT_MS);
    this.lastFrame = now;
    if (rawDt > 0) this.fps = lerp(this.fps, 1000 / rawDt, 0.05);

    this.spawnSteadyRain(dt);
    this.advance(dt);

    // Moving heads need a redraw every frame; an empty screen only once.
    const { showStats } = this.config.performance;
    if (!this.dirty && this.streams.length === 0 && !showStats) return;
    this.dirty = false;
    this.draw();
    if (showStats) this.drawStats();
  }

  private spawnSteadyRain(dt: number) {
    const { steadyRain, steadyPerMinute } = this.config.stream;
    if (!steadyRain || steadyPerMinute <= 0) {
      this.steadyDebt = 0;
      return;
    }
    this.steadyDebt += (dt * steadyPerMinute) / 60_000;
    for (; this.steadyDebt >= 1; this.steadyDebt--) this.spawn();
  }

  /** Moves every stream, re-rolls per-tick randomness, and drops streams below the screen. */
  private advance(dt: number) {
    const rowsPerMs = 1 / Math.max(1, this.config.motion.frameMs);
    let alive = 0;
    for (const s of this.streams) {
      s.progress += dt * rowsPerMs;
      const tick = Math.floor(s.progress);
      if (tick !== s.tick) {
        s.tick = tick;
        this.onTick(s);
      }
      const tailTopY = (this.tailBottomRow(s) - s.tail.length) * s.cellPx;
      if (tailTopY <= this.height) this.streams[alive++] = s;
      else this.releaseTail(s);
    }
    if (alive !== this.streams.length) {
      this.streams.length = alive;
      this.dirty = true;
    }
  }

  private onTick(s: Stream) {
    const { shine } = this.config;
    s.head = this.randomGlyph();
    for (let i = 0; i < s.shining.length; i++) s.shining[i] = Math.random() < shine.glyphChance;
    s.flare = Math.random() < shine.streamChance;
  }

  // -------------------------------------------------------------- geometry

  /** Row of the tail glyph right behind the head: `headGap` cells above the head at each tick. */
  private tailBottomRow(s: Stream) {
    return START_ROW + s.tick - this.config.trail.headGap;
  }

  /** Blur in device px, snapped to the quantum so sprites can be shared. */
  private quantizeBlur(cssPx: number) {
    const q = Math.max(0.05, this.config.performance.blurQuantum) * this.dpr;
    return +(Math.round((Math.max(0, cssPx) * this.dpr) / q) * q).toFixed(2);
  }

  /** Glow values are defined for the nearest streams and scale with glyph size. */
  private glowPx(s: Stream, glowCss: number) {
    return Math.round((glowCss * s.fontPx) / this.config.depth.fontSizeMax);
  }

  /** Blur (device px) and relative alpha of tail glyph `i`, fading from head to top. */
  private tailGlyphStyle(s: Stream, i: number) {
    const { trail } = this.config;
    const t = (i + 1) / s.tail.length;
    return {
      blur: this.quantizeBlur(s.depthBlur + trail.tailBlur * Math.pow(t, trail.blurCurve)),
      alpha: lerp(trail.headAlpha, trail.tailAlpha, Math.pow(t, trail.fadeCurve)),
    };
  }

  // -------------------------------------------------------------- rendering

  private renderTail(s: Stream) {
    const len = s.tail.length;
    const glow = this.glowPx(s, this.config.glow.glyphGlow);
    // The topmost glyph is the most blurred one.
    const pad = glyphPad(this.tailGlyphStyle(s, len - 1).blur, glow);
    const w = Math.ceil(s.fontPx * GLYPH_BOX_WIDTH) + pad * 2;
    const h = Math.ceil(len * s.cellPx) + pad * 2;
    const canvas = this.pool.acquire(w, h);
    const ctx = canvas.getContext('2d')!;
    for (let i = 0; i < len; i++) {
      const { blur, alpha } = this.tailGlyphStyle(s, i);
      const cy = pad + (len - 1 - i + 0.5) * s.cellPx;
      paintGlyph(ctx, this.config, s.tail[i], w / 2, cy, { fontPx: s.fontPx, blur, glow, tone: 'primary', alpha });
    }
    s.tailImage = { canvas, pad };
    return s.tailImage;
  }

  private draw() {
    const { ctx, config } = this;
    ctx.globalAlpha = 1;
    ctx.fillStyle = config.colors.background;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const s of this.streams) {
      const flare = s.flare ? config.shine.streamBoost : 1;
      this.drawTail(s, flare);
      this.drawHead(s, flare);
    }
    ctx.globalAlpha = 1;
  }

  private drawTail(s: Stream, flare: number) {
    const len = s.tail.length;
    const bottomRow = this.tailBottomRow(s);
    const bottomY = bottomRow * s.cellPx;
    if (len === 0 || bottomY + s.cellPx <= 0) return;

    const { ctx } = this;
    const { canvas, pad } = s.tailImage ?? this.renderTail(s);
    const top = Math.round((bottomRow - len + 0.5) * s.cellPx - pad);
    if (top < this.height) {
      ctx.globalAlpha = Math.min(1, s.depthAlpha * flare);
      ctx.drawImage(canvas, Math.round(s.x - canvas.width / 2), top);
    }

    const shineGlow = this.glowPx(s, this.config.glow.shineGlow);
    for (let i = 0; i < len; i++) {
      if (!s.shining[i]) continue;
      const y = bottomY - i * s.cellPx;
      if (y < -s.cellPx || y > this.height + s.cellPx) continue;
      const { blur, alpha } = this.tailGlyphStyle(s, i);
      const sprite = this.sprites.get(s.tail[i], { fontPx: s.fontPx, blur, glow: shineGlow, tone: 'shine' });
      ctx.globalAlpha = Math.min(1, s.depthAlpha * alpha * flare);
      ctx.drawImage(sprite.canvas, Math.round(s.x - sprite.cx), Math.round(y - sprite.cy));
    }
  }

  private drawHead(s: Stream, flare: number) {
    const { ctx, config } = this;
    const { trail } = config;
    const headPx = Math.max(MIN_FONT_PX, Math.round(s.fontPx * trail.headScale));
    const y = (START_ROW + (config.motion.smoothHead ? s.progress : s.tick)) * s.cellPx;
    if (y < -headPx || y > this.height + headPx) return;

    const sprite = this.sprites.get(s.head, {
      fontPx: headPx,
      blur: this.quantizeBlur(trail.headBlur),
      glow: this.glowPx(s, config.glow.headGlow),
      tone: 'head',
    });
    ctx.globalAlpha = Math.min(1, s.depthAlpha * trail.headAlpha * flare);
    ctx.drawImage(sprite.canvas, Math.round(s.x - sprite.cx), Math.round(y - sprite.cy));
  }

  private drawStats() {
    const { ctx } = this;
    const px = Math.round(12 * this.dpr);
    ctx.font = `${px}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = this.config.colors.interface;
    ctx.fillText(`${this.fps.toFixed(0)} fps  ${this.streams.length} streams  ${this.sprites.size} sprites`, px, this.height - px);
  }
}
