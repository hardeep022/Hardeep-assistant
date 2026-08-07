# Technical Requirements

## Frontend Tech Stack

| Technology | Role | Version |
|---|---|---|
| **Electron** | Desktop application framework (native window, system tray, IPC, OS integration) | 30+ |
| **React** | UI rendering framework (component-based renderer process) | 18+ |
| **React Router** | Client-side navigation between screens | 6+ |
| **Zustand** | Lightweight state management (simpler than Redux for desktop app scope) | 4+ |
| **Vite** | Build tool for React (fast HMR during development) | 5+ |
| **Inter Font** | Primary UI font (bundled, no network dependency) | — |
| **JetBrains Mono** | Monospace font for code blocks | — |
| **Noto Sans Devanagari/Gurmukhi** | Hindi and Punjabi fallback fonts | — |

## Backend Tech Stack

| Technology | Role | Version |
|---|---|---|
| **Python** | Backend runtime (embedded/portable distribution) | 3.11+ |
| **FastAPI** | API framework (async, auto-docs, type validation) | 0.100+ |
| **Uvicorn** | ASGI server for FastAPI | 0.24+ |
| **SQLAlchemy** | ORM for database operations | 2.0+ |
| **SQLCipher** | Encrypted SQLite (AES-256-CBC) | 4.5+ |
| **Pydantic** | Request/response validation and serialization | 2.0+ |
| **bcrypt** | Password hashing | 4.0+ |
| **PyJWT** | JWT token generation and verification | 2.8+ |
| **faster-whisper** | Local STT engine (Whisper via CTranslate2) | 0.10+ |
| **pyttsx3** | Local TTS engine (Windows SAPI5) | 2.90+ |
| **pvporcupine** | Wake word detection engine | 3.0+ |
| **langdetect** | Language detection fallback | 1.0+ |
| **zxcvbn** | Password strength estimation | — |
| **ollama** | Local LLM runtime (external install) | 0.3+ |
| **openai** | OpenAI API client (for cloud mode) | 1.0+ |
| **google-generativeai** | Google Gemini API client (for cloud mode) | 0.5+ |

---

## Architecture

### Folder Structure

