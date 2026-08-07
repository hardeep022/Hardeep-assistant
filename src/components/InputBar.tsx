import { useRef, useState, useEffect } from 'react';
import { MODELS } from '../types';
import type { AIModel } from '../types';
import { useApp } from '../context/AppContext';
import { useVoice, VOICE_LANGUAGES } from '../hooks/useVoice';

interface Props {
  onSend: (content: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'openai',
  gemini: 'gemini',
  anthropic: 'anthropic',
  ollama: 'ollama',
};

const PROVIDER_LABELS: Record<string, string> = {
  ollama: '🦥 Local (Ollama)',
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
};

export function InputBar({ onSend, isStreaming, onStop }: Props) {
  const { state, dispatch, activeConversation } = useApp();
  const [value, setValue] = useState('');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [installedOllamaModels, setInstalledOllamaModels] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const { isListening, isWakeWordEnabled, lang, setLang, startListening, stopListening, toggleWakeWord } = useVoice(onSend);

  // Fetch installed Ollama models dynamically
  useEffect(() => {
    if (window.nova?.getOllamaModels) {
      window.nova.getOllamaModels(state.settings.ollamaUrl || 'http://localhost:11434')
        .then(models => setInstalledOllamaModels(models || []))
        .catch(() => {});
    }
  }, [state.settings.ollamaUrl, showModelMenu]);

  // Combine static MODELS with any installed Ollama models
  const allModels: AIModel[] = [...MODELS];
  for (const tag of installedOllamaModels) {
    if (!allModels.some(m => m.id === tag || m.id.toLowerCase() === tag.toLowerCase())) {
      allModels.push({
        id: tag,
        name: tag,
        provider: 'ollama',
        description: 'Installed Local Model',
        free: true,
      });
    }
  }

  const currentModelId = activeConversation?.model || state.settings.defaultModel;
  const currentModel = allModels.find(m => m.id === currentModelId) ?? {
    id: currentModelId,
    name: currentModelId,
    provider: 'ollama' as const,
    description: 'Local Model',
  };

  const currentLangObj = VOICE_LANGUAGES.find(l => l.code === lang) ?? VOICE_LANGUAGES[0];

  // Auto-grow textarea
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleModelSelect = (modelId: string) => {
    setShowModelMenu(false);
    dispatch({
      type: 'UPDATE_SETTINGS',
      settings: { defaultModel: modelId },
    });
    if (activeConversation) {
      dispatch({
        type: 'SET_MODEL',
        conversationId: activeConversation.id,
        model: modelId,
      });
    }
  };

  // Group models by provider
  const groupedModels = allModels.reduce((acc, m) => {
    if (!acc[m.provider]) acc[m.provider] = [];
    acc[m.provider].push(m);
    return acc;
  }, {} as Record<string, AIModel[]>);

  const providerOrder: (keyof typeof PROVIDER_LABELS)[] = ['ollama', 'gemini', 'openai', 'anthropic'];

  return (
    <div className="input-bar-wrap">
      <div className="input-bar">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? `🎙️ Listening in ${currentLangObj.label}… Speak now!`
              : "Message Hardeep Assistant… (Enter to send, Shift+Enter for newline)"
          }
          rows={1}
          disabled={isStreaming}
          autoFocus
        />

        <div className="input-bar-footer">
          {/* Left: Model & Language Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Model Selector */}
            <div className="model-selector" ref={menuRef}>
              <button
                className="model-selector-btn"
                onClick={() => setShowModelMenu(p => !p)}
                title="Select AI model"
              >
                <span className={`model-provider-dot ${PROVIDER_COLORS[currentModel.provider] || 'ollama'}`} />
                {currentModel.name}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showModelMenu && (
                <div className="model-dropdown">
                  {providerOrder.map((provider, i) => {
                    const models = groupedModels[provider] || [];
                    if (models.length === 0) return null;
                    return (
                      <div key={provider}>
                        {i > 0 && <div className="model-dropdown-divider" />}
                        <div className="model-dropdown-section">
                          <div className="model-dropdown-label">{PROVIDER_LABELS[provider]}</div>
                          {models.map(m => (
                            <button
                              key={m.id}
                              className={`model-option${m.id === currentModelId ? ' selected' : ''}`}
                              onClick={() => handleModelSelect(m.id)}
                            >
                              <span className={`model-provider-dot ${PROVIDER_COLORS[m.provider] || 'ollama'}`} />
                              <div>
                                <div className="model-option-name">{m.name}</div>
                                <div className="model-option-desc">{m.description}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Voice Language Selector */}
            <div style={{ position: 'relative' }} ref={langMenuRef}>
              <button
                className="lang-selector-btn"
                onClick={() => setShowLangMenu(p => !p)}
                title="Voice language"
              >
                <span>{currentLangObj.flag}</span>
                <span>{currentLangObj.code.split('-')[0].toUpperCase()}</span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showLangMenu && (
                <div className="model-dropdown" style={{ width: '170px' }}>
                  <div className="model-dropdown-section">
                    <div className="model-dropdown-label">Voice Language</div>
                    {VOICE_LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        className={`model-option${l.code === lang ? ' selected' : ''}`}
                        onClick={() => {
                          setLang(l.code);
                          setShowLangMenu(false);
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>{l.flag}</span>
                        <span className="model-option-name">{l.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Microphone & Send Actions */}
          <div className="input-actions">
            <span className="hint-text">
              {isStreaming ? 'Generating…' : isListening ? 'Listening…' : 'Enter ↵'}
            </span>

            {/* Mic Button */}
            <button
              className={`mic-btn${isListening ? ' listening' : ''}`}
              onPointerDown={startListening}
              onPointerUp={stopListening}
              onPointerLeave={isListening ? stopListening : undefined}
              onPointerCancel={stopListening}
              title={isListening ? 'Stop listening' : `Start mic (${currentLangObj.label})`}
              disabled={isStreaming}
            >
              {isListening ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              )}
            </button>

            <button
              className={`mic-btn${isWakeWordEnabled ? ' listening' : ''}`}
              onClick={toggleWakeWord}
              title={isWakeWordEnabled ? 'Disable wake word “Nova”' : 'Enable wake word “Nova”'}
              disabled={isStreaming}
              aria-pressed={isWakeWordEnabled}
            >
              <span style={{ fontSize: '13px', lineHeight: 1 }}>✦</span>
            </button>

            {/* Send / Stop Button */}
            {isStreaming ? (
              <button
                className="send-btn stop"
                onClick={onStop}
                title="Stop generation"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={handleSend}
                disabled={!value.trim()}
                title="Send message"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
