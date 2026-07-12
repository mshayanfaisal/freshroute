import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { onRealtime } from '../../store/socket';
import { useNotifications } from '../../store/notifications';
import { Badge, Section } from '../../components/ui';
import type { Complaint } from '../../types';

export default function Complaints() {
  const [items, setItems] = useState<Complaint[]>([]);
  const push = useNotifications((s) => s.push);

  const load = () => api.get<Complaint[]>('/complaints').then((r) => setItems(r.data));
  useEffect(() => {
    load();
    return onRealtime((e) => {
      if (e === 'complaint.escalated') push('⚠ A critical complaint was escalated.', 'error');
      if (e.startsWith('complaint')) load();
    });
  }, []);

  const setStatus = async (c: Complaint, status: string, resolution?: string) => {
    await api.patch(`/complaints/${c.id}/status`, { status, resolution });
    load();
  };

  return (
    <Section title="Complaint Resolution">
      {items.length === 0 ? <p className="muted">No complaints.</p> : (
        <table>
          <thead><tr><th>Defect</th><th>Severity</th><th>Status</th><th>Description</th><th>AI Draft</th><th>Actions</th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.defectCategory?.replace('_', ' ') ?? '—'} {c.aiClassified && <span className="ai-badge">AI</span>}</td>
                <td>{c.severity ? <Badge kind={c.severity} /> : '—'}</td>
                <td><Badge kind={c.status} /></td>
                <td className="muted" style={{ maxWidth: 200 }}>{c.description}</td>
                <td className="muted" style={{ maxWidth: 220, fontSize: '0.8rem' }}>{c.supplierAlertDraft ?? '—'}</td>
                <td>
                  {c.status === 'submitted' && <button className="secondary" onClick={() => setStatus(c, 'under_review')}>Review</button>}
                  {c.status === 'under_review' && (
                    <div className="row" style={{ gap: '0.3rem' }}>
                      <button onClick={() => setStatus(c, 'resolved', 'credit')}>Credit</button>
                      <button className="secondary" onClick={() => setStatus(c, 'resolved', 'replace')}>Replace</button>
                      <button className="danger" onClick={() => setStatus(c, 'resolved', 'reject')}>Reject</button>
                    </div>
                  )}
                  {c.status === 'resolved' && <Badge kind="resolved">{c.resolution}</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