```
NovaApp/
├── nova-desktop/                    # Electron main process + packaging
│   ├── main/
│   │   ├── main.js                  # Electron main process entry point
│   │   ├── window.js                # Window management (create, resize, minimize to tray)
│   │   ├── tray.js                  # System tray icon, context menu
│   │   ├── ipc-handlers.js          # IPC bridge (renderer ↔ main ↔ backend)
│   │   ├── auto-updater.js          # electron-updater integration
│   │   └── startup.js               # Windows auto-start registration
│   ├── preload/
│   │   └── preload.js               # Secure API surface exposed to renderer
│   ├── build/
│   │   ├── icon.ico                 # App icon (Windows ICO format)
│   │   └── installer-banner.bmp     # NSIS installer branding
│   ├── package.json                 # Electron dependencies + electron-builder config
│   └── electron-builder.yml         # Build configuration (NSIS, auto-update, signing)
│
├── nova-ui/                         # React app (Electron renderer process)
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── ChatMessage.jsx      # Individual chat message bubble
│   │   │   ├── ChatInput.jsx        # Text + voice input bar
│   │   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   │   ├── TaskCard.jsx         # Task list item
│   │   │   ├── NoteEditor.jsx       # Note editing component
│   │   │   ├── ReminderItem.jsx     # Reminder list item
│   │   │   ├── VoiceOrb.jsx         # Voice interaction animation
│   │   │   ├── PasswordMeter.jsx    # Password strength indicator
│   │   │   ├── HashVerifier.jsx     # File hash tool UI
│   │   │   ├── ThemeToggle.jsx      # Dark/Light/System theme switch
│   │   │   ├── Toast.jsx            # Toast notification component
│   │   │   └── Modal.jsx            # Confirmation/dialog modal
│   │   ├── pages/                   # Screen-level components
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── ChatPage.jsx         # Shared chat UI (all assistant modes)
│   │   │   ├── ProductivityPage.jsx
│   │   │   ├── CybersecurityPage.jsx
│   │   │   ├── TaskManagementPage.jsx
│   │   │   ├── ConversationPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── hooks/                   # Custom React hooks
│   │   │   ├── useAuth.js           # Authentication state and actions
│   │   │   ├── useChat.js           # Chat message sending/receiving
│   │   │   ├── useVoice.js          # Voice recording and playback
│   │   │   ├── useTasks.js          # Task CRUD operations
│   │   │   └── useTheme.js          # Theme management
│   │   ├── services/                # API client and external service interfaces
│   │   │   ├── api.js               # HTTP client for FastAPI backend
│   │   │   ├── websocket.js         # WebSocket client for voice streaming
│   │   │   └── nova-bridge.js       # Wrapper around window.nova (preload API)
│   │   ├── store/                   # Zustand state stores
│   │   │   ├── authStore.js
│   │   │   ├── chatStore.js
│   │   │   ├── taskStore.js
│   │   │   ├── settingsStore.js
│   │   │   └── voiceStore.js
│   │   ├── i18n/                    # Internationalization
│   │   │   ├── en.json              # English strings
│   │   │   ├── hi.json              # Hindi strings
│   │   │   └── pa.json              # Punjabi strings
│   │   ├── styles/                  # CSS
│   │   │   ├── tokens.css           # Design tokens (colors, spacing, typography)
│   │   │   ├── global.css           # Global styles and resets
│   │   │   └── themes.css           # Dark and light theme definitions
│   │   ├── App.jsx                  # Root component with routing
│   │   └── main.jsx                 # React entry point
│   ├── public/
│   │   ├── index.html
│   │   └── assets/                  # Static assets (icons, sounds)
│   │       ├── chime.wav            # Wake word activation sound
│   │       └── error.wav            # Error notification sound
│   ├── package.json
│   └── vite.config.js
│
├── nova-api/                        # FastAPI backend
│   ├── main.py                      # FastAPI app entry point + CORS + lifespan
│   ├── config.py                    # Configuration management (env vars, defaults)
│   ├── routers/                     # API route modules
│   │   ├── auth.py                  # /api/auth/* routes
│   │   ├── chat.py                  # /api/chat/* routes
│   │   ├── tasks.py                 # /api/tasks/* routes
│   │   ├── reminders.py             # /api/reminders/* routes
│   │   ├── notes.py                 # /api/notes/* routes
│   │   ├── conversations.py         # /api/conversations/* routes
│   │   ├── actions.py               # /api/actions/* routes (system actions)
│   │   ├── preferences.py           # /api/preferences/* routes
│   │   └── voice.py                 # /api/voice/* routes + WebSocket
│   ├── models/                      # SQLAlchemy ORM models + Pydantic schemas
│   │   ├── database.py              # SQLAlchemy engine + session factory
│   │   ├── user.py                  # User model + schemas
│   │   ├── task.py                  # Task model + schemas
│   │   ├── reminder.py              # Reminder model + schemas
│   │   ├── note.py                  # Note model + schemas
│   │   ├── conversation.py          # Conversation model + schemas
│   │   ├── message.py               # Message model + schemas
│   │   ├── preference.py            # UserPreference model + schemas
│   │   ├── session.py               # Session model + schemas
│   │   └── action_log.py            # ActionLog model + schemas
│   ├── services/                    # Business logic layer
│   │   ├── ai_router.py             # AI model routing (local vs cloud)
│   │   ├── ollama_service.py        # Ollama client for local LLM
│   │   ├── openai_service.py        # OpenAI API client
│   │   ├── gemini_service.py        # Google Gemini API client
│   │   ├── prompt_service.py        # System prompts + context injection
│   │   ├── stt_service.py           # Speech-to-Text processing
│   │   ├── tts_service.py           # Text-to-Speech synthesis
│   │   ├── wake_word_service.py     # Porcupine wake word detection
│   │   ├── action_executor.py       # System action execution (allowlisted)
│   │   ├── auth_service.py          # Authentication + JWT logic
│   │   ├── hash_service.py          # File hash generation/verification
│   │   ├── password_checker.py      # Password strength analysis (zxcvbn)
│   │   └── language_service.py      # Language detection + switching
│   ├── database/                    # Database setup and migrations
│   │   ├── init_db.py               # Create tables, run migrations
│   │   ├── backup.py                # Automated daily backups
│   │   └── migrations/              # Schema migration scripts
│   │       ├── 001_initial.py
│   │       └── ...
│   ├── middleware/                   # FastAPI middleware
│   │   ├── auth_middleware.py        # JWT validation middleware
│   │   └── error_handler.py         # Global error handler
│   └── requirements.txt             # Python dependencies
│
└── nova-lib/                        # Shared utilities and constants
    ├── constants.py                 # Shared constants (risk levels, action types)
    ├── types.py                     # Shared TypedDict / Pydantic base types
    ├── validators.py                # Input validation utilities
    └── i18n.py                      # Backend internationalization helpers
```

