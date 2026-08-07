# Roadmap

## Overview

Nova's development is organized into **four phases**, each building on the previous one. Each phase delivers a usable, testable product. The principle: **ship incrementally, validate with real use, then expand.**

---

## Phase 1: Foundation (MVP)

**Goal:** A working desktop chat assistant with task management and local authentication.

**Duration:** 6-8 weeks

### Deliverables

| Component | Feature | Detail |
|---|---|---|
| **Backend** | FastAPI server | App entry point, CORS, health check endpoint |
| **Backend** | SQLite database | All 9 tables created with SQLAlchemy models |
| **Backend** | Authentication | Registration, login, logout, JWT sessions, password hashing |
| **Backend** | Chat API | POST /api/chat/message with cloud AI integration (OpenAI GPT-4o-mini) |
| **Backend** | Task API | Full CRUD for tasks |
| **Backend** | Conversation API | Create, list, get, delete conversations with messages |
| **Frontend** | Electron shell | Window management, system tray, minimize-to-tray |
| **Frontend** | Login screen | Username/password form, error states |
| **Frontend** | Registration screen | Full registration flow with recovery key display |
| **Frontend** | Home screen | Greeting, quick action cards, today's overview |
| **Frontend** | Chat screen | Text chat with AI, message bubbles, typing indicator, markdown rendering |
| **Frontend** | Task management | Task list, create/complete/delete, priority badges, due dates |
| **Frontend** | Settings screen | Basic settings (language, theme toggle, API key input) |
| **Frontend** | Dark theme | Full dark theme with design tokens |
| **Frontend** | Sidebar navigation | Navigation between all active screens |

### NOT in Phase 1

- ❌ Voice interaction (no STT/TTS/wake word)
- ❌ Local AI (no Ollama)
- ❌ Hindi/Punjabi UI strings (English-only UI, but AI responds in all languages)
- ❌ Reminders and notes
- ❌ Cybersecurity tools
- ❌ System actions (open apps/files/websites)
- ❌ Auto-start with Windows
- ❌ Auto-updates
- ❌ Light theme

### Exit Criteria

- [ ] User can register, log in, and log out
- [ ] User can send messages and receive AI responses (cloud mode)
- [ ] User can create, complete, and delete tasks
- [ ] User can browse past conversations
- [ ] App starts from desktop shortcut and minimizes to tray
- [ ] All backend unit tests pass (≥85% coverage)
- [ ] All frontend unit tests pass (≥80% coverage)
- [ ] App runs stably for 1 hour of continuous use without crashes

---

## Phase 2: Voice & Multilingual

**Goal:** Add voice interaction, multilingual UI, and local AI support.

**Duration:** 6-8 weeks

### Deliverables

| Component | Feature | Detail |
|---|---|---|
| **Backend** | Whisper STT | Speech-to-text via faster-whisper (local) |
| **Backend** | pyttsx3 TTS | Text-to-speech via Windows SAPI5 |
| **Backend** | Wake word | Porcupine SDK for "Hey Nova" / "Nova" detection |
| **Backend** | WebSocket audio | Bidirectional audio streaming for voice I/O |
| **Backend** | Local AI | Ollama integration with Llama 3.1 8B |
| **Backend** | AI Router | Hybrid mode (local/cloud routing) with fallback chain |
| **Backend** | Language detection | Auto-detect input language, respond accordingly |
| **Backend** | Reminders API | Full CRUD for reminders with Windows Toast notifications |
| **Backend** | Notes API | Full CRUD for notes with tags |
| **Frontend** | Voice orb animation | Visual indicator for voice states (idle/listening/processing/speaking) |
| **Frontend** | Voice input button | Mic button in chat input, push-to-talk |
| **Frontend** | Productivity screen | Tasks + Reminders + Notes tabs |
| **Frontend** | i18n | Hindi and Punjabi UI strings for all screens |
| **Frontend** | Language switcher | Settings + login screen language selector |
| **Frontend** | Light theme | Full light theme with toggle |
| **Frontend** | Reminder notifications | Windows Toast notifications when reminders fire |

### Exit Criteria

- [ ] User can interact via voice (speak → get spoken response)
- [ ] Wake word "Hey Nova" activates the assistant
- [ ] AI responds in Hindi and Punjabi when addressed in those languages
- [ ] UI displays in Hindi and Punjabi when selected
- [ ] Local AI mode works offline (Ollama + Llama 3.1)
- [ ] Hybrid mode correctly routes between local and cloud
- [ ] Reminders fire at scheduled times with Windows notifications
- [ ] Notes can be created, edited, tagged, and searched
- [ ] Voice latency end-to-end < 8 seconds (CPU), < 4 seconds (GPU)
- [ ] STT accuracy > 90% for English, > 85% for Hindi

---

## Phase 3: Desktop Integration & Security

**Goal:** Add system actions, cybersecurity tools, and full desktop integration.

**Duration:** 4-6 weeks

### Deliverables

