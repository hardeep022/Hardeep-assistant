import { useState } from 'react';
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

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

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

  const startRename = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    setEditingId(id);
    setEditTitle(title);
  };

  const saveRename = (id: string) => {
    if (editTitle.trim()) {
      dispatch({ type: 'SET_TITLE', conversationId: id, title: editTitle.trim() });
    }
    setEditingId(null);
  };

  const handleTogglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dispatch({ type: 'TOGGLE_PIN', conversationId: id });
  };

  const filteredConversations = conversations.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.messages.some(m => m.content.toLowerCase().includes(q))
    );
  });

  const pinnedConversations = filteredConversations.filter(c => c.pinned);
  const unpinnedConversations = filteredConversations.filter(c => !c.pinned);

  // Group conversations by relative date (pinned always at top)
  const groups: { label: string; items: typeof conversations }[] = [];
  if (pinnedConversations.length > 0) {
    groups.push({ label: '📌 Pinned', items: pinnedConversations });
  }

  const seen = new Set<string>();
  for (const conv of unpinnedConversations) {
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

        {/* Search Bar */}
        <div style={{ padding: '8px 0 0 0', position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search chats…"
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              padding: '6px 28px 6px 10px',
              fontSize: '12px',
              color: 'var(--text-primary)',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '14px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Quick Tools Nav */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', paddingTop: '8px' }}>
          <button
            onClick={() => dispatch({ type: 'SET_PRODUCTIVITY_OPEN', open: true })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '6px 8px',
              borderRadius: 'var(--r-xs)',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
            title="Tasks & Notes"
          >
            <span>⚡</span>
            <span>Tasks</span>
          </button>
          <button
            onClick={() => dispatch({ type: 'SET_SECURITY_TOOLS_OPEN', open: true })}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '6px 8px',
              borderRadius: 'var(--r-xs)',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
            title="Cybersecurity Toolkit"
          >
            <span>🛡️</span>
            <span>Security</span>
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <nav className="conv-list" aria-label="Conversations">
        {conversations.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '24px 16px' }}>
            No conversations yet.
            <br />Start a new chat above!
          </p>
        ) : filteredConversations.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '24px 16px' }}>
            No matches found.
          </p>
        ) : null}

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
                  {conv.pinned ? '📌' : conv.messages.length === 0 ? '💬' : '🗨️'}
                </span>
                <div className="conv-item-body">
                  {editingId === conv.id ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => saveRename(conv.id)}
                      onKeyDown={e => e.key === 'Enter' && saveRename(conv.id)}
                      style={{
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--accent)',
                        borderRadius: 'var(--r-xs)',
                        padding: '2px 4px',
                        fontSize: '12px',
                        width: '100%',
                      }}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <div className="conv-item-title">{conv.title}</div>
                  )}
                  <div className="conv-item-time">
                    {conv.messages.length} message{conv.messages.length !== 1 ? 's' : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button
                    className="conv-delete-btn"
                    onClick={e => handleTogglePin(e, conv.id)}
                    title={conv.pinned ? 'Unpin conversation' : 'Pin conversation'}
                    aria-label={conv.pinned ? 'Unpin conversation' : 'Pin conversation'}
                    style={{ opacity: conv.pinned ? 1 : 0.6 }}
                  >
                    {conv.pinned ? '📍' : '📌'}
                  </button>
                  <button
                    className="conv-delete-btn"
                    onClick={e => startRename(e, conv.id, conv.title)}
                    title="Rename chat"
                    aria-label="Rename chat"
                  >
                    ✏️
                  </button>
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
