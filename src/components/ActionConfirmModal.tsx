import { useTranslation } from '../i18n/I18nContext';
import type { ActionRequest } from '../types';

interface Props {
  action: ActionRequest | null;
  reason?: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ActionConfirmModal({ action, reason, isOpen, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();

  if (!isOpen || !action) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          width: '100%',
          maxWidth: '480px',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(234, 179, 8, 0.1)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#eab308',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              fontWeight: 700,
            }}
          >
            ⚠️
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {t('systemActionWarning')}
            </h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              Nova Security & Confirmation Framework
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            The assistant is requesting permission to perform the following system action on your computer:
          </p>

          <div
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Action Type:</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{action.type.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Target:</span>
              <code style={{ color: 'var(--text-primary)', wordBreak: 'break-all', fontSize: '12px' }}>{action.target}</code>
            </div>
            {reason && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Details:</span>
                <span style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>{reason}</span>
              </div>
            )}
          </div>

          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
            Only proceed if you initiated this request. Actions are audited in your system security log.
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--r-sm)',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--r-sm)',
              border: 'none',
              background: '#eab308',
              color: '#000',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(234, 179, 8, 0.3)',
            }}
          >
            {t('proceed')}
          </button>
        </div>
      </div>
    </div>
  );
}
