/**
 * HENS Dashboard — React Frontend
 * Heat Exchanger Network Synthesis Optimizer
 * Connects to FastAPI /optimize endpoint
 */

import { useState } from "react";

// ─── Default stream data (classic Linnhoff benchmark) ──────────────────────
const DEFAULT_HOT = [
  { id: "H1", Tin: 175, Tout: 45, Mcp: 10 },
  { id: "H2", Tin: 125, Tout: 65, Mcp: 40 },
];
const DEFAULT_COLD = [
  { id: "C1", Tin: 20,  Tout: 155, Mcp: 20 },
  { id: "C2", Tin: 40,  Tout: 112, Mcp: 15 },
];

// ─── Small UI primitives ───────────────────────────────────────────────────
const Label = ({ children }) => (
  <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
    {children}
  </label>
);

const Input = ({ value, onChange, type = "number", step = "0.1", min, placeholder }) => (
  <input
    type={type}
    step={step}
    min={min}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm
               text-white placeholder-slate-500 focus:outline-none focus:ring-2
               focus:ring-orange-500/60 focus:border-orange-500 transition-all"
  />
);

const Badge = ({ children, color = "slate" }) => {
  const colors = {
    orange: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    blue:   "bg-blue-500/20 text-blue-300 border-blue-500/30",
    green:  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    slate:  "bg-slate-700/60 text-slate-300 border-slate-600",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${colors[color]}`}>
      {children}
    </span>
  );
};

// ─── Stream editor panel ───────────────────────────────────────────────────
function StreamPanel({ streams, onChange, type }) {
  const isHot = type === "hot";
  const accent = isHot
    ? "from-orange-600/20 to-rose-600/10 border-orange-500/30"
    : "from-blue-600/20 to-cyan-600/10 border-blue-500/30";
  const dot = isHot ? "bg-orange-400" : "bg-blue-400";
  const label = isHot ? "Hot Stream" : "Cold Stream";

  const update = (idx, field, raw) => {
    const val = field === "id" ? raw : parseFloat(raw);
    const next = streams.map((s, i) => (i === idx ? { ...s, [field]: val } : s));
    onChange(next);
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 ${accent}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-3 h-3 rounded-full ${dot}`} />
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/80">{label}s</h3>
      </div>
      <div className="space-y-4">
        {streams.map((s, idx) => (
          <div key={idx} className="bg-slate-900/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 font-mono">Stream #{idx + 1}</span>
              <input
                value={s.id}
                onChange={e => update(idx, "id", e.target.value)}
                className="bg-transparent text-right text-sm font-bold text-white w-16
                           border-b border-slate-600 focus:outline-none focus:border-orange-400"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>T_in (°C)</Label>
                <Input value={s.Tin} onChange={e => update(idx, "Tin", e.target.value)} />
              </div>
              <div>
                <Label>T_out (°C)</Label>
                <Input value={s.Tout} onChange={e => update(idx, "Tout", e.target.value)} />
              </div>
              <div>
                <Label>Mcp (kW/°C)</Label>
                <Input value={s.Mcp} onChange={e => update(idx, "Mcp", e.target.value)} min="0.01" />
              </div>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Q = {(Math.abs(s.Mcp * (s.Tin - s.Tout))).toFixed(1)} kW
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Results section ───────────────────────────────────────────────────────
function ResultsPanel({ result }) {
  if (!result) return null;

  const costCards = [
    { label: "Total Annual Cost",  value: result.total_cost,   unit: "$/yr", color: "orange", icon: "◈" },
    { label: "Utility Cost",       value: result.utility_cost, unit: "$/yr", color: "blue",   icon: "⚡" },
    { label: "Capital Cost",       value: result.capital_cost, unit: "$/yr", color: "green",  icon: "🏗" },
  ];

  const stageColors = ["bg-violet-500/20 text-violet-300", "bg-amber-500/20 text-amber-300", "bg-teal-500/20 text-teal-300"];

  return (
    <div className="mt-8 space-y-6 animate-fade-in">
      {/* Summary Banner */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-emerald-400 text-lg">✓</span>
          <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
            Optimization Complete
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{result.solver_message}</p>
      </div>

      {/* Cost KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {costCards.map(c => (
          <div key={c.label} className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5 text-center">
            <div className="text-2xl mb-1">{c.icon}</div>
            <div className="text-2xl font-black text-white tracking-tight">
              {c.value.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-400 font-mono">{c.unit}</div>
            <div className="text-xs text-slate-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Utility Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 flex items-center gap-3">
          <div className="text-2xl">🔥</div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Hot Utility Required</div>
            <div className="text-lg font-bold text-orange-300">{result.hot_utility.toFixed(2)} <span className="text-sm font-normal text-slate-400">kW</span></div>
          </div>
        </div>
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-center gap-3">
          <div className="text-2xl">❄</div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider">Cold Utility Required</div>
            <div className="text-lg font-bold text-blue-300">{result.cold_utility.toFixed(2)} <span className="text-sm font-normal text-slate-400">kW</span></div>
          </div>
        </div>
      </div>

      {/* Heat Exchanger Matches Table */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-orange-500 rounded-full inline-block" />
          Active Heat Exchanger Matches ({result.heat_exchangers.length})
        </h3>
        <div className="rounded-2xl border border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 text-left">Match</th>
                <th className="px-4 py-3 text-center">Stage</th>
                <th className="px-4 py-3 text-right">Q (kW)</th>
                <th className="px-4 py-3 text-right">Area (m²)</th>
                <th className="px-4 py-3 text-right">ΔT Hot (°C)</th>
                <th className="px-4 py-3 text-right">ΔT Cold (°C)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {result.heat_exchangers.map((hx, idx) => (
                <tr key={idx} className="bg-slate-900/40 hover:bg-slate-800/60 transition-colors">
                  <td className="px-4 py-3 font-mono">
                    <Badge color="orange">{hx.hot_id}</Badge>
                    <span className="text-slate-500 mx-1.5">↔</span>
                    <Badge color="blue">{hx.cold_id}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${stageColors[hx.stage - 1] || "text-slate-300"}`}>
                      S{hx.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white font-semibold">
                    {hx.Q_ex.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">
                    {hx.area.toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-orange-300 text-xs">
                    {hx.T_hot_in.toFixed(1)} → {hx.T_hot_out.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-blue-300 text-xs">
                    {hx.T_cold_in.toFixed(1)} → {hx.T_cold_out.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────
export default function App() {
  const [hotStreams,  setHotStreams]  = useState(DEFAULT_HOT);
  const [coldStreams, setColdStreams] = useState(DEFAULT_COLD);
  const [params, setParams] = useState({
    U: 0.5,
    annualized_cost: 0.26,
    hot_utility_cost: 80,
    cold_utility_cost: 20,
    HRAT: 10,
    max_matches: 5,
  });
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  const updateParam = (key, val) =>
    setParams(p => ({ ...p, [key]: parseFloat(val) }));

  const handleOptimize = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const payload = {
      hot_streams:  hotStreams,
      cold_streams: coldStreams,
      ...params,
    };

    try {
      const res = await fetch("http://localhost:8000/optimize", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-rose-600
                            flex items-center justify-center text-white font-black text-sm">H</div>
            <div>
              <div className="font-black tracking-tight text-white text-lg leading-none">HENS Optimizer</div>
              <div className="text-xs text-slate-500 leading-none mt-0.5">Heat Exchanger Network Synthesis</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            3-Stage Superstructure · MINLP · Chen's LMTD
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* ── LEFT: Input Panel ── */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
                Stream Data
              </h2>
              <div className="space-y-4">
                <StreamPanel streams={hotStreams}  onChange={setHotStreams}  type="hot" />
                <StreamPanel streams={coldStreams} onChange={setColdStreams} type="cold" />
              </div>
            </div>

            {/* Solver Parameters */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                Solver Parameters
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>U (kW/m²·°C)</Label>
                  <Input value={params.U} step="0.01" min="0.01"
                    onChange={e => updateParam("U", e.target.value)} />
                </div>
                <div>
                  <Label>HRAT (°C)</Label>
                  <Input value={params.HRAT} step="1" min="1"
                    onChange={e => updateParam("HRAT", e.target.value)} />
                </div>
                <div>
                  <Label>Hot Util Cost ($/kW·yr)</Label>
                  <Input value={params.hot_utility_cost} step="1"
                    onChange={e => updateParam("hot_utility_cost", e.target.value)} />
                </div>
                <div>
                  <Label>Cold Util Cost ($/kW·yr)</Label>
                  <Input value={params.cold_utility_cost} step="1"
                    onChange={e => updateParam("cold_utility_cost", e.target.value)} />
                </div>
                <div>
                  <Label>Capital Factor ($/m^0.83)</Label>
                  <Input value={params.annualized_cost} step="0.01"
                    onChange={e => updateParam("annualized_cost", e.target.value)} />
                </div>
                <div>
                  <Label>Max Matches (Euler)</Label>
                  <Input value={params.max_matches} step="1" min="1"
                    onChange={e => updateParam("max_matches", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Optimize Button */}
            <button
              onClick={handleOptimize}
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-widest
                         bg-gradient-to-r from-orange-500 to-rose-600 text-white
                         hover:from-orange-400 hover:to-rose-500 active:scale-[0.98]
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all shadow-lg shadow-orange-500/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Solving MINLP…
                </span>
              ) : "Run Optimization"}
            </button>
          </div>

          {/* ── RIGHT: Results Panel ── */}
          <div className="lg:col-span-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              Optimization Results
            </h2>

            {/* Error */}
            {error && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5">
                <div className="text-sm font-bold text-rose-400 mb-1">Solver Error</div>
                <p className="text-xs text-rose-300/80">{error}</p>
              </div>
            )}

            {/* Empty state */}
            {!result && !error && !loading && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
                <div className="text-4xl mb-3 opacity-30">⚗</div>
                <div className="text-slate-500 text-sm">
                  Configure your streams and click <strong className="text-slate-400">Run Optimization</strong>
                </div>
                <div className="text-slate-600 text-xs mt-2">
                  3-Stage superstructure · Big-M = 100,000 · Chen's LMTD approximation
                </div>
              </div>
            )}

            {loading && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
                <div className="text-4xl mb-3 animate-bounce">⚙</div>
                <div className="text-slate-400 text-sm">Solving MINLP model…</div>
                <div className="text-slate-600 text-xs mt-2">
                  Enumerating feasible matches · Applying Euler's rule · Computing areas
                </div>
              </div>
            )}

            <ResultsPanel result={result} />
          </div>
        </div>

        {/* Math Model Reference */}
        <details className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/30">
          <summary className="px-6 py-4 cursor-pointer text-xs font-bold uppercase tracking-widest
                              text-slate-500 hover:text-slate-300 transition-colors select-none">
            Model Reference — Mathematical Formulation
          </summary>
          <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-400">
            <div>
              <div className="font-bold text-slate-300 mb-2">Objective Function</div>
              <pre className="bg-slate-950 rounded-lg p-3 text-emerald-300/80 leading-relaxed overflow-x-auto">
{`min TAC = Utility Cost + Capital Cost

Utility Cost =
  Qₕᵤₜ × CU_hot + Q_cold_util × CU_cold

Capital Cost =
  Σᵢⱼₖ [ CF × Aᵢⱼₖ^0.83 ]`}
              </pre>
            </div>
            <div>
              <div className="font-bold text-slate-300 mb-2">Chen's LMTD Approximation</div>
              <pre className="bg-slate-950 rounded-lg p-3 text-blue-300/80 leading-relaxed overflow-x-auto">
{`LMTD ≈ (ΔT₁ · ΔT₂ · (ΔT₁+ΔT₂)/2)^(1/3)

Area = Q / (U × LMTD)
      0 ≤ Area ≤ 5000 m²`}
              </pre>
            </div>
            <div>
              <div className="font-bold text-slate-300 mb-2">Big-M Constraints</div>
              <pre className="bg-slate-950 rounded-lg p-3 text-orange-300/80 leading-relaxed overflow-x-auto">
{`ΔTᵢⱼₖ ≥ HRAT - M(1 - zᵢⱼₖ)
Qᵢⱼₖ ≤ M · zᵢⱼₖ

M = 100,000
zᵢⱼₖ ∈ {0,1} (binary match variable)`}
              </pre>
            </div>
            <div>
              <div className="font-bold text-slate-300 mb-2">Structural Constraints</div>
              <pre className="bg-slate-950 rounded-lg p-3 text-violet-300/80 leading-relaxed overflow-x-auto">
{`Heat Balance (per stage):
  Mcp_H × (TH_in - TH_out) = Σⱼ Qᵢⱼₖ

Euler's Rule (max matches):
  Σᵢⱼₖ zᵢⱼₖ ≤ N_streams - 1 + 1

Monotonic T profiles:
  TH[k] ≤ TH[k-1]  (hot, decreasing)
  TC[k] ≥ TC[k-1]  (cold, increasing)`}
              </pre>
            </div>
          </div>
        </details>
      </main>

      <footer className="border-t border-slate-800 mt-12 py-6 text-center text-xs text-slate-600">
        HENS Optimizer · 3-Stage Superstructure MINLP · Chen's Approximation for LMTD ·
        Big-M = 100,000 · Euler's Rule
      </footer>
    </div>
  );
}
