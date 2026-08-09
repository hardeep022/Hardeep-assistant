# Nova AI Operating System
## Master Specification: Electron Desktop Architecture (EDA)
**Document Version:** 2.0  
**Status:** Approved Desktop Platform Blueprint  
**Target Audience:** Lead Electron Engineers, Desktop Software Architects, Windows Systems Engineers, Frontend Infrastructure Leads  

---

# 1. EXECUTIVE SUMMARY & ELECTRON ARCHITECTURE PARADIGM

### 1.1 Beyond Generic Electron Apps and Monolithic Node Bundles
Traditional Electron applications suffer from bloated memory footprints, sluggish window creation, insecure Node.js integration in the renderer, and main-process thread blocking. When intensive AI workloads (such as LLM token streaming, neural voice synthesis, or background vector indexing) are routed through the main Electron event loop, the application becomes unresponsive and prone to un-recoverable crashes.

**Nova AI Operating System** implements a 10-year enterprise-grade **Electron Desktop Architecture (EDA)**. Nova structures the desktop client into a **multi-window, process-isolated shell**. It strictly enforces **Context Isolation**, **Node Integration Disabled in Renderer**, **Content Security Policies (CSP)**, **Type-Safe Preload IPC Bridges**, and **Dedicated Background Worker Threads**—guaranteeing sub-40ms UI responsiveness and complete fault isolation across all 9 application window types.

```
+-----------------------------------------------------------------------------------+
|                        NOVA ELECTRON MULTI-WINDOW ARCHITECTURE                    |
+-----------------------------------------------------------------------------------+
|                                 [WINDOWS OS KERNEL]                               |
|                                         │                                         |
|                                         ▼                                         |
|                             [ELECTRON MAIN PROCESS]                               |
|                    (App Lifecycle, Native APIs, Security Gate)                    |
|                                         │                                         |
|        ┌────────────────────────────────┼────────────────────────────────┐        |
|        ▼                                ▼                                ▼        |
|  [Main Chat Window]           [Voice Overlay Window]           [Floating Assistant]   |
|  (React 18 / Tailwind)        (Frameless Audio Orb)            (Global Hotkey Overlay)|
|        │                                │                                │        |
|        └────────────────────────────────┴────────────────────────────────┘        |
|                                         │                                         |
|                                         ▼                                         |
|                    [TYPE-SAFE PRELOAD IPC SECURITY BRIDGE]                        |
|                                         │                                         |
|                                         ▼                                         |
|                    [ISOLATED AI & PLUGIN BACKGROUND WORKERS]                      |
+-----------------------------------------------------------------------------------+
```

---

# 2. THE 9-LAYER APPLICATION ARCHITECTURE

Nova structures desktop execution across nine decoupled runtime layers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Layer 1: Microsoft Windows OS Native API & Driver Layer                 │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Layer 2: Electron Main Process (`electron/main.ts`)                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Layer 3: Type-Safe Context Bridge Preload Layer (`electron/preload.ts`) │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Layer 4: Electron Renderer Process Pool (Chromium Sandboxes)            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Layer 5: React 18 UI Shell & Glassmorphic Component Matrix               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Layer 6: AppContext & Custom State Hooks (`useChat`, `useVoice`, `useOS`)│
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Layer 7: Background Service Manager (Voice, Memory, Workflow, Plugins)  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Layer 8: AI Core Daemon Bridge (Python FastAPI Sidecar Daemon)          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Layer 9: Sandboxed Plugin & Third-Party MCP Worker Processes            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 3. WINDOW MANAGEMENT & THE 9 WINDOW TYPES

Nova orchestrates nine specialized BrowserWindow instances, each pre-warmed for instant rendering:

```
+-----------------------------------------------------------------------------------+
|                            THE 9 WINDOW TYPES SPECIFICATION                       |
+-----------------------------------------------------------------------------------+
| Window Type             | Frame & Style                | Functional Purpose       |
| ----------------------- | ---------------------------- | ------------------------ |
| **Main Window**         | Frameless, Custom Controls   | Primary chat & workspace |
| **Overlay Window**      | Frameless, Always-on-Top     | Quick `Alt+Space` bar    |
| **Floating Assistant**  | Semi-Transparent Orb         | Desktop voice orb widget |
| **Voice Overlay**       | Compact Audio Visualizer     | Hands-free voice state   |
| **Settings Window**     | Standard Framed Dialog       | Preferences & API keys   |
| **Plugin Window**       | Bounded Sandboxed Webview    | Third-party extension UI |
| **Dev Console Window**  | Detached Inspector           | SRE diagnostics & logs   |
| **Notification Toast**  | Non-interactive Popup        | OS status alert toasts   |
| **Modal Confirmation**  | Modal Blocking Prompt        | High-risk action approval|
+-----------------------------------------------------------------------------------+
```

---

# 4. IPC ARCHITECTURE & PRELOAD SECURITY BRIDGE

Nova strictly prohibits exposing raw `ipcRenderer` or Node.js primitives to renderers. Communication flows exclusively through typed ContextBridge methods defined in `electron/preload.ts`:

```
+-----------------------------------------------------------------------------------+
|                        TYPE-SAFE IPC CONTEXT BRIDGE SCHEMA                        |
+-----------------------------------------------------------------------------------+
| API Namespace      | Exposed Preload Method          | Security Channel           |
| ------------------ | ------------------------------- | -------------------------- |
| `window.nova.chat` | `sendMessage(prompt, context)`  | `ipcMain.handle('chat:msg')|
| `window.nova.voice`| `startListening(config)`        | `ipcMain.on('voice:listen')|
| `window.nova.sys`  | `getSystemStats()`              | `ipcMain.handle('sys:stat')|
| `window.nova.tool` | `executeAction(actionPayload)`  | `ipcMain.handle('tool:exec')|
+-----------------------------------------------------------------------------------+
```

