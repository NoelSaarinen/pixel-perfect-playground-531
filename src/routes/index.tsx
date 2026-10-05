import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Activity, Box, Droplet, Pause, Play, RotateCcw, Thermometer, Wind, FlaskConical, Bug } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Slider } from "@/components/ui/slider";
import { tempFactor, useSimulation, type SimParams } from "@/hooks/use-simulation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PET-Degradation Simulation Engine" },
      { name: "description", content: "Deterministic simulation of engineered Ideonella sakaiensis degrading PET into biomass, water and CO₂." },
      { property: "og:title", content: "PET-Degradation Simulation Engine" },
      { property: "og:description", content: "Michaelis-Menten kinetics dashboard for PET-degrading bacteria." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const SERIES = [
  { key: "plastic", label: "PET (g)", color: "var(--chart-1)" },
  { key: "biomass", label: "Biomass (g)", color: "var(--chart-2)" },
  { key: "water", label: "H₂O (g)", color: "var(--chart-3)" },
  { key: "co2", label: "CO₂ (g)", color: "var(--chart-4)" },
] as const;

function Index() {
  const [params, setParams] = useState<SimParams>({ initialPlastic: 100, initialBiomass: 1, temperature: 30 });
  const memoParams = useMemo(() => params, [params]);
  const { state, history, running, play, pause, reset } = useSimulation(memoParams);
  const Tf = tempFactor(params.temperature);

  const plasticFrac = params.initialPlastic > 0 ? state.plastic / params.initialPlastic : 0;
  const bacteriaCount = Math.min(60, Math.round(4 + Math.log2(1 + state.biomass) * 8));

  return (
    <div className="min-h-screen bg-background text-foreground font-mono">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">PET-Degradation Simulation Engine</h1>
            <p className="text-xs text-muted-foreground">I. sakaiensis (engineered) · Δt = 1 h · 10 ticks/s</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-3 text-sm text-muted-foreground">t = <span className="text-foreground">{state.hour} h</span></span>
          <CtrlButton onClick={running ? pause : play} primary>
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {running ? "Pause" : "Play"}
          </CtrlButton>
          <CtrlButton onClick={reset}><RotateCcw className="h-4 w-4" />Reset</CtrlButton>
        </div>
      </header>

      <main className="grid gap-4 p-4 lg:grid-cols-[280px_1fr_1fr]">
        <section className="space-y-6 rounded-lg border border-border bg-card p-5">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Parameters</h2>
          <Param label="Initial Plastic Mass" value={`${params.initialPlastic} g`} icon={<Box className="h-4 w-4" />}>
            <Slider min={10} max={1000} step={10} value={[params.initialPlastic]} onValueChange={(vals) => setParams((p) => ({ ...p, initialPlastic: vals[0] ?? p.initialPlastic }))} />
          </Param>
          <Param label="Initial Bacterial Biomass" value={`${params.initialBiomass.toFixed(1)} g`} icon={<Bug className="h-4 w-4" />}>
            <Slider min={0.1} max={10} step={0.1} value={[params.initialBiomass]} onValueChange={(vals) => setParams((p) => ({ ...p, initialBiomass: vals[0] ?? p.initialBiomass }))} />
          </Param>
          <Param label="Temperature" value={`${params.temperature} °C`} icon={<Thermometer className="h-4 w-4" />}>
            <Slider min={10} max={50} step={1} value={[params.temperature]} onValueChange={(vals) => setParams((p) => ({ ...p, temperature: vals[0] ?? p.temperature }))} />
          </Param>
          <div className="space-y-1 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <div>T_f = <span className="text-foreground">{Tf.toFixed(3)}</span></div>
            <div>V_max = 0.05 h⁻¹ · K_m = 50 g</div>
            <div>Yield: 0.375 g H₂O, 2.29 g CO₂ / g catabolized</div>
            <div className="pt-1 opacity-70">Initial masses apply on reset (or at t=0).</div>
          </div>
        </section>

        <section className="flex flex-col rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 text-xs uppercase tracking-widest text-muted-foreground">Bioreactor</h2>
          <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-md bg-muted" style={{ minHeight: 300 }}>
            <svg viewBox="0 0 300 300" className="h-full w-full max-h-[360px]">
              <rect
                x={150 - 90 * Math.sqrt(plasticFrac)}
                y={150 - 90 * Math.sqrt(plasticFrac)}
                width={180 * Math.sqrt(plasticFrac)}
                height={180 * Math.sqrt(plasticFrac)}
                rx={8}
                fill="var(--chart-1)"
                opacity={0.35 + 0.5 * plasticFrac}
                style={{ transition: "all 100ms linear" }}
              />
              {Array.from({ length: bacteriaCount }).map((_, i) => {
                const a = i * 2.39996;
                const r = 30 + ((i * 37) % 110);
                const x = 150 + Math.cos(a + state.hour * 0.01) * r;
                const y = 150 + Math.sin(a + state.hour * 0.01) * r;
                return <ellipse key={i} cx={x} cy={y} rx={6} ry={3} transform={`rotate(${(a * 57) % 180} ${x} ${y})`} fill="var(--chart-2)" opacity={0.85} />;
              })}
            </svg>
          </div>
          <div className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>PET remaining {(plasticFrac * 100).toFixed(1)}%</span>
            <span>Biomass ×{(state.biomass / params.initialBiomass).toFixed(2)}</span>
          </div>
        </section>

        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric icon={<Box className="h-4 w-4" />} label="PET" value={state.plastic} color="var(--chart-1)" />
            <Metric icon={<Activity className="h-4 w-4" />} label="Biomass" value={state.biomass} color="var(--chart-2)" />
            <Metric icon={<Droplet className="h-4 w-4" />} label="H₂O" value={state.water} color="var(--chart-3)" />
            <Metric icon={<Wind className="h-4 w-4" />} label="CO₂" value={state.co2} color="var(--chart-4)" />
          </div>
          <div className="h-[320px] rounded-lg border border-border bg-card p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} formatter={(v: number) => v.toFixed(3)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {SERIES.map((s) => (
                  <Line key={s.key} dataKey={s.key} name={s.label} stroke={s.color} dot={false} strokeWidth={2} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </main>
    </div>
  );
}

function CtrlButton({ children, onClick, primary }: { children: ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${primary ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-border hover:bg-accent"}`}
    >
      {children}
    </button>
  );
}

function Param({ label, value, icon, children }: { label: string; value: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">{icon}{label}</span>
        <span className="text-primary">{value}</span>
      </div>
      {children}
    </div>
  );
}

function Metric({ icon, label, value, color }: { icon: ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground" style={{ color }}>{icon}{label}</div>
      <div className="mt-1 text-xl tabular-nums">{value.toFixed(2)}<span className="ml-1 text-xs text-muted-foreground">g</span></div>
    </div>
  );
}
