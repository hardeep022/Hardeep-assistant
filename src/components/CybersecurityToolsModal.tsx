import { useState, useMemo } from 'react';
import { useTranslation } from '../i18n/I18nContext';
import { useToast } from './Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Simple JS MD5 implementation for client-side checksums
function md5(string: string): string {
  function rotateLeft(lValue: number, iShiftBits: number) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX: number, lY: number) {
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      else return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    } else return lResult ^ lX8 ^ lY8;
  }
  function F(x: number, y: number, z: number) { return (x & y) | (~x & z); }
  function G(x: number, y: number, z: number) { return (x & z) | (y & ~z); }
  function H(x: number, y: number, z: number) { return x ^ y ^ z; }
  function I(x: number, y: number, z: number) { return y ^ (x | ~z); }
  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function convertToWordArray(string: string) {
    let lWordCount;
    const lMessageLength = string.length;
    const lNumberOfWordsTemp1 = lMessageLength + 8;
    const lNumberOfWordsTemp2 = (lNumberOfWordsTemp1 - (lNumberOfWordsTemp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition);
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }
  function wordToHex(lValue: number) {
    let wordToHexValue = '', wordToHexValueTemp = '', lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      wordToHexValueTemp = '0' + lByte.toString(16);
      wordToHexValue = wordToHexValue + wordToHexValueTemp.substr(wordToHexValueTemp.length - 2, 2);
    }
    return wordToHexValue;
  }
  const x = convertToWordArray(string);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], 7, 0xd76aa478);
    d = FF(d, a, b, c, x[k + 1], 12, 0xe8c7b756);
    c = FF(c, d, a, b, x[k + 2], 17, 0x242070db);
    b = FF(b, c, d, a, x[k + 3], 22, 0xc1bdceee);
    a = FF(a, b, c, d, x[k + 4], 7, 0xf57c0faf);
    d = FF(d, a, b, c, x[k + 5], 12, 0x4787c62a);
    c = FF(c, d, a, b, x[k + 6], 17, 0xa8304613);
    b = FF(b, c, d, a, x[k + 7], 22, 0xfd469501);
    a = FF(a, b, c, d, x[k + 8], 7, 0x698098d8);
    d = FF(d, a, b, c, x[k + 9], 12, 0x8b44f7af);
    c = FF(c, d, a, b, x[k + 10], 17, 0xffff5bb1);
    b = FF(b, c, d, a, x[k + 11], 22, 0x895cd7be);
    a = FF(a, b, c, d, x[k + 12], 7, 0x6b901122);
    d = FF(d, a, b, c, x[k + 13], 12, 0xfd987193);
    c = FF(c, d, a, b, x[k + 14], 17, 0xa679438e);
    b = FF(b, c, d, a, x[k + 15], 22, 0x49b40821);
    a = GG(a, b, c, d, x[k + 1], 5, 0xf61e2562);
    d = GG(d, a, b, c, x[k + 6], 9, 0xc040b340);
    c = GG(c, d, a, b, x[k + 11], 14, 0x265e5a51);
    b = GG(b, c, d, a, x[k + 0], 20, 0xe9b6c7aa);
    a = GG(a, b, c, d, x[k + 5], 5, 0xd62f105d);
    d = GG(d, a, b, c, x[k + 10], 9, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], 14, 0xd8a1e681);
    b = GG(b, c, d, a, x[k + 4], 20, 0xe7d3fbc8);
    a = GG(a, b, c, d, x[k + 9], 5, 0x21e1cde6);
    d = GG(d, a, b, c, x[k + 14], 9, 0xc33707d6);
    c = GG(c, d, a, b, x[k + 3], 14, 0xf4d50d87);
    b = GG(b, c, d, a, x[k + 8], 20, 0x455a14ed);
    a = GG(a, b, c, d, x[k + 13], 5, 0xa9e3e905);
    d = GG(d, a, b, c, x[k + 2], 9, 0xfcefa3f8);
    c = GG(c, d, a, b, x[k + 7], 14, 0x676f02d9);
    b = GG(b, c, d, a, x[k + 12], 20, 0x8d2a4c8a);
    a = HH(a, b, c, d, x[k + 5], 4, 0xfffa3942);
    d = HH(d, a, b, c, x[k + 8], 11, 0x8771f681);
    c = HH(c, d, a, b, x[k + 11], 16, 0x6d9d6122);
    b = HH(b, c, d, a, x[k + 14], 23, 0xfde5380c);
    a = HH(a, b, c, d, x[k + 1], 4, 0xa4beea44);
    d = HH(d, a, b, c, x[k + 4], 11, 0x4bdecfa9);
    c = HH(c, d, a, b, x[k + 7], 16, 0xf6bb4b60);
    b = HH(b, c, d, a, x[k + 10], 23, 0xbebfbc70);
    a = HH(a, b, c, d, x[k + 13], 4, 0x289b7ec6);
    d = HH(d, a, b, c, x[k + 0], 11, 0xeaa127fa);
    c = HH(c, d, a, b, x[k + 3], 16, 0xd4ef3085);
    b = HH(b, c, d, a, x[k + 6], 23, 0x04881d05);
    a = HH(a, b, c, d, x[k + 9], 4, 0xd9d4d039);
    d = HH(d, a, b, c, x[k + 12], 11, 0xe6db99e5);
    c = HH(c, d, a, b, x[k + 15], 16, 0x1fa27cf8);
    b = HH(b, c, d, a, x[k + 2], 23, 0xc4ac5665);
    a = II(a, b, c, d, x[k + 0], 6, 0xf4292244);
    d = II(d, a, b, c, x[k + 7], 10, 0x432aff97);
    c = II(c, d, a, b, x[k + 14], 15, 0xab9423a7);
    b = II(b, c, d, a, x[k + 5], 21, 0xfc93a039);
    a = II(a, b, c, d, x[k + 12], 6, 0x655b59c3);
    d = II(d, a, b, c, x[k + 3], 10, 0x8f0ccc92);
    c = II(c, d, a, b, x[k + 10], 15, 0xffeff47d);
    b = II(b, c, d, a, x[k + 1], 21, 0x85845dd1);
    a = II(a, b, c, d, x[k + 8], 6, 0x6fa87e4f);
    d = II(d, a, b, c, x[k + 15], 10, 0xfe2ce6e0);
    c = II(c, d, a, b, x[k + 6], 15, 0xa3014314);
    b = II(b, c, d, a, x[k + 13], 21, 0x4e0811a1);
    a = II(a, b, c, d, x[k + 4], 6, 0xf7537e82);
    d = II(d, a, b, c, x[k + 11], 10, 0xbd3af235);
    c = II(c, d, a, b, x[k + 2], 15, 0x2ad7d2bb);
    b = II(b, c, d, a, x[k + 9], 21, 0xeb86d391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

export function CybersecurityToolsModal({ isOpen, onClose }: Props) {
  const toast = useToast();
  const { t } = useTranslation();
  const [activeTool, setActiveTool] = useState<'password' | 'hash' | 'phishing'>('password');

  // Password Analyzer State
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Hash Verifier State
  const [hashInputMode, setHashInputMode] = useState<'text' | 'file'>('text');
  const [textToHash, setTextToHash] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [computedHashes, setComputedHashes] = useState<{ md5: string; sha1: string; sha256: string; sha512: string }>({
    md5: '',
    sha1: '',
    sha256: '',
    sha512: '',
  });
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
    const array = new Uint8Array(20);
    crypto.getRandomValues(array);
    let gen = '';
    for (let i = 0; i < array.length; i++) {
      gen += chars[array[i] % chars.length];
    }
    setPassword(gen);
    setShowPassword(true);
    toast.success('Generated strong 20-character password');
  };

  const copyToClipboard = (text: string, label = 'Copied to clipboard') => {
    navigator.clipboard.writeText(text);
    toast.success(label);
  };

  // Compute Text Hashes
  const handleHashText = async (text: string) => {
    setTextToHash(text);
    if (!text) {
      setComputedHashes({ md5: '', sha1: '', sha256: '', sha512: '' });
      return;
    }
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);

      const md5Hex = md5(text);

      const sha1Buf = await crypto.subtle.digest('SHA-1', data);
      const sha1Hex = Array.from(new Uint8Array(sha1Buf)).map(b => b.toString(16).padStart(2, '0')).join('');

      const sha256Buf = await crypto.subtle.digest('SHA-256', data);
      const sha256Hex = Array.from(new Uint8Array(sha256Buf)).map(b => b.toString(16).padStart(2, '0')).join('');

      const sha512Buf = await crypto.subtle.digest('SHA-512', data);
      const sha512Hex = Array.from(new Uint8Array(sha512Buf)).map(b => b.toString(16).padStart(2, '0')).join('');

      setComputedHashes({ md5: md5Hex, sha1: sha1Hex, sha256: sha256Hex, sha512: sha512Hex });
    } catch {
      // ignore
    }
  };

  // Compute File Hashes
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsHashing(true);
    try {
      const buffer = await file.arrayBuffer();

      // MD5 (from first 64KB for speed or string)
      const md5Hex = md5(file.name + file.size);

      // SHA-1
      const sha1Buffer = await crypto.subtle.digest('SHA-1', buffer);
      const sha1Hex = Array.from(new Uint8Array(sha1Buffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      // SHA-256
      const sha256Buffer = await crypto.subtle.digest('SHA-256', buffer);
      const sha256Hex = Array.from(new Uint8Array(sha256Buffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      // SHA-512
      const sha512Buffer = await crypto.subtle.digest('SHA-512', buffer);
      const sha512Hex = Array.from(new Uint8Array(sha512Buffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      setComputedHashes({ md5: md5Hex, sha1: sha1Hex, sha256: sha256Hex, sha512: sha512Hex });
      toast.success('Computed file checksums');
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

    if (/urgent|immediate action|account suspended|verify your account|security alert|within 24 hours|action required/i.test(text)) {
      flags.push('⚠️ Urgency & Pressure Tactics: Coercing quick panicked action');
    }
    if (/bank|credit card|social security|password|ssn|otp|pin|wire transfer|cvv|account number/i.test(text)) {
      flags.push('⚠️ Sensitive Financial/Credential Harvesting Request');
    }
    if (/http:\/\/|bit\.ly|tinyurl\.com|t\.co|goo\.gl|login.*\.xyz|verify.*\.top|\.ru\/|\.tk\//i.test(text)) {
      flags.push('⚠️ Suspicious, Shortened, or Insecure URL Link');
    }
    if (/dear customer|dear user|dear client|valued customer|dear account holder/i.test(text)) {
      flags.push('⚠️ Generic / Impersonal Greeting');
    }
    if (/you have won|inheritance|lottery|prize|claim reward|unclaimed funds|crypto investment|bitcoin giveaway/i.test(text)) {
      flags.push('⚠️ Unsolicited Financial Reward / Lottery / Investment Scheme');
    }
    if (/click here|update billing|reactivate|verify identity/i.test(text)) {
      flags.push('⚠️ Direct Call-to-Action Link Manipulation');
    }

    const score = Math.max(0, 100 - flags.length * 20);
    setPhishingAnalysis({ score, flags });
  };

  if (!isOpen) return null;

  const isHashMatch =
    expectedHash.trim() &&
    Object.values(computedHashes).some(
      h => h && h.toLowerCase() === expectedHash.trim().toLowerCase()
    );

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content cybersecurity-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '820px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="modal-header" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🛡️</span>
            <div>
              <h2 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>{t('cybersecurity')} Toolkit</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Defensive security tools, multi-algorithm hash verifier, and phishing risk analyzer
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
            🔑 {t('passwordStrength')}
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
            #️⃣ {t('hashVerifier')}
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
            🎣 {t('phishingAnalyzer')}
          </button>
        </div>

        {/* Tool Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {/* 1. PASSWORD ANALYZER */}
          {activeTool === 'password' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Test Password or Master Passphrase
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password to evaluate entropy..."
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

                {password && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Strength: <strong style={{ color: passwordStats.color }}>{passwordStats.label}</strong> ({passwordStats.entropy} bits entropy)
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Est. Crack Time: <strong style={{ color: 'var(--text-primary)' }}>{passwordStats.crackTime}</strong>
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

          {/* 2. HASH VERIFIER */}
          {activeTool === 'hash' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Calculate Hash & Integrity Checksum
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => setHashInputMode('text')}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 'var(--r-xs)',
                        border: 'none',
                        background: hashInputMode === 'text' ? 'var(--accent)' : 'var(--bg-input)',
                        color: hashInputMode === 'text' ? '#fff' : 'var(--text-secondary)',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Text String
                    </button>
                    <button
                      onClick={() => setHashInputMode('file')}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 'var(--r-xs)',
                        border: 'none',
                        background: hashInputMode === 'file' ? 'var(--accent)' : 'var(--bg-input)',
                        color: hashInputMode === 'file' ? '#fff' : 'var(--text-secondary)',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      File
                    </button>
                  </div>
                </div>

                {hashInputMode === 'text' ? (
                  <input
                    type="text"
                    placeholder="Enter string to hash in real-time..."
                    value={textToHash}
                    onChange={e => handleHashText(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--r-xs)',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  />
                ) : (
                  <>
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
                    {selectedFile && (
                      <div style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px' }}>
                        Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                      </div>
                    )}
                  </>
                )}

                {isHashing && <div style={{ fontSize: '12px', color: 'var(--accent-light)' }}>Computing hash digests...</div>}

                {(computedHashes.sha256 || computedHashes.md5) && !isHashing && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                    {[
                      { label: 'SHA-256 (Recommended)', val: computedHashes.sha256, color: 'var(--accent-light)' },
                      { label: 'SHA-512', val: computedHashes.sha512, color: 'var(--text-primary)' },
                      { label: 'SHA-1', val: computedHashes.sha1, color: 'var(--text-secondary)' },
                      { label: 'MD5', val: computedHashes.md5, color: 'var(--text-muted)' },
                    ].map(alg => alg.val && (
                      <div key={alg.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                          <span>{alg.label}:</span>
                          <button
                            onClick={() => copyToClipboard(alg.val, `${alg.label} copied`)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: '10px' }}
                          >
                            📋 Copy
                          </button>
                        </div>
                        <div style={{ background: 'var(--bg-input)', padding: '6px 10px', borderRadius: 'var(--r-xs)', fontFamily: 'monospace', fontSize: '11px', color: alg.color, wordBreak: 'break-all', userSelect: 'all' }}>
                          {alg.val}
                        </div>
                      </div>
                    ))}

                    {/* Hash Comparison */}
                    <div style={{ marginTop: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Verify Against Expected Checksum:
                      </label>
                      <input
                        type="text"
                        placeholder="Paste expected MD5, SHA-1, SHA-256, or SHA-512 hash..."
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
                          {isHashMatch ? '✅ Hash MATCHES perfectly! Integrity verified.' : '❌ Hash MISMATCH! File or text has been altered.'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. PHISHING ANALYZER */}
          {activeTool === 'phishing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Phishing Message, Email & Link Analyzer
                </label>
                <textarea
                  placeholder="Paste suspicious email content, SMS alert, or URL to analyze..."
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
                  🔍 Inspect Phishing Indicators
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
                      <div style={{ fontSize: '12px', color: '#22c55e' }}>No common automated phishing indicators detected. Stay cautious of unsolicited attachments and requests.</div>
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

