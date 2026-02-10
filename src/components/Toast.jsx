import { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose, duration = 5000 }) {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const colors = {
    success: { bg: '#2a3d2e', border: '#4a5d4e', text: '#8aff9a' },
    error: { bg: '#3d2a2e', border: '#5d4a4e', text: '#ff8a9a' },
    warning: { bg: '#3d3a2a', border: '#5d5a4a', text: '#ffd98a' },
    info: { bg: '#2a3a3d', border: '#4a5a5d', text: '#8ad9ff' }
  };

  const color = colors[type] || colors.info;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        maxWidth: '90%',
        width: '500px',
        animation: 'slideDown 0.3s ease-out'
      }}
    >
      <div
        style={{
          backgroundColor: color.bg,
          color: color.text,
          border: `1px solid ${color.border}`,
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '15px'
        }}
      >
        <div style={{ flex: 1, fontSize: '15px', fontWeight: '500' }}>
          {message}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: color.text,
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
