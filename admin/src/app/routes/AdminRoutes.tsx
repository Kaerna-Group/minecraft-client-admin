import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { useAuth } from '@features/auth/model/useAuth';
import { AccessDeniedPage } from '@pages/access-denied/ui/AccessDeniedPage';
import { BansPage } from '@pages/bans/ui/BansPage';
import { LoginPage } from '@pages/login/ui/LoginPage';
import { NewsPage } from '@pages/news/ui/NewsPage';
import { ProfilesPage } from '@pages/profiles/ui/ProfilesPage';
import { RegisterPage } from '@pages/register/ui/RegisterPage';
import { ReleasesPage } from '@pages/releases/ui/ReleasesPage';
import { RolesPage } from '@pages/roles/ui/RolesPage';
import { ProtectedLayout } from '@widgets/admin-layout/ProtectedLayout';

function RequireAuth() {
  const { hasAdminAccess, loading, roleLoading, session } = useAuth();

  if (loading || roleLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-300">Restoring admin session...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAdminAccess) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}

export function AdminRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/access-denied" element={<AccessDeniedPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<ProtectedLayout />}>
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/bans" element={<BansPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/releases" element={<ReleasesPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
