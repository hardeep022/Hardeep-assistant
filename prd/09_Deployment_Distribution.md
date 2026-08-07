# Deployment & Distribution

## Overview

Nova is distributed as a standalone Windows desktop application. It bundles all necessary runtimes and can operate fully offline after installation (with local AI mode). This document covers the installer, auto-update system, Windows integration, and prerequisite management.

---

## Installer

### Technology: electron-builder + NSIS

| Property | Value |
|---|---|
| **Build Tool** | electron-builder |
| **Installer Format** | NSIS (Nullsoft Scriptable Install System) |
| **Output** | `Nova-Setup-{version}.exe` (installer) + `Nova-{version}-portable.zip` (portable) |
| **Installer Size** | ~150-200 MB (app + Electron + Python runtime) |
| **Install Location** | `%LOCALAPPDATA%\Nova\` (per-user, no admin required) |
| **Uninstaller** | Standard Windows Add/Remove Programs entry |

### Installation Flow

```
1. User runs Nova-Setup-{version}.exe
2. NSIS installer UI:
   - Welcome screen with Nova branding
   - License agreement (MIT / Apache 2.0)
   - Install location selection (default: %LOCALAPPDATA%\Nova\)
   - Options:
     ☑ Create desktop shortcut
     ☑ Start Nova with Windows
     ☑ Add to Start Menu
3. Installation:
   - Extract Electron app bundle
   - Extract embedded Python runtime (portable Python, no system install required)
   - Install bundled pip packages (FastAPI, Whisper, etc.)
   - Create Start Menu entries
   - Create desktop shortcut (if selected)
   - Register auto-start (if selected)
4. First Launch:
   - FastAPI backend starts
   - Health check runs
   - Welcome / Registration screen appears
   - Optional: Prompt to download local AI model (Ollama + Llama 3.1)
```

### Portable Mode

- `Nova-{version}-portable.zip` can be extracted to any folder (including USB drive)
- No registry modifications, no Start Menu entries
- Data stored in `./data/` relative to the executable
- Auto-start with Windows not available in portable mode

---

## Auto-Update System

### Technology: electron-updater

| Property | Value |
|---|---|
| **Update Server** | GitHub Releases (public) or custom S3 bucket (private) |
| **Update Check** | On app startup + every 6 hours while running |
| **Update Type** | Full installer download (differential updates in future) |
| **Update Size** | Typically 50-100 MB (compressed delta) |
| **Channel** | Stable (default) / Beta (opt-in in Settings) |

### Update Flow

```
1. App starts → electron-updater checks for new version
2. If update available:
   - Toast notification: "Nova {version} is available. [Update Now] [Later]"
   - "Update Now" → Download in background with progress bar
   - Download complete → "Restart to update" prompt
   - User restarts → NSIS installer applies update silently
