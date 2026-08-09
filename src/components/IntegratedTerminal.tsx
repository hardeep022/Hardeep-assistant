import React, { useState, useRef, useEffect } from 'react';

interface TerminalLog {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  timestamp: number;
}

interface IntegratedTerminalProps {
  workspacePath: string | null;
  logs: TerminalLog[];
  onRunCommand: (cmd: string) => void;
  onClearLogs: () => void;
}

export function IntegratedTerminal({
  workspacePath,
  logs,
  onRunCommand,
  onClearLogs,
}: IntegratedTerminalProps) {
  const [inputCmd, setInputCmd] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCmd.trim()) return;
    onRunCommand(inputCmd.trim());
    setInputCmd('');
  };

  const handleQuickCmd = (cmd: string) => {
    onRunCommand(cmd);
  };

  return (
    <div className="integrated-terminal">
      <div className="terminal-header">
        <div className="terminal-title">
          <span className="icon">💻</span>
          <span>INTEGRATED TERMINAL</span>
          {workspacePath && <span className="cwd-path">{workspacePath}</span>}
        </div>
        <div className="terminal-actions">
          <button onClick={() => handleQuickCmd('npm test')} title="Run Test Suite">
            🧪 npm test
          </button>
          <button onClick={() => handleQuickCmd('git status')} title="Git Status">
            🌿 git status
          </button>
          <button onClick={() => handleQuickCmd('npm run build')} title="Build Project">
            ⚡ build
          </button>
          <button onClick={onClearLogs} title="Clear Terminal Logs">
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="terminal-output-body">
        {logs.length === 0 ? (
          <div className="terminal-welcome">
            <p>Nova Terminal Shell v1.0. Ready for commands.</p>
            <p className="dim">Type commands below or click quick action buttons.</p>
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="terminal-entry">
              <div className="entry-cmd-line">
                <span className="prompt-symbol">$</span>
                <span className="cmd-text">{log.command}</span>
                <span className="duration">({log.durationMs}ms)</span>
              </div>
              {log.stdout && <pre className="stdout-text">{log.stdout}</pre>}
              {log.stderr && <pre className="stderr-text">{log.stderr}</pre>}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form className="terminal-input-form" onSubmit={handleSubmit}>
        <span className="prompt-prefix">$</span>
        <input
          type="text"
          className="terminal-input"
          placeholder="Run terminal command (e.g. npm test, git status)..."
          value={inputCmd}
          onChange={e => setInputCmd(e.target.value)}
        />
        <button type="submit" className="run-btn">Run</button>
      </form>
    </div>
  );
}
