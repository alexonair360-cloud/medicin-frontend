import React, { useEffect } from 'react';
import Style from './Modal.module.css';

const Modal = ({ title, open, onClose, footer, children, size = 'md', className = '' }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={Style.backdrop} onClick={onClose}>
      <div
        className={`${Style.modal} ${size === 'lg' ? Style.modalLg : size === 'xl' ? Style.modalXl : ''} ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {title && <div className={Style.header}>{title}</div>}
        <div className={Style.body}>{children}</div>
        {footer && <div className={Style.footer}>{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
