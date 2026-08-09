import type { FileDiff } from '../types';


interface DiffViewerModalProps {
  isOpen: boolean;
  diff: FileDiff | null;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}

export function DiffViewerModal({
  isOpen,
  diff,
  onAccept,
  onReject,
  onClose,
}: DiffViewerModalProps) {
  if (!isOpen || !diff) return null;

  const addedCount = diff.diffHunks.filter(h => h.type === 'add').length;
  const deletedCount = diff.diffHunks.filter(h => h.type === 'delete').length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="diff-modal-card" onClick={e => e.stopPropagation()}>
        <div className="diff-modal-header">
          <div className="diff-title">
            <span className="icon">📝</span>
            <span className="filename">{diff.relativePath}</span>
            <span className="diff-stats">
              <span className="added">+{addedCount}</span>
              <span className="deleted">-{deletedCount}</span>
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="diff-modal-body">
          <div className="diff-code-container">
            {diff.diffHunks.map((line, idx) => (
              <div key={idx} className={`diff-line line-${line.type}`}>
                <span className="line-num old-num">{line.lineNoOld || ''}</span>
                <span className="line-num new-num">{line.lineNoNew || ''}</span>
                <span className="line-sign">
                  {line.type === 'add' ? '+' : line.type === 'delete' ? '-' : ' '}
                </span>
                <span className="line-text">{line.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="diff-modal-footer">
          <button className="reject-btn" onClick={onReject}>
            ✕ Revert Changes
          </button>
          <button className="accept-btn" onClick={onAccept}>
            ✓ Approve & Apply
          </button>
        </div>
      </div>
    </div>
  );
}
