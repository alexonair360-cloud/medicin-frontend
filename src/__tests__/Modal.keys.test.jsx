import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Modal from '../components/Modal.jsx';

describe('Modal keyboard', () => {
  test('Escape key triggers onClose when open', () => {
    const onClose = jest.fn();
    render(
      <Modal title="Title" open={true} onClose={onClose}>Body</Modal>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
