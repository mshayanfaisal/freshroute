import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useNotifications } from '../../store/notifications';
import { Badge, Section, money } from '../../components/ui';
import type { Produce } from '../../types';

interface CartItem { produce: Produce; quantity: number; }

export default function Catalogue() {
  const [items, setItems] = useState<Produce[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const push = useNotifications((s) => s.push);

  const load = () => api.get<Produce[]>('/produce/catalogue').then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const addToCart = (p: Produce) => {
    setCart((c) => {
      const found = c.find((i) => i.produce.id === p.id);
      if (found) return c.map((i) => i.produce.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...c, { produce: p, quantity: 1 }];
    });
  };
  const setQty = (id: string, q: number) =>
    setCart((c) => c.map((i) => i.produce.id === id ? { ...i, quantity: Math.max(1, q) } : i));
  const removeFromCart = (id: string) => setCart((c) => c.filter((i) => i.produce.id !== id));

  const total = cart.reduce((s, i) => s + i.produce.pricePerUnit * i.quantity, 0);

  const placeOrder = async () => {
    if (!cart.length) return;
    await api.post('/orders', {
      lines: cart.map((i) => ({ produceId: i.produce.id, quantity: i.quantity })),
      deliveryAddress: address || undefined,
      specialInstructions: instructions || undefined,
    });
    push('Order placed! Farmers notified in real time.', 'success');
    setCart([]); setAddress(''); setInstructions('');
    load();
  };

  return (
    <div className="grid cols-3" style={{ gridTemplateColumns: '2fr 1fr', alignItems: 'start' }}>
      <Section title="Produce Catalogue">
        <p className="muted">High-spoilage-risk items are highlighted — grab them before they’re gone.</p>
        <div className="grid cols-3">
          {items.map((p) => (
            <div key={p.id} className="card" style={p.spoilageRisk === 'high' ? { borderColor: '#e5544b' } : {}}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3>{p.name}</h3>
                <Badge kind={p.spoilageRisk} />
              </div>
              <p className="muted" style={{ margin: '0.2rem 0' }}>
                {p.variety ? `${p.variety} · ` : ''}{p.farmer?.orgName || p.farmer?.name}
              </p>
              <p style={{ margin: '0.3rem 0' }}><strong>{money(p.pricePerUnit)}</strong> / {p.unit}</p>
              <p className="muted" style={{ fontSize: '0.8rem' }}>
                {p.quantityAvailable} {p.unit} · harvested {p.daysSinceHarvest}d ago
              </p>
              <button style={{ width: '100%', marginTop: '0.4rem' }} onClick={() => addToCart(p)}>Add to order</button>
            </div>
          ))}
        </div>
      </Section>

      <Section title={`Your Order (${cart.length})`}>
        {cart.length === 0 ? <p className="muted">Add produce to start an order.</p> : (
          <>
            <table>
              <tbody>
                {cart.map((i) => (
                  <tr key={i.produce.id}>
                    <td>{i.produce.name}</td>
                    <td style={{ width: 70 }}>
                      <input type="number" min={1} value={i.quantity} onChange={(e) => setQty(i.produce.id, Number(e.target.value))} />
                    </td>
                    <td>{money(i.produce.pricePerUnit * i.quantity)}</td>
                    <td><button className="ghost" onClick={() => removeFromCart(i.produce.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <label>Delivery address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Uses your profile address if blank" />
            <label>Special instructions</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} />
            <h3 style={{ marginTop: '0.8rem' }}>Total: {money(total)}</h3>
            <button style={{ width: '100%' }} onClick={placeOrder}>Place order</button>
          </>
        )}
      </Section>
    </div>
  );
}
