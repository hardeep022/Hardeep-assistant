import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      await login(username, password);
      navigate('/');
    } catch {
      // Error is set in store
    }
  };

  return (
    <div className="login-page">
      <div className="login-container animate-fade-in">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-orb" />
          <h1 className="login-title">Nova</h1>
          <p className="login-subtitle">Your intelligent desktop companion</p>
        </div>

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className="input-field"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <div className="login-password-wrapper">
              <input
                id="password"
                className="input-field"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="login-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error animate-fade-in">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary login-submit"
            disabled={loading || !username || !password}
          >
            {loading ? <span className="spinner" /> : 'Log In'}
          </button>
        </form>

        {/* Footer */}
        <p className="login-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>

      {/* Background decoration */}
      <div className="login-bg-glow" />
    </div>
  );
}
