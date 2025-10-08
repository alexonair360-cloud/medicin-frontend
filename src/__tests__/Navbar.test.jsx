import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';

jest.mock('../assets/thangam_medicals.PNG', () => 'logo.png');

describe('Navbar', () => {
  test('renders brand and logout button, triggers onRequestLogout', () => {
    const onRequestLogout = jest.fn();
    render(
      <MemoryRouter>
        <Navbar onRequestLogout={onRequestLogout} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Thangam Medicals/i)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(btn);
    expect(onRequestLogout).toHaveBeenCalled();
  });
});
