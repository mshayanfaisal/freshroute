import { ReactNode } from 'react';

export const money = (n: number | null | undefined) =>
  n == null ? '—' : `$${Number(n).toFixed(2)}`;

export const titleCase = (s: string) =>
  s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function Badge({ kind, children }: { kind: string; children?: ReactNode }) {
  return <span className={`badge ${kind}`}>{children ?? titleCase(kind)}</span>;
}

export function Stat({ label, value, bars }: { label: string; value: ReactNode; bars?: number[] }) {
  // Decorative mini bar-chart (Ware-Sync style). Deterministic default pattern.
  const pattern = bars ?? [40, 65, 45, 80, 55, 95, 70];
  const max = Math.max(...pattern, 1);
  return (
    <div className="card stat">
      <span className="label">{label}</span>
      <span className="value">{value}</span>
      <div className="spark" aria-hidden>
        {pattern.map((h, i) => (
          <i key={i} style={{ height: `${Math.max(12, (h / max) * 100)}%` }} />
        ))}
      </div>
    </div>
  );
}

export function Section({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="card">
      <div className="topbar" style={{ marginBottom: '0.8rem' }}>
        <h2>{title}</h2>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="muted">{text}</p>;
}
