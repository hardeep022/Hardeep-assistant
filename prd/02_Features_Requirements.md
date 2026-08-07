# Features & Requirements

## Core Feature Set

### 1. Multilingual Support
Nova understands and replies in **English, Hindi, and Punjabi** as first-class languages.

- Automatic language detection from user input
- Responds in the same language the user speaks/types
- Handles code-switching (mixed-language input) gracefully
- Technical terms preserved in English regardless of response language
- All UI strings available in all three languages

**User Stories:**
- *As a Hindi-speaking user, I want to ask Nova questions in Hindi and get responses in Hindi, so I can use the assistant comfortably in my native language.*
- *As a bilingual user, I want to mix English and Hindi in my messages and have Nova understand both, so I can communicate naturally.*

---

### 2. Coding Assistant
Helps with coding, debugging, code explanation, and learning programming concepts.

- Explain code snippets in the user's preferred language
- Debug errors and suggest fixes
- Generate code from natural language descriptions
- Syntax highlighting in responses
- Support for popular languages: Python, JavaScript, Java, C++, HTML/CSS, SQL

**User Stories:**
- *As a developer, I want to paste an error message and have Nova explain what went wrong and suggest a fix, so I can debug faster.*
- *As a student learning Python, I want to ask Nova to explain a function in Hindi, so I can understand programming concepts in my native language.*

---

### 3. Learning Assistant
Supports learning with explanations, resources, study aids, and structured guidance.

- Break complex concepts into simple, step-by-step explanations
- Use analogies and examples relevant to the user's context
- Generate quizzes and flashcard-style Q&A
- Suggest learning resources and next steps
- Track learning topics across sessions

**User Stories:**
- *As a student, I want to ask Nova to explain machine learning in simple terms, so I can build foundational understanding.*
- *As a self-learner, I want Nova to quiz me on topics I've been studying, so I can test my retention.*

---

### 4. Research Assistant
Provides information, summarization, and structured research support.

- Answer factual questions with structured responses
- Summarize long text passages
- Compare and contrast topics
- Organize information into tables and bullet points
- Acknowledge knowledge cutoff limitations

**User Stories:**
- *As a researcher, I want to ask Nova to compare two technologies and present the comparison in a table, so I can make informed decisions.*
- *As a student, I want Nova to summarize a long article I paste, so I can study efficiently.*

---

### 5. Productivity Assistant
Assists with task management, reminders, note-taking, and time management.

- Create, edit, complete, and delete tasks
- Set reminders with date/time (notification via Windows Toast)
- Create and organize notes with tags
- Daily summary of pending tasks and upcoming reminders
- Priority levels for tasks (Low, Medium, High, Urgent)

**User Stories:**
- *As a busy professional, I want to say "Remind me to call the client at 3 PM" and have Nova set the reminder, so I don't forget important tasks.*
- *As a student, I want to manage my assignment deadlines in Nova, so I can stay organized.*

---

### 6. Cybersecurity Assistant
Helps with defensive cybersecurity education, tools, and awareness.

**Scope (Defined):**

| Feature | Description |
|---|---|
| **Security Q&A** | Answer questions about cybersecurity concepts, best practices, and threats |
| **Password Strength Checker** | Analyze password strength using zxcvbn; suggest improvements |
| **File Hash Verification** | Generate and verify MD5/SHA-256 hashes for downloaded files |
| **Security Tips** | Proactive security tips based on context (e.g., "Your password is weak") |
| **Phishing Awareness** | Help users identify phishing emails/links by analyzing text |

**Out of Scope (v1):**
- ❌ Real-time malware scanning
- ❌ Network traffic monitoring
- ❌ System vulnerability scanning
- ❌ Firewall management
- ❌ Antivirus functionality

**User Stories:**
- *As a user, I want to check if a password I'm considering is strong enough, so I can protect my accounts.*
- *As a user, I want to verify the SHA-256 hash of a downloaded file, so I can confirm it hasn't been tampered with.*
- *As a student, I want to learn about common cybersecurity threats in Hindi, so I can understand security concepts in my language.*

---

### 7. Writing Assistant
Helps with drafting, editing, and improving written content.

- Draft emails, messages, and documents
- Grammar and spelling correction
- Tone adjustment (formal, casual, professional)
- Translation between supported languages
- Content summarization and expansion

**User Stories:**
- *As a professional, I want Nova to help me draft a formal email in English from my Hindi notes, so I can communicate effectively.*
- *As a student, I want Nova to proofread my essay and suggest improvements, so I can submit better work.*

---

### 8. Contextual Memory
Maintains session context and remembers user preferences across sessions.

- Remember user's name, language, and communication style
- Track conversation topics across sessions
- Remember stated preferences (e.g., "I prefer Python over JavaScript")
- Forget specific information on user request
- No sensitive data stored unless user explicitly opts in

