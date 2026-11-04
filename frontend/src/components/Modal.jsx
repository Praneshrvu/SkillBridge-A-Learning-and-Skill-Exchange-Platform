import React from 'react';

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3 style={{ color: '#0f172a' }}>{title}</h3>
          <button className="close-modal-btn" onClick={onClose}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}
