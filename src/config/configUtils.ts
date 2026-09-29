import type { MatrixConfig } from './matrixConfig';

/** Untyped view of a config (or a partial / outdated one loaded from storage or JSON). */
type LooseConfig = Record<string, Record<string, unknown> | undefined>;

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

/** Renames keys from older saved / exported configs. */
function migrate(cfg: LooseConfig): LooseConfig {
  const uiColor = cfg.ui?.color;
  if (typeof uiColor === 'string' && cfg.colors?.interface === undefined) {
    return { ...cfg, colors: { ...cfg.colors, interface: uiColor } };
  }
  return cfg;
}

/**
 * Applies a partial / outdated config onto `base`. Unknown keys and values of
 * the wrong type are ignored, so bad JSON can never break the renderer.
 */
export function mergeConfig(base: MatrixConfig, patch: unknown): MatrixConfig {
  if (!isObject(patch)) return base;
  const out = structuredClone(base) as unknown as LooseConfig;
  for (const [section, values] of Object.entries(migrate(patch as LooseConfig))) {
    const target = out[section];
    if (!target || !isObject(values)) continue;
    for (const [key, value] of Object.entries(values)) {
      if (key in target && typeof value === typeof target[key]) target[key] = value;
    }
  }
  return out as unknown as MatrixConfig;
}

/** Only the values that differ from `base`, so later default changes still apply. */
export function diffConfig(base: MatrixConfig, config: MatrixConfig): LooseConfig {
  const b = base as unknown as LooseConfig;
  const out: LooseConfig = {};
  for (const [section, values] of Object.entries(config as unknown as LooseConfig)) {
    for (const [key, value] of Object.entries(values ?? {})) {
      if (b[section]?.[key] !== value) (out[section] ??= {})[key] = value;
    }
  }
  return out;
}
