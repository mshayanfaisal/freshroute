import { useNotifications } from '../store/notifications';

export function Toasts() {
  const { notices, dismiss } = useNotifications();
  return (
    <div className="toasts">
      {notices.map((n) => (
        <div key={n.id} className={`toast ${n.tone}`} onClick={() => dismiss(n.id)}>
          {n.text}
        </div>
      ))}
    </div>
  );
}
