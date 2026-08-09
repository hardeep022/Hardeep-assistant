import { useEffect, useRef, useState, useMemo, lazy, Suspense } from 'react';
import { useApp } from '../context/AppContext';
import { useChat } from '../hooks/useChat';
import { useToast } from './Toast';
import { useTranslation } from '../i18n/I18nContext';
import { MessageBubble } from './MessageBubble';
import { InputBar } from './InputBar';
import { parseSystemAction } from '../services/systemActions';
import { MODELS, ASSISTANT_MODES, type AssistantMode } from '../types';
import { executeDeepResearch, type DeepResearchReport } from '../services/deepResearchEngine';

const PrivacyCenterModal = lazy(() => import('./PrivacyCenterModal').then(m => ({ default: m.PrivacyCenterModal })));
const ResearchReportModal = lazy(() => import('./ResearchReportModal').then(m => ({ default: m.ResearchReportModal })));
const DataAnalysisModal = lazy(() => import('./DataAnalysisModal').then(m => ({ default: m.DataAnalysisModal })));
const CustomAssistantBuilderModal = lazy(() => import('./CustomAssistantBuilderModal').then(m => ({ default: m.CustomAssistantBuilderModal })));
const ImageGenModal = lazy(() => import('./ImageGenModal').then(m => ({ default: m.ImageGenModal })));
const InteractiveCanvasModal = lazy(() => import('./InteractiveCanvasModal').then(m => ({ default: m.InteractiveCanvasModal })));
const GlobalSearchModal = lazy(() => import('./GlobalSearchModal').then(m => ({ default: m.GlobalSearchModal })));
const AudioAnalysisModal = lazy(() => import('./AudioAnalysisModal').then(m => ({ default: m.AudioAnalysisModal })));
const AudioDeviceModal = lazy(() => import('./AudioDeviceModal').then(m => ({ default: m.AudioDeviceModal })));



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

interface ChatViewProps {
  onAgentPrompt?: (prompt: string) => void;
}

