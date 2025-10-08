import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';

// Mock assets used by Navbar/Signin
jest.mock('../assets/thangam_medicals.PNG', () => 'logo.png');

describe('App integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('Navbar hidden on sign-in route (/)', () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );
    // Logout button should not be present on sign-in
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
    // Signin content should be visible
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
  });

  test('Navbar visible on protected route when token exists', async () => {
    localStorage.setItem('auth_token', 'tok');
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );
    // Logout button should be visible
    expect(await screen.findByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  test('Logout flow clears token and returns to sign-in', async () => {
    localStorage.setItem('auth_token', 'tok');
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <App />
      </MemoryRouter>
    );

    const logoutBtn = await screen.findByRole('button', { name: /logout/i });
    fireEvent.click(logoutBtn);

    // Modal opens
    expect(screen.getByText(/Are you sure you want to logout/i)).toBeInTheDocument();

    // Confirm logout: there are two Logout buttons (navbar and modal). Click the one inside the modal footer.
    const modal = await screen.findByRole('dialog', { name: /logout/i });
    const buttons = modal.querySelectorAll('button');
    const confirmBtn = Array.from(buttons).find(b => /logout/i.test(b.textContent || ''));
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(localStorage.getItem('auth_token')).toBeNull());
    // Back to sign-in page
    expect(await screen.findByText(/Welcome Back/i)).toBeInTheDocument();
    // Navbar is hidden now
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
  });
});
