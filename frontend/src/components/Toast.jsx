import React, { useState, useEffect, useCallback } from 'react';

let _showToast = null;

export function useToast() {
  return _showToast;
}

export function ToastContainer() {
  const [toast, setToast] = useState(null);
  const [visible, setVisible] = useState(false);

  const show = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setVisible(true);
    setTimeout(() => {
      setVisible(false);
    }, 3200);
  }, []);

  useEffect(() => {
    _showToast = show;
    return () => { _showToast = null; };
  }, [show]);

  if (!toast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: '#fff',
        fontWeight: 600,
        fontSize: '0.9rem',
        zIndex: 9999,
        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
        transition: 'opacity 0.3s ease',
        opacity: visible ? 1 : 0,
        background: toast.type === 'error' ? '#ef4444' : '#10b981',
        pointerEvents: 'none',
      }}
    >
      {toast.message}
    </div>
  );
}

export function showToast(message, type = 'success') {
  if (_showToast) _showToast(message, type);
}
