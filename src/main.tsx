import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Nova UI Crash:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#0a0d14', color: '#f87171', fontFamily: 'sans-serif', height: '100vh' }}>
          <h2>⚠️ Nova UI Error Encountered</h2>
          <p style={{ color: '#94a3b8' }}>An unexpected error occurred while rendering the UI.</p>
          <pre style={{ background: '#161a26', padding: '16px', borderRadius: '8px', color: '#fbbf24', overflowX: 'auto' }}>
            {String(this.state.error?.stack || this.state.error || 'Unknown Error')}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '16px' }}
          >
            Reload Nova
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)