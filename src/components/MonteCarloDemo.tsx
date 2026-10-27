import { useState, useRef, useEffect, useMemo } from 'react';
import { cssVar } from '../utils/theme';
import { useTheme } from '../ThemeContext';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

type MCPoint = { x: number; y: number; inside: boolean };

const card: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '24px',
};

export default function MonteCarloDemo() {
  const { mode } = useTheme();
  // ---- estimate pi ----
  const [nPoints, setNPoints] = useState<number>(1000);
  const [points, setPoints] = useState<MCPoint[]>([]);
  const [shown, setShown] = useState<number>(0);
  const [running, setRunning] = useState<boolean>(false);
  const [checkpoints, setCheckpoints] = useState<{ n: number; est: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const insideCount = useMemo(() => points.slice(0, shown).filter((p) => p.inside).length, [points, shown]);
  const totalShown = shown;
  const piEst = totalShown > 0 ? (4 * insideCount) / totalShown : 0;
  const piError = totalShown > 0 ? Math.abs(piEst - Math.PI) : 0;

  const runPi = () => {
    const pts: MCPoint[] = [];
    const cps: { n: number; est: number }[] = [];
    let inside = 0;
    const step = Math.max(1, Math.floor(nPoints / 20));
    for (let i = 0; i < nPoints; i++) {
      const x = Math.random() * 2 - 1;
      const y = Math.random() * 2 - 1;
      const insideNow = x * x + y * y <= 1;
      pts.push({ x, y, inside: insideNow });
      if (insideNow) inside++;
      if ((i + 1) % step === 0 || i === nPoints - 1) {
        cps.push({ n: i + 1, est: (4 * inside) / (i + 1) });
      }
    }
    setPoints(pts);
    setCheckpoints(cps);
    setShown(0);
    setRunning(true);
  };

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setShown((s) => {
        const next = s + Math.max(1, Math.floor(nPoints / 60));
        if (next >= nPoints) {
          setRunning(false);
          return nPoints;
        }
        return next;
      });
    }, 30);
    return () => window.clearInterval(id);
  }, [running, nPoints]);

  // draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const size = 360;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = cssVar('--surface');
    ctx.fillRect(0, 0, size, size);

    const scale = size / 2 - 2;
    const cx = size / 2;
    const cy = size / 2;

    // square border removed for clean edge

    // circle
    ctx.strokeStyle = cssVar('--accent');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, scale, 0, Math.PI * 2);
    ctx.stroke();

    const toDraw = points.slice(0, shown);
    for (const p of toDraw) {
      ctx.fillStyle = p.inside ? cssVar('--accent') : cssVar('--muted');
      ctx.fillRect(cx + p.x * scale, cy - p.y * scale, 2, 2);
    }
  }, [points, shown, mode]);

  const convData = useMemo(() => {
    if (checkpoints.length === 0) return null;
    void mode;
    return {
      labels: checkpoints.map((c) => c.n),
      datasets: [
        {
          label: '|π_est - π|',
          data: checkpoints.map((c) => Math.abs(c.est - Math.PI)),
          borderColor: cssVar('--muted'),
          backgroundColor: cssVar('--muted'),
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2,
          fill: false,
        },
        {
          label: 'C / √n (trend)',
          data: checkpoints.map((c) => (Math.abs(checkpoints[0].est - Math.PI) * Math.sqrt(checkpoints[0].n)) / Math.sqrt(c.n)),
          borderColor: cssVar('--accent'),
          borderDash: [6, 4],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
      ],
    };
  }, [checkpoints, mode]);

  const convOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const, labels: { color: cssVar('--muted'), font: { size: 13 } } } },
    scales: {
      x: { title: { display: true, text: 'n points', color: cssVar('--muted') }, ticks: { color: cssVar('--muted'), maxTicksLimit: 6 } },
      y: { title: { display: true, text: 'error', color: cssVar('--muted') }, ticks: { color: cssVar('--muted') } },
    },
  };

  // ---- birthday paradox ----
  const [people, setPeople] = useState<number>(23);
  const [bTrials, setBTrials] = useState<number>(10000);
  const [bResult, setBResult] = useState<number | null>(null);
  const [bRunning, setBRunning] = useState(false);

  const birthdayExact = useMemo(() => {
    let p = 1;
    const days = 365;
    for (let i = 0; i < people; i++) p *= (days - i) / days;
    return 1 - p;
  }, [people]);

  const runBirthday = () => {
    setBRunning(true);
    let hits = 0;
    for (let t = 0; t < bTrials; t++) {
      const seen = new Set<number>();
      let collision = false;
      for (let i = 0; i < people; i++) {
        const d = Math.floor(Math.random() * 365);
        if (seen.has(d)) { collision = true; break; }
        seen.add(d);
      }
      if (collision) hits++;
    }
    setBResult(hits / bTrials);
    setBRunning(false);
  };

  // ---- monty hall ----
  const [mTrials, setMTrials] = useState<number>(10000);
  const [mRunning, setMRunning] = useState(false);
  const [stayRate, setStayRate] = useState<number | null>(null);
  const [switchRate, setSwitchRate] = useState<number | null>(null);

  const runMonty = () => {
    setMRunning(true);
    let stayWins = 0;
    let switchWins = 0;
    for (let t = 0; t < mTrials; t++) {
      const prize = Math.floor(Math.random() * 3);
      const pick = Math.floor(Math.random() * 3);
      // host opens a goat door
      let host: number;
      do { host = Math.floor(Math.random() * 3); } while (host === prize || host === pick);
      const stayWin = pick === prize;
      const switchPick = 3 - pick - host;
      const switchWin = switchPick === prize;
      if (stayWin) stayWins++;
      if (switchWin) switchWins++;
    }
    setStayRate(stayWins / mTrials);
    setSwitchRate(switchWins / mTrials);
    setMRunning(false);
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', background: 'var(--bg)', color: 'var(--text)', minHeight: '100%', textAlign: 'left' }}>
      <div style={{ width: '100%', padding: '48px 40px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <header>
          <h1 className="title-serif" style={{ margin: 0, fontSize: '40px', fontWeight: 600, letterSpacing: '-0.5px' }}>Monte Carlo</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: '19px' }}>
            Random sampling to estimate quantities, verify probabilities, and watch error shrink as 1/√n.
          </p>
        </header>

        {/* PI */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
          <div style={{ ...card, flex: '1 1 320px', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Estimate π</h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '18px', lineHeight: 1.5 }}>
              Drop random points in a square; the fraction landing in the inscribed circle estimates π/4.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', color: 'var(--muted)' }}>
                <span>Points</span><strong style={{ color: 'var(--text)' }}>{nPoints.toLocaleString()}</strong>
              </label>
              <input type="range" min={100} max={5000} step={100} value={nPoints}
                onChange={(e) => setNPoints(parseInt(e.target.value) || 100)}
                style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>
            <button
              onClick={runPi}
              disabled={running}
              style={{
                padding: '10px 16px', background: running ? 'var(--bg)' : 'var(--accent)', color: running ? 'var(--text)' : 'var(--bg)',
                border: '1px solid var(--accent)', borderRadius: '8px', cursor: running ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: '18px', boxShadow: 'none',
              }}
            >
              {running ? 'Animating…' : 'Run'}
            </button>
            <div style={{ fontSize: '17px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Stat label="Inside" value={`${insideCount.toLocaleString()} / ${totalShown.toLocaleString()}`} />
              <Stat label="π estimate" value={piEst.toFixed(6)} />
              <Stat label="True π" value={Math.PI.toFixed(6)} />
              <Stat label="Error" value={piError.toFixed(6)} />
            </div>
          </div>

          <div style={{ ...card, flex: '0 0 408px', width: '408px', height: '408px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <canvas ref={canvasRef} style={{ alignSelf: 'center' }} />
            <div style={{ display: 'flex', gap: '16px', fontSize: '17px', color: 'var(--muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <i style={{ width: 10, height: 10, background: 'var(--accent)', display: 'inline-block' }} /> inside
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <i style={{ width: 10, height: 10, background: 'var(--muted)', display: 'inline-block' }} /> outside
              </span>
            </div>
          </div>

          <div style={{ ...card, flex: '2 1 420px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Convergence (error ~ 1/√n)</h2>
            {convData ? (
              <div style={{ position: 'relative', height: '300px' }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Line data={convData as any} options={convOptions as any} />
              </div>
            ) : (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
                Run an estimate to see the error shrink.
              </div>
            )}
          </div>
        </section>

        {/* birthday + monty */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
          <div style={{ ...card, flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Birthday Paradox</h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '18px', lineHeight: 1.5 }}>
              Probability that, in a group of n people, at least two share a birthday.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', color: 'var(--muted)' }}>
                <span>People</span><strong style={{ color: 'var(--text)' }}>{people}</strong>
              </label>
              <input type="range" min={2} max={60} value={people} onChange={(e) => setPeople(parseInt(e.target.value) || 2)}
                style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', color: 'var(--muted)' }}>
                <span>Trials</span><strong style={{ color: 'var(--text)' }}>{bTrials.toLocaleString()}</strong>
              </label>
              <input type="range" min={1000} max={50000} step={1000} value={bTrials} onChange={(e) => setBTrials(parseInt(e.target.value) || 1000)}
                style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>
            <button onClick={runBirthday} disabled={bRunning}
              style={{ padding: '10px 16px', background: bRunning ? 'var(--bg)' : 'var(--accent)', color: bRunning ? 'var(--text)' : 'var(--bg)', border: '1px solid var(--accent)', borderRadius: '8px', cursor: bRunning ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '18px', boxShadow: 'none' }}>
              {bRunning ? 'Running…' : 'Simulate'}
            </button>
            <div style={{ fontSize: '17px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Stat label="Exact" value={`${(birthdayExact * 100).toFixed(2)}%`} />
              <Stat label="Simulated" value={bResult === null ? '—' : `${(bResult * 100).toFixed(2)}%`} />
            </div>
          </div>

          <div style={{ ...card, flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>Monty Hall</h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '18px', lineHeight: 1.5 }}>
              Simulated win rates for staying vs switching; exact answers are 1/3 and 2/3.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', color: 'var(--muted)' }}>
                <span>Trials</span><strong style={{ color: 'var(--text)' }}>{mTrials.toLocaleString()}</strong>
              </label>
              <input type="range" min={1000} max={50000} step={1000} value={mTrials} onChange={(e) => setMTrials(parseInt(e.target.value) || 1000)}
                style={{ width: '100%', accentColor: 'var(--accent)' }} />
            </div>
            <button onClick={runMonty} disabled={mRunning}
              style={{ padding: '10px 16px', background: mRunning ? 'var(--bg)' : 'var(--accent)', color: mRunning ? 'var(--text)' : 'var(--bg)', border: '1px solid var(--accent)', borderRadius: '8px', cursor: mRunning ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '18px', boxShadow: 'none' }}>
              {mRunning ? 'Running…' : 'Simulate'}
            </button>
            <div style={{ fontSize: '17px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Stat label="Stay — exact" value="33.33%" />
              <Stat label="Stay — simulated" value={stayRate === null ? '—' : `${(stayRate * 100).toFixed(2)}%`} />
              <Stat label="Switch — exact" value="66.67%" />
              <Stat label="Switch — simulated" value={switchRate === null ? '—' : `${(switchRate * 100).toFixed(2)}%`} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="num" style={{ fontWeight: 600, color: 'var(--text)' }}>{value}</span>
    </div>
  );
}