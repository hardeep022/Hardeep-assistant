# Nova AI Operating System
## Master Specification: FastAPI Backend Architecture (FBA)
**Document Version:** 2.0  
**Status:** Approved Backend Platform Blueprint  
**Target Audience:** Principal Backend Engineers, FastAPI Architects, AI Infrastructure Engineers, Python Systems Developers  

---

# 1. EXECUTIVE SUMMARY & BACKEND PARADIGM

### 1.1 Beyond Monolithic Web Frameworks and Synchronous Blocking Code
Traditional AI backends suffer from synchronous blocking IO, tightly coupled route handlers, lack of process isolation, and chaotic memory leaks when loading machine learning models into memory. When an LLM inference or audio processing loop blocks Python's Global Interpreter Lock (GIL) or AsyncIO event loop, API routes freeze, WebSocket connections drop, and desktop automation fails.

**Nova AI Operating System** implements a commercial-grade **FastAPI Backend Architecture (FBA)**. Serving as Nova’s **AI Intelligence Daemon**, FBA is built on a clean **Layered Architecture (Router -> Service -> Repository -> Database)**. It enforces **AsyncIO non-blocking execution**, **Dependency Injection**, **Streaming Server-Sent Events (SSE) & WebSockets**, **SQLCipher Encrypted Persistence**, and **Isolated Model Cache Pools**—scaling effortlessly from a single local desktop installation to enterprise cloud deployment.

```
+-----------------------------------------------------------------------------------+
|                        NOVA FASTAPI INTELLIGENCE DAEMON                           |
+-----------------------------------------------------------------------------------+
|                                 [ELECTRON CLIENT / IPC GATEWAY]                   |
|                                         │                                         |
|                                         ▼                                         |
|                 [FASTAPI API GATEWAY (REST / WEBSOCKETS / SSE)]                   |
|                                         │                                         |
|        ┌────────────────────────────────┼────────────────────────────────┐        |
|        ▼                                ▼                                ▼        |
|  [API Router Layer]           [Dependency Injector]           [Security & Auth Gate]|
|  (Clean Route Handlers)       (Service Container)             (DPAPI & Token Gate)  |
|        │                                │                                │        |
|        └────────────────────────────────┴────────────────────────────────┘        |
|                                         │                                         |
|                                         ▼                                         |
|                     [BUSINESS SERVICE LAYER (12 SERVICES)]                        |
|                                         │                                         |
|        ┌────────────────────────────────┼────────────────────────────────┐        |
|        ▼                                ▼                                ▼        |
|[AI Model Router (MRIO)]    [Agent Matrix (MAIA)]         [Repository Layer (SQLCipher)]|
+-----------------------------------------------------------------------------------+
```

---

# 2. THE 10-LAYER BACKEND PIPELINE SPECIFICATION

Every backend HTTP, WebSocket, or IPC request flows through a ten-tier execution stack:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Tier 1: Electron Desktop Client / Local IPC Socket                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 2: FastAPI API Gateway & CORS / Rate Limit Filter                  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 3: Security Authentication & DPAPI Privilege Gate                  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 4: API Router Layer (Type-Checked Pydantic V2 Schemas)             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 5: Dependency Injection & Service Container                        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 6: Business Service Layer (Conversation, Memory, Voice, Vision)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 7: AI Runtime Kernel (MRIO Model Router & MAIA 26-Agent Matrix)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 8: Domain Logic & Tool Execution Managers                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 9: Repository Pattern Layer (Data Abstraction & Query Caching)     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Tier 10: SQLCipher Encrypted DB & HNSW Vector Index Persistence         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 3. COMPLETE BACKEND REPOSITORY FOLDER BLUEPRINT

The canonical, production-grade Python project layout for Nova Backend adheres to clean architecture principles:

```
nova_backend/
├── app/                        # Main Application Package
│   ├── main.py                 # FastAPI app initialization & middleware configuration
│   ├── core/                   # System-wide core configurations
│   │   ├── config.py           # Pydantic BaseSettings & env configuration
│   │   ├── security.py         # DPAPI vault, JWT, and password hashing
│   │   ├── events.py           # Async System Event Bus pub-sub
│   │   └── logging.py          # Structured JSON logging setup
│   ├── api/                    # API Route Handlers
│   │   ├── v1/                 # Versioned API routes
│   │   │   ├── api.py          # Master router aggregator
│   │   │   ├── endpoints/      # Specialized route modules
│   │   │   │   ├── chat.py     # Conversation SSE streaming endpoints
│   │   │   │   ├── voice.py    # Audio ASR/TTS WebSocket endpoints
│   │   │   │   ├── vision.py   # Screen capture & OCR endpoints
│   │   │   │   ├── memory.py   # Memory CRUD & search endpoints
│   │   │   │   ├── knowledge.py# RAG document search endpoints
│   │   │   │   ├── desktop.py  # Automation tool execution endpoints
│   │   │   │   ├── workflow.py # Workflow execution endpoints
│   │   │   │   └── plugins.py  # Plugin management endpoints
│   ├── services/               # Business Service Layer (12 Core Services)
│   │   ├── conversation_service.py
│   │   ├── memory_service.py
│   │   ├── knowledge_service.py
│   │   ├── voice_service.py
│   │   ├── vision_service.py
│   │   ├── desktop_service.py
│   │   ├── workflow_service.py
│   │   ├── plugin_service.py
│   │   ├── security_service.py
│   │   ├── notification_service.py
│   │   ├── update_service.py
│   │   └── monitoring_service.py
│   ├── schemas/                # Pydantic V2 Request & Response Data Models
│   │   ├── chat_schema.py
│   │   ├── memory_schema.py
│   │   └── desktop_schema.py
│   ├── repositories/           # Clean Repository Pattern Data Layer
│   │   ├── base_repository.py
│   │   ├── memory_repository.py
│   │   └── knowledge_repository.py
│   ├── db/                     # Encrypted Persistence & Migrations
│   │   ├── session.py          # SQLAlchemy 2.0 Async Session Factory
│   │   └── sqlcipher.py        # SQLCipher engine & DPAPI key loader
│   ├── ai_runtime/             # Cognitive AI Engines
│   │   ├── model_router.py     # MRIO Model Router engine
│   │   ├── agent_matrix.py     # MAIA 26-Agent Coordinator
│   │   └── rag_engine.py       # KRIE 3-Way Hybrid Search
│   └── tests/                  # Pytest Automated Test Suite
│       ├── test_chat_api.py
│       ├── test_memory_repo.py
│       └── test_voice_stream.py
├── requirements.txt           # Production Python dependencies
└── pytest.ini                 # Pytest test configuration
```

