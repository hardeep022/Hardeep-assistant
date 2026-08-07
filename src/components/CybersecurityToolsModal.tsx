import { useState, useMemo } from 'react';
import { useToast } from './Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CybersecurityToolsModal({ isOpen, onClose }: Props) {
  const toast = useToast();
  const [activeTool, setActiveTool] = useState<'password' | 'hash' | 'phishing'>('password');

  // Password Analyzer State
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Hash Verifier State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [computedSha256, setComputedSha256] = useState('');
  const [computedSha1, setComputedSha1] = useState('');
  const [expectedHash, setExpectedHash] = useState('');
  const [isHashing, setIsHashing] = useState(false);

  // Phishing Analyzer State
  const [phishingInput, setPhishingInput] = useState('');
  const [phishingAnalysis, setPhishingAnalysis] = useState<{ score: number; flags: string[] } | null>(null);

  // Password Strength Calculation
  const passwordStats = useMemo(() => {
    if (!password) return { entropy: 0, score: 0, label: 'Empty', color: 'var(--text-muted)', crackTime: '0s', suggestions: [] };

    let pool = 0;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSymbol = /[^a-zA-Z0-9]/.test(password);

    if (hasLower) pool += 26;
    if (hasUpper) pool += 26;
    if (hasDigit) pool += 10;
    if (hasSymbol) pool += 33;

    const entropy = Math.round(password.length * Math.log2(pool || 1));
    const suggestions: string[] = [];

    if (password.length < 12) suggestions.push('Use at least 12-16 characters');
    if (!hasUpper) suggestions.push('Add uppercase letters (A-Z)');
    if (!hasDigit) suggestions.push('Include numbers (0-9)');
    if (!hasSymbol) suggestions.push('Include symbols (!@#$%^&*)');
    if (/^[0-9]+$/.test(password)) suggestions.push('Avoid purely numeric passwords');
    if (/password|123456|admin|welcome|qwerty/i.test(password)) suggestions.push('Contains common predictable words');

    let score: number;
    let label: string;
    let color: string;
    let crackTime: string;

    if (entropy < 28) {
      score = 1;
      label = 'Very Weak';
      color = '#ef4444';
      crackTime = 'A few seconds';
    } else if (entropy < 45) {
      score = 2;
      label = 'Weak';
      color = '#f97316';
      crackTime = 'A few hours';
    } else if (entropy < 65) {
      score = 3;
      label = 'Fair';
      color = '#eab308';
      crackTime = 'Several months';
    } else if (entropy < 85) {
      score = 4;
      label = 'Strong';
      color = '#22c55e';
      crackTime = 'Centuries';
    } else {
      score = 5;
      label = 'Very Strong';
      color = '#06b6d4';
      crackTime = 'Millions of years';
    }

    return { entropy, score, label, color, crackTime, suggestions };
  }, [password]);

  // Generate secure password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~|}{[]:;?><,.-=';
    const array = new Uint8Array(18);
    crypto.getRandomValues(array);
    let gen = '';
    for (let i = 0; i < array.length; i++) {
      gen += chars[array[i] % chars.length];
    }
    setPassword(gen);
    setShowPassword(true);
    toast.success('Generated strong 18-character password');
  };

  // Compute File Hash
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsHashing(true);
    try {
      const buffer = await file.arrayBuffer();

      // SHA-256
      const sha256Buffer = await crypto.subtle.digest('SHA-256', buffer);
      const sha256Array = Array.from(new Uint8Array(sha256Buffer));
      const sha256Hex = sha256Array.map(b => b.toString(16).padStart(2, '0')).join('');
      setComputedSha256(sha256Hex);

      // SHA-1
      const sha1Buffer = await crypto.subtle.digest('SHA-1', buffer);
      const sha1Array = Array.from(new Uint8Array(sha1Buffer));
      const sha1Hex = sha1Array.map(b => b.toString(16).padStart(2, '0')).join('');
      setComputedSha1(sha1Hex);

      toast.success('Calculated file hashes');
    } catch {
      toast.error('Failed to compute file hash');
    } finally {
      setIsHashing(false);
    }
  };

  // Analyze text for phishing red flags
  const handleAnalyzePhishing = () => {
    if (!phishingInput.trim()) return;

    const flags: string[] = [];
    const text = phishingInput.toLowerCase();

    if (/urgent|immediate action|account suspended|verify your account|security alert|within 24 hours/i.test(text)) {
      flags.push('⚠️ Urgency & Pressure Tactics (creating panic to force quick clicks)');
    }
    if (/bank|credit card|social security|password|ssn|otp|pin|wire transfer/i.test(text)) {
      flags.push('⚠️ Request for Sensitive Credentials or Financial Information');
    }
    if (/http:\/\/|bit\.ly|tinyurl\.com|t\.co|goo\.gl|login.*\.xyz|verify.*\.top/i.test(text)) {
      flags.push('⚠️ Suspicious / Shortened or Non-standard URL Domains');
    }
    if (/dear customer|dear user|dear client|valued customer/i.test(text)) {
      flags.push('⚠️ Generic Impersonal Greeting');
    }
    if (/you have won|inheritance|lottery|prize|claim reward|unclaimed funds/i.test(text)) {
      flags.push('⚠️ Too-good-to-be-true Financial / Reward Offer');
    }

    const score = Math.max(0, 100 - flags.length * 25);
    setPhishingAnalysis({ score, flags });
  };

  if (!isOpen) return null;

  const isHashMatch =
    expectedHash.trim() &&
    (expectedHash.trim().toLowerCase() === computedSha256.toLowerCase() ||
      expectedHash.trim().toLowerCase() === computedSha1.toLowerCase());

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content cybersecurity-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🛡️</span>
            <div>
              <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>Cybersecurity Toolkit</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Defensive security tools, hash verifiers, and risk analyzers
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </div>

        {/* Tool Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTool('password')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--r-xs)',
              background: activeTool === 'password' ? 'var(--accent-dim)' : 'transparent',
              color: activeTool === 'password' ? 'var(--accent-light)' : 'var(--text-secondary)',
              border: activeTool === 'password' ? '1px solid var(--border-active)' : '1px solid var(--border)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            🔑 Password Analyzer
          </button>
          <button
            onClick={() => setActiveTool('hash')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--r-xs)',
              background: activeTool === 'hash' ? 'var(--accent-dim)' : 'transparent',
              color: activeTool === 'hash' ? 'var(--accent-light)' : 'var(--text-secondary)',
              border: activeTool === 'hash' ? '1px solid var(--border-active)' : '1px solid var(--border)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            #️⃣ Hash Verifier
          </button>
          <button
            onClick={() => setActiveTool('phishing')}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--r-xs)',
              background: activeTool === 'phishing' ? 'var(--accent-dim)' : 'transparent',
              color: activeTool === 'phishing' ? 'var(--accent-light)' : 'var(--text-secondary)',
              border: activeTool === 'phishing' ? '1px solid var(--border-active)' : '1px solid var(--border)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            🎣 Phishing Advisor
          </button>
        </div>

        {/* Tool Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {activeTool === 'password' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Test Password or Passphrase
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password to test..."
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 'var(--r-xs)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)', padding: '0 12px', borderRadius: 'var(--r-xs)', cursor: 'pointer', fontSize: '13px' }}
                  >
                    {showPassword ? '🙈 Hide' : '👁️ Show'}
                  </button>
                  <button
                    type="button"
                    onClick={generatePassword}
                    style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '0 14px', borderRadius: 'var(--r-xs)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                  >
                    🎲 Generate
                  </button>
                </div>

                {/* Strength Meter */}
                {password && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Strength: <strong style={{ color: passwordStats.color }}>{passwordStats.label}</strong> ({passwordStats.entropy} bits entropy)
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Crack Time: <strong style={{ color: 'var(--text-primary)' }}>{passwordStats.crackTime}</strong>
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(passwordStats.score / 5) * 100}%`,
                          height: '100%',
                          background: passwordStats.color,
                          transition: 'width 0.25s ease, background 0.25s ease',
                        }}
                      />
                    </div>

                    {/* Suggestions */}
                    {passwordStats.suggestions.length > 0 && (
                      <div style={{ background: 'var(--bg-primary)', padding: '10px 12px', borderRadius: 'var(--r-xs)', border: '1px solid var(--border)', marginTop: '4px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          💡 Improvement Recommendations:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {passwordStats.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTool === 'hash' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Select File to Calculate Hash
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  style={{
                    padding: '8px',
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--r-xs)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                />

                {isHashing && <div style={{ fontSize: '12px', color: 'var(--accent-light)' }}>Computing hash digests...</div>}

                {selectedFile && !isHashing && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>SHA-256:</div>
                      <div style={{ background: 'var(--bg-input)', padding: '8px', borderRadius: 'var(--r-xs)', fontFamily: 'monospace', fontSize: '11px', color: 'var(--accent-light)', wordBreak: 'break-all', userSelect: 'all' }}>
                        {computedSha256}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>SHA-1:</div>
                      <div style={{ background: 'var(--bg-input)', padding: '8px', borderRadius: 'var(--r-xs)', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)', wordBreak: 'break-all', userSelect: 'all' }}>
                        {computedSha1}
                      </div>
                    </div>

                    {/* Hash Comparison */}
                    <div style={{ marginTop: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Verify Against Expected Hash:
                      </label>
                      <input
                        type="text"
                        placeholder="Paste expected SHA-256 or SHA-1 hash..."
                        value={expectedHash}
                        onChange={e => setExpectedHash(e.target.value)}
                        style={{
                          width: '100%',
                          marginTop: '4px',
                          padding: '6px 10px',
                          borderRadius: 'var(--r-xs)',
                          border: '1px solid var(--border)',
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                        }}
                      />
                      {expectedHash.trim() && (
                        <div style={{ marginTop: '6px', fontSize: '12px', fontWeight: 600, color: isHashMatch ? '#22c55e' : '#ef4444' }}>
                          {isHashMatch ? '✅ Hash MATCHES perfectly! Integrity verified.' : '❌ Hash MISMATCH! File may be altered or corrupted.'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTool === 'phishing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Phishing Message & Link Analyzer
                </label>
                <textarea
                  placeholder="Paste suspicious email text, SMS message, or URL to analyze..."
                  value={phishingInput}
                  onChange={e => setPhishingInput(e.target.value)}
                  rows={4}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--r-xs)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  type="button"
                  onClick={handleAnalyzePhishing}
                  style={{ alignSelf: 'flex-start', background: 'var(--accent)', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 'var(--r-xs)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  🔍 Inspect Red Flags
                </button>

                {phishingAnalysis && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-primary)', padding: '12px', borderRadius: 'var(--r-xs)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600 }}>
                      <span>Safety Score:</span>
                      <span style={{ color: phishingAnalysis.score > 70 ? '#22c55e' : phishingAnalysis.score > 40 ? '#eab308' : '#ef4444' }}>
                        {phishingAnalysis.score}/100 ({phishingAnalysis.score > 70 ? 'Low Risk' : phishingAnalysis.score > 40 ? 'Suspicious' : 'High Phishing Risk'})
                      </span>
                    </div>
                    {phishingAnalysis.flags.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#22c55e' }}>No common automated phishing indicators detected. Stay cautious of unfamiliar senders.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Detected Risk Factors:</div>
                        {phishingAnalysis.flags.map((f, i) => (
                          <div key={i} style={{ fontSize: '12px', color: '#f87171' }}>{f}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
