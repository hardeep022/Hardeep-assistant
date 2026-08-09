import type { ActionRequest, ActionRisk } from '../types';

export interface ActionParseResult {
  isAction: boolean;
  action?: ActionRequest;
  description?: string;
}

const COMMON_APP_MAP: Record<string, string> = {
  calculator: 'calc',
  calc: 'calc',
  कैलकुलेटर: 'calc',
  ਕੈਲਕੂਲੇਟਰ: 'calc',
  notepad: 'notepad',
  नोटपैड: 'notepad',
  ਨੋਟਪੈਡ: 'notepad',
  paint: 'mspaint',
  mspaint: 'mspaint',
  पेंट: 'mspaint',
  ਪੇਂਟ: 'mspaint',
  explorer: 'explorer',
  'file explorer': 'explorer',
  files: 'explorer',
  'task manager': 'taskmgr',
  taskmgr: 'taskmgr',
  'टास्क मैनेजर': 'taskmgr',
  'ਟਾਸਕ ਮੈਨੇਜਰ': 'taskmgr',
  terminal: 'terminal',
  cmd: 'cmd',
  'command prompt': 'cmd',
  powershell: 'powershell',
  vscode: 'code',
  code: 'code',
  browser: 'edge',
  edge: 'edge',
  chrome: 'chrome',
};

const COMMON_FOLDER_MAP: Record<string, string> = {
  downloads: '~/Downloads',
  documents: '~/Documents',
  desktop: '~/Desktop',
  pictures: '~/Pictures',
  music: '~/Music',
  videos: '~/Videos',
  'डाउनलोड': '~/Downloads',
  'ਡਾਊਨਲੋਡ': '~/Downloads',
  'ਦਸਤਾਵੇਜ਼': '~/Documents',
  'ਡੈਸਕਟਾਪ': '~/Desktop',
};