---

# 4. 12 CORE BACKEND SERVICES SPECIFICATION

FBA organizes business logic into twelve isolated domain services:

```
+-----------------------------------------------------------------------------------+
|                            THE 12 BACKEND SERVICES                                |
+-----------------------------------------------------------------------------------+
| 1. ConversationService  2. MemoryService       3. KnowledgeService                |
| 4. VoiceService         5. VisionService       6. DesktopService                  |
| 7. WorkflowService      8. PluginService       9. SecurityService                 |
|10. NotificationService 11. UpdateService      12. MonitoringService               |
+-----------------------------------------------------------------------------------+
```

### 4.1 Service Responsibilities
* **`ConversationService`**: Manages multi-turn conversation threads, prompt assembly, and SSE token streaming.
* **`MemoryService`**: Interacts with `MemoryRepository` to calculate salience scores and update SQLCipher graph nodes.
* **`VoiceService`**: Manages WebSocket audio frame buffers, calls Faster-Whisper ASR, and streams Kokoro TTS audio bytes.

---

# 5. ASYNCIO CONCURRENCY & WEBSOCKET STREAMING ENGINE

FBA enforces non-blocking AsyncIO across all IO-bound operations:

```
+-----------------------------------------------------------------------------------+
|                         ASYNC CONCURRENCY ARCHITECTURE                            |
+-----------------------------------------------------------------------------------+
| Communication Pattern   | Transport Technology       | Target Use Case            |
| ----------------------- | -------------------------- | -------------------------- |
| **Token Streaming**     | Server-Sent Events (SSE)   | LLM token text streaming   |
| **Bi-Directional Audio**| WebSockets (`ws://`)       | Real-time ASR & TTS voice  |
| **Desktop Telemetry**   | WebSockets (`ws://`)       | Active window & OCR events |
| **REST Queries**        | Async HTTP / Pydantic V2   | CRUD operations & Settings |
+-----------------------------------------------------------------------------------+
```

---

# 6. DEPENDENCY INJECTION & REPOSITORY PATTERN

FBA uses FastAPI's native `Depends()` container for modular dependency injection:

```
+-----------------------------------------------------------------------------------+
|                         DEPENDENCY INJECTION CONTAINER                            |
+-----------------------------------------------------------------------------------+
|  [API Route Handler] ──► `Depends(get_conversation_service)`                      |
|                                       │                                           |
|                                       ▼                                           |
|  [ConversationService] ──► `Depends(get_memory_repository)`                       |
|                                       │                                           |
|                                       ▼                                           |
|  [MemoryRepository] ──► `Depends(get_async_db_session)` (SQLCipher Engine)        |
+-----------------------------------------------------------------------------------+
```

---

# 7. PERFORMANCE TARGETS & RESOURCE BUDGETS

$$\text{FastAPI Startup Latency} \le 150\text{ms}, \quad \text{REST Response Overhead} \le 10\text{ms}$$

```
+-----------------------------------------------------------------------------------+
|                             SYSTEM LATENCY BENCHMARKS                             |
+-----------------------------------------------------------------------------------+
| Backend Operational Metric       | Target Benchmark | Optimization Strategy       |
| -------------------------------- | ---------------- | --------------------------- |
| FastAPI Daemon Boot Time         | < 150ms          | Lazy module imports        |
| REST API Route Overhead          | < 10ms           | Pydantic V2 C-extension     |
| SSE First-Token Latency          | < 50ms           | Streaming AsyncIO Buffer   |
| Memory Daemon Footprint          | < 45MB           | Uvicorn minimal worker count|
+-----------------------------------------------------------------------------------+
```

---

# 8. STRICT FORBIDDEN BACKEND BEHAVIORS

```
+-----------------------------------------------------------------------------------+
|                         STRICT FORBIDDEN BACKEND BEHAVIORS                        |
+-----------------------------------------------------------------------------------+
|  [X] NEVER block the AsyncIO event loop with synchronous CPU or disk file tasks   |
|  [X] NEVER mix raw SQL queries or business logic directly into API route handlers |
|  [X] NEVER expose un-authenticated internal backend endpoints to public interfaces|
|  [X] NEVER hardcode API keys, database secrets, or JWT secret keys in source files|
|  [X] NEVER create circular imports or dependencies between services or routers    |
+-----------------------------------------------------------------------------------+
```

---

**End of Master Specification**  
*Nova AI Operating System — FastAPI Backend Architecture v2.0*
