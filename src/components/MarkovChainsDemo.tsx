import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { CSSProperties } from 'react';

import { cssVar } from '../utils/theme';
import { useTheme } from '../ThemeContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const card: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '24px',
};

const PR_PAGES = ['A', 'B', 'C', 'D'];
const PR_LINKS: Record<string, string[]> = {
  A: ['B', 'C'],
  B: ['C'],
  C: ['A', 'D'],
  D: ['C'],
};
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-12) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const pv = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= pv;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let j = col; j <= n; j++) M[r][j] -= factor * M[col][j];
    }
  }
  return M.map((row) => row[n]);
}

function stationary(P: number[][]): number[] {
  const k = P.length;
  // Build A = M^T - I, then replace last row with ones (sum constraint)
  const A: number[][] = [];
  for (let i = 0; i < k; i++) {
    const row: number[] = [];
    for (let j = 0; j < k; j++) {
      row.push(P[j][i] - (i === j ? 1 : 0));
    }
    A.push(row);
  }
  A[k - 1] = Array(k).fill(1);
  const b = Array(k).fill(0);
  b[k - 1] = 1;
  const x = solveLinear(A, b);
  if (!x) return Array(k).fill(1 / k);
  // clip negatives
  const clipped = x.map((v) => Math.max(0, v));
  const s = clipped.reduce((a, c) => a + c, 0);
  return s > 0 ? clipped.map((v) => v / s) : Array(k).fill(1 / k);
}

