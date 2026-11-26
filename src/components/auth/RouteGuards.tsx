import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  buildPostLoginRedirectPath,
  evaluateProtectedRoute,
  evaluatePublicOnlyRoute,
} from '../../utils/authRouteGuard';
import { BrandLogo } from '../common/BrandLogo';

export const SessionVerificationLoader: React.FC = () => (
  <div
    className="min-h-screen flex items-center justify-center bg-[#F7F9FB] dark:bg-[#070B13] text-slate-600 dark:text-slate-300"
    role="status"
    aria-live="polite"
  >
    <div className="flex flex-col items-center gap-3 text-xs font-mono">
      <BrandLogo size="md" decorative className="animate-pulse" />
      <div className="flex items-center gap-2">
        <span>Verifying AquaWatt session...</span>
      </div>
    </div>
  </div>
);

export const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { authLoading, isAuthenticated } = useApp();
  const location = useLocation();

  const decision = evaluateProtectedRoute({ authLoading, isAuthenticated });

  if (decision === 'loading') {
    return <SessionVerificationLoader />;
  }

  if (decision === 'redirect_login') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export const PublicOnlyRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { authLoading, isAuthenticated } = useApp();
  const location = useLocation();

  const decision = evaluatePublicOnlyRoute({ authLoading, isAuthenticated });

  if (decision === 'loading') {
    return <SessionVerificationLoader />;
  }

  if (decision === 'redirect_app') {
    const target = buildPostLoginRedirectPath(location.state);
    return <Navigate to={target} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
