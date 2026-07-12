import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../api/client';
import { Badge, Section } from '../../components/ui';
import type { ForecastResult } from '../../types';

const CONF_COLOR: Record<string, string> = { low: '#e0a13c', medium: '#7fc7e0', high: '#46b96a' };

export default function Forecast() {
  const [data, setData] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get<ForecastResult>('/ai/forecast').then((r) => { setData(r.data); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  return (
    <Section title="AI Demand Forecast — Next Week" actions={<button className="secondary" onClick={load}>Refresh</button>}>
      <p className="muted">
        Predicted order volume per produce category, so you can plan harvests. <span className="ai-badge">AI Feature 1</span>
      </p>
      {loading && <p className="muted">Analysing 8 weeks of order history…</p>}
      {data && (
        <>
          {data.usedFallback && (
            <p className="fallback-note">⚠ AI unavailable — showing a rolling 4-week average as a static fallback forecast.</p>
          )}
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.forecasts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c4a34" />
                <XAxis dataKey="category" stroke="#9db3a2" />
                <YAxis stroke="#9db3a2" />
                <Tooltip contentStyle={{ background: '#16241a', border: '1px solid #2c4a34' }} />
                <Bar dataKey="predictedVolume" radius={[6, 6, 0, 0]}>
                  {data.forecasts.map((f, i) => <Cell key={i} fill={CONF_COLOR[f.confidence] ?? '#46b96a'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table style={{ marginTop: '1rem' }}>
            <thead><tr><th>Category</th><th>Predicted volume</th><th>Confidence</th><th>Rationale</th></tr></thead>
            <tbody>
              {data.forecasts.map((f) => (
                <tr key={f.category}>
                  <td style={{ textTransform: 'capitalize' }}>{f.category}</td>
                  <td>{f.predictedVolume}</td>
                  <td><Badge kind={f.confidence} /></td>
                  <td className="muted">{f.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Section>
  );
}
