import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../i18n/I18nContext';
import { MODELS } from '../types';
import type { Settings, Provider } from '../types';
import type { SupportedLanguage } from '../i18n/translations';
import { soundEffects } from '../utils/soundEffects';
import { useTTS } from '../hooks/useTTS';
import { MemoryManagerModal } from './MemoryManagerModal';

type Tab = 'ollama' | 'gemini' | 'openai' | 'anthropic' | 'voice' | 'privacy' | 'general';

const TAB_CONFIG = [
  { id: 'ollama' as Tab,    label: 'Ollama',    icon: '🦙', badge: 'FREE' },
  { id: 'gemini' as Tab,    label: 'Gemini',    icon: '🔵', badge: 'FREE' },
  { id: 'openai' as Tab,    label: 'OpenAI',    icon: '🟢', badge: null  },
  { id: 'anthropic' as Tab, label: 'Anthropic', icon: '🟡', badge: null  },
  { id: 'voice' as Tab,     label: 'Voice',     icon: '🎙️', badge: null  },
  { id: 'privacy' as Tab,   label: 'Privacy',   icon: '🔒', badge: null  },
  { id: 'general' as Tab,   label: 'General',   icon: '⚙️', badge: null  },
];

const PROVIDER_LINKS: Record<string, { name: string; url: string; hint: string }> = {
  openai:    { name: 'OpenAI Platform',   url: 'https://platform.openai.com/api-keys',        hint: 'Requires billing. GPT-4o Mini is cheapest.' },
  gemini:    { name: 'Google AI Studio',  url: 'https://aistudio.google.com/apikey',           hint: 'Free tier available — no credit card needed!' },
  anthropic: { name: 'Anthropic Console', url: 'https://console.anthropic.com/keys',           hint: 'Requires billing. Claude Haiku is cheapest.'  },
  ollama:    { name: 'Ollama Website',    url: 'https://ollama.com/download',                  hint: 'Runs 100% locally on your machine. No API key, no cost, no data sent anywhere.' },
};

type TestStatus = 'idle' | 'loading' | 'ok' | 'err';
interface TestState { status: TestStatus; message?: string; }

