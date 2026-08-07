# UI/UX Requirements

## Theme System

Nova uses a **dark theme** as the primary design with an optional **light theme** toggle. The dark theme is the default, reflecting the app's identity as a modern AI desktop assistant.

### Dark Theme (Default)

| Token | Hex Code | Usage |
|---|---|---|
| **Primary** | `#3B82F6` | Buttons, active states, links, primary actions |
| **Secondary** | `#64748B` | Secondary text, borders, inactive elements |
| **Accent** | `#06B6D4` | Highlights, badges, notification indicators, accents |
| **Background** | `#0F172A` | Main app background |
| **Surface** | `#1E293B` | Cards, panels, sidebar, elevated surfaces |
| **Surface Elevated** | `#334155` | Modals, dropdowns, tooltips |
| **Text Primary** | `#F8FAFC` | Headings, body text, primary content |
| **Text Secondary** | `#94A3B8` | Captions, hints, timestamps, metadata |
| **Text Muted** | `#64748B` | Placeholders, disabled text |
| **Success** | `#22C55E` | Success states, completed tasks, confirmations |
| **Warning** | `#F59E0B` | Warning states, overdue tasks, caution alerts |
| **Error** | `#EF4444` | Error states, destructive actions, validation errors |
| **Gradient Primary** | `#3B82F6 → #06B6D4` | Nova orb animation, hero elements, active indicators |
| **Gradient Accent** | `#06B6D4 → #8B5CF6` | Accent highlights, progress bars, hover effects |
| **Border** | `#334155` | Card borders, dividers, input outlines |
| **Border Focus** | `#3B82F6` | Focused input fields, active navigation items |

### Light Theme (Toggle)

| Token | Hex Code | Usage |
|---|---|---|
| **Primary** | `#2563EB` | Same role, slightly darker for contrast on white |
| **Secondary** | `#64748B` | Same role |
| **Accent** | `#0891B2` | Same role, slightly darker |
| **Background** | `#F8FAFC` | Main app background |
| **Surface** | `#FFFFFF` | Cards, panels, sidebar |
| **Surface Elevated** | `#F1F5F9` | Modals, dropdowns |
| **Text Primary** | `#0F172A` | Headings, body text |
| **Text Secondary** | `#475569` | Captions, hints |
| **Text Muted** | `#94A3B8` | Placeholders |
| **Success** | `#16A34A` | Success states |
| **Warning** | `#D97706` | Warning states |
| **Error** | `#DC2626` | Error states |
| **Gradient Primary** | `#2563EB → #0891B2` | Same role |
| **Border** | `#E2E8F0` | Card borders, dividers |
| **Border Focus** | `#2563EB` | Focused inputs |

### Theme Toggle

- Toggle located in Settings → Appearance → Theme (Dark / Light / System)
- **System** option follows Windows dark/light mode preference
- Theme transition: 200ms CSS transition for smooth switching
- User preference persisted in `user_preferences` table

---

## Typography

| Element | Font | Size | Weight | Line Height |
|---|---|---|---|---|
| **App Title** | Inter | 24px | 700 (Bold) | 1.2 |
| **Page Heading** | Inter | 20px | 600 (SemiBold) | 1.3 |
| **Section Heading** | Inter | 16px | 600 (SemiBold) | 1.4 |
| **Body Text** | Inter | 14px | 400 (Regular) | 1.6 |
| **Chat Message** | Inter | 14px | 400 (Regular) | 1.6 |
| **Code Block** | JetBrains Mono | 13px | 400 (Regular) | 1.5 |
| **Caption / Timestamp** | Inter | 12px | 400 (Regular) | 1.4 |
| **Button Label** | Inter | 14px | 500 (Medium) | 1.0 |
| **Input Placeholder** | Inter | 14px | 400 (Regular) | 1.6 |

- **Hindi/Punjabi:** Noto Sans Devanagari (Hindi), Noto Sans Gurmukhi (Punjabi) as fallback fonts
- **Font Loading:** Bundled with the app (no network dependency)

---

## Spacing & Layout

| Token | Value |
|---|---|
| **Base Unit** | 4px |
| **Spacing XS** | 4px |
| **Spacing SM** | 8px |
| **Spacing MD** | 16px |
| **Spacing LG** | 24px |
| **Spacing XL** | 32px |
| **Spacing 2XL** | 48px |
| **Border Radius SM** | 6px |
| **Border Radius MD** | 8px |
| **Border Radius LG** | 12px |
| **Border Radius Full** | 9999px (pills, avatars) |
| **Sidebar Width** | 260px (collapsible to 60px) |
| **Chat Input Height** | 48px (expandable to 120px) |
| **Max Content Width** | 800px (chat messages) |

---

## Design Guidance

