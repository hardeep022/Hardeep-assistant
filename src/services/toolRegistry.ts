import type { SecurityTier, FileDiff } from '../types';

export interface ToolDefinition {
  name: string;
  description: string;
  securityTier: SecurityTier;
  parameters: Record<string, string>;
  execute: (args: Record<string, any>, permissionLevel?: 'ask_every_time' | 'trusted' | 'full_agent') => Promise<{ success: boolean; result?: any; diff?: FileDiff; error?: string; requiresConfirmation?: boolean }>;
}

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  constructor() {
    this.registerDefaults();
  }

  public register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  public get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  public getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  private registerDefaults() {
    // Read File
    this.register({
      name: 'read_file',
      description: 'Read the contents of a file in the workspace.',
      securityTier: 'safe',
      parameters: { path: 'Absolute or workspace-relative path to file' },
      execute: async (args) => {
        if (!window.nova?.readFileContent) {
          return { success: false, error: 'File reading IPC is not available' };
        }
        const res = await window.nova.readFileContent(args.path);
        return { success: res.success, result: res.content, error: res.error };
      },
    });

    // Create File
    this.register({
      name: 'create_file',
      description: 'Create a new file with specified content in the workspace.',
      securityTier: 'confirmation_required',
      parameters: { path: 'Path to file', content: 'Text content' },
      execute: async (args, permissionLevel) => {
        if (permissionLevel === 'ask_every_time' && !args.bypassed) {
          return { success: false, requiresConfirmation: true, result: 'Approval required to create file' };
        }
        if (!window.nova?.writeFileContent) {
          return { success: false, error: 'File writing IPC is not available' };
        }
        const res = await window.nova.writeFileContent(args.path, args.content || '');
        return { success: res.success, diff: res.diff, result: `File created at ${args.path}`, error: res.error };
      },
    });

    // Edit File
    this.register({
      name: 'edit_file',
      description: 'Modify an existing file with updated content and generate a code diff.',
      securityTier: 'confirmation_required',
      parameters: { path: 'Path to file', content: 'New full text content' },
      execute: async (args, permissionLevel) => {
        if (permissionLevel === 'ask_every_time' && !args.bypassed) {
          return { success: false, requiresConfirmation: true, result: 'Approval required to edit file' };
        }
        if (!window.nova?.writeFileContent) {
          return { success: false, error: 'File writing IPC is not available' };
        }
        const res = await window.nova.writeFileContent(args.path, args.content || '');
        return { success: res.success, diff: res.diff, result: `File modified at ${args.path}`, error: res.error };
      },
    });

    // Delete File
    this.register({
      name: 'delete_file',
      description: 'Delete a file from the workspace.',
      securityTier: 'confirmation_required',
      parameters: { path: 'Path to file to remove' },
      execute: async (args, permissionLevel) => {
        if (permissionLevel !== 'full_agent' && !args.bypassed) {
          return { success: false, requiresConfirmation: true, result: 'Approval required to delete file' };
        }
        if (!window.nova?.deleteWorkspaceFile) {
          return { success: false, error: 'File delete IPC is not available' };
        }
        const res = await window.nova.deleteWorkspaceFile(args.path);
        return { success: res.success, result: `File deleted: ${args.path}`, error: res.error };
      },
    });

    // Search Codebase
    this.register({
      name: 'search_code',
      description: 'Search exact keywords, symbols, or filenames across indexed project workspace.',
      securityTier: 'safe',
      parameters: { query: 'Search pattern or symbol name', rootPath: 'Workspace root path' },
      execute: async (args) => {
        if (!window.nova?.searchCodebase) {
          return { success: false, error: 'Code search IPC is not available' };
        }
        const res = await window.nova.searchCodebase(args.query, args.rootPath || '');
        return { success: res.success, result: res.results, error: res.error };
      },
    });

    // Execute Terminal Command
    this.register({
      name: 'execute_terminal',
      description: 'Run a development shell command (npm, git, pytest, build scripts) in workspace.',
      securityTier: 'confirmation_required',
      parameters: { command: 'Shell command string', cwd: 'Working directory' },
      execute: async (args, permissionLevel) => {
        if (permissionLevel === 'ask_every_time' && !args.bypassed) {
          return { success: false, requiresConfirmation: true, result: `Approval required to run command: ${args.command}` };
        }
        if (!window.nova?.executeTerminalCommand) {
          return { success: false, error: 'Terminal execution IPC is not available' };
        }
        const res = await window.nova.executeTerminalCommand(args.command, args.cwd);
        return {
          success: res.success,
          result: { stdout: res.stdout, stderr: res.stderr, exitCode: res.exitCode, durationMs: res.durationMs },
          error: res.exitCode !== 0 ? res.stderr || `Exit code ${res.exitCode}` : undefined,
        };
      },
    });

    // Git Status
    this.register({
      name: 'git_status',
      description: 'Get current Git repository branch and changed file status.',
      securityTier: 'safe',
      parameters: { cwd: 'Workspace directory' },
      execute: async (args) => {
        if (!window.nova?.gitStatus) {
          return { success: false, error: 'Git IPC not available' };
        }
        const res = await window.nova.gitStatus(args.cwd);
        return { success: res.success, result: res };
      },
    });

    // Git Diff
    this.register({
      name: 'git_diff',
      description: 'View unstaged or staged Git diffs for the active project.',
      securityTier: 'safe',
      parameters: { cwd: 'Workspace directory' },
      execute: async (args) => {
        if (!window.nova?.gitDiff) {
          return { success: false, error: 'Git IPC not available' };
        }
        const res = await window.nova.gitDiff(args.cwd);
        return { success: res.success, result: res.diff };
      },
    });

    // Git Commit
    this.register({
      name: 'git_commit',
      description: 'Stage all changes and commit with specified message.',
      securityTier: 'confirmation_required',
      parameters: { message: 'Commit message string', cwd: 'Workspace directory' },
      execute: async (args, permissionLevel) => {
        if (permissionLevel === 'ask_every_time' && !args.bypassed) {
          return { success: false, requiresConfirmation: true, result: `Approval required to commit changes: "${args.message}"` };
        }
        if (!window.nova?.gitCommit) {
          return { success: false, error: 'Git IPC not available' };
        }
        const res = await window.nova.gitCommit(args.message, args.cwd);
        return { success: res.success, result: res.output, error: res.error };
      },
    });

    // Run Tests
    this.register({
      name: 'run_tests',
      description: 'Execute project test suite (npm test, vitest, jest, pytest) and capture failures.',
      securityTier: 'safe',
      parameters: { command: 'Optional test command override', cwd: 'Workspace path' },
      execute: async (args) => {
        const cmd = args.command || 'npm test';
        if (!window.nova?.executeTerminalCommand) {
          return { success: false, error: 'Terminal IPC not available' };
        }
        const res = await window.nova.executeTerminalCommand(cmd, args.cwd, 60000);
        return {
          success: res.success,
          result: { stdout: res.stdout, stderr: res.stderr, exitCode: res.exitCode },
          error: res.exitCode !== 0 ? res.stderr || 'Test execution failed' : undefined,
        };
      },
    });
  }
}

export const toolRegistry = new ToolRegistry();
