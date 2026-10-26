import { useState } from 'react';
import Nav from './components/Nav';
import CLTDemo from './components/CLTDemo';

const weekLabels: Record<string, string> = {
  week1: 'Week 1: CLT & Law of Large Numbers',
  week2: 'Week 2: Monte Carlo (coming soon)',
  week3: 'Week 3: Markov Chains (coming soon)',
  week4: 'Week 4: Bayes & Hypothesis Testing (coming soon)',
  week5: 'Week 5: Polish & Ship (coming soon)',
};

export default function App() {
  const [activeLab, setActiveLab] = useState<string>('week1');

  return (
    <>
      <Nav activeLab={activeLab} onSelectLab={setActiveLab} />
      {activeLab === 'week1' ? (
        <CLTDemo />
      ) : (
        <section
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '40vh',
            background: 'var(--bg)',
            padding: '40px',
            color: 'var(--text)',
            fontSize: '20px',
            fontWeight: 500,
          }}
        >
          {weekLabels[activeLab]}
        </section>
      )}
    </>
  );
}