- **Minimalistic and focused:** Clean layouts with generous whitespace; avoid visual clutter
- **Glassmorphism accents:** Subtle frosted-glass effect on modals and overlays (`backdrop-filter: blur(12px)`)
- **Smooth animations:** 200ms ease transitions for all interactive elements
- **Dark-first design:** Optimized for extended desktop use; reduces eye strain
- **Responsive within desktop:** Adapts to window resizing (minimum: 900×600; recommended: 1280×800)
- **Accessible:** WCAG AA compliance; 4.5:1 contrast ratio minimum; full keyboard navigation

---

## Core Screens

### 1. Login Screen

**Purpose:** User authentication and account selection.

**Key Components:**
- Nova logo with gradient orb animation (centered)
- Username input field
- Password input field (with show/hide toggle)
- "Log In" primary button
- "Create Account" secondary link
- Language selector (English / Hindi / Punjabi) at bottom
- User account cards (if multiple users exist on machine)

**States:**
- **Default:** Empty form with logo animation
- **Loading:** Button shows spinner during auth
- **Error:** Inline error below password field ("Invalid username or password")
- **Locked:** "Account locked. Try again in 60 seconds." with countdown

---

### 2. Home Screen

**Purpose:** Central hub with quick access to all features and a daily overview.

**Key Components:**
- **Greeting banner:** "Good morning, {name}!" with date/time (language-aware)
- **Quick action cards:** Coding, Learning, Research, Productivity, Cybersecurity, Writing (6 cards in a 3×2 grid)
- **Today's overview panel:**
  - Pending tasks count with overdue highlight
  - Upcoming reminders (next 3)
  - Last conversation preview with "Continue" button
- **Quick chat input:** Text field at bottom for instant interaction without navigating to a dedicated screen
- **Sidebar:** Navigation to all screens (collapsible)

**States:**
- **New User:** Welcome message with onboarding tips instead of overview panel
- **Active User:** Full overview with relevant data
- **Empty State:** "No tasks yet. Try saying 'Remind me to...' " with illustration

---

### 3. Chat Screen (Coding / Learning / Research / Writing Assistant)

**Purpose:** Primary AI interaction interface. The same chat UI is used for all assistant modes, with the active mode determining the AI's system prompt.

**Key Components:**
- **Mode selector tabs:** Coding | Learning | Research | Writing | General (top bar)
- **Chat message area:** Scrollable message list with:
  - User messages (right-aligned, primary color bubble)
  - Nova messages (left-aligned, surface color bubble)
  - Code blocks with syntax highlighting and copy button
  - Markdown rendering in responses
  - Typing indicator (animated dots when Nova is generating)
- **Input area:**
  - Multi-line text input (expandable)
  - Send button (Primary color, icon)
  - Voice input button (mic icon, toggles recording)
  - Attach file button (for code files or text, future)
- **Conversation sidebar (right panel, collapsible):**
  - List of past conversations with search
  - "New Conversation" button
  - Conversation title, date, message count preview

**States:**
- **Empty:** "Start a conversation with Nova" with suggested prompts
- **Loading:** Typing indicator + skeleton message
- **Error:** "Something went wrong. Try again." with retry button
- **Voice Active:** Orb animation replaces input area; waveform visualization

---

### 4. Productivity Assistant Screen

**Purpose:** Task management, reminders, and note-taking in one view.

**Key Components:**
- **Tab bar:** Tasks | Reminders | Notes
- **Tasks tab:**
  - Task list with checkboxes, priority badges (color-coded), due dates
  - Filter bar: All | Today | Upcoming | Overdue | Completed
  - Sort: Due Date | Priority | Created Date
  - "Add Task" floating action button
  - Inline task editing
  - Swipe/click to complete or delete
- **Reminders tab:**
  - Upcoming reminders list with time, date, and description
  - Toggle to enable/disable individual reminders
  - "Add Reminder" with date/time picker
- **Notes tab:**
  - Notes list with title, preview, tags, and last edited date
  - Full note editor (rich text or markdown)
  - Tag management
  - Search notes by content or tag
- **AI chat mini-panel (bottom):** Quick input to manage tasks via natural language ("Add a task to buy groceries by tomorrow")

**States:**
- **Empty:** "No tasks yet" with illustration and suggested actions
- **Populated:** Full list with sort/filter active
- **Task Detail:** Expanded task card with edit fields

---

### 5. Cybersecurity Assistant Screen

**Purpose:** Security tools and cybersecurity education.

**Key Components:**
- **Security chat:** AI chat interface (same as Chat Screen) with cybersecurity system prompt
- **Tools panel (sidebar or tabs):**
  - **Password Checker:** Input field → strength meter (color bar + score + suggestions)
  - **Hash Verifier:** File picker + hash type selector (MD5/SHA-256) → computed hash + comparison input
  - **Security Tips:** Rotating card with daily security tip
- **Learning section:** Curated cybersecurity topics with Q&A format

**States:**
- **Default:** Chat + tools panel visible
- **Password Check Result:** Strength meter with color (red/orange/yellow/green) + improvement suggestions
- **Hash Result:** Computed hash displayed with match/mismatch indicator

---

### 6. Task Management Screen

