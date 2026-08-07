import { useApp } from '../context/AppContext';

function formatRelativeDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function Sidebar() {
  const { state, dispatch } = useApp();
  const { conversations, activeConversationId } = state;

  const handleNewChat = () => {
    dispatch({ type: 'NEW_CHAT' });
  };

  const handleSelect = (id: string) => {
    dispatch({ type: 'SELECT_CHAT', id });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dispatch({ type: 'DELETE_CHAT', id });
  };

  // Group conversations by relative date
  const groups: { label: string; items: typeof conversations }[] = [];
  const seen = new Set<string>();
  for (const conv of conversations) {
    const label = formatRelativeDate(conv.updatedAt);
    if (!seen.has(label)) {
      seen.add(label);
      groups.push({ label, items: [] });
    }
    groups[groups.length - 1].items.push(conv);
  }

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="logo-row">
          <div className="logo-icon">✦</div>
          <span className="logo-text">Hardeep Assistant</span>
        </div>
        <button className="new-chat-btn" onClick={handleNewChat} id="new-chat-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversation List */}
      <nav className="conv-list" aria-label="Conversations">
        {conversations.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '24px 16px' }}>
            No conversations yet.
            <br />Start a new chat above!
          </p>
        )}

        {groups.map(group => (
          <div key={group.label}>
            <div className="conv-section-label">{group.label}</div>
            {group.items.map(conv => (
              <div
                key={conv.id}
                className={`conv-item${conv.id === activeConversationId ? ' active' : ''}`}
                onClick={() => handleSelect(conv.id)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleSelect(conv.id)}
              >
                <span className="conv-item-icon">
                  {conv.messages.length === 0 ? '💬' : '🗨️'}
                </span>
                <div className="conv-item-body">
                  <div className="conv-item-title">{conv.title}</div>
                  <div className="conv-item-time">
                    {conv.messages.length} message{conv.messages.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  className="conv-delete-btn"
                  onClick={e => handleDelete(e, conv.id)}
                  title="Delete conversation"
                  aria-label="Delete conversation"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="settings-btn"
          onClick={() => dispatch({ type: 'SET_SETTINGS_OPEN', open: true })}
          id="settings-btn"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </button>
      </div>
    </aside>
  );
}
