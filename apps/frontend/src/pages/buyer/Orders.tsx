import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { onRealtime } from '../../store/socket';
import { Badge, Section, money } from '../../components/ui';
import type { Order } from '../../types';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const load = () => api.get<Order[]>('/orders/mine').then((r) => setOrders(r.data));
  useEffect(() => {
    load();
    return onRealtime((e) => { if (e.startsWith('order') || e.startsWith('delivery')) load(); });
  }, []);

  const cancel = async (o: Order) => { await api.patch(`/orders/${o.id}/status`, { status: 'cancelled' }); load(); };

  return (
    <Section title="My Orders">
      {orders.length === 0 ? <p className="muted">No orders yet — visit the catalogue.</p> : (
        <table>
          <thead><tr><th>Ref</th><th>Status</th><th>Items</th><th>Fulfilment</th><th>Total</th><th></th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.reference}</td>
                <td><Badge kind={o.status} /></td>
                <td>{o.lines.map((l) => `${l.quantityOrdered}× ${l.productName}`).join(', ')}</td>
                <td className="muted">
                  {o.lines.reduce((s, l) => s + Number(l.quantityDelivered), 0)} / {o.lines.reduce((s, l) => s + Number(l.quantityOrdered), 0)} delivered
                </td>
                <td>{money(o.totalAmount)}</td>
                <td>{o.status === 'pending' && <button className="ghost" onClick={() => cancel(o)}>Cancel</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
