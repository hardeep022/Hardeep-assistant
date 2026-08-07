import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useChat } from '../hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { InputBar } from './InputBar';
import { MODELS } from '../types';

const SUGGESTIONS = [
  { icon: '⚡', text: 'Explain quantum computing in simple terms' },
  { icon: '🐍', text: 'Write a Python function to sort a linked list' },
  { icon: '✍️', text: 'Help me write a professional email' },
  { icon: '🔍', text: 'What are the pros and cons of React vs Vue?' },
];

export function ChatView() {
  const { activeConversation, state, dispatch } = useApp();
  const { sendMessage, regenerate, editAndResend, deleteMessage, isStreaming, streamingContent, stopStreaming } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('');

  const messages = activeConversation?.messages ?? [];
  const modelId = activeConversation?.model || state.settings.defaultModel;
  const model = MODELS.find(m => m.id === modelId);

  const handleStartEditTitle = () => {
    if (activeConversation) {
      setHeaderTitle(activeConversation.title);
      setIsEditingTitle(true);
    }
  };

  const saveHeaderTitle = () => {
    if (activeConversation && headerTitle.trim()) {
      dispatch({ type: 'SET_TITLE', conversationId: activeConversation.id, title: headerTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  const createConversationAndSend = (content: string) => {
    const conversationId = crypto.randomUUID();
    dispatch({ type: 'NEW_CHAT', id: conversationId });
    sendMessage(content, conversationId);
  };

  const handleSuggestion = (text: string) => {
    if (!activeConversation) {
      createConversationAndSend(text);
    } else {
      sendMessage(text);
    }
  };

  const exportAsMarkdown = () => {
    if (!activeConversation) return;
    let md = `# ${activeConversation.title}\n\n`;
    md += `*Exported from Hardeep Assistant on ${new Date().toLocaleString()}*\n\n---\n\n`;
    for (const m of activeConversation.messages) {
      const roleName = m.role === 'user' ? 'User' : 'Assistant';
      md += `### ${roleName}\n${m.content}\n\n`;
    }
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConversation.title.replace(/[^a-z0-9_-]/gi, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsJSON = () => {
    if (!activeConversation) return;
    const json = JSON.stringify(activeConversation, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConversation.title.replace(/[^a-z0-9_-]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasMessages = messages.length > 0;

  return (
    <main className="chat-view">
      {/* Header */}
      {activeConversation && (
        <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isEditingTitle ? (
              <input
                type="text"
                value={headerTitle}
                onChange={e => setHeaderTitle(e.target.value)}
                onBlur={saveHeaderTitle}
                onKeyDown={e => e.key === 'Enter' && saveHeaderTitle()}
                style={{
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--r-xs)',
                  padding: '4px 8px',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
                autoFocus
              />
            ) : (
              <span
                className="chat-title"
                onClick={handleStartEditTitle}
                style={{ cursor: 'pointer' }}
                title="Click to edit title"
              >
                {activeConversation.title} ✏️
              </span>
            )}
            {model && (
              <span className="chat-model-badge">
                {model.name}
              </span>
            )}
          </div>

          {/* Export Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={exportAsMarkdown}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                padding: '4px 8px',
                borderRadius: 'var(--r-xs)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
              title="Export as Markdown"
            >
              📥 .MD
            </button>
            <button
              onClick={exportAsJSON}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                padding: '4px 8px',
                borderRadius: 'var(--r-xs)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
              title="Export as JSON"
            >
              📥 .JSON
            </button>
          </div>
        </div>
      )}

      {/* Messages / Empty State */}
      {!activeConversation || !hasMessages ? (
        <div className="empty-state">
          <div className="empty-logo">✦</div>
          <div>
            <p className="empty-heading">How can I help you today?</p>
            <p className="empty-sub">
              Ask me anything — code, writing, analysis, and more.
            </p>
          </div>
          <div className="suggestions-grid">
            {SUGGESTIONS.map(s => (
              <button
                key={s.text}
                className="suggestion-card"
                onClick={() => handleSuggestion(s.text)}
              >
                <span className="suggestion-icon">{s.icon}</span>
                <span className="suggestion-text">{s.text}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="messages-area" ref={messagesRef}>
          <div className="messages-inner">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onRegenerate={regenerate}
                onEdit={editAndResend}
                onDelete={deleteMessage}
              />
            ))}

            {/* Streaming message */}
            {isStreaming && (
              <MessageBubble
                message={{
                  id: '__streaming__',
                  role: 'assistant',
                  content: streamingContent,
                  timestamp: 0,
                }}
                isStreaming
                streamingContent={streamingContent}
              />
            )}

            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Input Bar */}
      {activeConversation && (
        <InputBar
          onSend={sendMessage}
          isStreaming={isStreaming}
          onStop={stopStreaming}
        />
      )}

      {/* Show input even without a conversation (creates one on send) */}
      {!activeConversation && (
        <InputBar
          onSend={createConversationAndSend}
          isStreaming={isStreaming}
          onStop={stopStreaming}
        />
      )}
    </main>
  );
}
