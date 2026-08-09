import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: Array<{ id: string; type: 'Chat' | 'Memory'; title: string; snippet: string; convId?: string }> = [];

    // Search conversations
    state.conversations.forEach(c => {
      if (c.title?.toLowerCase().includes(q)) {
        results.push({
          id: c.id,
          type: 'Chat',
          title: c.title,
          snippet: `Conversation with ${c.messages.length} messages`,
          convId: c.id,
        });
      }
      c.messages.forEach(m => {
        if (m.content?.toLowerCase().includes(q)) {
          results.push({
            id: m.id,
            type: 'Chat',
            title: c.title || 'Conversation',
            snippet: m.content.slice(0, 100),
            convId: c.id,
          });
        }
      });
    });

    return results.slice(0, 15);
  }, [query, state.conversations]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="search-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="icon">🔍</span>
            <span>UNIFIED GLOBAL SEARCH</span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <input
            type="text"
            className="text-input search-query-input"
            placeholder="Search across conversations, memories, projects & documents (Ctrl + K)…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />

          <div className="search-results-container">
            {searchResults.length > 0 ? (
              searchResults.map(res => (
                <div
                  key={res.id}
                  className="search-result-item"
                  onClick={() => {
                    if (res.convId) {
                      dispatch({ type: 'SELECT_CHAT', id: res.convId });
                    }
                    onClose();
                  }}
                >
                  <div className="result-header">
                    <span className="result-type-badge">{res.type}</span>
                    <span className="result-title">{res.title}</span>
                  </div>
                  <div className="result-snippet">"{res.snippet}"</div>
                </div>
              ))
            ) : query.trim() ? (
              <div className="no-results-text">No matching records found for "{query}".</div>
            ) : (
              <div className="search-hint-box">
                Type keywords above to search past messages, files, and project memories.
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="primary-modal-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
