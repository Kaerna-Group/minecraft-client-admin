import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import App from '../App';

describe('App shell routes', () => {
  it('renders the main screen shell', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Main control surface' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play (placeholder)' })).toBeInTheDocument();
  });
});
