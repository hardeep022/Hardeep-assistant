import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useChat } from '../hooks/useChat';
import { useToast } from './Toast';
import { MessageBubble } from './MessageBubble';
import { InputBar } from './InputBar';
import { MODELS, ASSISTANT_MODES, type AssistantMode } from '../types';

const MODE_SUGGESTIONS: Record<AssistantMode, Array<{ icon: string; text: string }>> = {
  general: [
    { icon: '⚡', text: 'Explain quantum computing in simple terms' },
    { icon: '🌍', text: 'What are the most significant scientific breakthroughs this decade?' },
    { icon: '✍️', text: 'Help me write a professional follow-up email' },
    { icon: '🔍', text: 'Compare SQLite vs PostgreSQL for desktop apps' },
  ],
  coding: [
    { icon: '🐍', text: 'Write a Python script to monitor system CPU and memory usage' },
    { icon: '⚛️', text: 'How do React 19 server components work vs client components?' },
    { icon: '🛠️', text: 'Debug this TypeScript generic type constraint error' },
    { icon: '🚀', text: 'Refactor this async function for optimal concurrency' },
  ],
  learning: [
    { icon: '🧠', text: 'Explain how neural networks learn with backpropagation' },
    { icon: '📚', text: 'Create a 5-step study guide for learning Rust from scratch' },
    { icon: '💡', text: 'Give me a quiz on computer networking fundamentals' },
    { icon: '🎯', text: 'Use the Feynman technique to teach me blockchain consensus' },
  ],
  research: [
    { icon: '🔬', text: 'Synthesize the pros and cons of local LLMs vs Cloud APIs' },
    { icon: '📊', text: 'Generate a comparison matrix of AES-256 vs ChaCha20-Poly1305' },
    { icon: '📑', text: 'Summarize key principles of Zero Trust Architecture' },
    { icon: '📈', text: 'Analyze trends in edge computing and WebAssembly' },
  ],
  productivity: [
    { icon: '✅', text: 'Help me prioritize my weekly task backlog using Eisenhower Matrix' },
    { icon: '⏱️', text: 'Draft a Pomodoro sprint schedule for deep work sessions' },
    { icon: '📋', text: 'Turn these meeting notes into an actionable checklist with deadlines' },
    { icon: '🎯', text: 'Design a daily morning routine for maximum focus and flow' },
  ],
  cybersecurity: [
    { icon: '🛡️', text: 'How do I protect my application against Cross-Site Scripting (XSS)?' },
    { icon: '🔐', text: 'Explain how public key cryptography and Diffie-Hellman work' },
    { icon: '🎣', text: 'Analyze this sample email for spear-phishing indicators' },
    { icon: '🔍', text: 'What is the difference between SHA-256 and HMAC-SHA256?' },
  ],
  writing: [
    { icon: '✉️', text: 'Write a polite but firm email requesting an invoice payment' },
    { icon: '📝', text: 'Proofread and elevate the tone of this project introduction' },
    { icon: '📢', text: 'Draft a product launch announcement for developer tools' },
    { icon: '🎨', text: 'Rewrite this technical explanation in clear, engaging prose' },
  ],
};

export function ChatView() {
  const { activeConversation, state, dispatch } = useApp();
  const { sendMessage, regenerate, editAndResend, deleteMessage, isStreaming, streamingContent, stopStreaming } = useChat();
  const toast = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  const currentMode: AssistantMode = activeConversation?.mode ?? 'general';
  const currentModeConfig = ASSISTANT_MODES.find(m => m.id === currentMode) ?? ASSISTANT_MODES[0];

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

  const handleSelectMode = (mode: AssistantMode) => {
    if (activeConversation) {
      dispatch({ type: 'SET_MODE', conversationId: activeConversation.id, mode });
    } else {
      const id = crypto.randomUUID();
      dispatch({ type: 'NEW_CHAT', id, mode });
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent]);

  const createConversationAndSend = (content: string) => {
    const conversationId = crypto.randomUUID();
    dispatch({ type: 'NEW_CHAT', id: conversationId, mode: currentMode });
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
    toast.success('Exported conversation as Markdown (.md)');
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
    toast.success('Exported conversation as JSON (.json)');
  };

  const hasMessages = messages.length > 0;
  const suggestions = MODE_SUGGESTIONS[currentMode] || MODE_SUGGESTIONS.general;

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
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    zIndex: 100,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                    boxShadow: 'var(--shadow-md)',
                    minWidth: '220px',
                    padding: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <div style={{ padding: '4px 8px', fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
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
                        borderRadius: 'var(--r-xs)',
                        border: 'none',
                        background: m.id === model.id ? 'var(--accent-dim)' : 'transparent',
                        color: m.id === model.id ? 'var(--accent-light)' : 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
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

      {/* Assistant Mode Tab Bar */}
      <div className="mode-tab-bar" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', overflowX: 'auto' }}>
        {ASSISTANT_MODES.map(m => {
          const isSelected = currentMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => handleSelectMode(m.id)}
              title={m.description}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: 'var(--r-full)',
                border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                background: isSelected ? 'var(--accent-dim)' : 'transparent',
                color: isSelected ? 'var(--accent-light)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: isSelected ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{m.icon}</span>
              <span>{m.name}</span>
            </button>
          );
        })}
      </div>

      {/* Messages / Empty State */}
      {!activeConversation || !hasMessages ? (
        <div className="empty-state">
          <div className="empty-logo">{currentModeConfig.icon}</div>
          <div>
            <p className="empty-heading">{currentModeConfig.name} Assistant</p>
            <p className="empty-sub">
              {currentModeConfig.description}
            </p>
          </div>
          <div className="suggestions-grid">
            {suggestions.map(s => (
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