**User Stories:**
- *As a returning user, I want Nova to remember that I prefer Python when I ask coding questions, so I don't have to specify every time.*
- *As a privacy-conscious user, I want to tell Nova to forget something I shared, and have it actually forgotten.*

---

## System Actions

### App, File, and Website Opening
Nova opens apps, websites, files, folders, and Windows settings on user request.

- **Apps:** Launched from a curated allowlist (see [07_Security_Privacy.md](file:///c:/Users/Amandeep Singh/Desktop/prd/07_Security_Privacy.md))
- **Websites:** Opened via default browser using `webbrowser.open()`
- **Files:** Opened via `os.startfile()` with user confirmation
- **Folders:** Opened in File Explorer via `os.startfile()`
- **Windows Settings:** Opened via `ms-settings:` URI scheme

### Confirmation Framework

| Risk Level | Behavior | Examples |
|---|---|---|
| 🟢 **Safe** | Execute immediately, no confirmation | Open Calculator, open YouTube |
| 🟡 **Warning** | Ask user "Proceed?" before executing | Open a file, open Command Prompt |
| 🔴 **Blocked** | Refuse with explanation | Run shell commands, modify system files |

See [07_Security_Privacy.md](file:///c:/Users/Amandeep Singh/Desktop/prd/07_Security_Privacy.md) for the complete action taxonomy.

---

## Voice and Text Interaction

- **Text Input:** Primary input via chat interface
- **Voice Input:** Microphone input with STT transcription
- **Voice Output:** TTS for spoken responses
- **Wake Words:** "Hey Nova" and "Nova" for hands-free activation
- **Push-to-Talk:** Alternative to wake words (hold spacebar)
- **Continuous Conversation:** Mic stays active after response for follow-ups

See [06_Voice_Architecture.md](file:///c:/Users/Amandeep Singh/Desktop/prd/06_Voice_Architecture.md) for complete voice technical specification.

---

## Authentication

- **Local accounts** with username/password (no external auth server)
- **Multi-user support** on the same machine (isolated data per user)
- **Session management** via JWT tokens stored in OS keychain
- **Password recovery** via a 24-word recovery key generated at registration
- **Rate limiting** on login attempts (5/minute, lockout after 10 failures)

See [07_Security_Privacy.md](file:///c:/Users/Amandeep Singh/Desktop/prd/07_Security_Privacy.md) for complete authentication specification.

---

## Task Management

- **Create tasks** with description, due date, priority, and tags
- **Edit tasks** — update description, date, priority, status
- **Complete tasks** — mark as done with timestamp
- **Delete tasks** — soft delete (recoverable for 30 days)
- **Priority levels:** Low, Medium, High, Urgent
- **Recurring tasks:** Daily, weekly, monthly repeat options
- **Task views:** All, Today, Upcoming, Overdue, Completed
- **Natural language creation:** "Remind me to submit the report by Friday" → creates task with parsed due date

---

## Conversation Management

- **Multi-turn conversations** with full message history
- **Conversation list** with titles, timestamps, and previews
- **Search** conversations by keyword
- **Delete** conversations (soft delete, recoverable for 30 days)
- **Export** conversations as plain text or JSON
- **Session context:** Conversation state persists across app restarts
- **Token limit management:** Older messages summarized to stay within context window
- **Conversation limit:** Soft limit at 100 messages; prompt to start new conversation
- **Auto-title:** Conversations auto-titled based on first message content

---

## Data Storage

- All data stored **locally in SQLite** (encrypted with SQLCipher)
- No cloud sync or remote storage
- Users can export all their data (Settings → Privacy → Export Data)
- Users can delete all their data (Settings → Privacy → Delete All Data)
- Database backup/restore functionality

---

## Non-Functional Requirements

### Performance Targets

| Metric | Target | Maximum |
|---|---|---|
| **App startup time** (to usable UI) | < 3 seconds | 5 seconds |
| **Text response latency** (local AI) | < 2 seconds first token | 5 seconds |
| **Text response latency** (cloud AI) | < 1 second first token | 3 seconds |
| **Voice end-to-end** (wake word → first spoken word) | < 4 seconds | 8 seconds |
| **UI interaction responsiveness** | < 100ms | 200ms |
| **Task/note CRUD operations** | < 200ms | 500ms |
| **Search results** | < 500ms | 1 second |
| **App memory usage** (idle, no AI loaded) | < 300 MB | 500 MB |
| **App memory usage** (with local AI model) | < 6 GB | 8 GB |
| **CPU usage** (idle, wake word listening) | < 3% | 5% |

### Reliability

- App must not crash during normal operation
- Graceful degradation when AI models are unavailable
- Auto-recovery from database corruption (WAL mode + periodic backups)
- No data loss on unexpected shutdown (write-ahead logging)

### Accessibility

- Keyboard navigation for all UI elements
- Screen reader compatibility (ARIA labels)
- Minimum contrast ratio 4.5:1 (WCAG AA)
- Adjustable font sizes
- Voice-only mode for visually impaired users