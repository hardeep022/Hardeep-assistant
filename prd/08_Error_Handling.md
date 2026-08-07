# Error Handling

## Overview

Nova is designed to **fail gracefully** — no feature failure should crash the app or leave the user stranded. Every error has a defined fallback behavior and a user-facing message in the user's preferred language.

---

## Error Categories & Handling

### 1. AI Model Failures

| Error | Detection | Fallback | User Message |
|---|---|---|---|
| **Local model not loaded** | Ollama health check fails | Switch to cloud if API key exists | "Nova's local AI is still loading. Switching to cloud mode..." |
| **Local model OOM** | Process crash / timeout > 30s | Kill process, switch to cloud | "Local AI ran out of memory. Using cloud AI for this request." |
| **Cloud API key invalid** | HTTP 401 response | Switch to local model | "Your API key is invalid. Please check Settings → AI Configuration." |
| **Cloud API rate limited** | HTTP 429 response | Retry 3x with exponential backoff; then switch to local | "Cloud AI is temporarily busy. Retrying..." → "Switched to local AI." |
| **Cloud API timeout** | No response within 10s | Cancel request; switch to local | "Cloud AI took too long. Using local AI instead." |
| **Cloud API server error** | HTTP 500/502/503 | Retry once; then switch to local | "Cloud AI is experiencing issues. Switched to local mode." |
| **Both AI unavailable** | Both local and cloud fail | Non-AI features still work (tasks, notes, app launching) | "I can't process AI requests right now. You can still manage tasks, notes, and open apps. Check Settings → AI Configuration." |
| **LLM empty response** | Response is empty or whitespace | Retry once with same prompt | "I didn't quite get that. Could you try rephrasing?" |
| **LLM garbled response** | Response fails quality heuristic | Retry once; if still bad, show raw response with disclaimer | "My response might not be perfect — here's what I generated:" |
| **Context window exceeded** | Token count > model max | Summarize older messages, retry | "This conversation is getting long. I've summarized earlier messages to continue." |

### Fallback Chain

```
User Request
    │
    ▼
┌─────────────────┐     ┌─────────────────┐     ┌────────────────┐
│ Preferred Model │────▶│ Alternate Model  │────▶│ Graceful Error │
│ (user's choice) │fail │ (local↔cloud)    │fail │ + Non-AI Mode  │
└─────────────────┘     └─────────────────┘     └────────────────┘
```

---

### 2. Voice / Audio Failures

| Error | Detection | Fallback | User Message |
|---|---|---|---|
| **Microphone not available** | `getUserMedia()` rejected | Disable voice input; text-only mode | "Microphone not found. You can still type your messages." |
| **Microphone permission denied** | Browser permission API | Prompt re-permission; fall back to text | "Microphone access denied. Please enable it in your system settings." |
| **Wake word engine crash** | Porcupine process exits | Restart Porcupine; if fails 3x, disable wake word | "Wake word detection is unavailable. Use the mic button to speak." |
| **STT transcription empty** | Whisper returns empty text | Prompt user to repeat | "I didn't catch that. Could you say it again?" |
| **STT transcription garbage** | Confidence score < 0.3 | Prompt user to repeat; suggest text input | "I'm having trouble understanding. Could you try again or type your message?" |
| **STT model not downloaded** | Model file missing | Prompt to download; fall back to text | "Voice recognition model not installed. Download it in Settings → Voice." |
| **TTS engine failure** | Audio playback error | Show text response without audio | "I can't speak right now, but here's my response:" (text shown) |
| **Audio device changed mid-session** | Device disconnect event | Re-initialize audio pipeline; notify user | "Audio device changed. Reconnecting..." |

---

### 3. Network Failures

| Error | Detection | Fallback | User Message |
|---|---|---|---|
| **No internet connection** | `navigator.onLine` + API ping | Switch to local-only mode | "You're offline. Nova is running in local mode." |
| **Intermittent connection** | API calls fail sporadically | Retry with backoff; queue failed requests | "Connection unstable. Some features may be slower." |
| **Cloud service outage** | HTTP 503 for extended period | Switch to local; periodic retry | "Cloud services are down. Running in local mode until they're back." |

---

### 4. System Action Failures