export function ChatView({ onAgentPrompt }: ChatViewProps = {}) {

  const { activeConversation, state, dispatch } = useApp();
  const { sendMessage, regenerate, editAndResend, deleteMessage, isStreaming, streamingContent, stopStreaming } = useChat();
  const toast = useToast();
  const { t } = useTranslation();

  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isResearchOpen, setIsResearchOpen] = useState(false);
  const [researchReport, setResearchReport] = useState<DeepResearchReport | null>(null);
  const [isDataOpen, setIsDataOpen] = useState(false);
  const [dataResult, setDataResult] = useState<any>(null);
  const [isAssistantBuilderOpen, setIsAssistantBuilderOpen] = useState(false);
  const [isImageGenOpen, setIsImageGenOpen] = useState(false);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isAudioAnalysisOpen, setIsAudioAnalysisOpen] = useState(false);
  const [isAudioDeviceOpen, setIsAudioDeviceOpen] = useState(false);



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

  // Estimated token count
  const totalEstimatedTokens = useMemo(() => {
    const totalChars = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
    return Math.round(totalChars / 4);
  }, [messages]);

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

  const handleSendMessageWithActionCheck = async (content: string, conversationId?: string) => {
    const action = parseSystemAction(content);
    if (action) {
      if (action.riskLevel === 'blocked') {
        toast.error(`⚠️ Blocked dangerous action: ${action.description}`);
        dispatch({
          type: 'ADD_ACTION_LOG',
          log: {
            id: crypto.randomUUID(),
            actionType: action.actionType,
            riskLevel: 'blocked',
            status: 'blocked',
            target: action.target,
            details: 'Blocked by safety sandbox policies',
            timestamp: Date.now(),
          },
        });
        return;
      }

      if (action.riskLevel === 'warning') {
        dispatch({ type: 'SET_PENDING_ACTION', action });
        return;
      }

      // Safe action: execute directly
      if (window.nova?.executeAction) {
        toast.info(`Executing: ${action.description}…`);
        const res = await window.nova.executeAction({ type: action.actionType as any, target: action.target });
        dispatch({
          type: 'ADD_ACTION_LOG',
          log: {
            id: crypto.randomUUID(),
            actionType: action.actionType,
            riskLevel: 'safe',
            status: (res.success || res.ok) ? 'executed' : 'failed',
            target: action.target,
            details: res.output || res.error || res.reason,
            timestamp: Date.now(),
          },
        });
        if (res.success || res.ok) {
          toast.success(res.output || `Opened ${action.target}`);
        } else {
          toast.error(res.error || `Failed to execute action`);
        }
      }
    }

      if (onAgentPrompt && (currentMode === 'coding' || content.length > 15)) {
        onAgentPrompt(content);
      }

      if (!activeConversation && !conversationId) {
        const newId = crypto.randomUUID();
        dispatch({ type: 'NEW_CHAT', id: newId, mode: currentMode });
        sendMessage(content, newId);
      } else {
        sendMessage(content, conversationId);
      }
    };


  const handleSuggestion = (text: string) => {
    handleSendMessageWithActionCheck(text);
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

  const exportAsText = () => {
    if (!activeConversation) return;
    let txt = `${activeConversation.title.toUpperCase()}\n`;
    txt += `Exported on: ${new Date().toLocaleString()}\n`;
    txt += `-------------------------------------------\n\n`;
    for (const m of activeConversation.messages) {
      const roleName = m.role === 'user' ? 'USER' : 'ASSISTANT';
      txt += `[${roleName}]:\n${m.content}\n\n`;
    }
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConversation.title.replace(/[^a-z0-9_-]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported conversation as Text (.txt)');
  };

  const hasMessages = messages.length > 0;
  const suggestions = MODE_SUGGESTIONS[currentMode] || MODE_SUGGESTIONS.general;

  return (
    <main className="chat-view" style={{ position: 'relative' }}>
      {/* Background Watermark */}
      <div className="bg-watermark-text">HARDEEP</div>


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
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>{m.name}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{m.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Platform Feature Action Buttons */}
            <button
              className="chat-model-badge"
              onClick={() => setIsPrivacyOpen(true)}
              title="Privacy & Security Control Center"
              style={{
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#4ade80',
                padding: '3px 8px',
                borderRadius: 'var(--r-full)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🛡️ Privacy
            </button>

            <button
              className="chat-model-badge"
              onClick={async () => {
                const topic = prompt('Enter topic for Deep Research report:');
                if (topic && topic.trim()) {
                  toast.info(`Executing deep multi-source research for "${topic}"…`);
                  const rep = await executeDeepResearch(topic.trim());
                  setResearchReport(rep);
                  setIsResearchOpen(true);
                }
              }}
              title="Execute Deep Multi-Source Research"
              style={{
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                color: '#c084fc',
                padding: '3px 8px',
                borderRadius: 'var(--r-full)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔬 Research
            </button>

            <button
              className="chat-model-badge"
              onClick={() => setIsAssistantBuilderOpen(true)}
              title="Build Custom AI Assistant"
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: '#60a5fa',
                padding: '3px 8px',
                borderRadius: 'var(--r-full)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🛠️ Assistant
            </button>

            <button
              className="chat-model-badge"
              onClick={() => dispatch({ type: 'SET_SCREEN_GUIDE_OPEN', open: true })}
              title="Screen Sharing & AI Interactive Task Guidance (Ctrl+Shift+S)"
              style={{
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.25), rgba(6, 182, 212, 0.25))',
                border: '1px solid rgba(168, 85, 247, 0.5)',
                color: '#e9d5ff',
                padding: '3px 10px',
                borderRadius: 'var(--r-full)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 0 10px rgba(168, 85, 247, 0.2)',
              }}
            >
              🖥️ Screen Guide
            </button>

            <button
              className="chat-model-badge"
              onClick={() => setIsImageGenOpen(true)}
              title="Image Generation & Creative Studio"

              style={{
                background: 'rgba(236, 72, 153, 0.15)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                color: '#f472b6',
                padding: '3px 8px',
                borderRadius: 'var(--r-full)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🎨 Image Gen
            </button>

            <button
              className="chat-model-badge"
              onClick={() => setIsCanvasOpen(true)}
              title="Interactive Co-Editing Canvas Workspace"
              style={{
                background: 'rgba(20, 184, 166, 0.15)',
                border: '1px solid rgba(20, 184, 166, 0.3)',
                color: '#2dd4bf',
                padding: '3px 8px',
                borderRadius: 'var(--r-full)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✍️ Canvas
            </button>

            <button
              className="chat-model-badge"
              onClick={() => setIsGlobalSearchOpen(true)}
              title="Unified Global Search (Ctrl + K)"
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#fbbf24',
                padding: '3px 8px',
                borderRadius: 'var(--r-full)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔍 Search
            </button>

            <button
              className="chat-model-badge"
              onClick={() => setIsAudioAnalysisOpen(true)}
              title="Audio File & Meeting Intelligence"
              style={{
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#818cf8',
                padding: '3px 8px',
                borderRadius: 'var(--r-full)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🎧 Audio
            </button>

            <button
              className="chat-model-badge"
              onClick={() => setIsAudioDeviceOpen(true)}
              title="Microphone Hardware Test & Speaker Settings"
              style={{
                background: 'rgba(14, 165, 233, 0.15)',
                border: '1px solid rgba(14, 165, 233, 0.3)',
                color: '#38bdf8',
                padding: '3px 8px',
                borderRadius: 'var(--r-full)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🎙️ Mic Settings
            </button>



            {/* Token Counter Badge */}
            {hasMessages && (
              <span
                style={{
                  fontSize: '11px',
                  color: totalEstimatedTokens > 30000 ? 'var(--error)' : 'var(--text-muted)',
                  background: 'var(--bg-input)',
                  padding: '2px 6px',
                  borderRadius: 'var(--r-xs)',
                  border: '1px solid var(--border)',
                }}
                title={totalEstimatedTokens > 30000 ? 'Context size is large. Consider starting a new chat for optimal performance.' : 'Estimated token count'}
              >
                ~{totalEstimatedTokens.toLocaleString()} tokens {totalEstimatedTokens > 30000 && '⚠️'}
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
            <button
              onClick={exportAsText}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                padding: '4px 8px',
                borderRadius: 'var(--r-xs)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
              title="Export as Plain Text"
            >
              📥 .TXT
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
            <p className="empty-heading">{currentModeConfig.name} {t('assistant')}</p>
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
          onSend={handleSendMessageWithActionCheck}
          isStreaming={isStreaming}
          onStop={stopStreaming}
        />
      )}

      {/* Show input even without a conversation (creates one on send) */}
      {!activeConversation && (
        <InputBar
          onSend={handleSendMessageWithActionCheck}
          isStreaming={isStreaming}
          onStop={stopStreaming}
        />
      )}

      {/* Feature Modals */}
      <Suspense fallback={null}>
        <PrivacyCenterModal
          isOpen={isPrivacyOpen}
          onClose={() => setIsPrivacyOpen(false)}
        />
        <ResearchReportModal
          isOpen={isResearchOpen}
          report={researchReport}
          onClose={() => setIsResearchOpen(false)}
        />
        <DataAnalysisModal
          isOpen={isDataOpen}
          dataResult={dataResult}
          onClose={() => setIsDataOpen(false)}
        />
        <CustomAssistantBuilderModal
          isOpen={isAssistantBuilderOpen}
          onClose={() => setIsAssistantBuilderOpen(false)}
          onSaveAssistant={(asst) => {
            toast.success(`Custom Assistant "${asst.name}" created!`);
          }}
        />
        <ImageGenModal
          isOpen={isImageGenOpen}
          onClose={() => setIsImageGenOpen(false)}
        />
        <InteractiveCanvasModal
          isOpen={isCanvasOpen}
          onClose={() => setIsCanvasOpen(false)}
        />
        <GlobalSearchModal
          isOpen={isGlobalSearchOpen}
          onClose={() => setIsGlobalSearchOpen(false)}
        />
        <AudioAnalysisModal
          isOpen={isAudioAnalysisOpen}
          onClose={() => setIsAudioAnalysisOpen(false)}
        />
        <AudioDeviceModal
          isOpen={isAudioDeviceOpen}
          onClose={() => setIsAudioDeviceOpen(false)}
        />
      </Suspense>
    </main>
  );
}




