import { useState } from 'react';
import type { WorkspaceTreeItem, ProjectMetadata } from '../types';


interface FileExplorerProps {
  workspacePath: string | null;
  tree: WorkspaceTreeItem | null;
  metadata: ProjectMetadata | null;
  activeFilePath: string | null;
  onSelectWorkspace: () => void;
  onFileSelect: (filePath: string) => void;
}

interface TreeNodeProps {
  node: WorkspaceTreeItem;
  activeFilePath: string | null;
  onFileSelect: (filePath: string) => void;
  depth?: number;
}

function TreeNode({ node, activeFilePath, onFileSelect, depth = 0 }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(depth === 0);

  if (node.isDir) {
    return (
      <div className="tree-folder-group">
        <div
          className="tree-item folder-item"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="tree-icon">{isOpen ? '📂' : '📁'}</span>
          <span className="tree-name">{node.name}</span>
        </div>
        {isOpen && node.children && (
          <div className="tree-children">
            {node.children.map((child, idx) => (
              <TreeNode
                key={`${child.path}-${idx}`}
                node={child}
                activeFilePath={activeFilePath}
                onFileSelect={onFileSelect}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = activeFilePath === node.path;
  const ext = node.name.slice(node.name.lastIndexOf('.'));
  const icon = getFileIcon(ext);

  return (
    <div
      className={`tree-item file-item ${isSelected ? 'selected' : ''}`}
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
      onClick={() => onFileSelect(node.path)}
    >
      <span className="tree-icon">{icon}</span>
      <span className="tree-name">{node.name}</span>
    </div>
  );
}

function getFileIcon(ext: string): string {
  switch (ext) {
    case '.ts':
    case '.tsx': return '📘';
    case '.js':
    case '.jsx': return '🟨';
    case '.json': return '📜';
    case '.css': return '🎨';
    case '.html': return '🌐';
    case '.md': return '📝';
    case '.py': return '🐍';
    case '.rs': return '⚙️';
    default: return '📄';
  }
}

export function FileExplorer({
  workspacePath,
  tree,
  metadata,
  activeFilePath,
  onSelectWorkspace,
  onFileSelect,
}: FileExplorerProps) {
  return (
    <div className="file-explorer-container">
      <div className="explorer-header">
        <div className="explorer-title">
          <span>PROJECT WORKSPACE</span>
        </div>
        <button className="open-workspace-btn" onClick={onSelectWorkspace} title="Change Project Folder">
          📁 Open Folder
        </button>
      </div>

      {metadata && (
        <div className="project-badge-bar">
          <span className="project-name">{metadata.name}</span>
          <div className="tags">
            {metadata.languages.map(lang => (
              <span key={lang} className="chip lang">{lang}</span>
            ))}
            {metadata.frameworks.map(fw => (
              <span key={fw} className="chip fw">{fw}</span>
            ))}
            {metadata.hasGit && <span className="chip git">git</span>}
          </div>
        </div>
      )}

      <div className="explorer-tree-view">
        {!workspacePath ? (
          <div className="empty-workspace-state">
            <p>No project workspace opened.</p>
            <button className="primary-action-btn" onClick={onSelectWorkspace}>
              Select Folder
            </button>
          </div>
        ) : tree ? (
          <TreeNode
            node={tree}
            activeFilePath={activeFilePath}
            onFileSelect={onFileSelect}
          />
        ) : (
          <div className="loading-state">Loading workspace tree...</div>
        )}
      </div>
    </div>
  );
}
