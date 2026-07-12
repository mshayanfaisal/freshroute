import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../../api/client';
import { onRealtime } from '../../store/socket';
import { useNotifications } from '../../store/notifications';
import { Badge, Section } from '../../components/ui';
import type { DeliveryRun } from '../../types';

// Fix Leaflet's default marker icons under a bundler.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface RouteSuggestion {
  orderedStops: { id: string; reason: string }[];
  usedFallback: boolean;
}

export default function Deliveries() {
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [constraints, setConstraints] = useState('');
  const [suggestion, setSuggestion] = useState<RouteSuggestion | null>(null);
  const [busy, setBusy] = useState(false);
  const push = useNotifications((s) => s.push);

  const load = () =>
    api.get<DeliveryRun[]>('/deliveries/runs/mine').then((r) => {
      setRuns(r.data);
      if (!activeId && r.data.length) setActiveId(r.data[0].id);
    });
  useEffect(() => {
    load();
    return onRealtime((e) => { if (e.startsWith('delivery')) load(); });
  }, []);

  const active = runs.find((r) => r.id === activeId);
  const stops = useMemo(() => (active?.stops ?? []).slice().sort((a, b) => a.sequence - b.sequence), [active]);
  const geoStops = stops.filter((s) => s.latitude != null && s.longitude != null);
  const center: [number, number] = geoStops.length
    ? [geoStops[0].latitude!, geoStops[0].longitude!]
    : [40.71, -74.0];

  const updateStop = async (stopId: string, status: 'delivered' | 'failed') => {
    const failureReason = status === 'failed' ? prompt('Reason for failed delivery?') || 'Unspecified' : undefined;
    await api.patch(`/deliveries/stops/${stopId}`, { status, failureReason });
    push(`Stop marked ${status}. Buyer notified.`, status === 'delivered' ? 'success' : 'warn');
    load();
  };

  const optimise = async () => {
    if (!active) return;
    setBusy(true);
    const r = await api.post<RouteSuggestion>('/ai/optimise-route', {
      stops: stops.map((s) => ({ id: s.id, address: s.address, lat: s.latitude, lng: s.longitude })),
      constraints: constraints || undefined,
    });
    setSuggestion(r.data);
    setBusy(false);
  };

  const applyRoute = async () => {
    if (!active || !suggestion) return;
    await api.patch(`/deliveries/runs/${active.id}/reorder`, { stopIds: suggestion.orderedStops.map((s) => s.id) });
    setSuggestion(null);
    push('Route reordered.', 'success');
    load();
  };

  return (
    <div className="grid" style={{ gap: '1.2rem' }}>
      <Section title="My Delivery Runs" actions={
        <select value={activeId} onChange={(e) => { setActiveId(e.target.value); setSuggestion(null); }} style={{ width: 220 }}>
          {runs.map((r) => <option key={r.id} value={r.id}>{r.scheduledDate} — {r.stops?.length ?? 0} stops</option>)}
        </select>
      }>
        {runs.length === 0 && <p className="muted">No runs assigned yet.</p>}
        {active && (
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>Status: <Badge kind={active.status.replace('-', '_')} /></span>
            <span className="muted">{stops.length} stops</span>
          </div>
        )}
      </Section>

      {active && (
        <div className="grid cols-2" style={{ gridTemplateColumns: '1.3fr 1fr', alignItems: 'start' }}>
          <div className="card">
            <h2>Route Map</h2>
            <div className="map-box">
              <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {geoStops.map((s, i) => (
                  <Marker key={s.id} position={[s.latitude!, s.longitude!]}>
                    <Popup>#{i + 1} {s.address}<br />{s.status}</Popup>
                  </Marker>
                ))}
                {geoStops.length > 1 && (
                  <Polyline positions={geoStops.map((s) => [s.latitude!, s.longitude!] as [number, number])} color="#46b96a" />
                )}
              </MapContainer>
            </div>
          </div>

          <div className="grid" style={{ gap: '1rem' }}>
            <Section title="🤖 AI Route Optimiser (Bonus)">
              <label>Time constraints (optional)</label>
              <input value={constraints} onChange={(e) => setConstraints(e.target.value)} placeholder="e.g. dairy stop before 10am" />
              <div className="row" style={{ marginTop: '0.5rem' }}>
                <button className="secondary" onClick={optimise} disabled={busy || stops.length < 2}>
                  {busy ? 'Optimising…' : 'Suggest shortest route'}
                </button>
              </div>
              {suggestion && (
                <div className="ai-panel card" style={{ marginTop: '0.7rem' }}>
                  {suggestion.usedFallback && <p className="fallback-note">Heuristic ordering (AI unavailable).</p>}
                  <ol style={{ paddingLeft: '1.2rem', margin: '0.3rem 0' }}>
                    {suggestion.orderedStops.map((os) => {
                      const st = stops.find((s) => s.id === os.id);
                      return <li key={os.id}>{st?.address} <span className="muted">— {os.reason}</span></li>;
                    })}
                  </ol>
                  <div className="row">
                    <button onClick={applyRoute}>Apply route</button>
                    <button className="ghost" onClick={() => setSuggestion(null)}>Ignore</button>
                  </div>
                </div>
              )}
            </Section>

            <Section title="Stops">
              <table>
                <tbody>
                  {stops.map((s, i) => (
                    <tr key={s.id}>
                      <td>#{i + 1}</td>
                      <td>{s.address}<br /><span className="muted" style={{ fontSize: '0.78rem' }}>{s.specialInstructions}</span></td>
                      <td><Badge kind={s.status} /></td>
                      <td>
                        {s.status === 'pending' && (
                          <div className="row" style={{ gap: '0.3rem' }}>
                            <button onClick={() => updateStop(s.id, 'delivered')}>✓</button>
                            <button className="danger" onClick={() => updateStop(s.id, 'failed')}>✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
