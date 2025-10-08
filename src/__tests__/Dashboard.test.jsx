import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from '../pages/dashboard/Dashboard.jsx';

describe('Dashboard', () => {
  test('renders heading and subtitle', () => {
    render(<Dashboard />);
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Welcome to the Medical Shop Management dashboard.')).toBeInTheDocument();
  });
});
