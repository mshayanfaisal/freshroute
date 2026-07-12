import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { onRealtime } from '../../store/socket';
import { Badge, Section } from '../../components/ui';
import type { Complaint } from '../../types';

export default function Complaints() {
  const [items, setItems] = useState<Complaint[]>([]);
  const load = () => api.get<Complaint[]>('/complaints/against-me').then((r) => setItems(r.data));
  useEffect(() => {
    load();
    return onRealtime((e) => { if (e.startsWith('complaint')) load(); });
  }, []);

  return (
    <Section title="Complaints About My Produce">
      {items.length === 0 ? <p className="muted">No complaints — great work! 🎉</p> : (
        <table>
          <thead><tr><th>Defect</th><th>Severity</th><th>Status</th><th>Description</th><th>AI Supplier Alert</th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td>{c.defectCategory ? <Badge kind="major">{c.defectCategory.replace('_', ' ')}</Badge> : <span className="muted">—</span>}</td>
                <td>{c.severity ? <Badge kind={c.severity} /> : '—'}</td>
                <td><Badge kind={c.status} /></td>
                <td className="muted">{c.description}</td>
                <td className="muted" style={{ maxWidth: 280 }}>
                  {c.supplierAlertDraft || <em>Manual (AI fallback)</em>}
                  {c.aiClassified && <div className="ai-badge" style={{ marginTop: 4 }}>AI classified</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
