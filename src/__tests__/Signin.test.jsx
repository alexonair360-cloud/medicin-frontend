import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Signin from '../authentication/Signin.jsx';

jest.mock('../assets/thangam_medicals.PNG', () => 'logo.png');

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock ApiClient fully to avoid evaluating import.meta in source
const mockPost = jest.fn();
const mockSetAuthToken = jest.fn((t) => localStorage.setItem('auth_token', t));
jest.mock('../api/ApiClient', () => ({
  __esModule: true,
  default: { post: mockPost },
  setAuthToken: mockSetAuthToken,
}));
import api from '../api/ApiClient';

describe('Signin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('renders form and submits successfully', async () => {
    api.post.mockResolvedValueOnce({ data: { token: 'tok' } });

    render(
      <MemoryRouter>
        <Signin />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('shows error on failed login', async () => {
    api.post.mockRejectedValueOnce({ response: { data: { message: 'Invalid' } } });

    render(
      <MemoryRouter>
        <Signin />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'user' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    await waitFor(() => expect(screen.getByText(/invalid/i)).toBeInTheDocument());
  });
});
