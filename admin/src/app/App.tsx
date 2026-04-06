import { HashRouter } from 'react-router-dom';

import { AuthProvider } from '@app/providers/AuthProvider';
import { AdminRoutes } from '@app/routes/AdminRoutes';

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AdminRoutes />
      </HashRouter>
    </AuthProvider>
  );
}
