import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import App from '../App';
import { useLauncherStore } from '../store/launcher-store';

describe('App shell routes', () => {
  beforeEach(() => {
    useLauncherStore.setState({
      shellReady: true,
      bootstrapping: false,
      session: null,
      authError: '',
      registerMessage: '',
      initializeApp: async () => {},
    });
  });

  afterEach(() => {
    useLauncherStore.setState({
      shellReady: false,
      bootstrapping: false,
      session: null,
      authError: '',
      registerMessage: '',
    });
  });

  it('renders the login screen for guests', async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>,
      );
    });

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Create one here' })).toBeInTheDocument();
  });
});
