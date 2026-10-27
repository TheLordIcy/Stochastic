import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { CSSProperties } from 'react';
import { useTheme } from '../ThemeContext';
import { cssVar } from '../utils/theme';
import type { ChartData, ChartOptions } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const card: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '24px',
};

function randNormal(mean: number, sd: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + sd * z;
}

export default function BayesHypothesisDemo() {
  const { mode } = useTheme();
  // Bayes
  const [prior, setPrior] = useState(0.01);
  const [sens, setSens] = useState(0.99);
  const [fpr, setFpr] = useState(0.05);
  const posterior = useMemo(() => {
    const tp = prior * sens;
    const fp = (1 - prior) * fpr;
    return (tp + fp) > 0 ? tp / (tp + fp) : 0;
  }, [prior, sens, fpr]);
  const N = 100000;
  const tp = Math.round(prior * sens * N);
  const fn = Math.round(prior * (1 - sens) * N);
  const fp = Math.round((1 - prior) * fpr * N);
  const tn = N - tp - fn - fp;

  // Hypothesis
  const [trueMean, setTrueMean] = useState(10);
  const [n, setN] = useState(30);
  const [sigma, setSigma] = useState(5);
  const [running, setRunning] = useState(false);
  const [coverage, setCoverage] = useState<number | null>(null);
  const [falsePos, setFalsePos] = useState<number | null>(null);
  const [meanHist, setMeanHist] = useState<number[]>([]);

  const runExperiments = () => {
    setRunning(true);
    setTimeout(() => {
      const se = sigma / Math.sqrt(n);
      let covered = 0;
      const pVals: number[] = [];
      const histBins: number[] = [];
      const BINS = 40;
      const loRange = trueMean - 4 * se;
      const hiRange = trueMean + 4 * se;
      const binWidth = (hiRange - loRange) / BINS;
      for (let i = 0; i < BINS; i++) histBins.push(0);
      let fpCount = 0;
      const means: number[] = [];
      const EXPERIMENTS = 10000;
      for (let e = 0; e < EXPERIMENTS; e++) {
        let sum = 0;
        for (let i = 0; i < n; i++) sum += randNormal(trueMean, sigma);
        const m = sum / n;
        const l = m - 1.96 * se;
        const u = m + 1.96 * se;
        if (l <= trueMean && trueMean <= u) covered++;
        // p-value under H0: mu = trueMean
        const z = (m - trueMean) / se;
        const p = 2 * (1 - normalCdf(Math.abs(z)));
        pVals.push(p);
        if (p < 0.05) fpCount++;
        // histogram
        const idx = Math.floor((m - loRange) / binWidth);
        if (idx >= 0 && idx < BINS) histBins[idx]++;
        if (e < 2000) means.push(m);
      }
      setCoverage(covered / EXPERIMENTS);
      setFalsePos(fpCount / EXPERIMENTS);
      setMeanHist(histBins);
      setRunning(false);
    }, 0);
  };

  const histLabels = useMemo(() => {
    if (meanHist.length === 0) return [];
    const se = sigma / Math.sqrt(n);
    const loRange = trueMean - 4 * se;
    const binWidth = (8 * se) / meanHist.length;
    return meanHist.map((_, i) => (loRange + (i + 0.5) * binWidth).toFixed(2));
  }, [meanHist, sigma, n, trueMean]);

  const histData = useMemo<ChartData<'bar'>>(() => {
  void mode;
  return {
    labels: histLabels,
    datasets: [{
      label: 'sample means',
      data: meanHist,
      backgroundColor: cssVar('--accent'),
      borderColor: cssVar('--accent'),
      borderWidth: 1,
    }],
  };
}, [histLabels, meanHist, mode]);

  const histOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: cssVar('--muted'), maxTicksLimit: 6 }, title: { display: true, text: 'sample mean', color: cssVar('--muted') } },
      y: { ticks: { color: cssVar('--muted') }, title: { display: true, text: 'experiments', color: cssVar('--muted') } },
    },
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', background: 'var(--bg)', color: 'var(--text)', minHeight: '100%', textAlign: 'left' }}>
      <div style={{ width: '100%', padding: '48px 40px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <header>
          <h1 className="title-serif" style={{ margin: 0, fontSize: '40px', fontWeight: 600, letterSpacing: '-0.5px' }}>Bayes &amp; Hypothesis Testing</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: '19px' }}>
            Live Bayesian updates (medical test example) and 10,000 simulated experiments showing what p-values and 95% confidence intervals really mean.
          </p>
        </header>

        {/* Bayes */}
        <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Bayes' theorem (medical test)</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { label: 'Prior prevalence P(D)', value: prior, set: setPrior, min: 0.0001, max: 0.5, step: 0.001 },
                { label: 'Sensitivity P(+|D)', value: sens, set: setSens, min: 0.5, max: 1, step: 0.01 },
                { label: 'False positive P(+|¬D)', value: fpr, set: setFpr, min: 0.001, max: 0.2, step: 0.001 },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '17px' }}>
                    <span>{s.label}</span>
                    <span className="num" style={{ color: 'var(--text)', fontWeight: 600 }}>{s.value.toFixed(3)}</span>
                  </label>
                  <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                    onChange={(e) => s.set(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)' }} />
                </div>
              ))}
              <div style={{ padding: '14px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                <div style={{ color: 'var(--muted)', fontSize: '17px', marginBottom: '6px' }}>Posterior P(D|+) =</div>
                <div className="num" style={{ fontSize: '40px', fontWeight: 700, color: 'var(--accent)' }}>{(posterior * 100).toFixed(2)}%</div>
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '17px', lineHeight: 1.5 }}>
                Even with a 99% sensitive test, a positive result is rarely a true disease when the disease is rare (base rate fallacy).
              </p>
            </div>
            <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)' }}>Counts in 100,000 people</h3>
              {[
                { label: 'True positives', value: tp, color: 'var(--accent)' },
                { label: 'False negatives', value: fn, color: 'var(--muted)' },
                { label: 'False positives', value: fp, color: 'var(--curve)' },
                { label: 'True negatives', value: tn, color: 'var(--muted)' },
              ].map((r) => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '130px', color: 'var(--muted)', fontSize: '17px' }}>{r.label}</span>
                  <div style={{ flex: 1, height: '8px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div style={{ width: `${Math.min(100, (r.value / N) * 100)}%`, height: '100%', background: r.color }} />
                  </div>
                  <span className="num" style={{ width: '72px', textAlign: 'right', fontSize: '17px', fontWeight: 600 }}>{r.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Hypothesis testing */}
        <section style={{ ...card, display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>What a p-value and 95% CI really mean</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', fontSize: '17px' }}>
            <label style={{ color: 'var(--muted)' }}>True mean μ</label>
            <input type="number" value={trueMean} onChange={(e) => setTrueMean(parseFloat(e.target.value) || 0)} style={{ width: '80px', padding: '6px 8px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: '17px' }} />
            <label style={{ color: 'var(--muted)' }}>σ</label>
            <input type="number" value={sigma} onChange={(e) => setSigma(Math.max(0.1, parseFloat(e.target.value) || 1))} style={{ width: '70px', padding: '6px 8px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: '17px' }} />
            <label style={{ color: 'var(--muted)' }}>Sample size n</label>
            <input type="range" min={5} max={200} value={n} onChange={(e) => setN(parseInt(e.target.value) || 5)} style={{ width: '160px', accentColor: 'var(--accent)' }} />
            <span className="num">{n}</span>
            <button onClick={runExperiments} disabled={running}
              style={{ padding: '8px 14px', background: running ? 'var(--bg)' : 'var(--accent)', color: running ? 'var(--text)' : 'var(--bg)', border: '1px solid var(--accent)', cursor: running ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '17px', boxShadow: 'none' }}>
              {running ? 'Running…' : 'Run 10,000 experiments'}
            </button>
          </div>

          {coverage !== null && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                <div style={{ ...card, padding: '16px', flex: '1 1 220px' }}>
                  <div style={{ color: 'var(--muted)', fontSize: '17px', marginBottom: '4px' }}>95% CI coverage</div>
                  <div className="num" style={{ fontSize: '40px', fontWeight: 700, color: 'var(--accent)' }}>{(coverage * 100).toFixed(2)}%</div>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: '16px', lineHeight: 1.5 }}>
                    About 95% of the 10,000 intervals contain the true mean μ — exactly what “95% confidence” promises.
                  </p>
                </div>
                <div style={{ ...card, padding: '16px', flex: '1 1 220px' }}>
                  <div style={{ color: 'var(--muted)', fontSize: '17px', marginBottom: '4px' }}>False positives (p &lt; 0.05 under H₀)</div>
                  <div className="num" style={{ fontSize: '40px', fontWeight: 700, color: 'var(--curve)' }}>{falsePos !== null ? (falsePos * 100).toFixed(2) : '—'}%</div>
                  <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: '16px', lineHeight: 1.5 }}>
                    When H₀ is true, ~5% of tests cross p &lt; 0.05 by chance — that is the false positive rate.
                  </p>
                </div>
              </div>
              {meanHist.length > 0 && (
                <div style={{ ...card, padding: '16px' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 600 }}>Distribution of 10,000 sample means</h3>
                  <div style={{ position: 'relative', height: '240px' }}>
                    <Bar data={histData} options={histOptions} />
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function normalCdf(x: number): number {
  // Abramowitz & Stegun approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax / 2);
  return 0.5 * (1 + sign * y);
}