import { useCallback, useEffect, useRef, useState } from "react";

export interface SimParams {
  initialPlastic: number;
  initialBiomass: number;
  temperature: number;
}

export interface SimState {
  hour: number;
  plastic: number;
  biomass: number;
  water: number;
  co2: number;
}

export const V_MAX = 0.05;
export const K_M = 50;
export const H2O_YIELD = 0.375;
export const CO2_YIELD = 2.29;
const MAX_POINTS = 100;
const TICK_MS = 100;

export function tempFactor(t: number): number {
  return Math.max(0, 1 - Math.pow((t - 30) / 15, 2));
}

export function step(s: SimState, temperature: number): SimState {
  const T_f = tempFactor(temperature);
  let deltaP = ((V_MAX * s.biomass * s.plastic) / (K_M + s.plastic)) * T_f;
  deltaP = Math.min(deltaP, s.plastic);
  const anabolism = deltaP * 0.5;
  const catabolism = deltaP * 0.5;
  return {
    hour: s.hour + 1,
    plastic: Math.max(0, s.plastic - deltaP),
    biomass: s.biomass + anabolism,
    water: s.water + catabolism * H2O_YIELD,
    co2: s.co2 + catabolism * CO2_YIELD,
  };
}

const initial = (p: SimParams): SimState => ({
  hour: 0,
  plastic: p.initialPlastic,
  biomass: p.initialBiomass,
  water: 0,
  co2: 0,
});

export function useSimulation(params: SimParams) {
  const [state, setState] = useState<SimState>(() => initial(params));
  const [history, setHistory] = useState<SimState[]>(() => [initial(params)]);
  const [running, setRunning] = useState(false);
  const tempRef = useRef(params.temperature);
  tempRef.current = params.temperature;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setState((prev) => {
        const next = step(prev, tempRef.current);
        setHistory((h) => {
          const arr = [...h, next];
          return arr.length > MAX_POINTS ? arr.slice(arr.length - MAX_POINTS) : arr;
        });
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  const reset = useCallback(() => {
    setRunning(false);
    const s = initial(params);
    setState(s);
    setHistory([s]);
  }, [params]);

  // Apply initial-condition changes while at t=0
  useEffect(() => {
    if (state.hour === 0) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.initialPlastic, params.initialBiomass]);

  return { state, history, running, play: () => setRunning(true), pause: () => setRunning(false), reset };
}