---

# 5. COMPLETE PROJECT REPOSITORY FOLDER BLUEPRINT

The canonical, modular directory structure for Nova Desktop adheres to strict separation of concerns:

```
Nova/
├── electron/                   # Electron Main & Preload Process Source
│   ├── main.ts                 # Single-instance lock, window lifecycle, IPC handlers
│   ├── preload.ts              # ContextBridge type-safe IPC security bridge
│   ├── windowManager.ts        # Window pool manager & pre-warming controller
│   ├── singleInstance.ts       # App single instance lock logic
│   └── services/               # Native Windows OS integration services
│       ├── autoUpdater.ts      # Differential NSIS update manager
│       ├── nativeTray.ts       # System tray icon & context menu
│       └── globalShortcuts.ts  # Hotkey registration (Alt+Space)
├── src/                        # React 18 Renderer UI Source
│   ├── main.tsx                # React DOM entrypoint & provider wrap
│   ├── App.tsx                 # Core UI routing & layout container
│   ├── index.css               # Design system tokens, glassmorphism CSS
│   ├── components/             # Reusable UI component matrix
│   │   ├── Chat/               # Chat stream, markdown renderer, code blocks
│   │   ├── Voice/              # Voice Orb, visualizer wave, audio controls
│   │   ├── Header/             # Custom window controls, titlebar, status
│   │   └── Settings/           # Model selection, API keys, memory manager
│   ├── context/                # Global React state context & reducers
│   │   └── AppContext.tsx      # Unified state reducer & dispatchers
│   ├── hooks/                  # Custom state hooks
│   │   ├── useChat.ts          # Chat streaming & conversation management
│   │   ├── useVoice.ts         # Hybrid speech recognition & TTS hook
│   │   └── useOS.ts            # Desktop automation IPC bridge hook
│   ├── types.ts                # TypeScript domain type definitions
│   └── utils/                  # Utility functions
│       ├── languageDetector.ts # Multilingual EN/HI/PA language matching
│       └── ttsPlayer.ts        # Web Speech / Kokoro TTS stream player
├── voice/                      # Python Audio & AI Sidecar Service
│   ├── voice_service.py        # Python FastAPI daemon entrypoint
│   └── requirements.txt       # Faster-Whisper, Kokoro, PyTorch dependencies
├── prd/                        # Master PRD Specification Suite
├── public/                     # Static assets, icons, sound earcons
├── package.json                # Project dependencies & build scripts
├── tsconfig.json               # TypeScript master configuration
└── vite.config.ts              # Vite + Electron build configuration
```

---

# 6. AUTO-UPDATE, CRASH RECOVERY & FAILOVER MATRIX

Nova ensures 100% desktop operational uptime via automated recovery protocols:

```
+-----------------------------------------------------------------------------------+
|                        AUTO-UPDATE & CRASH FAILOVER MATRIX                        |
+-----------------------------------------------------------------------------------+
| Failure / Event                | Recovery & Failover Mechanism                    |
| ------------------------------ | ------------------------------------------------ |
| Renderer Process Crash         | Auto-reload Chromium tab; restore React state    |
| Python AI Daemon Crash         | Auto-respawn daemon process within < 800ms        |
| Plugin Worker Failure          | Terminate isolated V8 worker; update status UI   |
| Auto-Update Channel            | Supports `Stable`, `Beta`, and `Nightly` release |
| Update Rollback                | Automatic rollback to previous version on error  |
+-----------------------------------------------------------------------------------+
```

---

# 7. PERFORMANCE TARGETS & RESOURCE BUDGETS

$$\text{Base RAM Footprint} \le 60\text{MB}, \quad \text{Pre-Warmed Window Spawn} \le 40\text{ms}$$

```
+-----------------------------------------------------------------------------------+
|                             SYSTEM LATENCY BENCHMARKS                             |
+-----------------------------------------------------------------------------------+
| Desktop Operational Metric       | Target Benchmark | Optimization Strategy       |
| -------------------------------- | ---------------- | --------------------------- |
| Main Process Base RAM            | < 60MB           | Tree-shaken Node modules    |
| Window Spawn Latency             | < 40ms           | Background Window Pre-Warm  |
| IPC Message Serialization        | < 2ms            | Fast Binary JSON Protocol   |
| Renderer FPS during TTS Stream   | 60 FPS           | Hardware Accelerated Canvas |
+-----------------------------------------------------------------------------------+
```

---

# 8. STRICT FORBIDDEN ELECTRON BEHAVIORS

```
+-----------------------------------------------------------------------------------+
|                        STRICT FORBIDDEN ELECTRON BEHAVIORS                        |
+-----------------------------------------------------------------------------------+
|  [X] NEVER enable `nodeIntegration: true` in any Renderer process window           |
|  [X] NEVER disable `contextIsolation` in preload security bridges                 |
|  [X] NEVER block the main Electron event loop with synchronous file or CPU tasks  |
|  [X] NEVER expose raw `ipcRenderer` primitives directly to web application code    |
|  [X] NEVER allow secondary windows or third-party webviews to bypass CSP rules     |
+-----------------------------------------------------------------------------------+
```

---

**End of Master Specification**  
*Nova AI Operating System — Electron Desktop Architecture v2.0*
