import { useEffect, useRef } from 'react';

interface Handlers {
  onChar: (ch: string) => void;
  onBackspace?: () => void;
}

const isEditable = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/** Global typing listener that ignores shortcuts and keystrokes inside form fields. */
export function useKeyboardInput(handlers: Handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isEditable(e.target)) return;
      if (e.key === 'Backspace') {
        ref.current.onBackspace?.();
        e.preventDefault();
      } else if (e.key.length === 1 || e.key === 'Enter') {
        ref.current.onChar(e.key === 'Enter' ? '\n' : e.key);
        if (e.key === ' ') e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