---

## API Specification

### Authentication

| Method | Route | Request Body | Response | Auth |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | `{ display_name, username, password, language }` | `{ user_id, username, display_name, recovery_key, token }` | None |
| `POST` | `/api/auth/login` | `{ username, password }` | `{ user_id, username, display_name, token }` | None |
| `POST` | `/api/auth/logout` | — | `204 No Content` | JWT |
| `POST` | `/api/auth/refresh` | — | `{ token }` | JWT |
| `POST` | `/api/auth/recover` | `{ username, recovery_key, new_password }` | `{ success: true }` | None |
| `PUT` | `/api/auth/password` | `{ current_password, new_password }` | `{ success: true }` | JWT |

### Chat / AI

| Method | Route | Request Body | Response | Auth |
|---|---|---|---|---|
| `POST` | `/api/chat/message` | `{ message, conversation_id?, mode }` | `{ response, conversation_id, language }` | JWT |
| `POST` | `/api/chat/message/stream` | `{ message, conversation_id?, mode }` | SSE stream: `{ token, is_final }` | JWT |
| `GET` | `/api/chat/models` | — | `{ local: [...], cloud: [...], active }` | JWT |
| `PUT` | `/api/chat/model` | `{ model_id, type }` | `{ success: true }` | JWT |

### Conversations

| Method | Route | Request Body | Response | Auth |
|---|---|---|---|---|
| `GET` | `/api/conversations` | Query: `?page=1&limit=20&search=` | `{ conversations: [...], total, page }` | JWT |
| `GET` | `/api/conversations/:id` | — | `{ conversation_id, title, messages: [...], created_at }` | JWT |
| `PUT` | `/api/conversations/:id` | `{ title }` | `{ conversation }` | JWT |
| `DELETE` | `/api/conversations/:id` | — | `204 No Content` | JWT |
| `GET` | `/api/conversations/:id/export` | Query: `?format=txt|json` | File download | JWT |

### Tasks

| Method | Route | Request Body | Response | Auth |
|---|---|---|---|---|
| `GET` | `/api/tasks` | Query: `?status=&priority=&due=today|upcoming|overdue` | `{ tasks: [...], total }` | JWT |
| `POST` | `/api/tasks` | `{ description, due_date?, priority?, tags? }` | `{ task }` | JWT |
| `GET` | `/api/tasks/:id` | — | `{ task }` | JWT |
| `PUT` | `/api/tasks/:id` | `{ description?, due_date?, priority?, status?, tags? }` | `{ task }` | JWT |
| `PATCH` | `/api/tasks/:id/complete` | — | `{ task }` | JWT |
| `DELETE` | `/api/tasks/:id` | — | `204 No Content` (soft delete) | JWT |

### Reminders

| Method | Route | Request Body | Response | Auth |
|---|---|---|---|---|
| `GET` | `/api/reminders` | Query: `?status=active|fired|dismissed` | `{ reminders: [...] }` | JWT |
| `POST` | `/api/reminders` | `{ description, remind_at, repeat? }` | `{ reminder }` | JWT |
| `PUT` | `/api/reminders/:id` | `{ description?, remind_at?, enabled? }` | `{ reminder }` | JWT |
| `DELETE` | `/api/reminders/:id` | — | `204 No Content` | JWT |

### Notes