| Error | Detection | Fallback | User Message |
|---|---|---|---|
| **App not found** | `subprocess.Popen` raises `FileNotFoundError` | Suggest alternatives | "I couldn't find {app}. Is it installed? You could try opening it from the Start menu." |
| **File not found** | `os.path.exists()` check fails | Suggest searching | "I couldn't find that file. Would you like me to help you search for it?" |
| **Permission denied** | `PermissionError` exception | Explain and suggest manual action | "I don't have permission to open {target}. You may need to open it manually." |
| **App crash on launch** | Process exits with non-zero code | Report error | "I opened {app} but it seems to have closed unexpectedly." |
| **Windows Settings page invalid** | `ms-settings:` URI doesn't resolve | Suggest correct settings page | "I couldn't open that settings page. Did you mean {suggestion}?" |

---

### 5. Database Failures

| Error | Detection | Fallback | User Message |
|---|---|---|---|
| **Database file corrupted** | SQLite integrity check fails | Restore from automatic backup | "Nova detected a data issue and restored from backup. You may have lost recent changes." |
| **Database locked** | `OperationalError: database is locked` | Retry with backoff (max 5 retries) | (Silent retry — user doesn't see this unless persistent) → "Nova is having trouble saving data. Please try again." |
| **Disk full** | `OperationalError: disk full` | Alert user; continue with read-only mode | "Your disk is full. Nova can't save new data. Please free up space." |
| **Migration failure** | Schema migration script fails | Rollback migration; continue with previous version | "Nova couldn't update its database. Some new features may not work. Try restarting." |
| **Encryption key wrong** | SQLCipher decryption fails | Re-prompt for password | "Unable to unlock your data. Please log in again." |

---

### 6. Application Lifecycle Failures

| Error | Detection | Fallback | User Message |
|---|---|---|---|
| **FastAPI backend won't start** | Health check fails after 10s | Retry 3x; show critical error | "Nova's backend service couldn't start. Try restarting the app." |
| **Electron renderer crash** | Renderer process `unresponsive` event | Reload renderer; preserve state from backend | (Auto-reload) → "Nova reloaded due to an issue. Your data is safe." |
| **Unexpected shutdown** | WAL journal exists on next startup | Recover uncommitted transactions | (Silent recovery on startup) |
| **Update failure** | Auto-updater throws error | Continue with current version; retry later | "Update failed. Nova will try again later. You're on version {current}." |
| **Ollama not installed** | `ollama` command not found | Prompt to install; offer cloud-only mode | "Ollama is not installed. Install it for local AI, or use cloud mode." |

---

## Error Display Patterns

### Toast Notifications (Non-Blocking)

For errors that don't prevent the user from continuing:

```
┌────────────────────────────────────────┐
│ ⚠️  Connection lost. Running locally. │
│                              Dismiss ✕ │
└────────────────────────────────────────┘
```

- Position: Top-right corner
- Duration: 5 seconds (auto-dismiss) or persistent for critical errors
- Stacking: Max 3 toasts visible; older ones dismissed

### Inline Errors (Contextual)

For errors related to a specific action:

```
┌──────────────────────────────┐
│ 🔴 Invalid username or      │
│    password.                 │
└──────────────────────────────┘
```

- Position: Below the relevant input or component
- Color: Error token (`#EF4444` / `#DC2626`)

### Full-Screen Error (Critical)

For errors that block all functionality:

```
┌──────────────────────────────────────┐
│                                      │
│        😔 Something went wrong      │
│                                      │
│  Nova's backend service couldn't     │
│  start. This usually fixes itself    │
│  with a restart.                     │
│                                      │
│        [ Restart Nova ]              │
│        [ Report Issue ]              │
│                                      │
└──────────────────────────────────────┘
```

---

## Logging

### Error Logging Strategy

| Level | What's Logged | Destination |
|---|---|---|
| **DEBUG** | Detailed trace information | Log file only (not shown to user) |
| **INFO** | Normal operations, state changes | Log file |
| **WARNING** | Recoverable errors, fallbacks triggered | Log file + console |
| **ERROR** | Failures requiring user attention | Log file + toast notification |
| **CRITICAL** | Failures that crash or block the app | Log file + full-screen error |

### Log File

- **Location:** `%APPDATA%/Nova/logs/nova.log`
- **Rotation:** Daily rotation, keep last 7 days
- **Format:** `[TIMESTAMP] [LEVEL] [MODULE] Message`
- **Max Size:** 50 MB per log file
- **Sensitive Data:** NEVER log passwords, API keys, conversation content, or personal data
