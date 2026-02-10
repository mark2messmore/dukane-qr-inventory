export default function ConfirmDialog({ message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#2d2d2d',
          border: '1px solid #404040',
          borderRadius: '12px',
          padding: '30px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          animation: 'scaleIn 0.2s ease-out'
        }}
      >
        <div style={{ marginBottom: '24px', fontSize: '18px', lineHeight: '1.5', color: '#e0e0e0', whiteSpace: 'pre-line' }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          {cancelText && (
            <button
              onClick={onCancel}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                backgroundColor: '#2d2d2d',
                color: '#e0e0e0',
                border: '1px solid #404040',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#2d2d2d',
              color: '#e0e0e0',
              border: '1px solid #404040',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
