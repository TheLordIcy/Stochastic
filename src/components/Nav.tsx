import { useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useTheme } from '../ThemeContext';

interface NavProps {
  activeLab: string;
  onSelectLab: (key: string) => void;
}

const LAB_ITEMS = [
  { label: 'CLT', key: 'week1' },
  { label: 'Monte Carlo', key: 'week2' },
  { label: 'Markov', key: 'week3' },
  { label: 'Bayes', key: 'week4' },
];

export default function Nav({ activeLab, onSelectLab }: NavProps) {
  const { mode, toggle } = useTheme();
  const [labOpen, setLabOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setLabOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const linkStyle: CSSProperties = {
    color: 'var(--muted)',
    textDecoration: 'none',
    fontSize: '18px',
    fontWeight: 500,
  };

  const itemStyle = (active: boolean): CSSProperties => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    background: active ? 'var(--accent-bg)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--muted)',
    border: 'none',
    borderRadius: 0,
    fontSize: '18px',
    fontWeight: 500,
    cursor: 'pointer',
  });

  return (
    <header
      className="topbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 40px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
      }}
    >
      <div
        onClick={() => onSelectLab('home')}
        style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--accent)', cursor: 'pointer' }}
      >
        Stochastic
      </div>
      <nav style={{ display: 'flex', gap: '28px', alignItems: 'center', fontSize: '18px' }} aria-label="main">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onSelectLab('home'); }}
          style={{ ...linkStyle, color: activeLab === 'home' ? 'var(--text)' : 'var(--muted)' }}
        >
          Home
        </a>

          <button onClick={toggle} style={{ ...linkStyle, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            {mode === 'dark' ? 'Light' : 'Dark'}
          </button>
          <div ref={wrapRef} style={{ position: 'relative' }}>
            <button
            onClick={() => setLabOpen((o) => !o)}
            style={{
              ...linkStyle,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: LAB_ITEMS.some((i) => i.key === activeLab) ? 'var(--text)' : 'var(--muted)',
            }}
          >
            Lab ▾
          </button>
          {labOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                minWidth: '180px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '6px',
                zIndex: 10,
              }}
            >
              {LAB_ITEMS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => { onSelectLab(item.key); setLabOpen(false); }}
                  style={itemStyle(activeLab === item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <a href="https://github.com/TheLordIcy/Stochastic" target="_blank" rel="noreferrer" style={linkStyle}>Github</a>
        <a href="https://icyy.pages.dev/" style={linkStyle}>Contact</a>
      </nav>
    </header>
  );
}
