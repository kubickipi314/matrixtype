import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type { MatrixConfig } from '../config/matrixConfig';
import { MatrixRain } from '../engine/MatrixRain';

export interface MatrixCanvasHandle {
  spawn: (count?: number) => void;
  burst: (count: number) => void;
  clear: () => void;
}

interface Props {
  config: MatrixConfig;
  ref?: Ref<MatrixCanvasHandle>;
}

export function MatrixCanvas({ config, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MatrixRain | null>(null);
  // The engine is created once with the latest config; later changes go through setConfig.
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const engine = new MatrixRain(canvasRef.current!, configRef.current);
    engineRef.current = engine;
    engine.start();
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setConfig(config);
  }, [config]);

  useImperativeHandle(
    ref,
    () => ({
      spawn: (count = 1) => {
        for (let i = 0; i < count; i++) engineRef.current?.spawn();
      },
      burst: (count) => engineRef.current?.burst(count),
      clear: () => engineRef.current?.clear(),
    }),
    [],
  );

  return <canvas ref={canvasRef} className="matrix-canvas" />;
}
