import { render, screen } from '@testing-library/react';
import { HashRouter, MemoryRouter } from 'react-router-dom';

import { AuthContext } from '../auth/context';
import { AdminRoutes } from '../App';
import { LoginPage } from '../pages/LoginPage';

describe('admin routing', () => {
  it('renders the login screen', () => {
    render(
      <AuthContext.Provider
        value={{
          configured: true,
          loading: false,
          session: null,
          signIn: async () => ({}),
          signOut: async () => {},
        }}
      >
        <HashRouter>
          <LoginPage />
        </HashRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('heading', { name: 'Admin login' })).toBeInTheDocument();
  });

  it('redirects protected routes to login when signed out', () => {
    render(
      <AuthContext.Provider
        value={{
          configured: true,
          loading: false,
          session: null,
          signIn: async () => ({}),
          signOut: async () => {},
        }}
      >
        <MemoryRouter initialEntries={['/profiles']}>
          <AdminRoutes />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('heading', { name: 'Admin login' })).toBeInTheDocument();
  });
});