| Component | Feature | Detail |
|---|---|---|
| **Backend** | Action executor | Open apps, websites, files, folders, Windows settings |
| **Backend** | Action taxonomy | Safe/warning/blocked classification |
| **Backend** | Action audit log | Full logging of all system actions |
| **Backend** | Password checker | zxcvbn-based strength analysis API |
| **Backend** | Hash verifier | MD5/SHA-256 file hashing API |
| **Backend** | Conversation export | Export as TXT/JSON |
| **Backend** | Conversation search | Full-text search across messages |
| **Backend** | SQLCipher encryption | Database encryption at rest |
| **Backend** | Coqui TTS (optional) | Enhanced natural-sounding local TTS |
| **Frontend** | Cybersecurity screen | Password checker UI, hash verifier UI, security chat |
| **Frontend** | Conversation management | Search, export, pin, bulk delete |
| **Frontend** | Action confirmations | Warning modal for risky system actions |
| **Frontend** | Conversation sidebar | Past conversations list in chat screen |
| **Frontend** | Task board view | Kanban columns (To Do / In Progress / Done) |
| **System** | Auto-start with Windows | Registry key + Settings toggle |
| **System** | Windows notifications | Reminders, task overdue, voice activation |

### Exit Criteria

- [ ] User can say "Open Calculator" and it opens
- [ ] Warning actions require confirmation modal
- [ ] Blocked actions are refused with explanation
- [ ] All system actions are logged in audit log
- [ ] Password strength checker works with suggestions
- [ ] File hash verification works for MD5 and SHA-256
- [ ] Conversations are searchable and exportable
- [ ] Database is encrypted with SQLCipher
- [ ] Auto-start with Windows works and is configurable
- [ ] Cybersecurity screen functional with all tools

---

## Phase 4: Polish & Release

**Goal:** Production-ready quality, auto-updates, performance optimization, and public release.

**Duration:** 4-6 weeks

### Deliverables

| Component | Feature | Detail |
|---|---|---|
| **System** | Auto-updater | electron-updater with GitHub Releases |
| **System** | NSIS installer | Full installer with options (desktop shortcut, auto-start) |
| **System** | Portable build | ZIP archive for portable use |
| **Backend** | Database backup | Automated daily backups with 7-day retention |
| **Backend** | Database migration | Versioned schema migrations for updates |
| **Backend** | Cloud STT/TTS (optional) | Azure/ElevenLabs integration for premium users |
| **Frontend** | Onboarding flow | First-run tutorial, feature highlights |
| **Frontend** | Keyboard shortcuts | Global shortcuts for common actions |
| **Frontend** | Performance optimization | Lazy loading, virtual scrolling for long lists |
| **Frontend** | Accessibility audit | Full WCAG AA compliance, screen reader testing |
| **Quality** | E2E test suite | Playwright tests for all critical flows |
| **Quality** | Voice I/O tests | Pre-recorded audio sample test suite |
| **Quality** | AI quality tests | Response quality evaluation suite |
| **Quality** | Security audit | bandit, npm audit, dependency review |
| **Docs** | User guide | In-app help + external documentation |
| **Docs** | README | Installation, setup, contributing guide |
| **Docs** | Changelog | Version history and release notes |

### Exit Criteria

- [ ] Installer works cleanly on fresh Windows 10 and 11 machines
- [ ] Auto-update downloads and applies update correctly
- [ ] App starts in < 3 seconds on recommended hardware
- [ ] Memory usage < 300 MB idle (no local AI loaded)
- [ ] No crash in 8 hours of continuous use (stress test)
- [ ] All E2E tests pass
- [ ] Security audit shows no critical/high vulnerabilities
- [ ] WCAG AA accessibility audit passes
- [ ] User guide covers all features

---

## Future Considerations (Post-v1)

These are ideas for future versions, **not committed to any timeline:**

| Feature | Description |
|---|---|
| **Plugin system** | Allow third-party extensions to add new capabilities |
| **Cloud sync** | Optional encrypted sync across devices |
| **Mobile companion** | React Native mobile app for remote access |
| **Screen sharing / OCR** | Analyze on-screen content for context-aware help |
| **Calendar integration** | Sync with Google Calendar / Outlook |
| **Email integration** | Read/draft emails via IMAP/SMTP |
| **Custom wake words** | Users define their own activation phrase |
| **Voice cloning** | Clone a voice for personalized TTS |
| **Multi-monitor** | Floating widget mode on secondary display |
| **Offline documentation** | Download and index local docs for offline search |
| **Advanced cybersecurity** | Network monitoring, system log analysis, vulnerability scanning |

---

## Timeline Summary

```
Week  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28
      ├──────────────────────┤
      │     Phase 1: MVP     │
      │  Foundation + Chat   │
      │  + Tasks + Auth      │
                              ├──────────────────────┤
                              │  Phase 2: Voice &    │
                              │  Multilingual + i18n │
                              │  + Local AI          │
                                                      ├────────────────┤
                                                      │  Phase 3:      │
                                                      │  Desktop       │
                                                      │  Integration   │
                                                                        ├────────────────┤
                                                                        │  Phase 4:      │
                                                                        │  Polish &      │
                                                                        │  Release       │
```

**Total estimated timeline: 20-28 weeks (5-7 months)**

> This is a solo/small-team estimate. Adjust based on team size and availability.
