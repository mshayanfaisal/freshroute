import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../../api/client';
import { Section, Stat, money } from '../../components/ui';

const COLORS = ['#ff6a3d', '#6d5efc', '#f5451f', '#8b7dff', '#16b364', '#e8912b'];

export default function Analytics() {
  const [summary, setSummary] = useState<any>(null);
  const [waste, setWaste] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);

  useEffect(() => {
    api.get('/analytics/summary').then((r) => setSummary(r.data));
    api.get('/analytics/waste/category').then((r) => setWaste(r.data));
    api.get('/analytics/top-buyers').then((r) => setBuyers(r.data));
    api.get('/analytics/driver-success').then((r) => setDrivers(r.data));
    api.get('/analytics/forecast-accuracy').then((r) => setForecast(r.data));
    api.get('/analytics/pricing-acceptance').then((r) => setPricing(r.data));
  }, []);

  return (
    <div className="grid" style={{ gap: '1.2rem' }}>
      <div className="grid cols-4">
        <Stat label="Total Orders" value={summary?.totalOrders ?? '—'} />
        <Stat label="Delivered" value={summary?.deliveredOrders ?? '—'} />
        <Stat label="Revenue" value={money(summary?.revenue)} />
        <Stat label="Disputed" value={summary?.disputedOrders ?? '—'} />
      </div>

      <div className="grid cols-2">
        {/* Chart 1: Bar — waste rate by category */}
        <Section title="Waste Rate by Category (%)">
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={waste}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(32,36,46,0.08)" />
                <XAxis dataKey="category" stroke="#7c8698" />
                <YAxis stroke="#7c8698" />
                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(32,36,46,0.1)', borderRadius: 12, color: '#20242e' }} />
                <Bar dataKey="wasteRatePct" fill="#ff6a3d" radius={[8, 8, 0, 0]} name="Waste %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Chart 2: Pie — top buyers by revenue */}
        <Section title="Top Buyers by Revenue">
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={buyers} dataKey="revenue" nameKey="buyer" outerRadius={100} label>
                  {buyers.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(32,36,46,0.1)', borderRadius: 12, color: '#20242e' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Chart 3: Horizontal Bar — driver success rates */}
        <Section title="Driver Delivery Success Rate (%)">
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={drivers} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(32,36,46,0.08)" />
                <XAxis type="number" domain={[0, 100]} stroke="#7c8698" />
                <YAxis type="category" dataKey="driver" width={90} stroke="#7c8698" />
                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(32,36,46,0.1)', borderRadius: 12, color: '#20242e' }} />
                <Bar dataKey="successRatePct" fill="#16b364" radius={[0, 8, 8, 0]} name="Success %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {/* Chart 4: Line — top buyers by order volume */}
        <Section title="Buyer Order Volume">
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={buyers}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(32,36,46,0.08)" />
                <XAxis dataKey="buyer" stroke="#7c8698" />
                <YAxis stroke="#7c8698" />
                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(32,36,46,0.1)', borderRadius: 12, color: '#20242e' }} />
                <Line type="monotone" dataKey="orders" stroke="#6d5efc" strokeWidth={3} dot={{ r: 4, fill: "#6d5efc" }} name="Orders" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>
      </div>

      <div className="grid cols-2">
        {/* Chart 5 (bonus): RadialBar — AI accuracy gauges */}
        <Section title="AI Performance">
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <RadialBarChart
                innerRadius="40%"
                outerRadius="100%"
                data={[
                  { name: 'Forecast accuracy', value: forecast?.accuracyPct ?? 0, fill: '#ff6a3d' },
                  { name: 'Pricing acceptance', value: pricing?.acceptanceRatePct ?? 0, fill: '#6d5efc' },
                ]}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar background dataKey="value" />
                <Legend iconSize={10} />
                <Tooltip contentStyle={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(32,36,46,0.1)', borderRadius: 12, color: '#20242e' }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <p className="muted" style={{ fontSize: '0.82rem' }}>
            Forecast accuracy compares AI predictions to actual orders ({forecast?.samples ?? 0} samples).
            Pricing acceptance = accepted AI suggestions / total ({pricing?.total ?? 0}).
          </p>
        </Section>

        <Section title="Top Buyers (detail)">
          <table>
            <thead><tr><th>Buyer</th><th>Orders</th><th>Revenue</th></tr></thead>
            <tbody>
              {buyers.map((b) => (
                <tr key={b.buyer}><td>{b.buyer}</td><td>{b.orders}</td><td>{money(b.revenue)}</td></tr>
              ))}
              {buyers.length === 0 && <tr><td colSpan={3} className="muted">No delivered orders yet.</td></tr>}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  );
}
