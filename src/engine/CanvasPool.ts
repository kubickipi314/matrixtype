/** Reuses offscreen canvases by exact size to avoid allocation + GC churn. */
export class CanvasPool {
  private free = new Map<string, HTMLCanvasElement[]>();

  constructor(private perSizeLimit = 16) {}

  acquire(w: number, h: number): HTMLCanvasElement {
    const canvas = this.free.get(`${w}x${h}`)?.pop();
    if (canvas) {
      canvas.getContext('2d')!.clearRect(0, 0, w, h);
      return canvas;
    }
    const fresh = document.createElement('canvas');
    fresh.width = w;
    fresh.height = h;
    return fresh;
  }

  release(canvas: HTMLCanvasElement) {
    const key = `${canvas.width}x${canvas.height}`;
    let bucket = this.free.get(key);
    if (!bucket) this.free.set(key, (bucket = []));
    if (bucket.length < this.perSizeLimit) bucket.push(canvas);
  }

  clear() {
    this.free.clear();
  }
}
