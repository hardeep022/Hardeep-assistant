import { useEffect, useRef, useState } from 'react';
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
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const messages = activeConversation?.messages ?? [];
  const modelId = activeConversation?.model || state.settings.defaultModel;
  const model = MODELS.find(m => m.id === modelId) ?? {
    id: modelId,
    name: modelId,
    provider: 'ollama' as const,
    description: 'Local Model',
  };

  // Close model menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  const handleSelectModel = (selectedModelId: string) => {
    if (activeConversation) {
      dispatch({ type: 'SET_MODEL', conversationId: activeConversation.id, model: selectedModelId });
    }
    setShowModelDropdown(false);
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
            
            {/* Interactive Model Selector in Header */}
            <div style={{ position: 'relative' }} ref={modelMenuRef}>
              <button
                className="chat-model-badge interactive"
                onClick={() => setShowModelDropdown(prev => !prev)}
                title="Switch model for this conversation"
                style={{
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--border-active)',
                  color: 'var(--accent-light)',
                  padding: '3px 8px',
                  borderRadius: 'var(--r-full)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>{model.name}</span>
                <span style={{ fontSize: '9px', opacity: 0.7 }}>▼</span>
              </button>

              {showModelDropdown && (
                <div
                  className="header-model-dropdown"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '6px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-md)',
                    borderRadius: 'var(--r-md)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: '6px',
                    zIndex: 100,
                    width: '240px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '4px 8px' }}>
                    Select Model
                  </div>
                  {MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectModel(m.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        padding: '6px 8px',
                        background: m.id === model.id ? 'var(--accent-dim)' : 'transparent',
                        border: 'none',
                        borderRadius: 'var(--r-xs)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        color: m.id === model.id ? 'var(--accent-light)' : 'var(--text-primary)',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
