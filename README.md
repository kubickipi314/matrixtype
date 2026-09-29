# matrixtype

A typing playground inspired by [monkeytype](https://monkeytype.com) and the Matrix digital rain. The screen starts pure black; every typed character drops a stream of Matrix glyphs.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Using it

- Type anything: each printable key spawns a glyph stream at a random x position and depth.
- Type a flash keyword (default `matrix`; set a comma-separated list in Settings -> Flash -> Keywords): fires a screen shine plus an optional burst of streams.
- Move the mouse: the `matrixtype` logo (left) and `settings` (right) glitch into view in place (blank -> random glyphs -> real letters) and glitch out again after idle.
- `settings` opens a live-tuning panel. Changes persist in `localStorage`; use `export` / `import` to move a config around and `reset` to go back to the defaults.

## Structure

| Path | Role |
| --- | --- |
| `src/config/matrixConfig.ts` | Config type and defaults |
| `src/config/configSchema.ts` | Settings panel layout (keys type-checked against the config) |
| `src/config/configUtils.ts` | Merge / diff / migrate for stored and imported configs |
| `src/config/ConfigContext.tsx` | Config state + persistence |
| `src/engine/MatrixRain.ts` | Canvas renderer: streams, stepped motion, depth, shine, steady rain |
| `src/engine/SpriteCache.ts` | Pre-rendered glyph sprites with blur/glow baked in (LRU) |
| `src/engine/CanvasPool.ts` | Reuses offscreen canvases for baked stream tails |
| `src/components/GlitchText.tsx` | Letters that glitch in / out through random glyphs |
| `src/hooks/useChromeVisibility.ts` | Show logo + options on pointer movement, hide cursor when idle |
| `src/text/TypingSession.ts` | Typed text + stats, feeds the sequence detector |
| `src/text/SequenceDetector.ts` | Matches string/RegExp triggers against the typed tail |
| `src/text/triggers.ts` | Builds triggers from config (flash keywords -> `flash`) |
| `src/motives/` | Predefined looks (partial configs), not wired up yet |

### Adding a config option

1. Add the field to `MatrixConfig` and `DEFAULT_CONFIG` (`matrixConfig.ts`).
2. Add it to `CONFIG_SCHEMA` (`configSchema.ts`) so it appears in the panel.
3. Read it where needed (engine, components).

### Adding a sequence trigger

Return it from a builder in `src/text/triggers.ts` (typically derived from a config field), pass it to `TypingSession.setTriggers` in `src/App.tsx`, extend the `AppEvent` union, and handle the event in `handleEvent`.