**Purpose:** Dedicated full-screen task management (separate from the Productivity Assistant's compact view).

**Key Components:**
- Same as Productivity Assistant → Tasks tab, but **full-screen layout**
- **Board view option:** Kanban-style columns (To Do | In Progress | Done)
- **Calendar view option:** Tasks and reminders on a monthly calendar
- **Bulk actions:** Select multiple tasks → complete, delete, change priority
- **Statistics:** Tasks completed this week/month, streak counter

---

### 7. Conversation Management Screen

**Purpose:** Browse, search, and manage all past conversations.

**Key Components:**
- **Conversation list:** Title, date, message count, assistant mode used
- **Search bar:** Full-text search across all conversations
- **Filters:** By assistant mode, date range, language
- **Conversation detail:** Click to open full conversation in read-only view
- **Actions:** Delete, export (TXT/JSON), rename, pin/favorite
- **Bulk actions:** Select multiple → delete, export

**States:**
- **Empty:** "No conversations yet. Start chatting with Nova!"
- **Search results:** Filtered list with highlighted matches
- **Export:** File save dialog for TXT/JSON export

---

### 8. Settings Screen

**Purpose:** Configure all Nova preferences.

**Sections:**
- **General:** Language, theme (Dark/Light/System), start with Windows, notifications
- **AI Configuration:**
  - Mode selector (Local / Cloud / Hybrid / Auto)
  - Local model management (download/delete models via Ollama)
  - Cloud API key configuration (OpenAI, Google)
  - Default model selection
- **Voice:**
  - STT engine selection and model size
  - TTS engine selection and voice
  - Wake word enable/disable and sensitivity
  - Push-to-talk key binding
  - Microphone and speaker selection
  - Voice speed and volume
- **Privacy:**
  - Data encryption status
  - Export all data button
  - Delete all data button (with confirmation)
  - Cloud mode indicator
- **Account:**
  - Change password
  - View recovery key
  - Delete account
- **About:** Version, credits, licenses

---

### 9. Registration Screen

**Purpose:** New user account creation.

**Key Components:**
- Nova logo with welcome message
- Display name input
- Username input (unique check)
- Password input with strength meter
- Confirm password input
- Language preference selector (English / Hindi / Punjabi)
- "Create Account" primary button
- "Already have an account? Log In" link
- **Recovery Key Display** (shown after successful registration):
  - 24-word recovery key in a highlighted box
  - "I've saved my recovery key" checkbox (required to proceed)
  - Copy to clipboard button
  - Warning: "Store this key safely. You'll need it if you forget your password."

---

## Navigation Flow

```
                    ┌──────────────┐
                    │    Login     │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────────┐
        │  Home    │ │Register  │ │ Password     │
        └────┬─────┘ └──────────┘ │ Recovery     │
             │                     └──────────────┘
    ┌────────┼──────────┬──────────┬──────────┐
    │        │          │          │          │
    ▼        ▼          ▼          ▼          ▼
┌───────┐┌───────┐┌──────────┐┌───────┐┌──────────┐
│ Chat  ││Produc-││Cybersec- ││Task   ││Settings  │
│Screen ││tivity ││urity     ││Mgmt   ││          │
│       ││Asst   ││Asst      ││       ││          │
└───────┘└───────┘└──────────┘└───────┘└──────────┘
    │                                       │
    ▼                                       │
┌──────────────┐                            │
│ Conversation │◄───────────────────────────┘
│ Management   │
└──────────────┘
```

### Sidebar Navigation (Always Visible)

```
┌─────────────────────┐
│  🔵 Nova            │  ← Logo + app name
│                     │
│  🏠 Home            │
│  💬 Chat            │  ← Expands to show mode tabs
│  ✅ Tasks           │
│  📝 Productivity    │
│  🔒 Cybersecurity   │
│  📚 Conversations   │
│                     │
│  ─────────────────  │
│  ⚙️ Settings        │
│  👤 {Username}      │  ← Click for account menu
│  🚪 Logout          │
└─────────────────────┘
```

- Sidebar collapses to icon-only on narrow windows (< 1100px width)
- Active screen highlighted with Primary color left border
- Hover shows tooltip with screen name when collapsed

---

## Accessibility Requirements

| Requirement | Implementation |
|---|---|
| **Keyboard Navigation** | All interactive elements focusable; Tab order follows visual layout; Enter/Space to activate |
| **Screen Reader** | All elements have ARIA labels; live regions for dynamic content (chat messages, notifications) |
| **Contrast Ratio** | Minimum 4.5:1 for text; 3:1 for large text and UI components (WCAG AA) |
| **Font Scaling** | Respects Windows display scaling; manual font size adjustment in Settings (Small/Medium/Large) |
| **Motion** | Respects `prefers-reduced-motion`; disables animations when enabled |
| **Voice Mode** | Full app functionality available via voice for visually impaired users |
| **Color Blindness** | Status indicators use both color AND icons/text (not color alone) |