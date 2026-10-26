import { useState, useMemo } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { CSSProperties } from 'react';
import type { TooltipItem } from 'chart.js';

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, Title, Tooltip, Legend);

type Distribution = 'uniform' | 'exponential' | 'bimodal';

const NUM_BINS = 40;
const LLN_POINTS = 200;

export default function CLTDemo() {
  const [distribution, setDistribution] = useState<Distribution>('exponential');
  const [n, setN] = useState<number>(30);
  const [trials, setTrials] = useState<number>(5000);
  const [running, setRunning] = useState<boolean>(false);
  const [sampleMeans, setSampleMeans] = useState<number[]>([]);
  const [runningMeans, setRunningMeans] = useState<number[]>([]);
  const [runningMean, setRunningMean] = useState<number>(0);

  const randUniform = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
  const randExponential = (lambda: number) => -Math.log(1 - Math.random()) / lambda;
  const randBimodal = (mid1: number, mid2: number): number => {
    const r = Math.random();
    if (r < 0.5) return mid1 + (Math.random() - 0.5) * 0.3;
    return mid2 + (Math.random() - 0.5) * 0.3;
  };

  const sampleMean = (size: number): number => {
    let sum = 0;
    for (let i = 0; i < size; i++) {
      switch (distribution) {
        case 'uniform': sum += randUniform(0, 1); break;
        case 'exponential': sum += randExponential(1); break;
        case 'bimodal': sum += randBimodal(0.2, 0.9); break;
      }
    }
    return sum / size;
  };

  const runSim = () => {
    setSampleMeans([]);
    setRunningMeans([]);
    setRunningMean(0);
    setRunning(true);
    const means: number[] = [];
    const rMeans: number[] = [];
    let totalSum = 0;
    const step = Math.max(1, Math.floor(trials / LLN_POINTS));
    for (let i = 0; i < trials; i++) {
      const m = sampleMean(n);
      means.push(m);
      totalSum += m;
      if ((i + 1) % step === 0 || i === trials - 1) {
        rMeans.push(totalSum / (i + 1));
      }
    }
    setSampleMeans(means);
    setRunningMeans(rMeans);
    setRunningMean(totalSum / trials);
    setRunning(false);
  };

  const meanDist = useMemo(() => {
    switch (distribution) {
      case 'uniform': return (1 + 0) / 2;
      case 'exponential': return 1 / 1;
      case 'bimodal': return (0.2 + 0.9) / 2;
      default: return 0.5;
    }
  }, [distribution]);

  const varDist = useMemo(() => {
    switch (distribution) {
      case 'uniform': return ((1 - 0) ** 2) / 12;
      case 'exponential': return 1 / (1 ** 2);
      case 'bimodal':
        return (
          0.5 * (Math.pow(0.2 - meanDist, 2) + (0.3 ** 2) / 12) +
          0.5 * (Math.pow(0.9 - meanDist, 2) + (0.3 ** 2) / 12)
        );
      default: return 0.5;
    }
  }, [distribution, meanDist]);

  const histogram = useMemo(() => {
    if (sampleMeans.length === 0) return null;
    const min = Math.min(...sampleMeans);
    const max = Math.max(...sampleMeans);
    const span = max - min;
    const binWidth = span / NUM_BINS;
    const binEdges = Array.from({ length: NUM_BINS + 1 }, (_, i) => min + i * binWidth);
    const binCounts = Array(NUM_BINS).fill(0);
    const binLabels: string[] = [];

    for (let i = 0; i < NUM_BINS; i++) {
      const lo = binEdges[i];
      const hi = binEdges[i + 1];
      binLabels.push(`${lo.toFixed(2)}`);
      for (const m of sampleMeans) {
        if (m >= lo && m < hi) binCounts[i]++;
      }
    }
    if (binCounts.length > 0 && sampleMeans.length > 0) {
      for (const m of sampleMeans) {
        if (m === max) binCounts[NUM_BINS - 1]++;
      }
    }
    const density = binCounts.map((c) => c / (sampleMeans.length * binWidth));
    const stdev = Math.sqrt(varDist / n);
    const theoretical = binEdges.slice(0, -1).map((x) => {
      const xMid = x + binWidth / 2;
      return (1 / (stdev * Math.sqrt(2 * Math.PI))) *
        Math.exp(-Math.pow(xMid - meanDist, 2) / (2 * stdev * stdev));
    });
    return { binLabels, binCounts, density, theoretical };
  }, [sampleMeans, n, varDist, meanDist]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartData = useMemo<any>(() => {
    if (!histogram) return null;
    return {
      labels: histogram.binLabels,
      datasets: [
        {
          label: 'simulated means',
          data: histogram.density,
          backgroundColor: 'rgba(129, 140, 248, 0.65)',
          borderColor: '#818cf8',
          borderWidth: 1,
        },
        {
          label: 'predicted N(μ, σ²/n)',
          data: histogram.theoretical,
          type: 'line' as const,
          borderColor: '#f472b6',
          borderWidth: 2.5,
          pointRadius: 0,
          fill: false,
          tension: 0.4,
        },
      ],
    };
  }, [histogram]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#9ca3af', font: { size: 13 } },
      },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) => {
            const datasetLabel = ctx.dataset.label || '';
            return `${datasetLabel}: ${ctx.parsed.y?.toFixed(4) ?? ''}`;
          },
        },
      },
    },
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        title: { display: true, text: `sample mean (μ = ${meanDist.toFixed(3)})`, color: '#9ca3af' },
        ticks: { color: '#9ca3af', maxTicksLimit: 8 },
      },
      y: {
        title: { display: true, text: 'Density', color: '#9ca3af' },
        ticks: { color: '#9ca3af' },
        beginAtZero: true,
      },
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const llnChartData = useMemo<any>(() => {
    if (runningMeans.length === 0) return null;
    const labels = runningMeans.map((_, i) => (i + 1));
    return {
      labels,
      datasets: [
        {
          label: 'running mean of sample means',
          data: runningMeans,
          borderColor: '#f472b6',
          backgroundColor: 'rgba(244, 114, 182, 0.2)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2,
          fill: false,
        },
        {
          label: `true μ = ${meanDist.toFixed(4)}`,
          data: labels.map(() => meanDist),
          borderColor: '#818cf8',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
        },
      ],
    };
  }, [runningMeans, meanDist]);

  const llnChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, labels: { color: '#9ca3af', font: { size: 13 } } },
      title: { display: false },
    },
    scales: {
      x: {
        title: { display: true, text: 'trials', color: '#9ca3af' },
        ticks: { color: '#9ca3af', maxTicksLimit: 8 },
      },
      y: {
        title: { display: true, text: 'running mean', color: '#9ca3af' },
        ticks: { color: '#9ca3af' },
      },
    },
  };

  const cardStyle: CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '24px',
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', background: 'var(--bg)', color: 'var(--text)', minHeight: '100%', textAlign: 'left' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px', width: '100%', padding: '48px 40px', alignItems: 'flex-start', maxWidth: '100%' }}>
        {/* controls */}
        <aside style={{ flex: '1 1 300px', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '28px', textAlign: 'left' }}>
          <header style={{ margin: 0 }}>
            <h1 style={{ margin: 0, fontSize: '34px', fontWeight: 600, letterSpacing: '-0.5px' }}>
              Central Limit Theorem
            </h1>
            <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: '15px' }}>
              See randomness converge.
            </p>
          </header>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="dist" style={labelStyle}>Distribution</label>
            <select
              id="dist"
              value={distribution}
              onChange={(e) => setDistribution(e.target.value as Distribution)}
              style={selectStyle}
            >
              <option value="exponential">Exponential</option>
              <option value="uniform">Uniform</option>
              <option value="bimodal">Bimodal</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="n" style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between' }}>
              <span>Sample size n</span>
              <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{n}</strong>
            </label>
            <input
              id="n"
              type="range"
              min={1}
              max={200}
              value={n}
              onChange={(e) => setN(parseInt(e.target.value) || 1)}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="trials" style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between' }}>
              <span>Trials</span>
              <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{trials.toLocaleString()}</strong>
            </label>
            <input
              id="trials"
              type="range"
              min={50}
              max={20000}
              step={50}
              value={trials}
              onChange={(e) => setTrials(parseInt(e.target.value) || 100)}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </div>

          <button
            onClick={() => (running ? null : runSim())}
            disabled={running}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: running ? 'var(--bg)' : 'var(--accent)',
              color: running ? 'var(--text)' : '#0b0f19',
              border: '1px solid var(--accent)',
              borderRadius: '8px',
              cursor: running ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '15px',
              boxShadow: 'none',
            }}
          >
            {running ? 'Running…' : 'Run Simulation'}
          </button>

          {sampleMeans.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', background: 'var(--surface)' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)' }}>
                Theoretical (CLT)
              </h3>
              <StatRow label="Mean μ" value={meanDist.toFixed(5)} />
              <StatRow label="Variance σ²" value={varDist.toFixed(5)} />
              <StatRow label="Std Error σ/√n" value={Math.sqrt(varDist / n).toFixed(5)} />
              <StatRow label="# Means" value={sampleMeans.length.toLocaleString()} />
              <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />
              <h3 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)' }}>
                Live Running Mean (LLN)
              </h3>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>
                {runningMean.toFixed(5)}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                → converges to μ = {meanDist.toFixed(5)} as trials → ∞
              </p>
            </div>
          )}

          <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 24px', background: 'transparent' }}>
            <h2 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)' }}>
              What's happening?
            </h2>
            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: '#d1d5db' }}>
              Each bar counts how often a sample of 30 exponential draws averaged to
              that value. The curve is the normal distribution the CLT predicts,
              with standard error σ/√n = 0.183. Raise n and the bars settle onto it.
            </p>
          </div>
        </aside>

        {/* content */}
        <section style={{ flex: '4 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={cardStyle}>
            {chartData ? (
              <div style={{ position: 'relative', height: '400px' }}>
                <Bar
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  data={chartData as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  options={chartOptions as any}
                />
              </div>
            ) : (
              <Placeholder msg="Pick parameters and hit Run Simulation to see the sample means." />
            )}
            <div style={{ display: 'flex', gap: '24px', marginTop: '12px', fontSize: '13px', color: 'var(--muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <i style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: 0, background: 'var(--accent)' }} />
                simulated means
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <i style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: 0, background: 'var(--curve)' }} />
                predicted N(μ, σ²/n)
              </span>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)' }}>
              Running Average (Law of Large Numbers)
            </h2>
            {llnChartData ? (
              <div style={{ position: 'relative', height: '340px' }}>
                <Line
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  data={llnChartData as any}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  options={llnChartOptions as any}
                />
              </div>
            ) : (
              <Placeholder msg="Run a simulation to see the running mean converge." height={340} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

const labelStyle: CSSProperties = {
  fontSize: '13px',
  color: 'var(--muted)',
};

const selectStyle: CSSProperties = {
  background: 'var(--surface)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '15px',
};

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function Placeholder({ msg, height = 400 }: { msg: string; height?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: `${height}px`, color: 'var(--muted)', fontSize: '15px' }}>
      {msg}
    </div>
  );
}