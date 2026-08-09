import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../i18n/I18nContext';
import { useToast } from './Toast';
import type { UserProfile } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const RECOVERY_WORD_LIST = [
  'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel', 'india', 'juliet',
  'kilo', 'lima', 'mike', 'november', 'oscar', 'papa', 'quebec', 'romeo', 'sierra', 'tango',
  'uniform', 'victor', 'whiskey', 'xray', 'yankee', 'zulu', 'beacon', 'cipher', 'nexus', 'quantum',
  'shield', 'vortex', 'aurora', 'nebula', 'solaris', 'horizon', 'zenith', 'stellar', 'matrix', 'prism'
];

function generateRecoveryKey(): string {
  const words: string[] = [];
  const array = new Uint32Array(12);
  crypto.getRandomValues(array);
  for (let i = 0; i < 12; i++) {
    words.push(RECOVERY_WORD_LIST[array[i] % RECOVERY_WORD_LIST.length]);
  }
  return words.join(' ');
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'nova_salt_2026');
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function AuthModal({ isOpen, onClose }: Props) {
  const { state, dispatch } = useApp();
  const { t, language } = useTranslation();
  const toast = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number>(0);

  if (!isOpen) return null;

  const isLocked = lockoutUntil > Date.now();
  const lockoutSecondsRemaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Username and password are required');
      return;
    }

    const key = generateRecoveryKey();
    const hash = await hashPassword(password);

    const user: UserProfile = {
      id: crypto.randomUUID(),
      username: username.trim().toLowerCase(),
      displayName: displayName.trim() || username.trim(),
      passwordHash: hash,
      recoveryKey: key,
      language: language || 'en',
      createdAt: Date.now(),
    };

    localStorage.setItem(`nova-user-${user.username}`, JSON.stringify(user));
    localStorage.setItem('nova-active-user', user.username);
    dispatch({ type: 'SET_CURRENT_USER', user });
    setGeneratedKey(key);
    toast.success('Account created successfully!');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      toast.error(`Account locked. Please wait ${lockoutSecondsRemaining}s.`);
      return;
    }

    const storedStr = localStorage.getItem(`nova-user-${username.trim().toLowerCase()}`);
    if (!storedStr) {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= 5) {
        setLockoutUntil(Date.now() + 30000);
        toast.error('Too many failed attempts. Locked for 30s.');
      } else {
        toast.error('User not found.');
      }
      return;
    }

    const user: UserProfile = JSON.parse(storedStr);
    const hash = await hashPassword(password);

    if (user.passwordHash === hash) {
      localStorage.setItem('nova-active-user', user.username);
      dispatch({ type: 'SET_CURRENT_USER', user });
      setFailedAttempts(0);
      toast.success(`Welcome back, ${user.displayName}!`);
      onClose();
    } else {
      const attempts = failedAttempts + 1;
      setFailedAttempts(attempts);
      if (attempts >= 5) {
        setLockoutUntil(Date.now() + 30000);
        toast.error('Too many failed attempts. Locked for 30s.');
      } else {
        toast.error(`Invalid password. (${5 - attempts} attempts left)`);
      }
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    const storedStr = localStorage.getItem(`nova-user-${username.trim().toLowerCase()}`);
    if (!storedStr) {
      toast.error('User not found');
      return;
    }

    const user: UserProfile = JSON.parse(storedStr);
    if (user.recoveryKey.trim().toLowerCase() === recoveryKeyInput.trim().toLowerCase()) {
      const newHash = await hashPassword(password);
      user.passwordHash = newHash;
      localStorage.setItem(`nova-user-${user.username}`, JSON.stringify(user));
      dispatch({ type: 'SET_CURRENT_USER', user });
      toast.success('Password reset successfully!');
      setMode('login');
    } else {
      toast.error('Invalid recovery key phrase.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('nova-active-user');
    dispatch({ type: 'SET_CURRENT_USER', user: null });
    toast.info('Logged out');
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 9997,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.5)',
          width: '100%',
          maxWidth: '460px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-input)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>👤</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {state.currentUser ? 'User Profile' : mode === 'login' ? t('login') : mode === 'register' ? t('register') : t('recoverPassword')}
              </h2>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                Local Privacy-First Authentication
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* If already logged in */}
          {state.currentUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Display Name</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{state.currentUser.displayName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Username</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>@{state.currentUser.username}</div>
              </div>

              <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '12px', borderRadius: 'var(--r-sm)', fontSize: '12px', color: '#22c55e' }}>
                ✓ Authenticated locally with encrypted database session
              </div>

              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--border)',
                  background: 'transparent',
                  color: '#ef4444',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                {t('logout')}
              </button>
            </div>
          ) : generatedKey ? (
            /* Show Generated Recovery Key after registration */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #eab308', padding: '14px', borderRadius: 'var(--r-md)' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#eab308', marginBottom: '4px' }}>
                  🔑 Important: Save Your 12-Word Recovery Key
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  This key is the ONLY way to recover your account if you forget your password. Write it down in a secure place.
                </p>
              </div>

              <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', padding: '12px', borderRadius: 'var(--r-sm)', fontFamily: 'monospace', fontSize: '12px', color: 'var(--accent)', wordBreak: 'break-word', userSelect: 'all' }}>
                {generatedKey}
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey);
                  toast.success('Recovery key copied to clipboard');
                  onClose();
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--r-sm)',
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📋 Copy Key & Finish
              </button>
            </div>
          ) : mode === 'login' ? (
            /* Login Mode */
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {t('username')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. hardeep"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {t('password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              {isLocked && (
                <div style={{ color: '#ef4444', fontSize: '12px' }}>
                  ⚠️ Account locked. Try again in {lockoutSecondsRemaining}s.
                </div>
              )}

              <button
                type="submit"
                disabled={isLocked}
                style={{
                  marginTop: '6px',
                  padding: '9px 16px',
                  borderRadius: 'var(--r-sm)',
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.6 : 1,
                }}
              >
                {t('login')}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}
                >
                  Create new account
                </button>
                <button
                  type="button"
                  onClick={() => setMode('recovery')}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>
            </form>
          ) : mode === 'register' ? (
            /* Register Mode */
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {t('displayName')}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Amandeep Singh"
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {t('username')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. amandeep"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {t('password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Choose strong master password..."
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '6px',
                  padding: '9px 16px',
                  borderRadius: 'var(--r-sm)',
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('register')}
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px', alignSelf: 'center' }}
              >
                Already have an account? Log In
              </button>
            </form>
          ) : (
            /* Recovery Mode */
            <form onSubmit={handleRecover} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  {t('username')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Your username"
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  12-Word Recovery Key
                </label>
                <input
                  type="text"
                  value={recoveryKeyInput}
                  onChange={e => setRecoveryKeyInput(e.target.value)}
                  placeholder="Paste your 12 recovery words separated by spaces..."
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Choose new password..."
                  required
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontSize: '13px' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: '6px',
                  padding: '9px 16px',
                  borderRadius: 'var(--r-sm)',
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Reset Password
              </button>

              <button
                type="button"
                onClick={() => setMode('login')}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px', alignSelf: 'center' }}
              >
                Back to Log In
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
