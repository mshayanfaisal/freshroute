import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../../api/client';
import { onRealtime } from '../../store/socket';
import { useNotifications } from '../../store/notifications';
import { Badge, Section, Stat } from '../../components/ui';
import type { DeliveryRun, DeliveryStop } from '../../types';

// Configure default Leaflet marker icons.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// A violet "current vehicle" marker (SVG truck in a glass badge).
const truckIcon = L.divIcon({
  className: 'truck-marker',
  html:
    '<div class="truck-badge"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 17V5a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h1"/><path d="M14 8h4l3 3v6a1 1 0 0 1-1 1h-1"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg></div>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

interface RouteSuggestion {
  orderedStops: { id: string; reason: string }[];
  usedFallback: boolean;
}

/** Floating "recenter to route" control rendered inside the map. */
function RecenterControl({ center }: { center: [number, number] }) {
  const map = useMap();
  return (
    <button className="map-ctrl recenter" title="Recenter" onClick={() => map.setView(center, 12)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
    </button>
  );
}

const time = (d: string | null) =>
  d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

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
  const stops = useMemo(
    () => (active?.stops ?? []).slice().sort((a, b) => a.sequence - b.sequence),
    [active],
  );
  const geoStops = stops.filter((s) => s.latitude != null && s.longitude != null);
  const center: [number, number] = geoStops.length
    ? [geoStops[0].latitude!, geoStops[0].longitude!]
    : [40.71, -74.0];

  // Current vehicle position = last delivered stop, else first geo stop.
  const activeStop =
    [...geoStops].reverse().find((s) => s.status === 'delivered') ?? geoStops[0];

  // KPIs across all of this driver's runs.
  const allStops = runs.flatMap((r) => r.stops ?? []);
  const delivered = allStops.filter((s) => s.status === 'delivered').length;
  const pending = allStops.filter((s) => s.status === 'pending').length;
  const failed = allStops.filter((s) => s.status === 'failed').length;
  const successRate = delivered + failed ? Math.round((delivered / (delivered + failed)) * 100) : 100;

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

  const dotClass = (s: DeliveryStop) =>
    s.status === 'delivered' ? 'done' : s.status === 'failed' ? 'failed' : 'idle';

  return (
    <div className="grid" style={{ gap: '1.1rem' }}>
      {/* KPI row */}
      <div className="grid cols-4">
        <Stat label="Assigned stops" value={allStops.length} bars={[30, 50, 40, 70, 55, 80, 65]} />
        <Stat label="Delivered" value={delivered} bars={[20, 40, 55, 60, 75, 85, 95]} />
        <Stat label="Pending" value={pending} bars={[80, 70, 60, 55, 40, 35, 25]} />
        <Stat label="Success rate" value={`${successRate}%`} bars={[60, 70, 65, 80, 75, 90, 95]} />
      </div>

      <Section
        title="My Delivery Runs"
        actions={
          <select value={activeId} onChange={(e) => { setActiveId(e.target.value); setSuggestion(null); }} style={{ width: 230 }}>
            {runs.map((r) => <option key={r.id} value={r.id}>{r.scheduledDate} — {r.stops?.length ?? 0} stops</option>)}
            {runs.length === 0 && <option>No runs assigned</option>}
          </select>
        }
      >
        {active
          ? <div className="row" style={{ justifyContent: 'space-between' }}>
              <span>Status: <Badge kind={active.status.replace('-', '_')} /></span>
              <span className="muted">{stops.length} stops on this run</span>
            </div>
          : <p className="muted">No runs assigned yet.</p>}
      </Section>

      {active && (
        <>
          {/* Live tracking — map with floating shipment-status timeline */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="track-head">
              <h2 style={{ margin: 0 }}>Live Tracking</h2>
              <span className="muted">Run {active.scheduledDate}</span>
            </div>
            <div className="track-map">
              <MapContainer center={center} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {geoStops.length > 1 && (
                  <Polyline
                    positions={geoStops.map((s) => [s.latitude!, s.longitude!] as [number, number])}
                    pathOptions={{ color: '#6d5efc', weight: 4, opacity: 0.85, dashArray: '2 8', lineCap: 'round' }}
                  />
                )}
                {geoStops.map((s, i) => (
                  <Marker key={s.id} position={[s.latitude!, s.longitude!]}>
                    <Popup>#{i + 1} {s.address}<br />{s.status}</Popup>
                  </Marker>
                ))}
                {activeStop && <Marker position={[activeStop.latitude!, activeStop.longitude!]} icon={truckIcon} />}
                <RecenterControl center={center} />
              </MapContainer>

              {/* Overlay: shipment status timeline */}
              <div className="map-overlay card">
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                  <strong>Shipment status</strong>
                  <Badge kind={active.status.replace('-', '_')} />
                </div>
                <div className="timeline">
                  {stops.map((s, i) => (
                    <div className="timeline-item" key={s.id}>
                      <span className={`tl-dot ${dotClass(s)}`} />
                      <div className="tl-body">
                        <div className="tl-title">
                          {s.status === 'delivered' ? 'Delivered' : s.status === 'failed' ? 'Failed' : `Stop ${i + 1}`}
                        </div>
                        <div className="tl-sub">{s.address}</div>
                      </div>
                      <span className="tl-time">{time(s.completedAt as any)}</span>
                    </div>
                  ))}
                  {stops.length === 0 && <p className="muted">No stops on this run.</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="grid cols-2" style={{ gridTemplateColumns: '1fr 1.2fr', alignItems: 'start' }}>
            <Section title="AI Route Optimiser">
              <span className="ai-badge">Bonus · Feature 4</span>
              <label>Time constraints (optional)</label>
              <input value={constraints} onChange={(e) => setConstraints(e.target.value)} placeholder="e.g. dairy stop before 10am" />
              <div className="row" style={{ marginTop: '0.5rem' }}>
                <button className="purple" onClick={optimise} disabled={busy || stops.length < 2}>
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
                      <td style={{ width: 32 }}><span className={`tl-dot ${dotClass(s)}`} /></td>
                      <td>{i + 1}. {s.address}<br /><span className="muted" style={{ fontSize: '0.78rem' }}>{s.specialInstructions}</span></td>
                      <td><Badge kind={s.status} /></td>
                      <td>
                        {s.status === 'pending' && (
                          <div className="row" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
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
        </>
      )}
    </div>
  );
}
