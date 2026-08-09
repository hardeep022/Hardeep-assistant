import { useEffect, useState, lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { I18nProvider } from './i18n/I18nContext';
import { ToastProvider } from './components/Toast';
import { DeveloperLayout } from './components/DeveloperLayout';
import { useReminderScheduler } from './hooks/useReminderScheduler';
import './App.css';

const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const KeyboardShortcutsModal = lazy(() => import('./components/KeyboardShortcutsModal').then(m => ({ default: m.KeyboardShortcutsModal })));
const ProductivityModal = lazy(() => import('./components/ProductivityModal').then(m => ({ default: m.ProductivityModal })));
const CybersecurityToolsModal = lazy(() => import('./components/CybersecurityToolsModal').then(m => ({ default: m.CybersecurityToolsModal })));
const ActionConfirmModal = lazy(() => import('./components/ActionConfirmModal').then(m => ({ default: m.ActionConfirmModal })));
const ActionLogsModal = lazy(() => import('./components/ActionLogsModal').then(m => ({ default: m.ActionLogsModal })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const ScreenShareGuideModal = lazy(() => import('./components/ScreenShareGuideModal').then(m => ({ default: m.ScreenShareGuideModal })));

function AppShell() {
  const { state, dispatch } = useApp();
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Background reminder notification watcher
  useReminderScheduler();

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
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        dispatch({ type: 'SET_SCREEN_GUIDE_OPEN', open: true });
      }
      if (e.key === 'Escape') {
        setIsShortcutsOpen(false);
        dispatch({ type: 'SET_PRODUCTIVITY_OPEN', open: false });
        dispatch({ type: 'SET_SECURITY_TOOLS_OPEN', open: false });
        dispatch({ type: 'SET_AUTH_OPEN', open: false });
        dispatch({ type: 'SET_ACTION_LOGS_OPEN', open: false });
        dispatch({ type: 'SET_SCREEN_GUIDE_OPEN', open: false });
        dispatch({ type: 'SET_PENDING_ACTION', action: null });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch]);


  return (
    <div className="app-shell">
      <DeveloperLayout />
      <Suspense fallback={null}>

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
        <ActionConfirmModal
          isOpen={!!state.pendingAction}
          action={state.pendingAction?.action || (state.pendingAction ? { type: state.pendingAction.actionType || 'open_app', target: state.pendingAction.target, label: state.pendingAction.description } : null)}
          onConfirm={async () => {
            if (state.pendingAction && window.nova?.executeAction) {
              const reqAction = state.pendingAction.action || { type: state.pendingAction.actionType, target: state.pendingAction.target };
              const res = await window.nova.executeAction(reqAction, true);
              dispatch({
                type: 'ADD_ACTION_LOG',
                log: {
                  id: crypto.randomUUID(),
                  actionType: reqAction.type,
                  riskLevel: state.pendingAction.riskLevel || 'warning',
                  status: (res.success || res.ok) ? 'executed' : 'failed',
                  target: reqAction.target,
                  details: res.output || res.error || res.reason,
                  timestamp: Date.now(),
                },
              });
            }
            dispatch({ type: 'SET_PENDING_ACTION', action: null });
          }}
          onCancel={() => {
            if (state.pendingAction) {
              const reqAction = state.pendingAction.action || { type: state.pendingAction.actionType, target: state.pendingAction.target };
              dispatch({
                type: 'ADD_ACTION_LOG',
                log: {
                  id: crypto.randomUUID(),
                  actionType: reqAction.type,
                  riskLevel: state.pendingAction.riskLevel || 'warning',
                  status: 'cancelled',
                  target: reqAction.target,
                  details: 'User cancelled action confirmation',
                  timestamp: Date.now(),
                },
              });
            }
            dispatch({ type: 'SET_PENDING_ACTION', action: null });
          }}
        />
        <ActionLogsModal
          isOpen={state.isActionLogsOpen}
          onClose={() => dispatch({ type: 'SET_ACTION_LOGS_OPEN', open: false })}
        />
        <AuthModal
          isOpen={state.isAuthOpen}
          onClose={() => dispatch({ type: 'SET_AUTH_OPEN', open: false })}
        />
        <ScreenShareGuideModal
          isOpen={state.isScreenGuideOpen}
          onClose={() => dispatch({ type: 'SET_SCREEN_GUIDE_OPEN', open: false })}
        />
      </Suspense>

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <I18nProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </I18nProvider>
    </AppProvider>
  );
}

