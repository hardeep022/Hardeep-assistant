import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MODELS } from '../types';
import type { Settings, Provider } from '../types';

type Tab = 'ollama' | 'gemini' | 'openai' | 'anthropic' | 'general';

const TAB_CONFIG = [
  { id: 'ollama' as Tab,    label: 'Ollama',    icon: '🦙', badge: 'FREE' },
  { id: 'gemini' as Tab,    label: 'Gemini',    icon: '🔵', badge: 'FREE' },
  { id: 'openai' as Tab,    label: 'OpenAI',    icon: '🟢', badge: null  },
  { id: 'anthropic' as Tab, label: 'Anthropic', icon: '🟡', badge: null  },
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
  const [tab, setTab] = useState<Tab>('ollama');
  const [local, setLocal] = useState<Settings>({ ...state.settings });
  const [tests, setTests] = useState<Record<string, TestState>>({
    openai: { status: 'idle' }, gemini: { status: 'idle' },
    anthropic: { status: 'idle' }, ollama: { status: 'idle' },
  });
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);

  useEffect(() => {
    // Reset draft values whenever the settings dialog opens or saved settings change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal({ ...state.settings });
  }, [state.isSettingsOpen, state.settings]);

  // Auto-detect Ollama on open
  useEffect(() => {
    if (state.isSettingsOpen && window.nova?.getOllamaModels) {
      window.nova.getOllamaModels(local.ollamaUrl || 'http://localhost:11434')
        .then(models => setOllamaModels(models))
        .catch(() => setOllamaModels([]));
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
      const key = provider === 'ollama' ? '' : (local[keyMap[provider]] as string);
      const result = await window.nova.testConnection(provider as Provider, key, local.ollamaUrl);
      setTests(p => ({
        ...p,
        [provider]: result.ok
          ? { status: 'ok', message: result.error ?? 'Connected!' }
          : { status: 'err', message: result.error ?? 'Failed' },
      }));
      // Refresh Ollama models after successful test
      if (provider === 'ollama' && result.ok && window.nova?.getOllamaModels) {
        window.nova.getOllamaModels(local.ollamaUrl).then(setOllamaModels).catch(() => {});
      }
    } catch {
      setTests(p => ({ ...p, [provider]: { status: 'err', message: 'Connection error' } }));
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
      <div className="modal" role="dialog" aria-modal="true" aria-label="Settings">
        <div className="modal-header">
          <span className="modal-title">Settings</span>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-tabs">
          {TAB_CONFIG.map(t => (
            <button key={t.id} className={`modal-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
              {t.badge && (
                <span style={{ fontSize: '9px', background: 'var(--success)', color: '#000', borderRadius: '3px', padding: '1px 4px', fontWeight: 700, marginLeft: '4px' }}>
                  {t.badge}
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
            const t = ts(provider);
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
                      className={`settings-test-btn${t.status === 'ok' ? ' ok' : t.status === 'err' ? ' err' : ''}`}
                      onClick={() => runTest(provider)}
                      disabled={!getKey(provider) || t.status === 'loading'}
                    >
                      {t.status === 'loading' ? '…' : t.status === 'ok' ? '✓ OK' : t.status === 'err' ? '✗ Error' : 'Test'}
                    </button>
                  </div>
                  {t.status === 'err' && t.message && (
                    <p style={{ fontSize: '12px', color: 'var(--error)', marginTop: '4px' }}>{t.message}</p>
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

          {/* ── General ── */}
          {tab === 'general' && (
            <>
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
