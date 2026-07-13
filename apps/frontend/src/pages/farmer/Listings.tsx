import { Fragment, FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Badge, Section, money } from '../../components/ui';
import type { Produce, PricingResult } from '../../types';

const CATEGORIES = ['vegetable', 'fruit', 'dairy', 'eggs', 'herbs'];

export default function Listings() {
  const [items, setItems] = useState<Produce[]>([]);
  const [pricing, setPricing] = useState<Record<string, PricingResult & { loading?: boolean }>>({});
  const blank = { name: '', category: 'vegetable', unit: 'kg', pricePerUnit: '', quantityAvailable: '', harvestDate: '', variety: '' };
  const [form, setForm] = useState<any>(blank);

  const load = () => api.get<Produce[]>('/produce/mine').then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    await api.post('/produce', {
      ...form,
      pricePerUnit: Number(form.pricePerUnit),
      quantityAvailable: Number(form.quantityAvailable),
    });
    setForm(blank);
    load();
  };

  const toggleSoldOut = async (p: Produce) => {
    await api.patch(`/produce/${p.id}`, { isSoldOut: !p.isSoldOut });
    load();
  };
  const remove = async (id: string) => { await api.delete(`/produce/${id}`); load(); };

  const suggestPrice = async (id: string) => {
    setPricing((s) => ({ ...s, [id]: { ...(s[id] as any), loading: true } }));
    const r = await api.get<PricingResult>(`/ai/pricing/${id}`);
    setPricing((s) => ({ ...s, [id]: { ...r.data, loading: false } }));
  };
  const acceptPrice = async (p: Produce, price: number) => {
    await api.patch(`/produce/${p.id}`, { pricePerUnit: price });
    setPricing((s) => { const c = { ...s }; delete c[p.id]; return c; });
    load();
  };

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="grid" style={{ gap: '1.2rem' }}>
      <Section title="New Produce Listing">
        <form className="grid cols-3" onSubmit={create}>
          <div><label>Name</label><input value={form.name} onChange={(e) => set('name', e.target.value)} required /></div>
          <div><label>Variety</label><input value={form.variety} onChange={(e) => set('variety', e.target.value)} /></div>
          <div><label>Category</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label>Unit</label><input value={form.unit} onChange={(e) => set('unit', e.target.value)} required /></div>
          <div><label>Price / unit</label><input type="number" step="0.01" value={form.pricePerUnit} onChange={(e) => set('pricePerUnit', e.target.value)} required /></div>
          <div><label>Quantity</label><input type="number" step="0.01" value={form.quantityAvailable} onChange={(e) => set('quantityAvailable', e.target.value)} required /></div>
          <div><label>Harvest date</label><input type="date" value={form.harvestDate} onChange={(e) => set('harvestDate', e.target.value)} required /></div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}><button type="submit">Add listing</button></div>
        </form>
      </Section>

      <Section title="My Listings">
        {items.length === 0 ? <p className="muted">No listings yet.</p> : (
          <table>
            <thead><tr><th>Produce</th><th>Category</th><th>Price</th><th>Qty</th><th>Age</th><th>Spoilage</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {items.map((p) => (
                <Fragment key={p.id}>
                  <tr>
                    <td>{p.name}{p.variety ? ` · ${p.variety}` : ''}</td>
                    <td>{p.category}</td>
                    <td>{money(p.pricePerUnit)}/{p.unit}</td>
                    <td>{p.quantityAvailable}</td>
                    <td>{p.daysSinceHarvest}d</td>
                    <td><Badge kind={p.spoilageRisk} /></td>
                    <td>{p.isSoldOut ? <Badge kind="cancelled">Sold out</Badge> : <Badge kind="delivered">In stock</Badge>}</td>
                    <td className="row" style={{ gap: '0.35rem' }}>
                      <button className="purple" onClick={() => suggestPrice(p.id)} disabled={pricing[p.id]?.loading}>
                        {pricing[p.id]?.loading ? '…' : '💡 Price'}
                      </button>
                      <button className="ghost" onClick={() => toggleSoldOut(p)}>{p.isSoldOut ? 'Restock' : 'Sold out'}</button>
                      <button className="danger" onClick={() => remove(p.id)}>✕</button>
                    </td>
                  </tr>
                  {pricing[p.id] && !pricing[p.id].loading && (
                    <tr key={p.id + '-ai'}>
                      <td colSpan={8}>
                        <div className="ai-panel card" style={{ margin: '0.4rem 0' }}>
                          <span className="ai-badge">AI Dynamic Pricing</span>
                          {pricing[p.id].suggestedPrice != null ? (
                            <>
                              <p style={{ margin: '0.5rem 0' }}>
                                Suggested: <strong>{money(pricing[p.id].suggestedPrice)}</strong>{' '}
                                ({pricing[p.id].changePercent! >= 0 ? '+' : ''}{pricing[p.id].changePercent}%) — {pricing[p.id].rationale}
                              </p>
                              <button onClick={() => acceptPrice(p, pricing[p.id].suggestedPrice!)}>Accept price</button>
                            </>
                          ) : (
                            <p className="fallback-note">
                              {pricing[p.id].rationale}{' '}
                              {pricing[p.id].historicalRange &&
                                `Range: ${money(pricing[p.id].historicalRange!.min)}–${money(pricing[p.id].historicalRange!.max)} (avg ${money(pricing[p.id].historicalRange!.avg)}).`}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
