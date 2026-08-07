import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { SettingsModal } from './components/SettingsModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ProductivityModal } from './components/ProductivityModal';
import { CybersecurityToolsModal } from './components/CybersecurityToolsModal';
import './App.css';

function AppShell() {
  const { state, dispatch } = useApp();
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        dispatch({ type: 'NEW_CHAT' });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        dispatch({ type: 'SET_SETTINGS_OPEN', open: true });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsShortcutsOpen(false);
        dispatch({ type: 'SET_PRODUCTIVITY_OPEN', open: false });
        dispatch({ type: 'SET_SECURITY_TOOLS_OPEN', open: false });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);

  return (
    <div className="app-shell">
      <Sidebar />
      <ChatView />
      <SettingsModal />
      <KeyboardShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />
      <ProductivityModal
        isOpen={state.isProductivityOpen}
        onClose={() => dispatch({ type: 'SET_PRODUCTIVITY_OPEN', open: false })}
      />
      <CybersecurityToolsModal
        isOpen={state.isSecurityToolsOpen}
        onClose={() => dispatch({ type: 'SET_SECURITY_TOOLS_OPEN', open: false })}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AppProvider>
  );
}
