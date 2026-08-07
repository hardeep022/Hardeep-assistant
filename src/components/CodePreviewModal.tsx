import { useState, useRef, useEffect } from 'react';

interface CodePreviewProps {
  code: string;
  language: string;
  onClose: () => void;
}

export function CodePreviewModal({ code, language, onClose }: CodePreviewProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'console'>('preview');
  const [logs, setLogs] = useState<Array<{ type: 'log' | 'error' | 'warn'; text: string }>>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generate full runnable HTML payload
  const getHTMLPayload = () => {
    const langLower = (language || '').toLowerCase();

    let scriptToRun = '';
    let bodyHTML: string;
    let cssCode = '';

    if (langLower === 'html' || langLower === 'xml' || langLower === 'svg') {
      bodyHTML = code;
    } else if (langLower === 'css') {
      cssCode = code;
      bodyHTML = `
        <div class="demo-box">
          <h2>CSS Style Preview</h2>
          <p>This box is styled using the generated CSS code.</p>
          <button class="btn">Sample Button</button>
        </div>
      `;
    } else if (langLower === 'js' || langLower === 'javascript' || langLower === 'ts' || langLower === 'typescript') {
      scriptToRun = code;
      bodyHTML = `
        <div id="output" style="font-family: system-ui, sans-serif; padding: 20px;">
          <h3>JavaScript Output Console</h3>
          <div id="app"></div>
        </div>
      `;
    } else if (langLower === 'python' || langLower === 'py') {
      bodyHTML = `
        <div style="font-family: system-ui, sans-serif; padding: 20px;">
          <h3>🐍 Python Output</h3>
          <pre id="py-out" style="background:#111219; color:#10b981; padding:16px; border-radius:8px;">Executing Python script...</pre>
        </div>
      `;
      scriptToRun = `
        try {
          console.log("Python code ready for execution.");
        } catch(e) { console.error(e); }
      `;
    } else {
      bodyHTML = `<pre style="font-family: monospace; white-space: pre-wrap;">${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:" />
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 16px;
              background-color: #0f172a;
              color: #f8fafc;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .demo-box {
              padding: 24px;
              border-radius: 12px;
              background: #1e293b;
              border: 1px solid #334155;
            }
            .btn {
              padding: 8px 16px;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
            }
            ${cssCode}
          </style>
          <script>
            // Intercept console messages and post to parent
            (function() {
              const origLog = console.log;
              const origErr = console.error;
              const origWarn = console.warn;

              console.log = function(...args) {
                origLog.apply(console, args);
                window.parent.postMessage({ type: 'LOG', level: 'log', text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
              };
              console.error = function(...args) {
                origErr.apply(console, args);
                window.parent.postMessage({ type: 'LOG', level: 'error', text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
              };
              console.warn = function(...args) {
                origWarn.apply(console, args);
                window.parent.postMessage({ type: 'LOG', level: 'warn', text: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') }, '*');
              };

              window.onerror = function(msg, url, line) {
                window.parent.postMessage({ type: 'LOG', level: 'error', text: msg + ' (Line ' + line + ')' }, '*');
              };
            })();
          </script>
        </head>
        <body>
          ${bodyHTML}
          <script>
            try {
              ${scriptToRun}
            } catch(err) {
              console.error(err.message || err);
            }
          </script>
        </body>
      </html>
    `;
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.source === iframeRef.current?.contentWindow && e.data && e.data.type === 'LOG') {
        setLogs(prev => [...prev, { type: e.data.level, text: e.data.text }]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRefresh = () => {
    setLogs([]);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = getHTMLPayload();
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: '820px', height: '85vh', maxWidth: 'calc(100vw - 32px)' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>▶</span>
            <span className="modal-title">Live Code Runner ({language || 'code'})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="btn-secondary" onClick={handleRefresh} style={{ padding: '4px 10px', fontSize: '12px' }}>
              ↻ Rerun
            </button>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button className={`modal-tab${activeTab === 'preview' ? ' active' : ''}`} onClick={() => setActiveTab('preview')}>
            🖥️ Live Output
          </button>
          <button className={`modal-tab${activeTab === 'console' ? ' active' : ''}`} onClick={() => setActiveTab('console')}>
            📟 Console Log {logs.length > 0 && `(${logs.length})`}
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: 0, position: 'relative', overflow: 'hidden' }}>
          {activeTab === 'preview' ? (
            <iframe
              ref={iframeRef}
              srcDoc={getHTMLPayload()}
              title="Live Code Preview"
              sandbox="allow-scripts"
              style={{ width: '100%', height: '100%', border: 'none', background: '#0f172a' }}
            />
          ) : (
            <div style={{ padding: '16px', background: '#0b0c10', height: '100%', overflowY: 'auto', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
              {logs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Console output is empty. Any console.log() or error calls will appear here.</p>
              ) : (
                logs.map((l, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '4px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      color: l.type === 'error' ? '#f87171' : l.type === 'warn' ? '#f59e0b' : '#34d399',
                    }}
                  >
                    [{l.type.toUpperCase()}] {l.text}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
