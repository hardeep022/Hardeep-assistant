import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChatView } from './ChatView';
import { DiffViewerModal } from './DiffViewerModal';

import { AgentOrchestrator } from '../services/agentOrchestrator';

import { MODELS } from '../types';
import type { WorkspaceTreeItem, ProjectMetadata, AgentPlan, FileDiff, AgentPermissionLevel } from '../types';

export function DeveloperLayout() {
  const { state, dispatch } = useApp();


  // Workspace state
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [tree, setTree] = useState<WorkspaceTreeItem | null>(null);
  const [metadata, setMetadata] = useState<ProjectMetadata | null>(null);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);

  // Agent State
  const [permissionLevel, setPermissionLevel] = useState<AgentPermissionLevel>('ask_every_time');
  const [agentPlan, setAgentPlan] = useState<AgentPlan | null>(null);
  const [activeDiff, setActiveDiff] = useState<FileDiff | null>(null);
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [tokensPerSec] = useState<number>(0);

  // Agent Orchestrator instance
  const [orchestrator] = useState(() => new AgentOrchestrator(
    permissionLevel,
    (plan) => setAgentPlan(plan),
    (diff) => {
      setActiveDiff(diff);
      setIsDiffOpen(true);
    }
  ));

  useEffect(() => {
    orchestrator.setPermissionLevel(permissionLevel);
  }, [permissionLevel, orchestrator]);

  // Open Workspace Selector
  const handleSelectWorkspace = async () => {
    if (!window.nova?.selectWorkspaceFolder) return;
    const res = await window.nova.selectWorkspaceFolder();
    if (res.success && res.path) {
      setWorkspacePath(res.path);
      loadTree(res.path);
    }
  };

  const loadTree = async (rootPath: string) => {
    if (!window.nova?.getWorkspaceTree) return;
    const res = await window.nova.getWorkspaceTree(rootPath);
    if (res.success && res.tree) {
      setTree(res.tree);
      setMetadata(res.metadata || null);
      orchestrator.setWorkspace(rootPath, res.metadata);
    }
  };

  // Trigger agent planning from chat prompt
  const handleAgentTask = (prompt: string) => {
    const plan = orchestrator.createPlan(prompt);
    setAgentPlan(plan);
    orchestrator.executeNextStep();
  };

  return (
    <div className="developer-layout">
      {/* Main Grid: Left Panel | Center Chat */}
      <div className="layout-body">
        {/* Left Sidebar Panel */}
        <aside className="left-panel">
          <div className="sidebar-tab-bar">
            <button
              className="tab-btn active"
              title="Conversations"
            >
              💬 Conversations
            </button>
          </div>

          <div className="panel-tab-content">
            <div className="chats-list-panel">
              <div className="new-chat-bar">
                <button className="new-chat-btn" onClick={() => dispatch({ type: 'NEW_CHAT' })}>
                  ➕ New Conversation
                </button>
              </div>
              <div className="conversations-scroll">
                {state.conversations.map(c => (
                  <div
                    key={c.id}
                    className={`conv-item ${c.id === state.activeConversationId ? 'active' : ''}`}
                    onClick={() => dispatch({ type: 'SELECT_CHAT', id: c.id })}
                  >
                    <span className="conv-title">{c.title || 'Untitled Conversation'}</span>
                    <button
                      className="del-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch({ type: 'DELETE_CHAT', id: c.id });
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>


        {/* Center Section: AI Chat & Code Agent */}
        <main className="center-panel">
          <ChatView onAgentPrompt={handleAgentTask} />
        </main>
      </div>


      {/* Code Diff Viewer Modal */}
      <DiffViewerModal
        isOpen={isDiffOpen}
        diff={activeDiff}
        onAccept={() => setIsDiffOpen(false)}
        onReject={() => setIsDiffOpen(false)}
        onClose={() => setIsDiffOpen(false)}
      />
    </div>
  );
}