export function SettingsModal() {
  const { state, dispatch } = useApp();
  const { language, setLanguage, t } = useTranslation();
  const { speak, isSpeaking, stop: stopTTS } = useTTS();
  const [tab, setTab] = useState<Tab>('ollama');
  const [local, setLocal] = useState<Settings>({ ...state.settings });
  const [tests, setTests] = useState<Record<string, TestState>>({
    openai: { status: 'idle' }, gemini: { status: 'idle' },
    anthropic: { status: 'idle' }, ollama: { status: 'idle' },
  });
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [systemInfo, setSystemInfo] = useState<{ platform?: string; arch?: string; cpus?: number; totalMem?: number; freeMem?: number; hostname?: string } | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const update = () => setAvailableVoices(window.speechSynthesis.getVoices());
      update();
      window.speechSynthesis.onvoiceschanged = update;
    }
  }, []);

  useEffect(() => {
    setLocal({ ...state.settings });
  }, [state.isSettingsOpen, state.settings]);

  // Auto-detect Ollama and system info on open
  useEffect(() => {
    if (state.isSettingsOpen) {
      if (window.nova?.getOllamaModels) {
        window.nova.getOllamaModels(local.ollamaUrl || 'http://localhost:11434')
          .then(models => setOllamaModels(models))
          .catch(() => setOllamaModels([]));
      }
      if (window.nova?.getSystemInfo) {
        window.nova.getSystemInfo().then(setSystemInfo).catch(() => {});
      }
    }
  }, [state.isSettingsOpen, local.ollamaUrl]);

  if (!state.isSettingsOpen) return null;

  const handleClose = () => dispatch({ type: 'SET_SETTINGS_OPEN', open: false });

  const handleSave = () => {
    dispatch({ type: 'UPDATE_SETTINGS', settings: local });
    if (window.nova?.setSettings) window.nova.setSettings(local).catch(() => {});
    handleClose();
  };

  const openLink = (url: string) => {
    if (window.nova?.openExternal) window.nova.openExternal(url);
    else window.open(url, '_blank');
  };

  const runTest = async (provider: string) => {
    setTests(p => ({ ...p, [provider]: { status: 'loading' } }));
    try {
      const keyMap: Record<string, keyof Settings> = {
        openai: 'openaiKey', gemini: 'geminiKey', anthropic: 'anthropicKey',
      };
      if (!window.nova?.testConnection) return;
      const key = provider === 'ollama' ? '' : (local[keyMap[provider]] as string);
      const result = await window.nova.testConnection(provider as Provider, key, local.ollamaUrl);
      setTests(p => ({
        ...p,
        [provider]: result.ok
          ? { status: 'ok', message: result.error ?? 'Connected!' }
          : { status: 'err', message: result.error ?? 'Failed' },
      }));
      if (provider === 'ollama' && result.ok && window.nova?.getOllamaModels) {
        window.nova.getOllamaModels(local.ollamaUrl).then(setOllamaModels).catch(() => {});
      }
    } catch {
      setTests(p => ({ ...p, [provider]: { status: 'err', message: 'Connection error' } }));
    }
  };

  const exportAllData = () => {
    const backup = {
      exportDate: new Date().toISOString(),
      conversations: state.conversations,
      notes: state.notes,
      tasks: state.tasks,
      reminders: state.reminders,
      settings: state.settings,
      language: language,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nova-full-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const purgeAllData = () => {
    if (window.confirm('⚠️ WARNING: This will permanently delete ALL chats, notes, tasks, reminders, and settings. Are you completely sure?')) {
      localStorage.clear();
      dispatch({ type: 'CLEAR_ALL_CHATS' });
      window.location.reload();
    }
  };

  const ts = (p: string) => tests[p] ?? { status: 'idle' };
  const getKey = (p: string) => {
    const map: Record<string, keyof Settings> = { openai: 'openaiKey', gemini: 'geminiKey', anthropic: 'anthropicKey' };
    return (local[map[p]] ?? '') as string;
  };
  const setKey = (p: string, v: string) => {
    const map: Record<string, keyof Settings> = { openai: 'openaiKey', gemini: 'geminiKey', anthropic: 'anthropicKey' };
    setLocal(prev => ({ ...prev, [map[p]]: v }));
    setTests(prev => ({ ...prev, [p]: { status: 'idle' } }));
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Settings" style={{ maxWidth: '680px' }}>
        <div className="modal-header">
          <span className="modal-title">{t('settings')}</span>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-tabs">
          {TAB_CONFIG.map(tTab => (
            <button key={tTab.id} className={`modal-tab${tab === tTab.id ? ' active' : ''}`} onClick={() => setTab(tTab.id)}>
              {tTab.icon} {tTab.label}
              {tTab.badge && (
                <span style={{ fontSize: '9px', background: 'var(--success)', color: '#000', borderRadius: '3px', padding: '1px 4px', fontWeight: 700, marginLeft: '4px' }}>
                  {tTab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="modal-body">

          {/* ── Ollama (local, no key) ── */}
          {tab === 'ollama' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="settings-info-box" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                <strong style={{ color: 'var(--success)' }}>🦙 100% Free & Private</strong><br />
                Ollama runs AI models locally on your machine. No API key, no cloud, no cost.
                <br /><br />
                <button className="btn-primary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => openLink(PROVIDER_LINKS.ollama.url)}>
                  ↗ Download Ollama — free
                </button>
              </div>

              <div className="settings-field">
                <label className="settings-label">Ollama Server URL</label>
                <div className="settings-input-row">
                  <input
                    className="settings-input"
                    value={local.ollamaUrl || 'http://localhost:11434'}
                    onChange={e => setLocal(p => ({ ...p, ollamaUrl: e.target.value }))}
                    placeholder="http://localhost:11434"
                  />
                  <button
                    className={`settings-test-btn${ts('ollama').status === 'ok' ? ' ok' : ts('ollama').status === 'err' ? ' err' : ''}`}
                    onClick={() => runTest('ollama')}
                    disabled={ts('ollama').status === 'loading'}
                  >
                    {ts('ollama').status === 'loading' ? '…' :
                     ts('ollama').status === 'ok' ? '✓ Running' :
                     ts('ollama').status === 'err' ? '✗ Not found' : 'Detect'}
                  </button>
                </div>
                {ts('ollama').message && (
                  <p style={{ fontSize: '12px', color: ts('ollama').status === 'ok' ? 'var(--success)' : 'var(--error)', marginTop: '4px' }}>
                    {ts('ollama').message}
                  </p>
                )}
              </div>

              <div className="settings-field">
                <label className="settings-label">Installed Models {ollamaModels.length > 0 && `(${ollamaModels.length})`}</label>
                {ollamaModels.length === 0 ? (
                  <div className="settings-info-box">
                    No models detected. After installing Ollama, run in terminal:<br />
                    <code style={{ color: 'var(--accent-light)', display: 'block', marginTop: '8px' }}>ollama pull llama3.2</code>
                    <code style={{ color: 'var(--accent-light)', display: 'block', marginTop: '4px' }}>ollama pull gemma3</code>
                    <code style={{ color: 'var(--accent-light)', display: 'block', marginTop: '4px' }}>ollama pull mistral</code>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {ollamaModels.map(m => (
                      <div key={m} style={{ padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        🦙 {m}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Cloud Provider Tabs ── */}
          {(['gemini', 'openai', 'anthropic'] as Provider[]).map(provider => {
            if (tab !== provider) return null;
            const link = PROVIDER_LINKS[provider];
            const tTest = ts(provider);
            return (
              <div key={provider} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="settings-info-box">
                  {link.hint}<br /><br />
                  <button
                    className="btn-primary"
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                    onClick={() => openLink(link.url)}
                  >
                    ↗ Get Free API Key — {link.name}
                  </button>
                </div>

                <div className="settings-field">
                  <label className="settings-label">API Key</label>
                  <div className="settings-input-row">
                    <input
                      type="password"
                      className="settings-input"
                      value={getKey(provider)}
                      onChange={e => setKey(provider, e.target.value)}
                      placeholder={provider === 'anthropic' ? 'sk-ant-...' : provider === 'openai' ? 'sk-...' : 'AIza...'}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      className={`settings-test-btn${tTest.status === 'ok' ? ' ok' : tTest.status === 'err' ? ' err' : ''}`}
                      onClick={() => runTest(provider)}
                      disabled={!getKey(provider) || tTest.status === 'loading'}
                    >
                      {tTest.status === 'loading' ? '…' : tTest.status === 'ok' ? '✓ OK' : tTest.status === 'err' ? '✗ Error' : 'Test'}
                    </button>
                  </div>
                  {tTest.status === 'err' && tTest.message && (
                    <p style={{ fontSize: '12px', color: 'var(--error)', marginTop: '4px' }}>{tTest.message}</p>
                  )}
                </div>

                <div className="settings-field">
                  <label className="settings-label">Models</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {MODELS.filter(m => m.provider === provider).map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{m.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.description}</div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Voice & Speech ── */}
          {tab === 'voice' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="settings-field">
                <label className="settings-label">Voice Assistant Feature</label>
                <p className="settings-sublabel">Enable or disable hands-free voice conversation and audio interactions</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <input
                    type="checkbox"
                    id="voiceEnabled"
                    checked={local.voiceEnabled ?? true}
                    onChange={e => setLocal(p => ({ ...p, voiceEnabled: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="voiceEnabled" style={{ fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>
                    Enable Voice System
                  </label>
                </div>
              </div>

              <div className="settings-field">
                <label className="settings-label">Speech Recognition Provider</label>
                <p className="settings-sublabel">Choose STT engine for transcription</p>
                <select
                  className="settings-input"
                  value={local.sttProvider || 'auto'}
                  onChange={e => setLocal(p => ({ ...p, sttProvider: e.target.value as any }))}
                  style={{ marginTop: '6px' }}
                >
                  <option value="auto">Automatic (Local Whisper + Web Fallback)</option>
                  <option value="local">Local Faster-Whisper (Python Sidecar)</option>
                  <option value="web">Web Speech API (Browser Built-in)</option>
                </select>
              </div>

              <div className="settings-field">
                <label className="settings-label">Preferred Text-to-Speech Voice</label>
                <p className="settings-sublabel">Select natural voice profile for audio response playback</p>
                <select
                  className="settings-input"
                  value={local.ttsVoice || ''}
                  onChange={e => setLocal(p => ({ ...p, ttsVoice: e.target.value }))}
                  style={{ marginTop: '6px' }}
                >
                  <option value="">Default Auto-Detected Voice</option>
                  {availableVoices.map(v => (
                    <option key={`${v.name}-${v.lang}`} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div className="settings-field">
                <label className="settings-label">Playback Volume</label>
                <p className="settings-sublabel">Set audio output loudness</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={local.voiceVolume ?? 1.0}
                    onChange={e => setLocal(p => ({ ...p, voiceVolume: parseFloat(e.target.value) }))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-light)', width: '40px' }}>
                    {Math.round((local.voiceVolume ?? 1.0) * 100)}%
                  </span>
                </div>
              </div>

              <div className="settings-field">
                <label className="settings-label">Speech Synthesis Speed</label>
                <p className="settings-sublabel">Adjust playback speed for voice responses (0.5x to 2.0x)</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={local.voiceSpeed ?? 1.0}
                    onChange={e => setLocal(p => ({ ...p, voiceSpeed: parseFloat(e.target.value) }))}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-light)', width: '40px' }}>
                    {(local.voiceSpeed ?? 1.0).toFixed(2)}x
                  </span>
                </div>
              </div>

              <div className="settings-field">
                <label className="settings-label">{t('wakeWord')}</label>
                <p className="settings-sublabel">Activate Nova hands-free by saying "Hey Nova" or "Nova"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <input
                    type="checkbox"
                    id="wakeWordEnabled"
                    checked={local.wakeWordEnabled ?? false}
                    onChange={e => setLocal(p => ({ ...p, wakeWordEnabled: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="wakeWordEnabled" style={{ fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Enable Background Wake Word ("Hey Nova")
                  </label>
                </div>
              </div>

              <div className="settings-field">
                <label className="settings-label">Test Audio & Voice Output</label>
                <p className="settings-sublabel">Verify your speakers, sound synthesis, and acoustic earcons</p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isSpeaking) {
                        stopTTS();
                      } else {
                        speak('settings-test', 'Hello! I am Nova, your local AI operating system. Audio output is working properly.', { rate: local.voiceSpeed ?? 1.0, voiceName: local.ttsVoice, volume: local.voiceVolume ?? 1.0 });
                      }
                    }}
                    className="btn-primary"
                    style={{ fontSize: '12px', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isSpeaking ? '🛑 Stop Speaking' : '🔊 Test Voice Speech'}
                  </button>
                  <button
                    type="button"
                    onClick={() => soundEffects.playSuccess()}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      padding: '7px 14px',
                      borderRadius: 'var(--r-sm)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    🎵 Test Sound Chime
                  </button>
                </div>
              </div>

              <div className="settings-info-box">
                🎙️ Nova voice engine combines built-in Web Speech synthesis with local Python Faster-Whisper and Kokoro neural audio for seamless offline audio communication.
              </div>
            </div>
          )}

          {/* ── Privacy & Data Management ── */}
          {tab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="settings-field">
                <label className="settings-label">{t('privacy')}</label>
                <p className="settings-sublabel">Your chats, notes, tasks, and memories are stored 100% locally on this device.</p>
                
                <div style={{ display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowMemoryModal(true)}
                    className="btn-primary"
                    style={{ fontSize: '12px', padding: '8px 14px', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
                  >
                    🧠 Manage Stored Memories (Real Memory Engine)
                  </button>

                  <button
                    onClick={exportAllData}
                    className="btn-primary"
                    style={{ fontSize: '12px', padding: '8px 14px' }}
                  >
                    📦 {t('exportData')} (JSON Backup)
                  </button>

                  <button
                    onClick={purgeAllData}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      padding: '8px 14px',
                      borderRadius: 'var(--r-sm)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    🔥 {t('deleteAllData')}
                  </button>
                </div>
              </div>

              {showMemoryModal && (
                <MemoryManagerModal onClose={() => setShowMemoryModal(false)} />
              )}

              {systemInfo && (
                <div className="settings-field">
                  <label className="settings-label">Hardware & Device Diagnostics</label>
                  <div style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div>OS: <strong style={{ color: 'var(--text-primary)' }}>{systemInfo.platform} ({systemInfo.arch})</strong></div>
                    <div>Hostname: <strong style={{ color: 'var(--text-primary)' }}>{systemInfo.hostname}</strong></div>
                    <div>CPU Cores: <strong style={{ color: 'var(--text-primary)' }}>{systemInfo.cpus}</strong></div>
                    <div>RAM: <strong style={{ color: 'var(--text-primary)' }}>{systemInfo.totalMem} GB Total ({systemInfo.freeMem} GB Free)</strong></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── General ── */}
          {tab === 'general' && (
            <>
              {/* Multilingual Selector */}
              <div className="settings-field">
                <label className="settings-label">{t('language')}</label>
                <p className="settings-sublabel">Select preferred display & response language</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {[
                    { id: 'en' as SupportedLanguage, label: 'English (EN)' },
                    { id: 'hi' as SupportedLanguage, label: 'हिन्दी (Hindi)' },
                    { id: 'pa' as SupportedLanguage, label: 'ਪੰਜਾਬੀ (Punjabi)' },
                  ].map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => setLanguage(lang.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 'var(--r-xs)',
                        background: language === lang.id ? 'var(--accent)' : 'var(--bg-input)',
                        color: language === lang.id ? '#fff' : 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-field">
                <label className="settings-label">Default Model</label>
                <p className="settings-sublabel">Used for new conversations</p>
                <select className="settings-select" value={local.defaultModel} onChange={e => setLocal(p => ({ ...p, defaultModel: e.target.value }))}>
                  <optgroup label="🦙 Local (Ollama — no API key)">
                    {MODELS.filter(m => m.provider === 'ollama').map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                    {ollamaModels.filter(n => !MODELS.find(m => m.id === n)).map(n => (
                      <option key={n} value={n}>{n} (local)</option>
                    ))}
                  </optgroup>
                  <optgroup label="🔵 Google Gemini (free tier)">
                    {MODELS.filter(m => m.provider === 'gemini').map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🟢 OpenAI">
                    {MODELS.filter(m => m.provider === 'openai').map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="🟡 Anthropic">
                    {MODELS.filter(m => m.provider === 'anthropic').map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="settings-field">
                <label className="settings-label">Theme</label>
                <p className="settings-sublabel">Choose appearance mode for the app</p>
                <div className="theme-toggle-group">
                  {(['dark', 'light', 'system'] as const).map(tTheme => (
                    <button
                      key={tTheme}
                      className={`theme-toggle-btn${(local.theme ?? 'dark') === tTheme ? ' active' : ''}`}
                      onClick={() => setLocal(p => ({ ...p, theme: tTheme }))}
                    >
                      {tTheme === 'dark' ? '🌙' : tTheme === 'light' ? '☀️' : '💻'}{' '}
                      {tTheme.charAt(0).toUpperCase() + tTheme.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-field">
                <label className="settings-label">Global System Instructions</label>
                <p className="settings-sublabel">Custom persona or instructions given to all AI models</p>
                <textarea
                  className="settings-input"
                  rows={4}
                  value={local.systemPrompt || ''}
                  onChange={e => setLocal(p => ({ ...p, systemPrompt: e.target.value }))}
                  placeholder="e.g. You are an expert software developer. Provide clear explanations and clean, production-ready code with TypeScript types."
                  style={{ resize: 'vertical', fontFamily: 'inherit', height: 'auto', paddingTop: '8px' }}
                />
              </div>

              <div className="settings-info-box">
                API keys are stored encrypted using your system keychain. Never sent anywhere except to the AI provider directly.
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