| Method | Route | Request Body | Response | Auth |
|---|---|---|---|---|
| `GET` | `/api/notes` | Query: `?search=&tag=&sort=updated|created` | `{ notes: [...], total }` | JWT |
| `POST` | `/api/notes` | `{ title, content, tags? }` | `{ note }` | JWT |
| `GET` | `/api/notes/:id` | — | `{ note }` | JWT |
| `PUT` | `/api/notes/:id` | `{ title?, content?, tags? }` | `{ note }` | JWT |
| `DELETE` | `/api/notes/:id` | — | `204 No Content` (soft delete) | JWT |

### System Actions

| Method | Route | Request Body | Response | Auth |
|---|---|---|---|---|
| `POST` | `/api/actions/open` | `{ target, type: "app"|"website"|"file"|"folder"|"settings" }` | `{ status, risk_level, requires_confirmation }` | JWT |
| `POST` | `/api/actions/confirm` | `{ action_id }` | `{ status: "executed"|"failed", error? }` | JWT |
| `GET` | `/api/actions/log` | Query: `?page=1&limit=50` | `{ logs: [...], total }` | JWT |

### Cybersecurity Tools

| Method | Route | Request Body | Response | Auth |
|---|---|---|---|---|
| `POST` | `/api/security/password-check` | `{ password }` | `{ score, strength, suggestions, crack_time }` | JWT |
| `POST` | `/api/security/hash` | `{ file_path, algorithm: "md5"|"sha256" }` | `{ hash, algorithm, file_name }` | JWT |
| `POST` | `/api/security/hash/verify` | `{ file_path, expected_hash, algorithm }` | `{ match: boolean, computed_hash }` | JWT |

### User Preferences

| Method | Route | Request Body | Response | Auth |
|---|---|---|---|---|
| `GET` | `/api/preferences` | — | `{ preferences }` | JWT |
| `PUT` | `/api/preferences` | `{ key, value }` | `{ preferences }` | JWT |
| `PUT` | `/api/preferences/bulk` | `{ preferences: { key: value, ... } }` | `{ preferences }` | JWT |

### Voice (WebSocket)

| Endpoint | Protocol | Description |
|---|---|---|
| `ws://localhost:{port}/api/voice/stream` | WebSocket | Bidirectional audio streaming for STT/TTS |

