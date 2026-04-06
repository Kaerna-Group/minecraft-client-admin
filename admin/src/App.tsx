import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './auth/AuthProvider';
import { useAuth } from './auth/useAuth';
import { LoginPage } from './pages/LoginPage';
import { ProtectedLayout } from './pages/ProtectedLayout';
import { ProfilesPage } from './pages/ProfilesPage';
import { RolesPage } from './pages/RolesPage';
import { BansPage } from './pages/BansPage';
import { NewsPage } from './pages/NewsPage';
import { ReleasesPage } from './pages/ReleasesPage';

function RequireAuth() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-300">
        Restoring admin session...
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export function AdminRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/profiles" replace />} />
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

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AdminRoutes />
      </HashRouter>
    </AuthProvider>
  );
}

