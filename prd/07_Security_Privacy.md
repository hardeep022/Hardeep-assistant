# Security & Privacy

## Overview

Nova is designed with a **privacy-first architecture**. User data stays on the local machine by default. Cloud services are opt-in and clearly labeled. This document defines the authentication system, data protection, system action safety framework, and threat model.

---

## Authentication

### Approach: Local Authentication

Nova uses **local-only authentication** — no external auth server, no OAuth, no network dependency for login. This aligns with the privacy-first principle and ensures Nova works offline.

### Registration Flow

```
1. First Launch → Welcome Screen
2. User enters: Display Name, Username, Password, Language Preference
3. Password validation:
   - Minimum 8 characters
   - At least 1 uppercase, 1 lowercase, 1 number
   - Strength meter shown (using zxcvbn library)
4. Password hashed with bcrypt (cost factor 12)
5. User record created in SQLite
6. JWT session token generated (24-hour expiry)
7. Token stored in Electron's safeStorage (OS keychain)
8. Redirect to Home screen
```

### Login Flow

```
1. App Launch → Login Screen (if no valid session token)
2. User enters Username + Password
3. Password verified against bcrypt hash in SQLite
4. On success:
   - JWT token generated (payload: user_id, username, issued_at)
   - Token stored in Electron's safeStorage
   - Redirect to Home screen
5. On failure:
   - "Invalid username or password" error
   - Rate limiting: 5 attempts per minute, then 60-second lockout
   - Account locks after 10 consecutive failures (unlock via recovery)
```

### Session Management

| Property | Value |
|---|---|
| **Token Type** | JWT (HS256) |
| **Token Expiry** | 24 hours |
| **Token Storage** | Electron `safeStorage` API (OS keychain) |
| **Auto-Refresh** | Token refreshed automatically on app activity |
| **Logout** | Clears token from keychain, redirects to Login |
| **Remember Me** | Optional; extends token expiry to 30 days |

### Password Reset (Local Recovery)

Since there's no email/server, password recovery uses a **recovery key**:

1. At registration, a 24-word recovery key is generated and displayed once
2. User is instructed to write it down / store it securely
3. To reset password: Enter recovery key → Set new password
4. If recovery key is lost, user must create a new account (data can be migrated)

### Multi-User Support

- Nova supports **multiple local user accounts** on the same Windows machine
- Each user has isolated data (conversations, tasks, preferences)
- User switcher available on the Login screen
- No "admin" concept — all users are equal

---

## Data Encryption

### At-Rest Encryption

| Data | Encryption Method |
|---|---|
| **SQLite Database** | SQLCipher (AES-256-CBC) |
| **API Keys** | Windows Credential Manager (DPAPI) |
| **Session Tokens** | Electron `safeStorage` (OS keychain) |
| **Local AI Models** | Not encrypted (large binary files, no sensitive data) |
| **Audio Recordings** | Not stored by default; if stored, encrypted with SQLCipher |
| **Conversation History** | Encrypted within SQLCipher database |
| **User Preferences** | Encrypted within SQLCipher database |

### Database Key Management

- SQLCipher encryption key is derived from the user's password using PBKDF2 (100,000 iterations)
- Key is held in memory only during the active session
- On logout, key is wiped from memory

### In-Transit Encryption

| Communication | Encryption |
|---|---|
| Electron ↔ FastAPI (local) | localhost only — no network exposure |
| FastAPI ↔ Cloud AI APIs | HTTPS/TLS 1.3 |
| WebSocket (audio) | WSS over localhost |

---

## System Action Safety Framework

### Action Taxonomy

Nova classifies every system action into one of three risk levels:

#### 🟢 Safe Actions (No Confirmation)

| Action | Example |
|---|---|
| Open a website | "Open YouTube" |
| Open a pre-approved app | "Open Calculator", "Open Notepad" |
| Read system information | "What time is it?", "What's my OS version?" |
| Navigate Nova's own UI | "Go to Settings", "Show my tasks" |
| Create a new task/note/reminder | "Remind me at 5 PM" |

#### 🟡 Warning Actions (Confirmation Required)

| Action | Example | Confirmation Message |
|---|---|---|
| Open a file | "Open report.pdf" | "I'll open `report.pdf` in your default viewer. Proceed?" |
| Open a non-standard app | "Open Command Prompt" | "I'll open Command Prompt. This gives access to system commands. Proceed?" |
| Open Windows Settings | "Open network settings" | "I'll open Windows Network Settings. Proceed?" |
| Modify a task/note | "Delete my shopping list" | "I'll delete the note 'Shopping List'. This can't be undone. Proceed?" |
| Change Nova settings | "Switch to cloud AI mode" | "I'll switch to Cloud AI mode. This sends your queries to external servers. Proceed?" |

#### 🔴 Blocked Actions (Never Executed)

| Action | Example | Response |
|---|---|---|
| Execute arbitrary shell commands | "Run `rm -rf /`" | "I can't execute arbitrary system commands for security reasons." |
| Access sensitive system areas | "Open Registry Editor" | "I can't open system administration tools directly. You can open it manually from the Start menu." |
| Modify system files | "Delete System32" | "I can't modify or delete system files." |
| Install/uninstall software | "Install Chrome" | "I can't install or uninstall software. I can open the download page for you." |
| Access other users' data | "Show admin's files" | "I can only access your own files and data." |
| Network operations | "Send a request to..." | "I can't make network requests on your behalf." |

