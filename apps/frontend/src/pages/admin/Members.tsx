import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Badge, Section } from '../../components/ui';

export default function Members() {
  const [members, setMembers] = useState<any[]>([]);
  useEffect(() => { api.get('/users').then((r) => setMembers(r.data)); }, []);

  const byRole = (role: string) => members.filter((m) => m.role === role).length;

  return (
    <div className="grid" style={{ gap: '1.2rem' }}>
      <div className="grid cols-4">
        {['farmer', 'buyer', 'driver', 'admin'].map((r) => (
          <div key={r} className="card stat">
            <span className="value">{byRole(r)}</span>
            <span className="label" style={{ textTransform: 'capitalize' }}>{r}s</span>
          </div>
        ))}
      </div>
      <Section title="Cooperative Members">
        <table>
          <thead><tr><th>Name</th><th>Organisation</th><th>Email</th><th>Role</th><th>Active</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td className="muted">{m.orgName ?? '—'}</td>
                <td className="muted">{m.email}</td>
                <td><Badge kind={m.role === 'admin' ? 'confirmed' : 'delivered'}>{m.role}</Badge></td>
                <td>{m.isActive ? '✓' : '✕'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}