3. If no update: Silent, no notification
4. If update check fails (no internet): Silent, retry on next check
```

### Update Settings

- **Auto-check:** Enabled by default (configurable in Settings → General)
- **Auto-download:** Disabled by default (user must click "Update Now")
- **Beta channel:** Opt-in via Settings → General → "Receive beta updates"
- **Skip version:** User can dismiss a specific version ("Don't remind me about {version}")

---

## Windows Integration

### Auto-Start with Windows

| Method | Detail |
|---|---|
| **Registry Key** | `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` |
| **Value Name** | `Nova` |
| **Value Data** | `"{install_path}\Nova.exe" --minimized` |
| **User Control** | Settings → General → "Start Nova with Windows" toggle |
| **Behavior** | Nova starts minimized to system tray on login |

### System Tray

| Feature | Detail |
|---|---|
| **Tray Icon** | Nova logo (16×16 / 32×32 ico) |
| **Left Click** | Show/hide main window |
| **Right Click Menu** | New Chat, Toggle Voice, Settings, ──, Quit |
| **Minimize Behavior** | Closing the window minimizes to tray (configurable: close vs. minimize) |
| **Tray Tooltip** | "Nova — AI Desktop Assistant" |
| **Notification Badges** | Tray icon shows badge for pending reminders |

### Windows Notifications

| Notification | Trigger | Action on Click |
|---|---|---|
| **Reminder Due** | Reminder time reached | Opens Productivity → Reminders |
| **Task Overdue** | Task past due date | Opens Task Management |
| **Update Available** | New version detected | Opens update dialog |
| **Voice Activated** | Wake word detected (when minimized) | Brings Nova to foreground |

- Technology: Electron's `Notification` API (Windows Toast Notifications)
- Notification sound: System default (configurable)
- Do Not Disturb: Respect Windows Focus Assist settings

---

## Bundled Prerequisites

### Python Runtime

| Property | Value |
|---|---|
| **Version** | Python 3.11+ (embedded/portable distribution) |
| **Bundled With** | The NSIS installer; no separate Python install required |
| **Location** | `{install_path}\python\` |
| **Packages** | FastAPI, uvicorn, SQLAlchemy, pydantic, bcrypt, PyJWT, faster-whisper, pyttsx3, pvporcupine, langdetect, zxcvbn |
| **Virtual Env** | Bundled as a self-contained environment (no system PATH modification) |

### Ollama (Local AI)

| Property | Value |
|---|---|
| **Bundled** | No — optional separate install |
| **Install Prompt** | On first launch, if user selects Local AI mode, Nova prompts to install Ollama |
| **Download Link** | Opens `https://ollama.com/download/windows` in browser |
| **Detection** | Nova checks for `ollama` command availability on startup |
| **Model Download** | Managed via Nova Settings → AI Configuration → "Download Model" button |

### Coqui TTS Models (Optional)

| Property | Value |
|---|---|
| **Bundled** | No — optional download via Settings |
| **Default TTS** | pyttsx3 (uses Windows built-in SAPI5 voices, zero download) |
| **Upgrade Path** | Settings → Voice → TTS Engine → "Coqui TTS" → Download model (~1.5 GB) |

---

## File System Layout (Installed)

```
%LOCALAPPDATA%\Nova\
├── Nova.exe                    # Electron executable
├── resources/
│   ├── app.asar                # Bundled Electron app (renderer + main process)
│   └── app.asar.unpacked/      # Native modules that can't be packed
├── python/
│   ├── python.exe              # Embedded Python runtime
│   ├── Lib/
│   │   └── site-packages/      # All Python dependencies
│   └── Scripts/
│       └── uvicorn.exe         # ASGI server
├── data/
│   ├── nova.db                 # SQLCipher encrypted database
│   ├── nova.db-wal             # Write-ahead log
│   └── backups/                # Automatic daily backups
├── logs/
│   └── nova.log                # Application logs (7-day rotation)
├── models/                     # Downloaded voice models (Whisper, Coqui)
│   ├── whisper-small/
│   └── coqui-xtts-v2/
└── Uninstall Nova.exe          # NSIS uninstaller
```

### User Data Location

| Data Type | Location |
|---|---|
| **Database** | `%LOCALAPPDATA%\Nova\data\nova.db` |
| **Logs** | `%LOCALAPPDATA%\Nova\logs\` |
| **Voice Models** | `%LOCALAPPDATA%\Nova\models\` |
| **Backups** | `%LOCALAPPDATA%\Nova\data\backups\` |
| **API Keys** | Windows Credential Manager (not on filesystem) |
| **Session Tokens** | OS Keychain via Electron `safeStorage` |

---

## Uninstallation

### Standard Uninstall (via Add/Remove Programs)

1. Runs NSIS uninstaller
2. Removes all program files from `%LOCALAPPDATA%\Nova\`
3. Removes registry entries (auto-start, app registration)
4. Removes Start Menu and desktop shortcuts
5. **Does NOT remove user data** (`data/`, `logs/`, `models/`) — displays prompt:
   - "Do you want to remove your Nova data (conversations, tasks, settings)?"
   - [Keep My Data] [Remove Everything]

### Clean Uninstall

If user selects "Remove Everything":
- Deletes `%LOCALAPPDATA%\Nova\` entirely
- Removes Windows Credential Manager entries for Nova
- Removes Electron `safeStorage` entries
