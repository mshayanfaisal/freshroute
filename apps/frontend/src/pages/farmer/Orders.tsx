import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { onRealtime } from '../../store/socket';
import { Badge, Section, money, titleCase } from '../../components/ui';
import type { Order, OrderStatus } from '../../types';

const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'packed',
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const load = () => api.get<Order[]>('/orders/incoming').then((r) => setOrders(r.data));
  useEffect(() => {
    load();
    return onRealtime((e) => { if (e.startsWith('order')) load(); });
  }, []);

  const advance = async (o: Order) => {
    const next = NEXT[o.status];
    if (!next) return;
    await api.patch(`/orders/${o.id}/status`, { status: next });
    load();
  };

  return (
    <Section title="Incoming Orders">
      {orders.length === 0 ? <p className="muted">No orders yet.</p> : (
        <table>
          <thead><tr><th>Ref</th><th>Status</th><th>Items (yours)</th><th>Total</th><th>Placed</th><th></th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.reference}</td>
                <td><Badge kind={o.status} /></td>
                <td>{o.lines.map((l) => `${l.quantityOrdered}× ${l.productName}`).join(', ')}</td>
                <td>{money(o.totalAmount)}</td>
                <td className="muted">{new Date(o.createdAt).toLocaleDateString()}</td>
                <td>{NEXT[o.status] && <button onClick={() => advance(o)}>Mark {titleCase(NEXT[o.status]!)}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
