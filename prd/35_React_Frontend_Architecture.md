# Nova AI Operating System
## Master Specification: React Frontend Architecture (RFA)
**Document Version:** 2.0  
**Status:** Approved Frontend Platform Blueprint  
**Target Audience:** Principal Frontend Architects, React Systems Engineers, UI/UX Engineers, Design System Lead Engineers  

---

# 1. EXECUTIVE SUMMARY & FRONTEND ARCHITECTURE PARADIGM

### 1.1 Beyond Static Web Pages and Heavy Re-Render Loops
Traditional web applications and AI client interfaces suffer from janky re-render loops, un-virtualized chat threads that freeze when thousands of messages accumulate, layout shifts during text streaming, and laggy visualizers that block the main JavaScript thread. When real-time token streams, audio canvas visualizers, and desktop event toasts trigger simultaneous React state updates, traditional single-tree state architectures degrade severely.

**Nova AI Operating System** implements an enterprise-grade **React Frontend Architecture (RFA)**. Powered by **React 18 Concurrent Rendering**, **Un-directional Data Flows**, **Atomic & Modular Feature Components**, **Virtual List Windowing**, and **Dedicated Offscreen Canvas Audio Rendering**, RFA delivers a fluid, 60 FPS glassmorphic desktop interface that never blocks the main UI thread during intensive AI model reasoning or multi-modal streaming.

```
+-----------------------------------------------------------------------------------+
|                        NOVA REACT CONCURRENT FRONTEND                             |
+-----------------------------------------------------------------------------------+
|                                 [CHROMIUM RENDERER SHELL]                         |
|                                         │                                         |
|                                         ▼                                         |
|            [REACT 18 CONCURRENT ROOT (`<AppProvider>` & State Container)]         |
|                                         │                                         |
|        ┌────────────────────────────────┼────────────────────────────────┐        |
|        ▼                                ▼                                ▼        |
|  [Main Layout Container]       [Voice Orb Canvas Overlay]       [Streaming UI Buffer] |
|  (Resizable Docking Panels)    (Offscreen RMS Physics 60 FPS)   (Chunked SSE Pipe)   |
|        │                                │                                │        |
|        └────────────────────────────────┴────────────────────────────────┘        |
|                                         │                                         |
|                                         ▼                                         |
|                     [FEATURE MODULE MATRIX (12 MODULES)]                          |
|                                         │                                         |
|        ┌───────────────────────┬────────┴────────┬───────────────────────┐        |
|        ▼                       ▼                 ▼                       ▼        |
|  [Conversation]            [Memory]           [Vision]               [Workflows]  |
+-----------------------------------------------------------------------------------+
```

---

# 2. THE 8-TIER FRONTEND PIPELINE SPECIFICATION

Every user click, keypress, or incoming SSE token stream flows through an eight-tier frontend execution pipeline:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Tier 1: User Input Event Layer (Keyboard, Mouse, Voice Audio Stream)   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 2: Electron BrowserWindow Container & Preload ContextBridge        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 3: React 18 Concurrent Root & AppContext Reducer Container         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 4: Custom State Hooks Layer (`useChat`, `useVoice`, `useOS`)       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 5: Feature Module Orchestrator (Chat, Voice, Memory, Workflows)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 6: UI Component System Matrix (Atomic Glassmorphic Components)     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 7: Real-Time Virtual List Windowing & Offscreen Canvas Engine     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 8: Transport Client Layer (REST Client / SSE Reader / WebSockets)  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 3. COMPLETE FRONTEND REPOSITORY FOLDER BLUEPRINT

The canonical, production-grade directory layout for Nova React Frontend adheres to strict modular component isolation:

```
src/
├── app/                        # App Entrypoint & Provider Shell
│   ├── main.tsx                # React DOM root & concurrent render bootstrap
│   ├── App.tsx                 # Master layout wrapper & router dispatcher
│   └── index.css               # Design tokens, CSS variables, glassmorphism
├── assets/                     # Static SVGs, audio earcons, brand logos
├── components/                 # Atomic Reusable UI Components
│   ├── ui/                     # Basic design tokens (Button, Input, Card, Modal)
│   ├── Chat/                   # Chat container, MessageBubble, CodeBlock, Markdown
│   ├── Voice/                  # VoiceOrb, WaveformVisualizer, AudioMeter
│   ├── Header/                 # Titlebar, Frameless Controls, Status Badge
│   ├── Navigation/             # Sidebar, NavigationRail, QuickSearch Overlay
│   └── System/                 # NotificationToast, ErrorBoundary, Tooltip
├── context/                    # React Context State Management
│   └── AppContext.tsx          # Master reducer context & state dispatcher
├── features/                   # 12 Independent Domain Feature Modules
│   ├── conversation/           # Conversation thread history & streaming logic
│   ├── voice/                  # Speech ASR/TTS visualizer & state
│   ├── vision/                 # Screen capture frame inspector & OCR overlay
│   ├── memory/                 # MPE Memory Explorer & Salience Graph
│   ├── knowledge/              # KRIE Second Brain document viewer & RAG search
│   ├── workflow/               # WASE Workflow Builder & DAG Execution Viewer
│   ├── automation/             # DATEE Desktop Automation status & permissions
│   ├── plugins/                # PSEP Plugin Store & MCP Server Inspector
│   ├── timeline/               # Chronological Activity Log & Event Audit
│   ├── settings/               # System Settings, Model Router, API Key Vault
│   ├── devconsole/             # PMOE Telemetry Dashboard & Log Viewer
│   └── notifications/          # System alert toasts & notification center
├── hooks/                      # Custom Reusable React Hooks
│   ├── useChat.ts              # SSE Streaming & conversation thread dispatcher
│   ├── useVoice.ts             # Audio recording & TTS stream player hook
│   ├── useOS.ts                # Electron IPC bridge wrapper hook
│   └── useVirtualList.ts       # Virtual windowing hook for chat threads
├── layouts/                    # Application Structural Layout Templates
│   ├── MainLayout.tsx          # Resizable 3-pane docking workspace layout
│   └── OverlayLayout.tsx       # Compact Alt+Space overlay layout
├── services/                   # Frontend Transport & API Clients
│   ├── api.ts                  # Axios/Fetch client for REST endpoints
│   ├── sse.ts                  # Server-Sent Events token stream parser
│   └── ws.ts                   # WebSocket client for Voice & Desktop events
├── styles/                     # CSS Design System & Theme Modules
│   ├── theme.css               # Dark Glassmorphism CSS variables & tokens
│   └── typography.css          # Inter / JetBrains Mono font definitions
├── types/                      # Master Domain TypeScript Types (`types.ts`)
└── utils/                      # Helper Functions & Utility Modules
    ├── languageDetector.ts    # Multilingual Unicode EN/HI/PA language parser
    └── ttsPlayer.ts           # Web Speech / Kokoro TTS stream player
```

