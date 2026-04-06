import { HashRouter } from 'react-router-dom';

import { AuthProvider } from '@app/providers/AuthProvider';
import { AdminRoutes } from '@app/routes/AdminRoutes';
import { ToastProvider } from '@shared/lib/react/toast/ToastProvider';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <HashRouter>
          <AdminRoutes />
        </HashRouter>
      </AuthProvider>
    </ToastProvider>
  );
}
