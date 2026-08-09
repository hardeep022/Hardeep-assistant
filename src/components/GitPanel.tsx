import { useState, useEffect } from 'react';


interface GitFile {
  status: string;
  path: string;
}

interface GitPanelProps {
  workspacePath: string | null;
  onViewDiff: () => void;
}

export function GitPanel({ workspacePath, onViewDiff }: GitPanelProps) {
  const [branch, setBranch] = useState<string>('main');
  const [files, setFiles] = useState<GitFile[]>([]);
  const [isGit, setIsGit] = useState<boolean>(true);
  const [commitMsg, setCommitMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');

  const refreshGit = async () => {
    if (!window.nova?.gitStatus) return;
    setLoading(true);
    try {
      const res = await window.nova.gitStatus(workspacePath || undefined);
      if (res.success) {
        setIsGit(res.isGit);
        setBranch(res.branch || 'main');
        setFiles(res.files || []);
      } else {
        setIsGit(false);
      }
    } catch {
      setIsGit(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshGit();
  }, [workspacePath]);

  const handleCommit = async () => {
    if (!commitMsg.trim() || !window.nova?.gitCommit) return;
    setLoading(true);
    try {
      const res = await window.nova.gitCommit(commitMsg.trim(), workspacePath || undefined);
      if (res.success) {
        setStatusText('✓ Changes committed successfully!');
        setCommitMsg('');
        refreshGit();
      } else {
        setStatusText(`⚠️ Commit error: ${res.error}`);
      }
    } catch (err: any) {
      setStatusText(`⚠️ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateCommitMessage = () => {
    if (files.length === 0) {
      setCommitMsg('chore: minor updates');
      return;
    }
    const fileList = files.slice(0, 3).map(f => f.path.split(/[/\\]/).pop()).join(', ');
    setCommitMsg(`feat: update ${fileList}`);
  };

  if (!isGit) {
    return (
      <div className="git-panel-container empty">
        <p>No Git repository detected in this workspace.</p>
      </div>
    );
  }

  return (
    <div className="git-panel-container">
      <div className="git-header">
        <span className="icon">🌿</span>
        <span className="branch-name">{branch}</span>
        <button className="refresh-btn" onClick={refreshGit} disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      <div className="changed-files-header">
        <span>CHANGED FILES ({files.length})</span>
        <button className="view-diff-btn" onClick={onViewDiff}>
          📄 View Diff
        </button>
      </div>

      <div className="changed-files-list">
        {files.length === 0 ? (
          <div className="clean-working-tree">Working tree clean. No modified files.</div>
        ) : (
          files.map((file, idx) => (
            <div key={idx} className="git-file-row">
              <span className={`status-badge status-${file.status}`}>{file.status}</span>
              <span className="file-path">{file.path}</span>
            </div>
          ))
        )}
      </div>

      <div className="commit-box">
        <div className="commit-header">
          <span>COMMIT CHANGES</span>
          <button className="ai-gen-btn" onClick={generateCommitMessage}>
            ✨ Auto Message
          </button>
        </div>
        <textarea
          className="commit-input"
          placeholder="Enter commit message..."
          value={commitMsg}
          onChange={e => setCommitMsg(e.target.value)}
        />
        <button
          className="commit-submit-btn"
          disabled={!commitMsg.trim() || loading}
          onClick={handleCommit}
        >
          Commit to {branch}
        </button>
        {statusText && <span className="status-msg">{statusText}</span>}
      </div>
    </div>
  );
}
