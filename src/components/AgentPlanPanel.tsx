import type { AgentPlan, ProjectMetadata } from '../types';


interface AgentPlanPanelProps {
  plan: AgentPlan | null;
  metadata: ProjectMetadata | null;
  activeFilePath: string | null;
  onExecuteNextStep: () => void;
}

export function AgentPlanPanel({
  plan,
  metadata,
  activeFilePath,
  onExecuteNextStep,
}: AgentPlanPanelProps) {
  return (
    <div className="agent-plan-panel">
      <div className="panel-section-header">
        <span>🤖 AGENT EXECUTION PLAN</span>
      </div>

      {!plan ? (
        <div className="empty-plan-state">
          <p>No active agent task.</p>
          <span className="subtext">Ask Nova to build, search, refactor, or debug code to see the execution plan here.</span>
        </div>
      ) : (
        <div className="plan-content">
          <div className="plan-task-title">
            <span className="label">GOAL:</span>
            <p className="prompt">{plan.taskPrompt}</p>
          </div>

          <div className="plan-status-badge">
            <span className={`status-tag status-${plan.status}`}>{plan.status.toUpperCase()}</span>
            <span className="step-count">Step {plan.currentStepIndex + 1} of {plan.steps.length}</span>
          </div>

          <div className="steps-list">
            {plan.steps.map((step, idx) => (
              <div key={step.id} className={`step-item step-${step.status}`}>
                <div className="step-header">
                  <span className="step-icon">
                    {step.status === 'completed' && '✅'}
                    {step.status === 'in_progress' && '⏳'}
                    {step.status === 'pending' && '⚪'}
                    {step.status === 'failed' && '❌'}
                    {step.status === 'blocked' && '🔒'}
                  </span>
                  <span className="step-title">{idx + 1}. {step.title}</span>
                </div>
                {step.output && (
                  <div className="step-output-box">
                    <pre>{step.output.slice(0, 300)}</pre>
                  </div>
                )}
                {step.error && (
                  <div className="step-error-box">
                    <span>⚠️ {step.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {plan.status === 'paused' || plan.status === 'planning' ? (
            <button className="execute-step-btn" onClick={onExecuteNextStep}>
              ▶ Approve & Continue
            </button>
          ) : null}
        </div>
      )}

      {/* Workspace Context Section */}
      <div className="panel-section-header context-header">
        <span>📦 PROJECT CONTEXT</span>
      </div>
      <div className="context-box">
        {metadata ? (
          <div className="context-info">
            <div className="info-row">
              <span className="lbl">Project:</span>
              <span className="val">{metadata.name}</span>
            </div>
            <div className="info-row">
              <span className="lbl">Stack:</span>
              <span className="val">{metadata.languages.join(', ') || 'Auto'}</span>
            </div>
            {metadata.testFramework && (
              <div className="info-row">
                <span className="lbl">Tests:</span>
                <span className="val">{metadata.testFramework}</span>
              </div>
            )}
            {activeFilePath && (
              <div className="info-row active-file">
                <span className="lbl">Active File:</span>
                <span className="val">{activeFilePath.split(/[/\\]/).pop()}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-context">Open a folder to load workspace intelligence.</div>
        )}
      </div>
    </div>
  );
}
