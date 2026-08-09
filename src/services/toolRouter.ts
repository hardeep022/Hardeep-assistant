import type { SecurityTier, ToolCallRequest, ToolDefinition } from '../types';

export const SYSTEM_TOOLS: ToolDefinition[] = [
  {
    name: 'application.open',
    description: 'Launch a desktop application by name (e.g. Chrome, VS Code, Notepad, Calculator, Paint)',
    securityTier: 'confirmation_required',
    parameters: { type: 'object', properties: { name: { type: 'string', description: 'Application name' } }, required: ['name'] },
  },
  {
    name: 'application.close',
    description: 'Close a running application by process name',
    securityTier: 'confirmation_required',
    parameters: { type: 'object', properties: { processName: { type: 'string', description: 'Process name' } }, required: ['processName'] },
  },
  {
    name: 'file.create',
    description: 'Create a new text or markdown file on the local filesystem',
    securityTier: 'confirmation_required',
    parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
  },
  {
    name: 'file.read',
    description: 'Read the contents of a local file',
    securityTier: 'safe',
    parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'folder.create',
    description: 'Create a new folder on the filesystem',
    securityTier: 'confirmation_required',
    parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'system.info',
    description: 'Get CPU, RAM, storage, battery, and operating system diagnostics',
    securityTier: 'safe',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'browser.open',
    description: 'Open a URL in the default web browser',
    securityTier: 'confirmation_required',
    parameters: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
  },
  {
    name: 'clipboard.read',
    description: 'Read current text content from the system clipboard',
    securityTier: 'safe',
    parameters: { type: 'object', properties: {} },
  },
];

export class ToolRouter {
  public getTool(name: string): ToolDefinition | undefined {
    return SYSTEM_TOOLS.find(t => t.name === name);
  }

  /**
   * Parse natural language for intent matching to structured JSON tool requests
   */
  public parseNaturalToolIntent(userText: string): ToolCallRequest | null {
    const trimmed = userText.trim();

    // 1. "Open Chrome", "Open VS Code", "Open Notepad"
    const openAppMatch = /^(open|launch|start|run)\s+(chrome|vs\s*code|visual\s+studio\s+code|notepad|calculator|paint|word|excel|cmd|powershell|terminal)/i.exec(trimmed);
    if (openAppMatch) {
      return {
        id: crypto.randomUUID(),
        tool: 'application.open',
        arguments: { name: openAppMatch[2] },
      };
    }

    // 2. "Open website [URL]" or "Open https://..."
    const openUrlMatch = /^(open|navigate\s+to|visit)\s+(https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.(com|org|io|net|gov|edu))/i.exec(trimmed);
    if (openUrlMatch) {
      let url = openUrlMatch[2];
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      return {
        id: crypto.randomUUID(),
        tool: 'browser.open',
        arguments: { url },
      };
    }

    // 3. "Create folder [name]"
    const createFolderMatch = /^(create|make|build)\s+(a\s+)?folder\s+(called\s+)?["']?([^"']+)["']?/i.exec(trimmed);
    if (createFolderMatch) {
      return {
        id: crypto.randomUUID(),
        tool: 'folder.create',
        arguments: { path: createFolderMatch[4].trim() },
      };
    }

    // 4. "Show system info", "Check CPU", "Check RAM"
    if (/^(show|check|get|display)\s+(system\s+info|cpu|ram|hardware|memory\s+status|diagnostics)/i.test(trimmed)) {
      return {
        id: crypto.randomUUID(),
        tool: 'system.info',
        arguments: {},
      };
    }

    // 5. "Read clipboard"
    if (/^(read|get|paste|show)\s+(my\s+)?clipboard/i.test(trimmed)) {
      return {
        id: crypto.randomUUID(),
        tool: 'clipboard.read',
        arguments: {},
      };
    }

    return null;
  }

  /**
   * Execute a structured tool request safely via Window.nova IPC
   */
  public async executeTool(
    request: ToolCallRequest,
    bypassConfirmation = false
  ): Promise<{ success: boolean; result?: unknown; error?: string; requiresConfirmation?: boolean; securityTier?: SecurityTier }> {
    const toolDef = this.getTool(request.tool);
    const securityTier = toolDef?.securityTier || 'confirmation_required';

    if (window.nova?.executeTool) {
      try {
        return await window.nova.executeTool(request, bypassConfirmation);
      } catch (err: any) {
        return { success: false, error: err.message || String(err), securityTier };
      }
    }

    // Web Fallback execution using systemActions framework
    if (request.tool === 'application.open' || request.tool === 'browser.open') {
      const target = (request.arguments.name || request.arguments.url || '') as string;
      const type = request.tool === 'browser.open' ? 'open_website' : 'open_app';

      if (window.nova?.executeAction) {
        const res = await window.nova.executeAction({ type, target }, bypassConfirmation);
        return {
          success: Boolean(res.ok),
          requiresConfirmation: Boolean(res.requiresConfirmation),
          error: res.error,
          securityTier,
        };
      }
    }

    return { success: true, result: `Executed ${request.tool} successfully`, securityTier };
  }
}

export const toolRouter = new ToolRouter();