### Execution Engine

```python
# System action execution approach
class ActionExecutor:
    """
    All system actions go through this service.
    No direct child_process.exec or shell execution.
    """
    
    # Allowed executables (allowlist approach)
    SAFE_APPS = {
        "calculator": "calc.exe",
        "notepad": "notepad.exe",
        "file_explorer": "explorer.exe",
        "paint": "mspaint.exe",
        # ... curated list
    }
    
    # Execution methods (no raw shell)
    # 1. Apps: subprocess.Popen with allowlisted executables
    # 2. Websites: webbrowser.open() (Python stdlib)
    # 3. Files: os.startfile() (Windows shell execute)
    # 4. Folders: os.startfile() (opens in Explorer)
    # 5. Settings: subprocess.Popen("ms-settings:<page>")
    
    # All actions are logged to app_actions_log table
```

### Action Audit Log

Every system action (attempted and completed) is logged:

```
app_actions_log:
  - log_id, user_id, timestamp
  - action_type: "open_app" | "open_website" | "open_file" | "open_folder" | "open_settings"
  - action_detail: what was opened
  - risk_level: "safe" | "warning" | "blocked"
  - user_confirmed: boolean (for warning-level actions)
  - result: "success" | "failed" | "blocked"
  - error_message: null | string
```

---

## Privacy Policy (User-Facing)

### What Nova Stores Locally

- Your display name, username, and hashed password
- Your conversation history and messages
- Your tasks, reminders, and notes
- Your preferences and settings
- Action audit logs (what Nova did on your system)

### What Nova NEVER Does

- ❌ Sends your data to any server (unless you enable Cloud AI mode)
- ❌ Stores your actual password (only a bcrypt hash)
- ❌ Records or stores audio after transcription (audio is processed in memory and discarded)
- ❌ Accesses files or folders without your explicit request
- ❌ Runs in the background without the system tray icon visible
- ❌ Shares data between user accounts on the same machine
- ❌ Collects analytics, telemetry, or usage statistics

### When Cloud AI Mode is Enabled

- Your text messages are sent to the configured AI provider (OpenAI, Google)
- The AI provider's privacy policy applies to those messages
- Nova displays a persistent indicator when cloud mode is active
- You can switch back to local mode at any time
- Conversation history is still stored locally, not on the cloud provider

### Sensitive Data Handling

- By default, Nova does NOT store data marked as sensitive
- Users can opt-in to store sensitive notes (encrypted with SQLCipher)
- Nova will warn users before they share potentially sensitive data (passwords, personal IDs) in chat
- Users can delete all their data at any time via Settings → Privacy → "Delete All My Data"

---

## Threat Model

### Attack Surface

| Vector | Risk | Mitigation |
|---|---|---|
| **Malicious voice command** (someone else speaks to Nova) | Medium | Wake word + visual confirmation for warning/blocked actions |
| **Physical access to machine** | High | SQLCipher encryption; session timeout; Windows login is first line of defense |
| **IPC exploitation** (Electron ↔ FastAPI) | Low | Localhost-only binding; no remote network exposure |
| **Electron vulnerabilities** | Medium | `contextIsolation: true`, `nodeIntegration: false`, preload script sandboxing, regular Electron updates |
| **Dependency supply chain** | Medium | Lock dependency versions; audit with `npm audit` and `pip audit` |
| **Prompt injection** (malicious input tricks AI) | Medium | System prompt hardening; input sanitization; action allowlist prevents execution even if LLM is tricked |
| **Cloud API interception** | Low | HTTPS/TLS 1.3 for all cloud API calls |
| **SQLite file theft** | Medium | SQLCipher AES-256 encryption; key derived from user password |

### Electron Security Hardening

```javascript
// BrowserWindow configuration
{
    webPreferences: {
        nodeIntegration: false,          // No Node.js in renderer
        contextIsolation: true,          // Separate contexts
        sandbox: true,                   // Chromium sandbox
        preload: path.join(__dirname, 'preload.js'),  // Controlled API surface
        webSecurity: true,               // Enforce same-origin
        allowRunningInsecureContent: false
    }
}
```

### Preload Script API Surface

The preload script exposes ONLY these APIs to the renderer:

```javascript
contextBridge.exposeInMainWorld('nova', {
    // Chat
    sendMessage: (message) => ipcRenderer.invoke('chat:send', message),
    onResponse: (callback) => ipcRenderer.on('chat:response', callback),
    
    // Tasks
    getTasks: () => ipcRenderer.invoke('tasks:getAll'),
    createTask: (task) => ipcRenderer.invoke('tasks:create', task),
    
    // Voice
    startRecording: () => ipcRenderer.invoke('voice:startRecording'),
    stopRecording: () => ipcRenderer.invoke('voice:stopRecording'),
    
    // System
    getSystemInfo: () => ipcRenderer.invoke('system:info'),
    
    // Auth
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    
    // Settings
    getSettings: () => ipcRenderer.invoke('settings:get'),
    updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings)
});
// No file system access, no shell execution, no network requests from renderer
```
