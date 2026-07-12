import { ReactNode, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { connectSocket, disconnectSocket } from '../store/socket';
import { api } from '../api/client';
import { Toasts } from './Toasts';
import type { UserRole } from '../types';

const NAV: Record<UserRole, { to: string; label: string }[]> = {
  farmer: [
    { to: '/farmer', label: '🌱 My Listings' },
    { to: '/farmer/orders', label: '📦 Incoming Orders' },
    { to: '/farmer/forecast', label: '📈 Demand Forecast' },
    { to: '/farmer/complaints', label: '⚠ Complaints' },
  ],
  buyer: [
    { to: '/buyer', label: '🛒 Catalogue' },
    { to: '/buyer/orders', label: '📦 My Orders' },
    { to: '/buyer/complaints', label: '⚠ My Complaints' },
  ],
  driver: [{ to: '/driver', label: '🚚 My Deliveries' }],
  admin: [
    { to: '/admin', label: '📊 Analytics' },
    { to: '/admin/deliveries', label: '🚚 Scheduling' },
    { to: '/admin/complaints', label: '⚠ Complaints' },
    { to: '/admin/members', label: '👥 Members' },
  ],
};

export function Layout({ children }: { children: ReactNode }) {
  const { user, clear } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);

  if (!user) return null;

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    disconnectSocket();
    clear();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">🥬 Fresh<span>Route</span></div>
        {NAV[user.role].map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === `/${user.role}`}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            {n.label}
          </NavLink>
        ))}
        <div className="sidebar-foot">
          Farm-to-Table Supply Chain
          <br />© GreenValley Cooperative
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <h1>Welcome, {user.name}</h1>
            <span className="muted">{user.orgName || user.email}</span>
          </div>
          <div className="row">
            <span className="role-pill">{user.role}</span>
            <button className="ghost" onClick={logout}>Log out</button>
          </div>
        </div>
        {children}
      </main>
      <Toasts />
    </div>
  );
}
