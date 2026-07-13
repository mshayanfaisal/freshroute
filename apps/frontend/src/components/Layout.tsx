import { ComponentType, ReactNode, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { connectSocket, disconnectSocket } from '../store/socket';
import { api } from '../api/client';
import { Toasts } from './Toasts';
import type { UserRole } from '../types';
import {
  IconAlert,
  IconBox,
  IconCalendar,
  IconCart,
  IconChart,
  IconChevronLeft,
  IconClipboard,
  IconLeaf,
  IconLogout,
  IconMenu,
  IconTrendingUp,
  IconTruck,
  IconUsers,
} from './icons';

type NavItem = { to: string; label: string; icon: ComponentType<{ size?: number }> };

const NAV: Record<UserRole, NavItem[]> = {
  farmer: [
    { to: '/farmer', label: 'My Listings', icon: IconBox },
    { to: '/farmer/orders', label: 'Incoming Orders', icon: IconClipboard },
    { to: '/farmer/forecast', label: 'Demand Forecast', icon: IconTrendingUp },
    { to: '/farmer/complaints', label: 'Complaints', icon: IconAlert },
  ],
  buyer: [
    { to: '/buyer', label: 'Catalogue', icon: IconCart },
    { to: '/buyer/orders', label: 'My Orders', icon: IconClipboard },
    { to: '/buyer/complaints', label: 'My Complaints', icon: IconAlert },
  ],
  driver: [{ to: '/driver', label: 'My Deliveries', icon: IconTruck }],
  admin: [
    { to: '/admin', label: 'Analytics', icon: IconChart },
    { to: '/admin/deliveries', label: 'Scheduling', icon: IconCalendar },
    { to: '/admin/complaints', label: 'Complaints', icon: IconAlert },
    { to: '/admin/members', label: 'Members', icon: IconUsers },
  ],
};

export function Layout({ children }: { children: ReactNode }) {
  const { user, clear } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('freshroute-sidebar') === 'collapsed',
  );

  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);

  useEffect(() => {
    localStorage.setItem('freshroute-sidebar', collapsed ? 'collapsed' : 'open');
  }, [collapsed]);

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
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-head">
          <div className="brand">
            <IconLeaf size={26} />
            {!collapsed && <span>FreshRoute</span>}
          </div>
          <button
            className="collapse-btn"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            {collapsed ? <IconMenu size={18} /> : <IconChevronLeft size={18} />}
          </button>
        </div>

        <nav className="nav">
          {NAV[user.role].map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === `/${user.role}`}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                title={collapsed ? n.label : undefined}
              >
                <Icon size={20} />
                {!collapsed && <span className="nav-text">{n.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <button className="nav-link logout" onClick={logout} title="Log out">
            <IconLogout size={20} />
            {!collapsed && <span className="nav-text">Log out</span>}
          </button>
          {!collapsed && (
            <p className="coop-note">Farm-to-Table Supply Chain<br />© GreenValley Cooperative</p>
          )}
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
          </div>
        </div>
        {children}
      </main>
      <Toasts />
    </div>
  );
}
