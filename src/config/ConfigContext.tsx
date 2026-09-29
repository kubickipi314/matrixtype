import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { diffConfig, mergeConfig } from './configUtils';
import { DEFAULT_CONFIG, type MatrixConfig } from './matrixConfig';

const STORAGE_KEY = 'matrixtype.config.v2';
/** Pre-rename key; read once so saved tweaks survive the rename. */
const LEGACY_STORAGE_KEY = 'blindtyper.config.v2';

interface ConfigContextValue {
  config: MatrixConfig;
  setValue: <S extends keyof MatrixConfig, K extends keyof MatrixConfig[S]>(
    section: S,
    key: K,
    value: MatrixConfig[S][K],
  ) => void;
  /** Applies an arbitrary (possibly partial or outdated) config on top of the defaults. */
  replace: (config: unknown) => void;
  reset: () => void;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

function loadConfig(): MatrixConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return raw ? mergeConfig(DEFAULT_CONFIG, JSON.parse(raw)) : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<MatrixConfig>(loadConfig);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(diffConfig(DEFAULT_CONFIG, config)));
  }, [config]);

  const setValue = useCallback<ConfigContextValue['setValue']>((section, key, value) => {
    setConfig((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  }, []);

  const replace = useCallback((next: unknown) => setConfig(mergeConfig(DEFAULT_CONFIG, next)), []);
  const reset = useCallback(() => setConfig(DEFAULT_CONFIG), []);

  const value = useMemo(() => ({ config, setValue, replace, reset }), [config, setValue, replace, reset]);
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigContextValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used inside <ConfigProvider>');
  return ctx;
}
