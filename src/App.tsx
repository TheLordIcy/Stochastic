import { useEffect, useState, useCallback } from 'react';
import { ThemeContext } from './ThemeContext';
import type { ThemeMode } from './ThemeContext';
import Nav from './components/Nav';
import Home from './components/Home';
import CLTDemo from './components/CLTDemo';
import MonteCarloDemo from './components/MonteCarloDemo';
import MarkovChainsDemo from './components/MarkovChainsDemo';
import BayesHypothesisDemo from './components/BayesHypothesisDemo';

const weekLabels: Record<string, string> = {
  week1: 'Week 1: CLT & Law of Large Numbers',
  week2: 'Week 2: Monte Carlo',
  week3: 'Week 3: Markov Chains',
  week4: 'Week 4: Bayes & Hypothesis Testing (coming soon)',
  week5: 'Week 5: Polish & Ship (coming soon)',
};

export default function App() {
  const [activeLab, setActiveLab] = useState<string>(() => {
    try {
      return window.localStorage.getItem('stochastic:active-lab') || 'home';
    } catch {
      return 'home';
    }
  });

  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      return (window.localStorage.getItem('stochastic:theme') as ThemeMode) || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('stochastic:active-lab', activeLab);
    } catch {
      // ignore
    }
  }, [activeLab]);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    try {
      window.localStorage.setItem('stochastic:theme', mode);
    } catch {
      // ignore
    }
  }, [mode]);

  useEffect(() => {
    const titles: Record<string, string> = {
      home: 'Stochastic // Home',
      week1: 'Stochastic // Central Limit Theorem',
      week2: 'Stochastic // Monte Carlo',
      week3: 'Stochastic // Markov Chains',
      week4: 'Stochastic // Bayes & Hypothesis Testing',
    };
    document.title = titles[activeLab] || `Stochastic // ${activeLab}`;
  }, [activeLab]);

  const toggleTheme = useCallback(() => {
    setMode((m) => {
      const next = m === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { window.localStorage.setItem('stochastic:theme', next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, toggle: toggleTheme }}>
      <Nav activeLab={activeLab} onSelectLab={setActiveLab} />
      {activeLab === 'home' ? (
        <Home onOpenLab={setActiveLab} />
      ) : activeLab === 'week1' ? (
        <CLTDemo />
      ) : activeLab === 'week2' ? (
        <MonteCarloDemo />
      ) : activeLab === 'week3' ? (
        <MarkovChainsDemo />
      ) : activeLab === 'week4' ? (
        <BayesHypothesisDemo />
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
            fontSize: '22px',
            fontWeight: 500,
          }}
        >
          {weekLabels[activeLab]}
        </section>
      )}
    </ThemeContext.Provider>
  );
}