---

# 4. 12 CORE FEATURE MODULES SPECIFICATION

RFA isolates frontend functionality into twelve independent domain feature modules:

```
+-----------------------------------------------------------------------------------+
|                            THE 12 FRONTEND FEATURE MODULES                        |
+-----------------------------------------------------------------------------------+
| 1. Conversation Module  2. Voice Module        3. Vision Module                   |
| 4. Memory Explorer      5. Knowledge Explorer  6. Workflow Dashboard              |
| 7. Automation Center    8. Plugin Store        9. Activity Timeline               |
|10. Settings Console     11. Dev Console       12. Notification Center             |
+-----------------------------------------------------------------------------------+
```

---

# 5. STATE MANAGEMENT & CONCURRENT RENDERING STRATEGY

RFA enforces a clear, non-overlapping multi-tier state management strategy:

```
+-----------------------------------------------------------------------------------+
|                         MULTI-TIER STATE MANAGEMENT TABLE                         |
+-----------------------------------------------------------------------------------+
| State Scope             | Tech Implementation        | Domain Responsibility      |
| ----------------------- | -------------------------- | -------------------------- |
| **Global App State**    | `useReducer` in `AppContext`| Theme, Active Chat, Settings|
| **Streaming UI State**  | React 18 `useTransition`   | High-frequency token stream|
| **Audio Canvas State**  | Offscreen Canvas / Ref      | 60 FPS Voice Orb audio RMS  |
| **Form & Modal State**  | Local Component `useState` | TextInput, Modal Toggles   |
+-----------------------------------------------------------------------------------+
```

---

# 6. DESIGN SYSTEM TOKENS & ORGANIC ANIMATIONS

Nova’s UI uses a dark glassmorphic design system with CSS custom properties:

```css
:root {
  --bg-primary: #0A0D14;
  --bg-glass: rgba(18, 24, 38, 0.75);
  --border-glass: rgba(255, 255, 255, 0.08);
  --accent-cyan: #00F0FF;
  --accent-green: #00FF66;
  --accent-purple: #7000FF;
  --text-main: #F0F4F8;
  --text-muted: #8A99AD;
  --backdrop-blur: blur(16px);
}
```

---

# 7. PERFORMANCE TARGETS & RESOURCE BUDGETS

$$\text{Initial JS Bundle Size} \le 250\text{KB}, \quad \text{UI Frame Rate} \ge 60\text{ FPS}$$

```
+-----------------------------------------------------------------------------------+
|                             SYSTEM LATENCY BENCHMARKS                             |
+-----------------------------------------------------------------------------------+
| Frontend Performance Metric      | Target Benchmark | Optimization Strategy       |
| -------------------------------- | ---------------- | --------------------------- |
| JS Initial Bundle Size (Gzipped) | < 250KB          | Dynamic Code Splitting      |
| Chat Thread Frame Rate           | 60 FPS           | `@tanstack/react-virtual`   |
| SSE Token Re-render Overhead     | < 4ms            | React 18 `useTransition`    |
| Voice Orb Canvas FPS             | 60 FPS           | Offscreen Canvas Worker     |
+-----------------------------------------------------------------------------------+
```

---

# 8. STRICT FORBIDDEN FRONTEND BEHAVIORS

```
+-----------------------------------------------------------------------------------+
|                         STRICT FORBIDDEN FRONTEND BEHAVIORS                       |
+-----------------------------------------------------------------------------------+
|  [X] NEVER block the main JavaScript UI thread with synchronous calculations      |
|  [X] NEVER render thousands of DOM chat nodes without virtual list windowing      |
|  [X] NEVER cause full React tree re-renders during high-frequency token streaming |
|  [X] NEVER expose backend API key secrets or un-redacted user data in UI state    |
|  [X] NEVER disable WCAG keyboard focus indicators or break ARIA accessibility     |
+-----------------------------------------------------------------------------------+
```

---

**End of Master Specification**  
*Nova AI Operating System — React Frontend Architecture v2.0*
