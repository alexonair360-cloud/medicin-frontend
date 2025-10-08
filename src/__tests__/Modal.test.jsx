import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../components/Modal.jsx';

describe('Modal', () => {
  test('does not render when open=false', () => {
    const { container } = render(<Modal title="X" open={false}>Body</Modal>);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders content when open=true and closes on backdrop click', () => {
    const onClose = jest.fn();
    render(
      <Modal title="My Modal" open={true} onClose={onClose} footer={<button>Ok</button>}>
        Body Text
      </Modal>
    );
    expect(screen.getByText('My Modal')).toBeInTheDocument();
    expect(screen.getByText('Body Text')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Body Text').closest('div').parentElement.parentElement); // click backdrop
    expect(onClose).toHaveBeenCalled();
  });
});
