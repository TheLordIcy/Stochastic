import { type CSSProperties } from 'react';
import cltImg from '../assets/screenshots/CLT.png';
import monteImg from '../assets/screenshots/Monte carlo.png';
import markovImg from '../assets/screenshots/Markovchains.png';
import bayesImg from '../assets/screenshots/Bayes.png';

const card: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: '14px',
  padding: '24px',
};

const labs = [
  { key: 'week1', title: 'Central Limit Theorem', desc: 'Watch sample means converge to a normal curve as n grows; running means for the law of large numbers.', ready: true },
  { key: 'week2', title: 'Monte Carlo', desc: 'Estimate π with random points, the birthday paradox, and Monty Hall, each with simulated vs exact answers.', ready: true },
  { key: 'week3', title: 'Markov Chains', desc: 'Editable transition matrices, stationary distributions, and a mini PageRank.', ready: true },
  { key: 'week4', title: 'Bayes & Hypothesis Testing', desc: 'Live Bayesian updates and what p-values and 95% confidence intervals really mean, via 10,000 simulated experiments.', ready: true },
];

export default function Home({ onOpenLab }: { onOpenLab: (key: string) => void }) {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', background: 'var(--bg)', color: 'var(--text)', minHeight: '100%', textAlign: 'left' }}>
      <div style={{ width: '100%', padding: '64px 40px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
        <header style={{ maxWidth: '720px' }}>
          <h1 className="title-serif" style={{ margin: 0, fontSize: '54px', fontWeight: 600, letterSpacing: '-1px' }}>
            Stochastic
          </h1>
          <p style={{ margin: '12px 0 0', color: 'var(--muted)', fontSize: '20px', lineHeight: 1.5 }}>
            An interactive probability simulator. Explore randomness, sampling, and inference
            through hands-on visual experiments.
          </p>
        </header>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {labs.map((lab) => (
            <div key={lab.key} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="title-serif" style={{ margin: 0, fontSize: '28px', fontWeight: 600 }}>{lab.title}</h2>
                <span style={{ fontSize: '16px', fontWeight: 600, color: lab.ready ? 'var(--accent)' : 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {lab.ready ? 'Ready' : 'Soon'}
                </span>
              </div>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '18px', lineHeight: 1.5, flex: 1 }}>
                {lab.desc}
              </p>
              {lab.key === 'week1' && (
                <img src={cltImg} alt="CLT demo screenshot" style={{ width: '100%', height: '160px', objectFit: 'cover', border: '1px solid var(--border)', display: 'block' }} />
              )}
              {lab.key === 'week2' && (
                <img src={monteImg} alt="Monte Carlo demo screenshot" style={{ width: '100%', height: '160px', objectFit: 'cover', border: '1px solid var(--border)', display: 'block' }} />
              )}
              {lab.key === 'week3' && (
                <img src={markovImg} alt="Markov Chains demo screenshot" style={{ width: '100%', height: '160px', objectFit: 'cover', border: '1px solid var(--border)', display: 'block' }} />
              )}
              {lab.key === 'week4' && (
                <img src={bayesImg} alt="Bayes & Hypothesis Testing demo screenshot" style={{ width: '100%', height: '160px', objectFit: 'cover', border: '1px solid var(--border)', display: 'block' }} />
              )}
              <button
                onClick={() => lab.ready && onOpenLab(lab.key)}
                disabled={!lab.ready}
                style={{
                  padding: '10px 16px', background: lab.ready ? 'var(--accent)' : 'var(--bg)', color: lab.ready ? 'var(--bg)' : 'var(--muted)',
                  border: '1px solid var(--border)', borderRadius: '8px', cursor: lab.ready ? 'pointer' : 'not-allowed',
                  fontWeight: 600, fontSize: '18px', boxShadow: 'none', alignSelf: 'flex-start',
                }}
              >
                {lab.ready ? 'Open lab' : 'Coming soon'}
              </button>
            </div>
          ))}
        </section>

        <h2 className="title-serif" style={{ margin: '12px 0 0', fontSize: '28px', fontWeight: 600 }}>What each lab does</h2>
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          {[
            { t: 'Central Limit Theorem', d: 'Pick a distribution, sample size n and trials. See the histogram of sample means match the theoretical normal curve, plus a running-mean view of the law of large numbers.' },
            { t: 'Monte Carlo', d: 'Estimate π by scattering random points in a square, explore the birthday paradox and Monty Hall, and watch the error fall like 1/√n.' },
            { t: 'Markov Chains', d: 'Edit a transition matrix, simulate walks, compute the stationary distribution, and run a mini PageRank.' },
            { t: 'Bayes & Hypothesis Testing', d: 'Update a posterior live from priors and likelihoods, and simulate 10,000 experiments to see what p-values and 95% confidence intervals really mean.' },
          ].map((x) => (
            <div key={x.t} style={{ ...card, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 className="title-serif" style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>{x.t}</h3>
              <p style={{ margin: 0, color: 'var(--muted)', fontSize: '18px', lineHeight: 1.6 }}>{x.d}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}