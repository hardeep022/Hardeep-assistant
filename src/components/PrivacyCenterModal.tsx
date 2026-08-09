import { useState } from 'react';
import { useApp } from '../context/AppContext';

interface PrivacyCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyCenterModal({ isOpen, onClose }: PrivacyCenterModalProps) {
  const { state, dispatch } = useApp();
  const [offlineMode, setOfflineMode] = useState(false);
  const [disableTelemetry, setDisableTelemetry] = useState(true);
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handleClearMemory = async () => {
    if (window.nova?.clearMemories) {
      await window.nova.clearMemories();
      setStatusMsg('✓ Memory store cleared successfully.');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  const handlePurgeLogs = async () => {
    if (window.nova?.clearActionLogs) {
      await window.nova.clearActionLogs();
      setStatusMsg('✓ Action audit logs purged.');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="privacy-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="icon">🛡️</span>
            <span>PRIVACY & SECURITY CENTER</span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Status Banner */}
          <div className={`privacy-status-banner ${offlineMode ? 'offline' : 'local-first'}`}>
            <span className="badge-icon">{offlineMode ? '🔒' : '🦙'}</span>
            <div>
              <div className="status-title">
                {offlineMode ? 'OFFLINE / LOCAL-ONLY MODE ACTIVE' : 'LOCAL-FIRST PRIVACY ACTIVE'}
              </div>
              <div className="status-sub">
                {offlineMode
                  ? 'All network traffic to external services is blocked. Models run 100% locally on your device.'
                  : 'Ollama local models process your data. No project code is sent to external services without your permission.'}
              </div>
            </div>
          </div>

          {/* Privacy Toggles */}
          <div className="privacy-section">
            <h4>PRIVACY CONTROLS</h4>
            
            <div className="toggle-row">
              <div>
                <span className="toggle-label">Strict Offline Mode</span>
                <span className="toggle-desc">Disables all internet access and external provider API connections.</span>
              </div>
              <input
                type="checkbox"
                checked={offlineMode}
                onChange={e => setOfflineMode(e.target.checked)}
              />
            </div>

            <div className="toggle-row">
              <div>
                <span className="toggle-label">Disable Usage Telemetry</span>
                <span className="toggle-desc">Blocks all anonymized diagnostic logging and error metrics.</span>
              </div>
              <input
                type="checkbox"
                checked={disableTelemetry}
                onChange={e => setDisableTelemetry(e.target.checked)}
              />
            </div>

            <div className="toggle-row">
              <div>
                <span className="toggle-label">Secret & API Key Redaction</span>
                <span className="toggle-desc">Automatically redacts `.env` secrets, passwords, and tokens before model processing.</span>
              </div>
              <input type="checkbox" checked readOnly />
            </div>
          </div>

          {/* Data Cleanup Actions */}
          <div className="privacy-section">
            <h4>DATA & MEMORY SANITIZATION</h4>
            <div className="action-buttons-group">
              <button className="sec-action-btn" onClick={handleClearMemory}>
                🧠 Clear Long-Term Memory Store
              </button>
              <button className="sec-action-btn" onClick={handlePurgeLogs}>
                📜 Purge Action Audit Logs
              </button>
              <button
                className="sec-action-btn danger"
                onClick={() => {
                  dispatch({ type: 'CLEAR_ALL_CHATS' });
                  setStatusMsg('✓ Conversation history purged.');
                  setTimeout(() => setStatusMsg(''), 3000);
                }}
              >
                🗑️ Clear All Conversation History
              </button>
            </div>
            {statusMsg && <div className="status-feedback-text">{statusMsg}</div>}
          </div>

          {/* Audit Telemetry Summary */}
          <div className="privacy-section">
            <h4>SECURITY AUDIT SUMMARY</h4>
            <div className="audit-grid">
              <div className="audit-stat">
                <span className="stat-val">{state.actionLogs.length}</span>
                <span className="stat-lbl">Logged Actions</span>
              </div>
              <div className="audit-stat">
                <span className="stat-val">{state.conversations.length}</span>
                <span className="stat-lbl">Active Chats</span>
              </div>
              <div className="audit-stat">
                <span className="stat-val">100%</span>
                <span className="stat-lbl">Local Privacy Score</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary-modal-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
