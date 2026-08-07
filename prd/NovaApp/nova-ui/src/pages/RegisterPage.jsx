import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import './RegisterPage.css';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    language: 'en',
  });
  const [savedKey, setSavedKey] = useState(false);
  const { register, loading, error, recoveryKey, clearError, clearRecoveryKey } = useAuthStore();
  const navigate = useNavigate();

  const passwordStrength = getPasswordStrength(formData.password);
  const passwordsMatch = formData.password === formData.confirmPassword;
  const canSubmit =
    formData.username.length >= 3 &&
    formData.displayName.length >= 1 &&
    formData.password.length >= 8 &&
    passwordsMatch &&
    !loading;

  const handleChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await register(
        formData.username,
        formData.displayName,
        formData.password,
        formData.language
      );
    } catch {
      // Error is set in store
    }
  };

  const handleContinue = () => {
    clearRecoveryKey();
    navigate('/');
  };

  // Show recovery key after successful registration
  if (recoveryKey) {
    return (
      <div className="register-page">
        <div className="register-container animate-fade-in">
          <div className="recovery-key-card">
            <div className="recovery-icon">🔑</div>
            <h2>Save Your Recovery Key</h2>
            <p className="recovery-desc">
              Write this key down and store it somewhere safe. You'll need it if you ever forget your password.
            </p>
            <div className="recovery-key-box">
              <code>{recoveryKey}</code>
              <button
                className="recovery-copy"
                onClick={() => {
                  navigator.clipboard.writeText(recoveryKey);
                }}
              >
                📋 Copy
              </button>
            </div>
            <div className="recovery-warning">
              ⚠️ This key is shown only once. If you lose it, you cannot recover your account.
            </div>
            <label className="recovery-confirm">
              <input
                type="checkbox"
                checked={savedKey}
                onChange={(e) => setSavedKey(e.target.checked)}
              />
              I've saved my recovery key
            </label>
            <button
              className="btn-primary register-submit"
              disabled={!savedKey}
              onClick={handleContinue}
            >
              Continue to Nova
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-container animate-fade-in">
        <div className="register-header">
          <div className="login-orb" />
          <h1 className="login-title">Create Account</h1>
          <p className="login-subtitle">Join Nova — your AI desktop assistant</p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="displayName">Display Name</label>
            <input
              id="displayName"
              className="input-field"
              type="text"
              placeholder="How should Nova call you?"
              value={formData.displayName}
              onChange={handleChange('displayName')}
              autoFocus
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="reg-username">Username</label>
            <input
              id="reg-username"
              className="input-field"
              type="text"
              placeholder="Choose a username (min 3 chars)"
              value={formData.username}
              onChange={handleChange('username')}
              minLength={3}
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="reg-password">Password</label>
            <input
              id="reg-password"
              className="input-field"
              type="password"
              placeholder="Min 8 characters"
              value={formData.password}
              onChange={handleChange('password')}
              minLength={8}
              required
            />
            {formData.password && (
              <div className="password-strength">
                <div className="password-meter">
                  <div
                    className={`password-meter-fill strength-${passwordStrength.level}`}
                    style={{ width: `${passwordStrength.percent}%` }}
                  />
                </div>
                <span className={`password-label strength-${passwordStrength.level}`}>
                  {passwordStrength.label}
                </span>
              </div>
            )}
          </div>

          <div className="login-field">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              className="input-field"
              type="password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              required
            />
            {formData.confirmPassword && !passwordsMatch && (
              <span className="field-error">Passwords don't match</span>
            )}
          </div>

          <div className="login-field">
            <label htmlFor="language">Preferred Language</label>
            <select
              id="language"
              className="input-field"
              value={formData.language}
              onChange={handleChange('language')}
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी (Hindi)</option>
              <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
            </select>
          </div>

          {error && (
            <div className="login-error animate-fade-in">{error}</div>
          )}

          <button type="submit" className="btn-primary register-submit" disabled={!canSubmit}>
            {loading ? <span className="spinner" /> : 'Create Account'}
          </button>
        </form>

        <p className="login-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

function getPasswordStrength(password) {
  if (!password) return { level: 'none', label: '', percent: 0 };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 'weak', label: 'Weak', percent: 20 };
  if (score <= 2) return { level: 'fair', label: 'Fair', percent: 40 };
  if (score <= 3) return { level: 'good', label: 'Good', percent: 65 };
  if (score <= 4) return { level: 'strong', label: 'Strong', percent: 85 };
  return { level: 'excellent', label: 'Excellent', percent: 100 };
}
