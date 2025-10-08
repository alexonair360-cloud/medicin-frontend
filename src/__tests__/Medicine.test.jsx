import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Medicine from '../pages/medicine/Medicine.jsx';

// Mock API client
jest.mock('../api/ApiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

import api from '../api/ApiClient';

const medicines = [
  { _id: '1', name: 'Para 500', genericName: 'Paracetamol', category: 'Pain', brand: 'ACME', defaultLowStockThreshold: 10 },
  { _id: '2', name: 'Amox 250', genericName: 'Amoxicillin', category: 'Antibiotic', brand: 'HealCo', defaultLowStockThreshold: 5 },
];

const stockSummary = [
  { _id: '1', totalQty: 20 }, // in stock
  { _id: '2', totalQty: 0 },  // out of stock
];

describe('Medicine page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes('/medicines')) return Promise.resolve({ data: medicines });
      if (url.includes('/inventory/stock-summary')) return Promise.resolve({ data: stockSummary });
      return Promise.resolve({ data: [] });
    });
  });

  test('renders table and filters by stock', async () => {
    render(<Medicine />);

    // Wait for rows to load
    await waitFor(() => expect(screen.getByText('Para 500')).toBeInTheDocument());
    expect(screen.getByText('Amox 250')).toBeInTheDocument();

    // Click In Stock
    fireEvent.click(screen.getByRole('button', { name: /in stock/i }));
    // Para 500 should remain, Amox 250 should be filtered out
    await waitFor(() => expect(screen.queryByText('Amox 250')).not.toBeInTheDocument());
    expect(screen.getByText('Para 500')).toBeInTheDocument();

    // Click Out of Stock
    fireEvent.click(screen.getByRole('button', { name: /out of stock/i }));
    await waitFor(() => expect(screen.queryByText('Para 500')).not.toBeInTheDocument());
    expect(screen.getByText('Amox 250')).toBeInTheDocument();

    // Click All
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    expect(screen.getByText('Para 500')).toBeInTheDocument();
    expect(screen.getByText('Amox 250')).toBeInTheDocument();
  });

  test('delete is blocked when stock > 0 and allowed when stock = 0', async () => {
    render(<Medicine />);
    await waitFor(() => expect(screen.getByText('Para 500')).toBeInTheDocument());

    // For in-stock item (Para 500), clicking Delete should not open modal
    const deleteInStock = screen.getAllByRole('button', { name: /delete/i })[0];
    fireEvent.click(deleteInStock);
    expect(screen.queryByText(/Delete Medicine/i)).not.toBeInTheDocument();

    // Switch to Out of Stock filter and click Delete on Amox 250
    fireEvent.click(screen.getByRole('button', { name: /out of stock/i }));
    await waitFor(() => expect(screen.getByText('Amox 250')).toBeInTheDocument());
    const deleteOutStock = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteOutStock);
    expect(screen.getByText(/Delete Medicine/i)).toBeInTheDocument();
  });
});
