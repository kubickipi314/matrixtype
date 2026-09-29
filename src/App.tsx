import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { GlitchText } from './components/GlitchText';
import { glitchOptionsFromConfig } from './components/glitchOptions';
import { MatrixCanvas, type MatrixCanvasHandle } from './components/MatrixCanvas';
import { ScreenFlash } from './components/ScreenFlash';
import { SettingsPanel } from './components/SettingsPanel';
import { ConfigProvider, useConfig } from './config/ConfigContext';
import { useChromeVisibility } from './hooks/useChromeVisibility';
import { useKeyboardInput } from './hooks/useKeyboardInput';
import { TypingSession } from './text/TypingSession';
import { flashTriggers, type AppEvent } from './text/triggers';

const TEST_RAIN_STREAMS = 40;

function Stage() {
  const { config } = useConfig();
  const configRef = useRef(config);
  configRef.current = config;

  const rainRef = useRef<MatrixCanvasHandle>(null);
  const sessionRef = useRef(new TypingSession<AppEvent>());
  const [flashId, setFlashId] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { keywords } = config.flash;
  useEffect(() => {
    sessionRef.current.setTriggers(flashTriggers(keywords));
  }, [keywords]);

  const flash = useCallback(() => {
    setFlashId((id) => id + 1);
    rainRef.current?.burst(configRef.current.flash.burstStreams);
  }, []);

  const handleEvent = useCallback(
    (event: AppEvent) => {
      switch (event) {
        case 'flash':
          flash();
          break;
      }
    },
    [flash],
  );

  useKeyboardInput({
    onChar: (ch) => {
      if (ch.trim()) rainRef.current?.spawn(configRef.current.stream.streamsPerKey);
      for (const match of sessionRef.current.type(ch)) handleEvent(match.trigger.event);
    },
    onBackspace: () => sessionRef.current.backspace(),
  });

  const chrome = useChromeVisibility({
    idleHideMs: config.ui.idleHideMs,
    hideCursorWhenIdle: config.ui.hideCursorWhenIdle,
    keepCursor: settingsOpen,
  });
  const settingsEntryVisible = chrome.visible && !settingsOpen;

  const glitch = useMemo(() => glitchOptionsFromConfig(config), [config]);

  const stageStyle = {
    background: config.colors.background,
    '--ui-color': config.colors.interface,
    '--glyph-font': config.glyphs.fontFamily,
    '--glitch-spacing': `${config.ui.glitchSpacing}em`,
  } as CSSProperties;

  return (
    <main className="stage" style={stageStyle}>
      <MatrixCanvas ref={rainRef} config={config} />
      <ScreenFlash flashId={flashId} config={config.flash} />

      <header className={`logo ${chrome.visible ? 'visible' : ''}`} aria-label="matrixtype" {...chrome.hoverProps}>
        <GlitchText text="matrixtype" visible={chrome.visible} options={glitch} />
      </header>

      <nav className={`options-bar ${settingsEntryVisible ? 'visible' : ''}`} {...chrome.hoverProps}>
        <button
          className="link-btn options-item"
          aria-label="settings"
          onClick={() => {
            chrome.resetHover();
            setSettingsOpen(true);
          }}
        >
          <GlitchText text="settings" visible={settingsEntryVisible} options={glitch} />
        </button>
      </nav>

      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          onTestFlash={flash}
          onTestRain={() => rainRef.current?.spawn(TEST_RAIN_STREAMS)}
          onClearRain={() => rainRef.current?.clear()}
        />
      )}
    </main>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <Stage />
    </ConfigProvider>
  );
}
