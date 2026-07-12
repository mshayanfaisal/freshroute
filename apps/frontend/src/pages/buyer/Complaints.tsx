import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useNotifications } from '../../store/notifications';
import { onRealtime } from '../../store/socket';
import { Badge, Section } from '../../components/ui';
import type { Complaint, Order } from '../../types';

const CATEGORIES = ['packaging', 'contamination', 'freshness', 'wrong_item', 'quantity'];

interface Classification {
  defectCategory: string | null;
  severity: string | null;
  supplierAlert: string | null;
  usedFallback: boolean;
}

export default function Complaints() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [lineId, setLineId] = useState('');
  const [description, setDescription] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [ai, setAi] = useState<Classification | null>(null);
  const [busy, setBusy] = useState(false);
  const push = useNotifications((s) => s.push);

  const load = () => {
    api.get<Order[]>('/orders/mine').then((r) => setOrders(r.data.filter((o) => ['delivered', 'disputed'].includes(o.status))));
    api.get<Complaint[]>('/complaints/mine').then((r) => setComplaints(r.data));
  };
  useEffect(() => {
    load();
    return onRealtime((e) => { if (e.startsWith('complaint')) load(); });
  }, []);

  const lines = orders.flatMap((o) => o.lines.map((l) => ({ ...l, ref: o.reference })));
  const selected = lines.find((l) => l.id === lineId);

  const classify = async () => {
    if (!selected || description.length < 5) return;
    setBusy(true);
    const r = await api.post<Classification>('/ai/classify-complaint', {
      complaintText: description,
      produceType: selected.productName,
      daysSinceDelivery: 1,
    });
    setAi(r.data);
    setBusy(false);
  };

  const submit = async () => {
    if (!lineId || description.length < 5) return;
    await api.post('/complaints', {
      orderLineId: lineId,
      description,
      manualCategory: manualCategory || undefined,
    });
    push('Complaint submitted. The farmer has been notified.', 'success');
    setLineId(''); setDescription(''); setManualCategory(''); setAi(null);
    load();
  };

  return (
    <div className="grid" style={{ gap: '1.2rem' }}>
      <Section title="Raise a Quality Complaint">
        <label>Order line</label>
        <select value={lineId} onChange={(e) => { setLineId(e.target.value); setAi(null); }}>
          <option value="">Select a delivered item…</option>
          {lines.map((l) => (
            <option key={l.id} value={l.id}>{l.ref} — {l.quantityOrdered}× {l.productName}</option>
          ))}
        </select>
        <label>What went wrong?</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Half the tomatoes were bruised and mouldy on arrival." />

        <div className="row" style={{ marginTop: '0.6rem' }}>
          <button className="secondary" disabled={!selected || description.length < 5 || busy} onClick={classify}>
            {busy ? 'Analysing…' : '🤖 Classify with AI'}
          </button>
        </div>

        {ai && (
          <div className="ai-panel card" style={{ marginTop: '0.8rem' }}>
            <span className="ai-badge">AI Complaint Classifier · Feature 3</span>
            {ai.usedFallback ? (
              <>
                <p className="fallback-note">AI unavailable — please pick a defect category manually.</p>
                <label>Defect category</label>
                <select value={manualCategory} onChange={(e) => setManualCategory(e.target.value)}>
                  <option value="">Select…</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                </select>
              </>
            ) : (
              <>
                <p style={{ margin: '0.5rem 0' }}>
                  Defect: <Badge kind="major">{ai.defectCategory?.replace('_', ' ')}</Badge>{' '}
                  Severity: <Badge kind={ai.severity ?? 'minor'} />
                </p>
                <p className="muted"><strong>Drafted supplier alert:</strong> {ai.supplierAlert}</p>
              </>
            )}
          </div>
        )}

        <button style={{ marginTop: '0.8rem' }} disabled={!lineId || description.length < 5} onClick={submit}>
          Submit complaint
        </button>
      </Section>

      <Section title="My Complaints">
        {complaints.length === 0 ? <p className="muted">No complaints filed.</p> : (
          <table>
            <thead><tr><th>Defect</th><th>Severity</th><th>Status</th><th>Resolution</th><th>Description</th></tr></thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.id}>
                  <td>{c.defectCategory ? c.defectCategory.replace('_', ' ') : '—'}</td>
                  <td>{c.severity ? <Badge kind={c.severity} /> : '—'}</td>
                  <td><Badge kind={c.status} /></td>
                  <td>{c.resolution ? <Badge kind="resolved">{c.resolution}</Badge> : '—'}</td>
                  <td className="muted">{c.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
