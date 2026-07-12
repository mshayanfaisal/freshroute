import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useNotifications } from '../../store/notifications';
import { Badge, Section, money } from '../../components/ui';
import type { DeliveryRun, Order } from '../../types';

export default function Scheduling() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [assignable, setAssignable] = useState<Order[]>([]);
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [driverId, setDriverId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<string[]>([]);
  const push = useNotifications((s) => s.push);

  const load = () => {
    api.get('/users/drivers').then((r) => setDrivers(r.data));
    api.get<Order[]>('/orders/assignable').then((r) => setAssignable(r.data));
    api.get<DeliveryRun[]>('/deliveries/runs').then((r) => setRuns(r.data));
  };
  useEffect(() => { load(); }, []);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const createRun = async () => {
    if (!driverId || selected.length === 0) return;
    await api.post('/deliveries/runs', { driverId, scheduledDate: date, orderIds: selected });
    push('Delivery run created — driver notified.', 'success');
    setSelected([]);
    load();
  };

  const runSummary = async () => {
    await api.post('/scheduler/driver-summary/run');
    push('Daily driver summary dispatched.', 'info');
  };

  return (
    <div className="grid" style={{ gap: '1.2rem' }}>
      <Section title="Create Delivery Run" actions={<button className="ghost" onClick={runSummary}>Send 6AM summary now</button>}>
        <div className="grid cols-2">
          <div>
            <label>Driver</label>
            <select value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">Select driver…</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label>Scheduled date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <label>Assign confirmed/packed orders ({selected.length} selected)</label>
        {assignable.length === 0 ? <p className="muted">No orders awaiting assignment.</p> : (
          <table>
            <thead><tr><th></th><th>Ref</th><th>Status</th><th>Address</th><th>Total</th></tr></thead>
            <tbody>
              {assignable.map((o) => (
                <tr key={o.id}>
                  <td><input type="checkbox" style={{ width: 'auto' }} checked={selected.includes(o.id)} onChange={() => toggle(o.id)} /></td>
                  <td>{o.reference}</td>
                  <td><Badge kind={o.status} /></td>
                  <td className="muted">{o.deliveryAddress ?? '—'}</td>
                  <td>{money(o.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button style={{ marginTop: '0.8rem' }} disabled={!driverId || !selected.length} onClick={createRun}>Create run</button>
      </Section>

      <Section title="All Delivery Runs">
        {runs.length === 0 ? <p className="muted">No runs yet.</p> : (
          <table>
            <thead><tr><th>Date</th><th>Driver</th><th>Stops</th><th>Status</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{r.scheduledDate}</td>
                  <td>{(r as any).driver?.name ?? '—'}</td>
                  <td>{r.stops?.length ?? 0}</td>
                  <td><Badge kind={r.status.replace('-', '_')} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
