import React from 'react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Navigation' | 'Chat' | 'System';
}

const SHORTCUTS: ShortcutItem[] = [
  { keys: ['Ctrl', 'N'], description: 'Start a new conversation', category: 'Navigation' },
  { keys: ['Ctrl', ','], description: 'Open Settings modal', category: 'Navigation' },
  { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts', category: 'Navigation' },
  { keys: ['Enter'], description: 'Send message', category: 'Chat' },
  { keys: ['Shift', 'Enter'], description: 'Add new line in input', category: 'Chat' },
  { keys: ['Esc'], description: 'Close modal or cancel editing', category: 'Chat' },
  { keys: ['Alt', 'Space'], description: 'Toggle Nova window visibility', category: 'System' },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const categories = ['Navigation', 'Chat', 'System'] as const;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Keyboard Shortcuts" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⌨️</span>
            <span className="modal-title">Keyboard Shortcuts</span>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close shortcuts modal">×</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {categories.map(category => {
            const items = SHORTCUTS.filter(s => s.category === category);
            if (items.length === 0) return null;

            return (
              <div key={category} className="shortcuts-category-section">
                <div className="shortcuts-category-title">{category}</div>
                <div className="shortcuts-list">
                  {items.map((shortcut, index) => (
                    <div key={index} className="shortcut-row">
                      <span className="shortcut-description">{shortcut.description}</span>
                      <div className="shortcut-keys">
                        {shortcut.keys.map((k, ki) => (
                          <React.Fragment key={ki}>
                            <kbd className="shortcut-key">{k}</kbd>
                            {ki < shortcut.keys.length - 1 && <span className="shortcut-key-plus">+</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
};