WebSocket message types documented in [06_Voice_Architecture.md](file:///c:/Users/Amandeep Singh/Desktop/prd/06_Voice_Architecture.md).

### System / Health

| Method | Route | Response | Auth |
|---|---|---|---|
| `GET` | `/api/health` | `{ status: "ok", version, uptime }` | None |
| `GET` | `/api/system/info` | `{ os, memory, cpu, gpu, ollama_status }` | JWT |

---

## Data Schema

### Complete Table Structure

#### `users`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | UUID | PRIMARY KEY, DEFAULT uuid4() | Unique user identifier |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | Login username |
| `display_name` | VARCHAR(100) | NOT NULL | Display name shown in UI |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hashed password |
| `recovery_key_hash` | VARCHAR(255) | NOT NULL | bcrypt hashed recovery key |
| `language` | VARCHAR(5) | NOT NULL, DEFAULT 'en' | Preferred language: 'en', 'hi', 'pa' |
| `created_at` | DATETIME | NOT NULL, DEFAULT now() | Account creation timestamp |
| `updated_at` | DATETIME | NOT NULL, DEFAULT now() | Last update timestamp |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft-delete flag |
| `last_login_at` | DATETIME | NULLABLE | Last successful login |
| `failed_login_count` | INTEGER | NOT NULL, DEFAULT 0 | Consecutive failed login attempts |
| `locked_until` | DATETIME | NULLABLE | Account lock expiry (after too many failures) |

#### `sessions`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `session_id` | UUID | PRIMARY KEY | Unique session identifier |
| `user_id` | UUID | FOREIGN KEY → users.user_id, NOT NULL | Session owner |
| `token_hash` | VARCHAR(255) | NOT NULL | Hashed JWT token (for revocation) |
| `created_at` | DATETIME | NOT NULL, DEFAULT now() | Session start |
| `expires_at` | DATETIME | NOT NULL | Token expiry time |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Session validity |
| `device_info` | VARCHAR(255) | NULLABLE | Device/OS information |

**Index:** `idx_sessions_user_id` on `user_id`

#### `conversations`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `conversation_id` | UUID | PRIMARY KEY | Unique conversation identifier |
| `user_id` | UUID | FOREIGN KEY → users.user_id, NOT NULL | Conversation owner |
| `title` | VARCHAR(200) | NOT NULL, DEFAULT 'New Conversation' | Auto-generated or user-set title |
| `mode` | VARCHAR(20) | NOT NULL, DEFAULT 'general' | Assistant mode: 'coding', 'learning', 'research', 'writing', 'cybersecurity', 'general' |
| `summary` | TEXT | NULLABLE | LLM-generated summary of older messages |
| `language` | VARCHAR(5) | NOT NULL, DEFAULT 'en' | Dominant language of conversation |
| `message_count` | INTEGER | NOT NULL, DEFAULT 0 | Total messages in conversation |
| `created_at` | DATETIME | NOT NULL, DEFAULT now() | Conversation start |
| `updated_at` | DATETIME | NOT NULL, DEFAULT now() | Last message timestamp |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT FALSE | Soft delete flag |
| `deleted_at` | DATETIME | NULLABLE | Soft delete timestamp (purge after 30 days) |
| `is_pinned` | BOOLEAN | NOT NULL, DEFAULT FALSE | Pinned/favorite flag |

**Indexes:** `idx_conversations_user_id` on `user_id`, `idx_conversations_updated_at` on `updated_at`

#### `conversation_messages`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `message_id` | UUID | PRIMARY KEY | Unique message identifier |
| `conversation_id` | UUID | FOREIGN KEY → conversations.conversation_id, NOT NULL | Parent conversation |
| `role` | VARCHAR(10) | NOT NULL | 'user', 'assistant', 'system' |
| `content` | TEXT | NOT NULL | Message text content |
| `language` | VARCHAR(5) | NOT NULL, DEFAULT 'en' | Message language |
| `token_count` | INTEGER | NULLABLE | Token count for context management |
| `model_used` | VARCHAR(50) | NULLABLE | Which AI model generated this response |
| `input_type` | VARCHAR(10) | NOT NULL, DEFAULT 'text' | 'text' or 'voice' |
| `created_at` | DATETIME | NOT NULL, DEFAULT now() | Message timestamp |

**Index:** `idx_messages_conversation_id` on `conversation_id`, `idx_messages_created_at` on `created_at`

#### `tasks`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `task_id` | UUID | PRIMARY KEY | Unique task identifier |
| `user_id` | UUID | FOREIGN KEY → users.user_id, NOT NULL | Task owner |
| `description` | TEXT | NOT NULL | Task description |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | 'pending', 'in_progress', 'completed' |
| `priority` | VARCHAR(10) | NOT NULL, DEFAULT 'medium' | 'low', 'medium', 'high', 'urgent' |
| `due_date` | DATETIME | NULLABLE | Task due date/time |
| `tags` | JSON | NULLABLE | Array of tag strings |
| `repeat` | VARCHAR(20) | NULLABLE | 'daily', 'weekly', 'monthly', NULL |
| `completed_at` | DATETIME | NULLABLE | Completion timestamp |
| `created_at` | DATETIME | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | DATETIME | NOT NULL, DEFAULT now() | Last update timestamp |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT FALSE | Soft delete flag |
| `deleted_at` | DATETIME | NULLABLE | Soft delete timestamp |

**Indexes:** `idx_tasks_user_id` on `user_id`, `idx_tasks_due_date` on `due_date`, `idx_tasks_status` on `status`

#### `reminders`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `reminder_id` | UUID | PRIMARY KEY | Unique reminder identifier |
| `user_id` | UUID | FOREIGN KEY → users.user_id, NOT NULL | Reminder owner |
| `description` | TEXT | NOT NULL | Reminder text |
| `remind_at` | DATETIME | NOT NULL | When to fire the reminder |
| `repeat` | VARCHAR(20) | NULLABLE | 'daily', 'weekly', 'monthly', NULL |
| `is_enabled` | BOOLEAN | NOT NULL, DEFAULT TRUE | Enable/disable toggle |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'pending' | 'pending', 'fired', 'dismissed' |
| `fired_at` | DATETIME | NULLABLE | When the reminder actually fired |
| `created_at` | DATETIME | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | DATETIME | NOT NULL, DEFAULT now() | Last update timestamp |

**Index:** `idx_reminders_user_id` on `user_id`, `idx_reminders_remind_at` on `remind_at`

#### `notes`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `note_id` | UUID | PRIMARY KEY | Unique note identifier |
| `user_id` | UUID | FOREIGN KEY → users.user_id, NOT NULL | Note owner |
| `title` | VARCHAR(200) | NOT NULL, DEFAULT 'Untitled Note' | Note title |
| `content` | TEXT | NOT NULL, DEFAULT '' | Note content (markdown/plain text) |
| `tags` | JSON | NULLABLE | Array of tag strings |
| `is_sensitive` | BOOLEAN | NOT NULL, DEFAULT FALSE | Marked as sensitive data |
| `created_at` | DATETIME | NOT NULL, DEFAULT now() | Creation timestamp |
| `updated_at` | DATETIME | NOT NULL, DEFAULT now() | Last edit timestamp |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT FALSE | Soft delete flag |
| `deleted_at` | DATETIME | NULLABLE | Soft delete timestamp |

**Indexes:** `idx_notes_user_id` on `user_id`, `idx_notes_updated_at` on `updated_at`

#### `user_preferences`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `preference_id` | UUID | PRIMARY KEY | Unique preference identifier |
| `user_id` | UUID | FOREIGN KEY → users.user_id, NOT NULL | Preference owner |
| `key` | VARCHAR(100) | NOT NULL | Preference key (e.g., 'theme', 'ai_mode', 'tts_engine') |
| `value` | TEXT | NOT NULL | Preference value (JSON-encoded for complex values) |
| `updated_at` | DATETIME | NOT NULL, DEFAULT now() | Last update timestamp |

**Index:** `idx_preferences_user_id_key` UNIQUE on `(user_id, key)`

#### `app_actions_log`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `log_id` | UUID | PRIMARY KEY | Unique log entry identifier |
| `user_id` | UUID | FOREIGN KEY → users.user_id, NOT NULL | Action initiator |
| `action_type` | VARCHAR(20) | NOT NULL | 'open_app', 'open_website', 'open_file', 'open_folder', 'open_settings' |
| `action_detail` | TEXT | NOT NULL | What was opened (app name, URL, file path, etc.) |
| `risk_level` | VARCHAR(10) | NOT NULL | 'safe', 'warning', 'blocked' |
| `user_confirmed` | BOOLEAN | NULLABLE | Whether user confirmed (for warning-level actions) |
| `result` | VARCHAR(10) | NOT NULL | 'success', 'failed', 'blocked', 'cancelled' |
| `error_message` | TEXT | NULLABLE | Error details if action failed |
| `created_at` | DATETIME | NOT NULL, DEFAULT now() | Action timestamp |

**Index:** `idx_actions_user_id` on `user_id`, `idx_actions_created_at` on `created_at`

---

### Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌─────────────────────┐
│  users   │──1:N──│ conversations│──1:N──│ conversation_messages│
└──────────┘       └──────────────┘       └─────────────────────┘
     │
     ├──1:N──┌──────────┐
     │       │  tasks   │
     │       └──────────┘
     │
     ├──1:N──┌──────────┐
     │       │reminders │
     │       └──────────┘
     │
     ├──1:N──┌──────────┐
     │       │  notes   │
     │       └──────────┘
     │
     ├──1:N──┌──────────────────┐
     │       │ user_preferences │
     │       └──────────────────┘
     │
     ├──1:N──┌──────────┐
     │       │ sessions │
     │       └──────────┘
     │
     └──1:N──┌─────────────────┐
             │ app_actions_log │
             └─────────────────┘
```

---

## Local Storage Approach

- **Primary:** SQLite (via SQLCipher) for all structured data
- **Secondary:** Electron `safeStorage` for sensitive credentials (API keys, session tokens)
- **File System:** `%LOCALAPPDATA%\Nova\` for models, logs, and backups
- **No cloud storage** — all data remains on the user's machine
- **Backup:** Automatic daily backups of the SQLite database to `data/backups/` (retain last 7 days)
- **WAL Mode:** SQLite Write-Ahead Logging enabled for crash recovery and concurrent reads