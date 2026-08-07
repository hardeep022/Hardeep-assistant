import { useEffect, useRef } from 'react';
import useChatStore from '../store/chatStore';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import './ChatPage.css';

const MODES = [
  { key: 'general', label: '💬 General' },
  { key: 'coding', label: '💻 Coding' },
  { key: 'learning', label: '📚 Learning' },
  { key: 'research', label: '🔍 Research' },
  { key: 'writing', label: '✍️ Writing' },
  { key: 'cybersecurity', label: '🔒 Security' },
];

export default function ChatPage() {
  const {
    messages, conversations, activeConversationId, activeMode, sending, loading,
    sendMessage, setMode, loadConversations, loadConversation, newConversation, deleteConversation,
  } = useChatStore();

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-page">
      {/* Conversations Sidebar */}
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h3>Conversations</h3>
          <button className="btn-ghost" onClick={newConversation} title="New conversation">
            ✨ New
          </button>
        </div>
        <div className="chat-sidebar-list">
          {conversations.length === 0 ? (
            <p className="chat-sidebar-empty">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.conversation_id}
                className={`chat-sidebar-item ${conv.conversation_id === activeConversationId ? 'chat-sidebar-item-active' : ''}`}
                onClick={() => loadConversation(conv.conversation_id)}
              >
                <div className="chat-sidebar-item-info">
                  <span className="chat-sidebar-item-title">{conv.title}</span>
                  <span className="chat-sidebar-item-meta">
                    {conv.message_count} msgs · {new Date(conv.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className="chat-sidebar-item-delete"
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.conversation_id); }}
                  title="Delete"
                >
                  ×
                </button>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {/* Mode Tabs */}
        <div className="chat-mode-bar">
          {MODES.map((mode) => (
            <button
              key={mode.key}
              className={`chat-mode-tab ${activeMode === mode.key ? 'chat-mode-tab-active' : ''}`}
              onClick={() => setMode(mode.key)}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="chat-messages" ref={messagesContainerRef}>
          {loading ? (
            <div className="chat-loading">
              <div className="spinner" />
              <span>Loading conversation...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <div className="chat-empty-orb" />
              <h2>Start a conversation with Nova</h2>
              <p>Ask me anything — coding help, research, writing, or just chat!</p>
              <div className="chat-suggestions">
                {getSuggestions(activeMode).map((s, i) => (
                  <button
                    key={i}
                    className="chat-suggestion"
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <ChatMessage key={msg.message_id} message={msg} />
              ))}
              {sending && (
                <div className="chat-typing animate-fade-in">
                  <div className="chat-message-avatar-orb" style={{ width: 24, height: 24 }} />
                  <div className="chat-typing-dots">
                    <span /><span /><span />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <ChatInput onSend={sendMessage} disabled={sending} />
      </div>
    </div>
  );
}

function getSuggestions(mode) {
  const suggestions = {
    general: [
      "What can you help me with?",
      "Tell me a fun fact",
      "What's the weather like today?",
    ],
    coding: [
      "Explain async/await in JavaScript",
      "How do I center a div in CSS?",
      "Write a Python function to sort a list",
    ],
    learning: [
      "Explain machine learning simply",
      "What is blockchain?",
      "Teach me about data structures",
    ],
    research: [
      "Compare React vs Vue vs Angular",
      "What are the latest AI trends?",
      "Explain quantum computing",
    ],
    writing: [
      "Help me draft a professional email",
      "Proofread this paragraph for me",
      "Write a project proposal outline",
    ],
    cybersecurity: [
      "What is phishing?",
      "How can I create a strong password?",
      "Explain common web vulnerabilities",
    ],
  };
  return suggestions[mode] || suggestions.general;
}