export function parseSystemActionIntent(input: string): ActionParseResult {
  const text = input.trim().toLowerCase();

  // Pattern: "open <target>" or "<target> खोलो" or "<target> ਖੋਲ੍ਹੋ"
  const openMatch =
    text.match(/^(?:please\s+)?(?:open|launch|start|run)\s+(.+)$/i) ||
    text.match(/^(.+?)\s+(?:खोलो|शुरू\s+करो|खोलो\s+जी)$/i) ||
    text.match(/^(.+?)\s+(?:ਖੋਲ੍ਹੋ|ਸ਼ੁਰੂ\s+ਕਰੋ|ਖੋਲ੍ਹੋ\s+ਜੀ)$/i);

  if (!openMatch) {
    // Check for "system info" query
    if (/system\s+info|system\s+spec|computer\s+spec|हार्डवेयर\s+जानकारी|ਸਿਸਟਮ\s+ਜਾਣਕਾਰੀ/i.test(text)) {
      return {
        isAction: true,
        action: { type: 'open_settings', target: 'about', label: 'System Specifications' },
        description: 'View System Information',
      };
    }
    return { isAction: false };
  }

  const rawTarget = openMatch[1].trim().replace(/[.!?]+$/, '');

  // 1. Website URLs
  if (/^https?:\/\//i.test(rawTarget) || /^www\.[a-z0-9-]+\.[a-z]{2,}/i.test(rawTarget) || /^[a-z0-9-]+\.(com|org|net|io|dev|edu|gov|co|ai|app)$/i.test(rawTarget)) {
    const url = rawTarget.startsWith('http') ? rawTarget : `https://${rawTarget}`;
    return {
      isAction: true,
      action: { type: 'open_website', target: url, label: `Open ${url}` },
      description: `Open Website: ${url}`,
    };
  }

  // Common quick websites (e.g. "open youtube", "open github", "open google")
  const quickWebsites: Record<string, string> = {
    youtube: 'https://youtube.com',
    'यूट्यूब': 'https://youtube.com',
    'ਯੂਟਿਊਬ': 'https://youtube.com',
    google: 'https://google.com',
    'गूगल': 'https://google.com',
    'ਗੂਗਲ': 'https://google.com',
    github: 'https://github.com',
    wikipedia: 'https://wikipedia.org',
    reddit: 'https://reddit.com',
    gmail: 'https://mail.google.com',
    chatgpt: 'https://chatgpt.com',
  };

  if (quickWebsites[rawTarget]) {
    return {
      isAction: true,
      action: { type: 'open_website', target: quickWebsites[rawTarget], label: `Open ${rawTarget}` },
      description: `Open ${rawTarget} in browser`,
    };
  }

  // 2. Settings URIs (e.g. "open settings", "open wifi settings", "open bluetooth settings")
  if (/settings|सेटिंग्स|ਸੈਟਿੰਗਾਂ/i.test(rawTarget)) {
    let subpage = '';
    if (/network|wifi|internet|वाईफाई|ਇੰਟਰਨੈੱਟ/i.test(rawTarget)) subpage = 'network';
    else if (/display|screen|स्क्रीन|ਸਕਰੀਨ/i.test(rawTarget)) subpage = 'display';
    else if (/sound|audio|आवाज|ਆਵਾਜ਼/i.test(rawTarget)) subpage = 'sound';
    else if (/bluetooth|ब्लूटूथ|ਬਲੂਟੁੱਥ/i.test(rawTarget)) subpage = 'bluetooth';
    else if (/update|अपडेट|ਅੱਪਡੇਟ/i.test(rawTarget)) subpage = 'windowsupdate';
    else if (/privacy|गोपनीयता|ਪਰਦੇਦਾਰੀ/i.test(rawTarget)) subpage = 'privacy';

    const targetUri = subpage ? `ms-settings:${subpage}` : 'ms-settings:';
    return {
      isAction: true,
      action: { type: 'open_settings', target: targetUri, label: `Windows Settings: ${subpage || 'Home'}` },
      description: `Open Windows Settings (${subpage || 'Home'})`,
    };
  }

  // 3. User Folders (Downloads, Documents, Desktop)
  if (COMMON_FOLDER_MAP[rawTarget] || rawTarget.includes('folder') || rawTarget.includes('फ़ोल्डर') || rawTarget.includes('ਫੋਲਡਰ')) {
    const cleaned = rawTarget.replace(/folder|फ़ोल्डर|ਫੋਲਡਰ/gi, '').trim();
    const folderPath = COMMON_FOLDER_MAP[cleaned] || (cleaned ? `~/${cleaned}` : '~/');
    return {
      isAction: true,
      action: { type: 'open_folder', target: folderPath, label: `Folder: ${cleaned || 'Home'}` },
      description: `Open folder ${cleaned || 'Home'}`,
    };
  }

  // 4. Desktop Applications
  if (COMMON_APP_MAP[rawTarget]) {
    const appKey = COMMON_APP_MAP[rawTarget];
    return {
      isAction: true,
      action: { type: 'open_app', target: appKey, label: `Application: ${rawTarget}` },
      description: `Launch ${rawTarget}`,
    };
  }

  return { isAction: false };
}

export interface ParsedAction {
  actionType: string;
  target: string;
  params?: any;
  riskLevel: 'safe' | 'warning' | 'blocked';
  description: string;
}

export function parseSystemAction(input: string): ParsedAction | null {
  const result = parseSystemActionIntent(input);
  if (!result.isAction || !result.action) return null;

  return {
    actionType: result.action.type,
    target: result.action.target,
    params: { target: result.action.target, url: result.action.target, app: result.action.target, path: result.action.target, uri: result.action.target },
    riskLevel: 'safe',
    description: result.description || `Open ${result.action.target}`,
  };
}

export async function executeSystemAction(
  action: ActionRequest,
  bypassWarning = false
): Promise<{ ok: boolean; risk?: ActionRisk; reason?: string; requiresConfirmation?: boolean; error?: string }> {
  if (!window.nova?.executeAction) {
    return { ok: false, error: 'System actions are available only in the Nova desktop application.' };
  }
  return window.nova.executeAction(action, bypassWarning);
}

