# Product Overview

## Vision & Mission

**Nova** is a multilingual AI desktop assistant for Windows that combines the intelligence of modern large language models with the privacy and speed of local processing. Nova's mission is to be the user's most trusted digital companion — one that understands them in their native language, automates tedious tasks, and keeps their data under their control.

**Tagline:** *Your intelligent, private, multilingual desktop companion.*

---

## Target Users & Personas

### Persona 1: The Developer (Arjun, 26)
- **Background:** Full-stack developer working on side projects at home.
- **Language:** Primarily English, switches to Hindi for casual queries.
- **Needs:** Code explanations, debugging help, quick app/file launching, task tracking for projects.
- **Pain Points:** Context-switching between browser tabs for docs, manually organizing TODO lists, privacy concerns with cloud AI tools.
- **How Nova Helps:** Arjun asks Nova to explain error messages, open his IDE and project folders, manage sprint tasks, and research library documentation — all without leaving his desktop.

### Persona 2: The Student (Simran, 20)
- **Background:** University student studying cybersecurity, comfortable in Punjabi and English.
- **Language:** Punjabi at home, English for technical work.
- **Needs:** Study assistance, research summarization, reminders for deadlines, cybersecurity learning.
- **Pain Points:** Difficulty finding quality resources in Punjabi, forgetting assignment deadlines, no centralized study assistant.
- **How Nova Helps:** Simran asks Nova questions in Punjabi, sets reminders for submissions, uses the cybersecurity assistant for learning, and manages notes for each course.

### Persona 3: The General User (Ravi, 45)
- **Background:** Small business owner, not very tech-savvy, prefers Hindi.
- **Language:** Hindi primarily.
- **Needs:** Opening apps and websites quickly, setting reminders, basic productivity help, writing assistance.
- **Pain Points:** Intimidated by complex interfaces, wants voice-first interaction, concerned about data privacy.
- **How Nova Helps:** Ravi uses wake words to activate Nova, asks it to open WhatsApp Web, set meeting reminders, and draft emails — all in Hindi via voice.

---

## Key Differentiators

| Differentiator | Description |
|---|---|
| **Trilingual Native Support** | First-class support for English, Hindi, and Punjabi — not just translation, but culturally-aware responses |
| **Privacy-First Architecture** | Hybrid local/cloud AI with a strong default toward local processing; user controls what leaves their machine |
| **Desktop-Native Integration** | Opens apps, files, folders, websites, and Windows Settings — not just a chatbot in a window |
| **Voice + Text Multimodal** | Full voice interaction with wake word detection, or traditional text chat — user's choice |
| **Persistent Context** | Remembers user preferences, conversation history, and task state across sessions |
| **Defensive Cybersecurity Tools** | Built-in password strength checking, file hash verification, and security Q&A |

---

## Minimum Hardware Requirements

| Component | Minimum | Recommended |
|---|---|---|
| **OS** | Windows 10 (64-bit) v1903+ | Windows 11 |
| **CPU** | Intel i5 8th Gen / AMD Ryzen 5 3600 | Intel i7 10th Gen+ / AMD Ryzen 7 5700+ |
| **RAM** | 8 GB (cloud AI mode) | 16 GB+ (local AI mode) |
| **GPU** | Not required (cloud mode) | NVIDIA GPU with 6GB+ VRAM (local mode, for faster inference) |
| **Storage** | 2 GB (app only) | 10 GB+ (app + local AI models) |
| **Network** | Required for cloud AI mode | Optional if using local models only |
| **Audio** | Microphone + speakers (for voice) | Headset with noise cancellation |

> **Note:** Local AI mode (running LLMs on-device via Ollama) requires significantly more resources. Users with lower-spec machines should use cloud AI mode.

---

## Auto-Start with Windows

Nova registers itself to start automatically with Windows so it's always available:

- **Mechanism:** Windows Registry key at `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- **Behavior:** Nova starts minimized to the system tray on boot
- **User Control:** Configurable via Settings → General → "Start Nova with Windows" toggle
- **System Tray:** Nova lives in the system tray when minimized; clicking the tray icon restores the window; right-click offers Quick Actions (New Chat, Toggle Voice, Quit)

---

## Product Principles

1. **Privacy by Default** — Local processing is the default. Cloud APIs are opt-in and clearly labeled.
2. **Speed Over Perfection** — A fast, good-enough response is better than a slow, perfect one.
3. **Language Equality** — Hindi and Punjabi are not second-class citizens; they receive the same quality of responses as English.
4. **Confirm Before Acting** — Any action that modifies the system (opening apps, deleting files) requires user confirmation based on risk level.
5. **Graceful Degradation** — If AI is unavailable, voice fails, or network is down, Nova should still be usable with reduced functionality, never crash or hang.