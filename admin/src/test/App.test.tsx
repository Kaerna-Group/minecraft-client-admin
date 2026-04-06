import { render, screen } from '@testing-library/react';
import { HashRouter, MemoryRouter } from 'react-router-dom';

import { AdminRoutes } from '@app/routes/AdminRoutes';
import { AuthContext } from '@features/auth/model/context';
import { LoginPage } from '@pages/login/ui/LoginPage';
import { RegisterPage } from '@pages/register/ui/RegisterPage';

const authValue = {
  configured: true,
  loading: false,
  roleLoading: false,
  session: null,
  roles: [],
  hasAdminAccess: false,
  isAdmin: false,
  isModerator: false,
  canManageProfiles: false,
  canManageNews: false,
  canManageBans: false,
  canManageRoles: false,
  canManageReleases: false,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
};

describe('admin routing', () => {
  it('renders the login screen', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <HashRouter>
          <LoginPage />
        </HashRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('heading', { name: 'Admin login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create admin account' })).toBeInTheDocument();
  });

  it('renders the register screen', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <HashRouter>
          <RegisterPage />
        </HashRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('heading', { name: 'Admin registration' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to login' })).toBeInTheDocument();
  });

  it('redirects protected routes to login when signed out', () => {
    render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/profiles']}>
          <AdminRoutes />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('heading', { name: 'Admin login' })).toBeInTheDocument();
  });
});
