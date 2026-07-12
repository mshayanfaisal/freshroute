import { Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../store/auth';
import type { UserRole } from '../types';

/**
 * Guards a route: redirects unauthenticated users to /login, and users whose
 * role is not permitted to their own dashboard.
 */
export function ProtectedRoute({ roles, children }: { roles?: UserRole[]; children: ReactNode }) {
  const { user, accessToken } = useAuth();
  const location = useLocation();

  if (!user || !accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  return <>{children}</>;
}
