import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/I18nContext';
import { useToast } from './Toast';
import type { ActionLogItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ActionLogsModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [logs, setLogs] = useState<ActionLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterRisk, setFilterRisk] = useState<string>('all');

  useEffect(() => {
    if (isOpen && window.nova?.getActionLogs) {
      setLoading(true);
      window.nova.getActionLogs()
        .then(res => setLogs(res))
        .catch(() => setLogs([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = async () => {
    if (window.nova?.clearActionLogs) {
      await window.nova.clearActionLogs();
      setLogs([]);
      toast.info('Action logs cleared');
    }
  };

  const filtered = logs.filter(l => {
    if (filterRisk === 'all') return true;
    return l.risk === filterRisk || l.status === filterRisk;
  });

  const getRiskBadge = (risk: string) => {
    if (risk === 'safe') return <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', fontSize: '11px', fontWeight: 600 }}>🟢 SAFE</span>;
    if (risk === 'warning') return <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', fontSize: '11px', fontWeight: 600 }}>🟡 WARNING</span>;
    return <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '11px', fontWeight: 600 }}>🔴 BLOCKED</span>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'success') return <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 500 }}>✓ Executed</span>;
    if (status === 'blocked') return <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: 500 }}>✕ Blocked</span>;
    if (status === 'cancelled') return <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>⊘ Cancelled</span>;
    return <span style={{ color: '#f97316', fontSize: '12px', fontWeight: 500 }}>! Failed</span>;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🛡️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {t('actionLogs')}
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                Audit trail of system action requests & risk evaluations
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {logs.length > 0 && (
              <button
                onClick={handleClear}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--r-xs)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div
          style={{
            padding: '10px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: '8px',
            background: 'var(--bg-input)',
          }}
        >
          {['all', 'safe', 'warning', 'blocked'].map(f => (
            <button
              key={f}
              onClick={() => setFilterRisk(f)}
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--r-xs)',
                border: 'none',
                background: filterRisk === f ? 'var(--accent)' : 'transparent',
                color: filterRisk === f ? '#fff' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: '40px 0' }}>
              Loading action logs…
            </p>
          ) : filtered.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', margin: '40px 0' }}>
              No system action logs found.
            </p>
          ) : (
            filtered.map(log => (
              <div
                key={log.id}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {getRiskBadge(log.risk || 'safe')}
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {(log.type || log.actionType || 'action').replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {getStatusBadge(log.status)}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '6px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Target:</span>
                  <code style={{ color: 'var(--text-primary)', wordBreak: 'break-all' }}>{log.target}</code>
                </div>

                {log.error && (
                  <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px' }}>
                    ⚠️ {log.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
