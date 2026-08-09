import type { AgentPlan, AgentPlanStep, AgentPermissionLevel, FileDiff, ProjectMetadata } from '../types';
import { toolRegistry } from './toolRegistry';

export class AgentOrchestrator {
  private currentPlan: AgentPlan | null = null;
  private permissionLevel: AgentPermissionLevel = 'ask_every_time';
  private workspaceRoot: string = '';
  private projectMetadata: ProjectMetadata | null = null;
  private onPlanUpdate?: (plan: AgentPlan) => void;
  private onDiffGenerated?: (diff: FileDiff) => void;
  private onLog?: (stepId: string, text: string) => void;

  constructor(
    permissionLevel: AgentPermissionLevel = 'ask_every_time',
    onPlanUpdate?: (plan: AgentPlan) => void,
    onDiffGenerated?: (diff: FileDiff) => void,
    onLog?: (stepId: string, text: string) => void
  ) {
    this.permissionLevel = permissionLevel;
    this.onPlanUpdate = onPlanUpdate;
    this.onDiffGenerated = onDiffGenerated;
    this.onLog = onLog;
  }

  public setPermissionLevel(level: AgentPermissionLevel) {
    this.permissionLevel = level;
  }

  public setWorkspace(rootPath: string, metadata?: ProjectMetadata) {
    this.workspaceRoot = rootPath;
    this.projectMetadata = metadata || null;
  }

  public getCurrentPlan(): AgentPlan | null {
    return this.currentPlan;
  }

  /**
   * Create plan from prompt and workspace state
   */
  public createPlan(prompt: string): AgentPlan {
    const isTestTask = /\b(test|jest|vitest|pytest)\b/i.test(prompt);
    const isGitTask = /\b(git|commit|status|diff|branch)\b/i.test(prompt);
    const isSearchTask = /\b(find|search|where|locate)\b/i.test(prompt);
    const isFixTask = /\b(fix|bug|error|debug|repair)\b/i.test(prompt);

    const steps: AgentPlanStep[] = [];
    let stepId = 1;

    // Step 1: Inspect Workspace
    steps.push({
      id: `step-${stepId++}`,
      title: 'Inspect workspace structure & metadata',
      action: 'Inspect Workspace',
      status: 'pending',
      tool: 'read_file',
    });

    // Step 2: Code Search if applicable
    if (isSearchTask || isFixTask || prompt.length > 20) {
      steps.push({
        id: `step-${stepId++}`,
        title: `Search codebase for relevant symbols: "${prompt.slice(0, 30)}..."`,
        action: 'Search Codebase',
        status: 'pending',
        tool: 'search_code',
      });
    }

    // Step 3: Primary Task Action
    if (isGitTask) {
      steps.push({
        id: `step-${stepId++}`,
        title: 'Check Git repository status and diffs',
        action: 'Git Status',
        status: 'pending',
        tool: 'git_status',
      });
    } else {
      steps.push({
        id: `step-${stepId++}`,
        title: 'Generate or modify relevant source code files',
        action: 'Modify Files',
        status: 'pending',
        tool: 'edit_file',
      });
    }

    // Step 4: Testing & Verification
    if (isTestTask || this.projectMetadata?.testFramework) {
      steps.push({
        id: `step-${stepId++}`,
        title: `Execute project test suite (${this.projectMetadata?.testFramework || 'npm test'})`,
        action: 'Run Tests',
        status: 'pending',
        tool: 'run_tests',
      });
    }

    // Step 5: Final Report
    steps.push({
      id: `step-${stepId++}`,
      title: 'Synthesize changes and report result to developer',
      action: 'Final Summary',
      status: 'pending',
    });

    const plan: AgentPlan = {
      id: `plan-${Date.now()}`,
      taskPrompt: prompt,
      steps,
      currentStepIndex: 0,
      status: 'planning',
    };

    this.currentPlan = plan;
    if (this.onPlanUpdate) this.onPlanUpdate(plan);
    return plan;
  }

  /**
   * Execute current active step
   */
  public async executeNextStep(userApproved = false): Promise<{ done: boolean; plan: AgentPlan; diff?: FileDiff }> {
    if (!this.currentPlan) {
      throw new Error('No active plan to execute');
    }

    const plan = { ...this.currentPlan };
    if (plan.currentStepIndex >= plan.steps.length) {
      plan.status = 'completed';
      this.currentPlan = plan;
      if (this.onPlanUpdate) this.onPlanUpdate(plan);
      return { done: true, plan };
    }

    plan.status = 'executing';
    const step = plan.steps[plan.currentStepIndex];
    step.status = 'in_progress';
    if (this.onPlanUpdate) this.onPlanUpdate(plan);

    let stepDiff: FileDiff | undefined = undefined;

    try {
      if (step.tool) {
        const tool = toolRegistry.get(step.tool);
        if (tool) {
          const args: Record<string, any> = {
            cwd: this.workspaceRoot,
            rootPath: this.workspaceRoot,
            bypassed: userApproved,
          };

          if (step.tool === 'search_code') {
            args.query = plan.taskPrompt.split(/\s+/).slice(0, 3).join(' ');
          }

          const res = await tool.execute(args, this.permissionLevel);

          if (res.requiresConfirmation) {
            step.status = 'blocked';
            step.output = res.result || 'User approval required to proceed.';
            plan.status = 'paused';
            this.currentPlan = plan;
            if (this.onPlanUpdate) this.onPlanUpdate(plan);
            return { done: false, plan };
          }

          if (!res.success) {
            step.status = 'failed';
            step.error = res.error || 'Tool execution failed';
            // Debug recovery attempt
            if (step.tool === 'run_tests') {
              this.log(step.id, `[DEBUG AGENT] Test failure detected: ${step.error}. Constructing fix...`);
            }
          } else {
            step.status = 'completed';
            step.output = typeof res.result === 'string' ? res.result : JSON.stringify(res.result, null, 2);
            if (res.diff) {
              stepDiff = res.diff;
              if (this.onDiffGenerated) this.onDiffGenerated(res.diff);
            }
          }
        } else {
          step.status = 'completed';
          step.output = `Step "${step.title}" executed successfully.`;
        }
      } else {
        step.status = 'completed';
        step.output = `Completed step: ${step.title}`;
      }
    } catch (err: any) {
      step.status = 'failed';
      step.error = err.message || String(err);
    }

    plan.currentStepIndex += 1;
    if (plan.currentStepIndex >= plan.steps.length) {
      plan.status = plan.steps.some(s => s.status === 'failed') ? 'failed' : 'completed';
    }

    this.currentPlan = plan;
    if (this.onPlanUpdate) this.onPlanUpdate(plan);
    return { done: plan.status === 'completed' || plan.status === 'failed', plan, diff: stepDiff };
  }

  private log(stepId: string, text: string) {
    if (this.onLog) this.onLog(stepId, text);
  }
}