export default function MarkovChainsDemo() {
  const { mode } = useTheme();

  const [numStates, setNumStates] = useState<number>(3);
  const [matrixText, setMatrixText] = useState<string[][]>([
    ['0.2', '0.5', '0.3'],
    ['0.1', '0.6', '0.3'],
    ['0.4', '0.2', '0.4'],
  ]);
  const P = useMemo(() => matrixText.map((row) => row.map((cell) => {
    const n = parseFloat(cell);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  })), [matrixText]);
  const [steps, setSteps] = useState<number>(5000);
  const [running, setRunning] = useState<boolean>(false);
  const [freqHistory, setFreqHistory] = useState<number[][]>([]);
  const [finalFreq, setFinalFreq] = useState<number[] | null>(null);

  // Resize matrix when numStates changes
  const resizeMatrix = (k: number) => {
    const next: string[][] = [];
    for (let i = 0; i < k; i++) {
      const row: string[] = [];
      for (let j = 0; j < k; j++) {
        if (i < matrixText.length && j < (matrixText[i]?.length ?? 0)) {
          row.push(matrixText[i][j]);
        } else {
          row.push(i === j ? '0.6' : (0.4 / (k - 1 || 1)).toFixed(2));
        }
      }
      next.push(row);
    }
    setMatrixText(next);
  };

  const handleStateCount = (k: number) => {
    setNumStates(k);
    resizeMatrix(k);
  };

  const updateCell = (i: number, j: number, value: string) => {
    setMatrixText((prev) => prev.map((r, ri) => (ri === i ? r.map((c, ci) => (ci === j ? value : c)) : r)));
  };

  const Pnorm = useMemo(() => {
    return P.map((row) => {
      const s = row.reduce((a, c) => a + (isFinite(c) ? c : 0), 0);
      if (s <= 0) return row.map(() => 1 / row.length);
      return row.map((v) => (isFinite(v) ? v : 0) / s);
    });
  }, [P]);

  const pi = useMemo(() => {
    void mode;
    return stationary(Pnorm);
  }, [Pnorm, mode]);

  const runWalk = () => {
    setRunning(true);
    const k = numStates;
    const counts = Array(k).fill(0);
    const history: number[][] = [];
    let state = 0;
    const checkpointEvery = Math.max(1, Math.floor(steps / 100));
    for (let t = 1; t <= steps; t++) {
      counts[state]++;
      // transition
      const r = Math.random();
      let cum = 0;
      let next = k - 1;
      for (let j = 0; j < k; j++) {
        cum += Pnorm[state][j];
        if (r <= cum) { next = j; break; }
      }
      state = next;
      if (t % checkpointEvery === 0 || t === steps) {
        const snap = [...counts].map((c) => c / t);
        history.push(snap);
      }
    }
    setFreqHistory(history);
    setFinalFreq(counts.map((c) => c / steps));
    setRunning(false);
  };

  const labels = Array.from({ length: freqHistory.length }, (_, i) => (i + 1) * Math.max(1, Math.floor(steps / 100)));
  const colors = [cssVar('--accent'), cssVar('--muted'), cssVar('--muted'), cssVar('--accent'), cssVar('--muted')];
  const chartData = freqHistory.length > 0 ? {
    labels,
    datasets: [
      ...Array.from({ length: numStates }, (_, s) => ({
        label: `state ${s} (sim)`,
        data: freqHistory.map((h) => h[s]),
        borderColor: colors[s % colors.length],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.2,
        fill: false,
      })),
      ...Array.from({ length: numStates }, (_, s) => ({
        label: `state ${s} (stationary)`,
        data: labels.map(() => pi[s]),
        borderColor: colors[s % colors.length],
        borderDash: [4, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      })),
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { color: cssVar('--muted'), font: { size: 11 } } } },
    scales: {
      x: { title: { display: true, text: 'steps', color: cssVar('--muted') }, ticks: { color: cssVar('--muted'), maxTicksLimit: 8 } },
      y: { min: 0, max: 1, title: { display: true, text: 'frequency', color: cssVar('--muted') }, ticks: { color: cssVar('--muted') } },
    },
  };

  // PageRank
  const pageRank = useMemo(() => {
    const pages = PR_PAGES;
    const links = PR_LINKS;
    const idx = (p: string) => pages.indexOf(p);
    const n = pages.length;
    const damp = 0.85;
    let r = Array(n).fill(1 / n);
    for (let it = 0; it < 100; it++) {
      const next = Array(n).fill((1 - damp) / n);
      for (let i = 0; i < n; i++) {
        const outs = links[pages[i]];
        if (outs.length === 0) {
          // dangling: distribute evenly
          for (let j = 0; j < n; j++) next[j] += damp * r[i] / n;
        } else {
          for (const target of outs) {
            next[idx(target)] += damp * r[i] / outs.length;
          }
        }
      }
      r = next;
    }
    return r;
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', background: 'var(--bg)', color: 'var(--text)', minHeight: '100%', textAlign: 'left' }}>
      <div style={{ width: '100%', padding: '48px 40px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <header>
          <h1 className="title-serif" style={{ margin: 0, fontSize: '40px', fontWeight: 600, letterSpacing: '-0.5px' }}>Markov Chains</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: '19px' }}>
            Editable transition matrix, simulated walks, stationary distribution via eigenvectors, and a mini PageRank.
          </p>
        </header>

        {/* matrix + stationary */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
          <div style={{ ...card, flex: '1 1 320px', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Transition matrix P</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '17px' }}>
              <label style={{ color: 'var(--muted)' }}>States</label>
              <select
                value={numStates}
                onChange={(e) => handleStateCount(parseInt(e.target.value))}
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', fontSize: '18px' }}
              >
                {[2, 3, 4, 5].map((k) => (<option key={k} value={k}>{k}</option>))}
              </select>
              <span style={{ color: 'var(--muted)', fontSize: '16px' }}>(rows sum to 1)</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: '17px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px' }}></th>
                    {Array.from({ length: numStates }, (_, j) => (
                      <th key={j} style={{ padding: '6px', color: 'var(--muted)', fontWeight: 500 }}>s{j}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {P.map((_, i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px', color: 'var(--muted)', fontWeight: 500 }}>s{i}</td>
                      {matrixText[i].map((_, j) => (
                        <td key={j} style={{ padding: '4px' }}>
                          <input
                            type="text" inputMode="decimal" value={matrixText[i][j]}
                            onChange={(e) => updateCell(i, j, e.target.value)}
                            style={{ width: '64px', padding: '4px 6px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '17px', boxShadow: 'none' }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => {
                // random stochastic matrix
                const next = Array.from({ length: numStates }, () => {
                  const row = Array.from({ length: numStates }, () => Math.random());
                  const s = row.reduce((a, c) => a + c, 0);
                  return row.map((v) => (v / s).toFixed(2));
                });
                setMatrixText(next);
              }}
              style={{ padding: '8px 12px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '17px', alignSelf: 'flex-start' }}
            >
              Randomize
            </button>
          </div>

          <div style={{ ...card, flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Stationary distribution π</h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '17px', lineHeight: 1.5 }}>
              Solved from πP = π (via eigenvector/linear system), normalized to sum 1.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {pi.map((v, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '30px', color: 'var(--muted)', fontSize: '17px' }}>s{i}</span>
                  <div style={{ flex: 1, height: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div style={{ width: `${Math.max(0, Math.min(100, v * 100))}%`, height: '100%', background: 'var(--accent)' }} />
                  </div>
                  <span className="num" style={{ width: '56px', textAlign: 'right', fontSize: '17px', fontWeight: 600 }}>{v.toFixed(4)}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '8px' }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)' }}>Simulated visit frequencies</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '8px', fontSize: '17px' }}>
                <label style={{ color: 'var(--muted)' }}>Steps</label>
                <input type="range" min={500} max={20000} step={500} value={steps} onChange={(e) => setSteps(parseInt(e.target.value) || 500)}
                  style={{ width: '160px', accentColor: 'var(--accent)' }} />
                <span className="num" style={{ color: 'var(--text)' }}>{steps.toLocaleString()}</span>
                <button onClick={runWalk} disabled={running}
                  style={{ padding: '8px 12px', background: running ? 'var(--bg)' : 'var(--accent)', color: running ? 'var(--text)' : 'var(--bg)', border: '1px solid var(--accent)', borderRadius: '8px', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '17px', boxShadow: 'none' }}>
                  {running ? 'Running…' : 'Simulate'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(finalFreq || pi).map((_v, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '30px', color: 'var(--muted)', fontSize: '17px' }}>s{i}</span>
                    <div style={{ flex: 1, height: '10px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                      <div style={{ width: `${Math.max(0, Math.min(100, (finalFreq ? finalFreq[i] : pi[i]) * 100))}%`, height: '100%', background: 'var(--curve)' }} />
                    </div>
                    <span className="num" style={{ width: '56px', textAlign: 'right', fontSize: '17px', fontWeight: 600 }}>
                      {(finalFreq ? finalFreq[i] : 0).toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
              <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: '16px' }}>
                Simulated bars should approach the stationary values above.
              </p>
            </div>
          </div>
        </section>

        {/* convergence chart */}
        {chartData && (
          <section style={card}>
            <h2 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 600 }}>Visit frequencies converging to stationary distribution</h2>
            <div style={{ position: 'relative', height: '320px' }}>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Line data={chartData as any} options={chartOptions as any} />
            </div>
          </section>
        )}

        {/* PageRank */}
        <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Mini PageRank (random surfer)</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: '17px', lineHeight: 1.5 }}>
            Graph: A→B,C; B→C; C→A,D; D→C. Scores from power iteration (damping 0.85).
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {PR_PAGES.map((p, i) => (
              <div key={p} style={{ ...card, padding: '12px 16px', flex: '1 1 120px', textAlign: 'center' }}>
                <div className="title-serif" style={{ fontSize: '26px', fontWeight: 600 }}>{p}</div>
                <div className="num" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent)', marginTop: '4px' }}>{pageRank[i].toFixed(4)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}