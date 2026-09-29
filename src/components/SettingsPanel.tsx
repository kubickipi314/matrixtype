import { useEffect, useMemo, useRef, useState } from 'react';
import { useConfig } from '../config/ConfigContext';
import { CONFIG_SCHEMA, type FieldSpec } from '../config/configSchema';
import type { MatrixConfig } from '../config/matrixConfig';
import { GlitchText } from './GlitchText';
import { glitchOptionsFromConfig } from './glitchOptions';

interface Props {
  onClose: () => void;
  onTestFlash: () => void;
  onTestRain: () => void;
  onClearRain: () => void;
}

const STATUS_MS = 1800;

export function SettingsPanel({ onClose, onTestFlash, onTestRain, onClearRain }: Props) {
  const { config, setValue, replace, reset } = useConfig();
  const glitch = useMemo(() => glitchOptionsFromConfig(config), [config]);
  const status = useStatusMessage();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const exportJson = async () => {
    const json = JSON.stringify(config, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      status.show('config copied');
    } catch {
      window.prompt('Copy config JSON', json);
    }
  };

  const importJson = () => {
    const raw = window.prompt('Paste config JSON');
    if (!raw) return;
    try {
      replace(JSON.parse(raw));
      status.show('config imported');
    } catch {
      status.show('invalid JSON');
    }
  };

  const actions: [label: string, run: () => void][] = [
    ['test rain', onTestRain],
    ['test flash', onTestFlash],
    ['clear', onClearRain],
    ['export', exportJson],
    ['import', importJson],
    ['reset', reset],
  ];

  return (
    <aside className="settings-panel">
      <header className="settings-header">
        <span className="settings-title" aria-label="settings">
          <GlitchText text="settings" visible options={glitch} />
        </span>
        <button className="link-btn" onClick={onClose} aria-label="Close settings">
          close
        </button>
      </header>

      <div className="settings-actions">
        {actions.map(([label, run]) => (
          <button key={label} className="link-btn" onClick={run}>
            {label}
          </button>
        ))}
        {status.message && <span className="settings-status">{status.message}</span>}
      </div>

      <div className="settings-body">
        {CONFIG_SCHEMA.map(({ section, title, open, fields }) => {
          const values = config[section] as unknown as Record<string, unknown>;
          return (
            <details key={section} className="settings-section" open={open}>
              <summary>{title}</summary>
              {fields.map((field) => (
                <Field
                  key={field.key}
                  id={`cfg-${section}-${field.key}`}
                  field={field}
                  value={values[field.key]}
                  onChange={(v) => setValue(section, field.key as keyof MatrixConfig[typeof section], v as never)}
                />
              ))}
            </details>
          );
        })}
      </div>
    </aside>
  );
}

/** Short-lived status text; the timer is cleared on unmount and when a new message replaces it. */
function useStatusMessage() {
  const [message, setMessage] = useState('');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return {
    message,
    show(text: string) {
      setMessage(text);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setMessage(''), STATUS_MS);
    },
  };
}

interface FieldProps {
  id: string;
  field: FieldSpec;
  value: unknown;
  onChange: (value: unknown) => void;
}

function Field({ id, field, value, onChange }: FieldProps) {
  const label = <span className="field-label">{field.label}</span>;
  switch (field.kind) {
    case 'number': {
      const range = { min: field.min, max: field.max, step: field.step, value: value as number };
      return (
        <label className="field" htmlFor={id}>
          {label}
          <input id={id} type="range" {...range} onChange={(e) => onChange(Number(e.target.value))} />
          <input
            className="field-number"
            type="number"
            {...range}
            onChange={(e) => e.target.value !== '' && onChange(Number(e.target.value))}
          />
        </label>
      );
    }
    case 'color':
      return (
        <label className="field" htmlFor={id}>
          {label}
          <input id={id} type="color" value={value as string} onChange={(e) => onChange(e.target.value)} />
          <span className="field-number">{value as string}</span>
        </label>
      );
    case 'boolean':
      return (
        <label className="field" htmlFor={id}>
          {label}
          <input id={id} type="checkbox" checked={value as boolean} onChange={(e) => onChange(e.target.checked)} />
        </label>
      );
    case 'text':
      return (
        <label className="field field-text" htmlFor={id}>
          {label}
          <textarea id={id} rows={2} value={value as string} onChange={(e) => onChange(e.target.value)} />
        </label>
      );
  }
}
