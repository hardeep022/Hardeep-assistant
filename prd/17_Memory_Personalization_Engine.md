# Nova AI Operating System
## Master Specification: Memory & Personalization Engine (MPE)
**Document Version:** 2.0  
**Status:** Approved Cognitive Architecture  
**Target Audience:** Cognitive AI Engineers, Memory Architects, Graph Systems Designers, HCI & Privacy Researchers  

---

# 1. EXECUTIVE SUMMARY & HUMAN-INSPIRED MEMORY PARADIGM

### 1.1 Beyond Static Chat History
Existing AI interfaces treat memory as a raw text transcript or a simple vector retrieval store. This results in AI systems that either forget crucial user context between sessions or suffer from semantic noise caused by accumulating thousands of irrelevant chat messages.

**Nova AI Operating System** implements a human-inspired **Memory & Personalization Engine (MPE)**. Humans do not retain every literal word spoken; instead, the brain distills experiences into **episodic events, semantic facts, procedural routines, and emotional impressions**, continually consolidating important knowledge while allowing trivial noise to decay.

```
+-----------------------------------------------------------------------------------+
|                        NOVA HUMAN-INSPIRED MEMORY PIPELINE                        |
+-----------------------------------------------------------------------------------+
|  [Real-Time Interaction Stream] (Voice, Text, Desktop Context, IDE)               |
|                                │                                                  |
|                                ▼                                                  |
|  [Tier 1: Working Memory Buffer] ──► [Importance & Salience Evaluator]            |
|                                                │                                  |
|                                                ▼                                  |
|  [Tier 3 & 4: Episodic & Semantic Graph] ◄── [Tier 2: Short-Term Session Store]   |
|                                │                                                  |
|                                ▼                                                  |
|  [Tier 5: Encrypted SQLCipher Long-Term Store & Consolidation Engine]             |
+-----------------------------------------------------------------------------------+
```

---

# 2. THE 10 HUMAN-LIKE MEMORY TYPES ARCHITECTURE

Nova models cognition across ten distinct functional memory systems:

```
+-----------------------------------------------------------------------------------+
|                        HUMAN-INSPIRED MEMORY TAXONOMY                             |
+-----------------------------------------------------------------------------------+
|  1. Working Memory        (Active turn context, immediate token stack)            |
|  2. Short-Term Memory     (Current session chat and temporary activity log)       |
|  3. Long-Term Memory      (Consolidated persistent storage in SQLCipher)           |
|  4. Semantic Memory       (Factual knowledge, domain concepts, definitions)       |
|  5. Episodic Memory       (Event logs, specific project milestones, past chats)   |
|  6. Procedural Memory     (Custom workflows, IDE shortcuts, automated routines)   |
|  7. Associative Memory    (Knowledge graph nodes and contextual entity links)     |
|  8. Emotional Memory      (User sentiment trends, stress triggers, fatigue)       |
|  9. Project Memory        (Repository trees, tech stacks, active bugs, goals)     |
| 10. Preference Memory     (IDE themes, writing tone, voice speed, routines)       |
+-----------------------------------------------------------------------------------+
```

---

# 3. COMPLETE 22 INDEPENDENT MEMORY TYPES SPECIFICATION

Nova partitions data into twenty-two specialized, independently searchable memory registries:

| Memory Type | Target Contents | Retention & Expiration Policy |
| :--- | :--- | :--- |
| **Working Memory** | Active prompt tokens, current code block | Flushed per conversational turn |
| **Chat Memory** | Raw message history for active thread | Retained for thread duration |
| **Session Memory** | Desktop window history, active applications | Retained until app closure |
| **Daily Memory** | Summary of tasks completed, meetings, commits | Consolidated into Weekly Memory at 00:00 |
| **Weekly Memory** | Synthesized project progress & research logs | Retained 90 days; distilled into Long-Term |
| **Long-Term Memory** | Core user identity facts, key milestones | Encrypted SQLCipher; permanent until wiped |
| **Relationship Memory**| User's team members, roles, key contacts | User controlled; encrypted |
| **People Memory** | Specific colleague preferences & interactions | Explicit permission required |
| **Project Memory** | Repositories, dependencies, active goals, bugs | Linked to workspace root path |
| **Task Memory** | Active, pending, and completed tasks/reminders | Retained in local task DB |
| **Learning Memory** | Conceptual masteries, weak spots, quizzes | Persistent educational profile |
| **Coding Memory** | Preferred linters, test frameworks, stack choices| Persistent per repository / global |
| **Document Memory** | Indexed PDF, Markdown, and text file chunks | Embedded locally via RAG |
| **Research Memory** | Synthesis of web literature, paper summaries | Linked to specific research sessions |
| **Workflow Memory** | Repeated multi-step desktop actions | Auto-learned procedural routines |
| **Application Memory**| Frequently used local apps (VS Code, Chrome) | System usage stats |
| **Desktop Memory** | Active window layouts, multi-monitor setups | Real-time session telemetry |
| **Voice Memory** | Acoustic preferences, voice speed, preferred voice| Saved in local Settings |
| **Preference Memory** | Writing style, tone, language choices (EN/HI/PA)| Permanent user profile |
| **Knowledge Memory**| Custom domain facts, technical documentation | Knowledge Graph vector store |
| **Calendar Memory** | Scheduled events, deadlines, reminders | Synced locally |
| **Reminder Memory** | Acoustic alarms, one-shot and recurring alerts| Synced locally |

---

# 4. MEMORY IMPORTANCE SCORING & ATTRIBUTES FORMULA

Every captured memory item $M_i$ is evaluated using a multi-factor **Salience & Importance Algorithm**:

$$\text{Salience}(M_i) = \frac{w_1 \cdot \text{ExplicitUserPreference} + w_2 \cdot \text{Frequency} + w_3 \cdot \text{EmotionalWeight} + w_4 \cdot \text{DomainRelevance}}{1 + \lambda \cdot \Delta t}$$

Where:
* $\Delta t$ is the time elapsed since last access (decay factor $\lambda$).
* $\text{ExplicitUserPreference}$ carries maximum weight ($w_1 = 0.40$).

```
+-----------------------------------------------------------------------------------+
|                             MEMORY METADATA SCHEMA                                |
+-----------------------------------------------------------------------------------+
| Attribute          | Type / Range            | Purpose                            |
| ------------------ | ----------------------- | ---------------------------------- |
| Importance         | Float (0.0 to 1.0)      | Prioritizes context injection      |
| Confidence         | Float (0.0 to 1.0)      | Measures factual reliability       |
| Freshness          | Timestamp (Epoch ms)    | Tracks last verification time      |
| Frequency          | Integer (Access Count)  | Boosts salience for repeated items |
| Expiration         | Timestamp / Never       | Determines auto-purge trigger      |
| User Visibility    | Boolean (Visible/Hidden)| Controls UI Memory Viewer display  |
| Trust Score        | Float (0.0 to 1.0)      | Verification level of source       |
+-----------------------------------------------------------------------------------+
```

---

# 5. THE 10-STAGE MEMORY LIFECYCLE

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Stage 1: New Memory Acquisition (Multi-Stream Signal Capture)           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Stage 2: Salience & Noise Evaluation                                    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Stage 3: Classification & Schema Mapping                                │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Stage 4: Importance Scoring                                             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Stage 5: Encrypted SQLCipher & Vector Storage                           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Stage 6: Knowledge Graph Relationship Linking                           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Stage 7: Periodic Summarization & Distillation                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Stage 8: Long-Term Memory Consolidation                                 │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Stage 9: Archiving & Decay Pruning                                      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│ Stage 10: User-Controlled Deletion / Purge                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 6. INTELLIGENT FORGETTING & DECAY ALGORITHM

Nova enforces **natural cognitive forgetting** so that irrelevant noise is automatically pruned while critical facts remain sharp:

```
+-----------------------------------------------------------------------------------+
|                           INTELLIGENT FORGETTING DECAY                            |
+-----------------------------------------------------------------------------------+
|  [High Importance Memory]   ──► Decay Rate ~ 0 (Retained Permanently)              |
|  [Medium Importance Memory] ──► Decays after 30 days of zero access               |
|  [Low Importance / Noise]   ──► Purged after 24 hours                             |
|  [Incognito / Session Only] ──► Purged immediately upon session exit              |
+-----------------------------------------------------------------------------------+
```

---

# 7. KNOWLEDGE GRAPH & ENTITY RELATIONSHIP ENGINE

Nova constructs an interconnected **Associative Knowledge Graph** linking projects, tools, tasks, and people:

```
[User: Hardeep] ──► (owns) ──► [Project: Nova AI OS]
                                      │
                                      ▼
                        [Repository: Nova-Desktop]
                                      │
           ┌──────────────────────────┴──────────────────────────┐
           ▼                                                     ▼
 [Language: TypeScript]                                [Framework: React/Electron]
           │                                                     │
           ▼                                                     ▼
 [Linter: ESLint]                                      [Test Suite: Vitest]
           │                                                     │
           └──────────────────────────┬──────────────────────────┘
                                      ▼
                           [Task: Upgrade TTS Bridge]
```

---

# 8. HYBRID SEARCH & RETRIEVAL ENGINE

When fetching context for a prompt, Nova executes a **3-Way Hybrid Search**:

$$\text{FinalScore}(D_i) = \alpha \cdot \text{VectorSimilarity}(D_i) + \beta \cdot \text{BM25Keyword}(D_i) + \gamma \cdot \text{GraphProximity}(D_i)$$

```
+-----------------------------------------------------------------------------------+
|                             HYBRID RETRIEVAL PIPELINE                             |
+-----------------------------------------------------------------------------------+
|  1. Dense Vector Search   ---> Captures semantic intent & concept similarity      |
|  2. Sparse BM25 Keyword   ---> Exact code symbol, error code, and file path matching |
|  3. Graph Traversal       ---> Resolves relational dependencies & project links   |
+-----------------------------------------------------------------------------------+
```

---

# 9. MEMORY PRIVACY, CONTROL & ENCRYPTION ARCHITECTURE

### 9.1 Zero-Cloud Local Security Principles
1. **Encrypted Storage**: All long-term memories, embeddings, and relationship graphs are stored locally on disk inside SQLCipher databases encrypted via OS native keys (`safeStorage` on Windows DPAPI / Electron).
2. **Memory Viewer & Manager UI**: Users can view, edit, search, export, or delete any stored memory item at any time.
3. **Incognito & Private Mode**: One-click UI toggle disables memory recording and logging for sensitive sessions.

```
+-----------------------------------------------------------------------------------+
|                            PRIVACY & CONTROL MATRIX                               |
+-----------------------------------------------------------------------------------+
| Feature               | Implementation Protocol                                   |
| --------------------- | --------------------------------------------------------- |
| Storage Encryption    | SQLCipher AES-256 + Windows DPAPI safeStorage             |
| User Audit Log        | All memory modifications logged to transparent local JSON |
| One-Click Export      | JSON Backup of complete memory graph                      |
| One-Click Purge       | Instant wipe of memory database                           |
+-----------------------------------------------------------------------------------+
```

---

# 10. STRICT FORBIDDEN MEMORY BEHAVIORS

```
+-----------------------------------------------------------------------------------+
|                         STRICT FORBIDDEN MEMORY BEHAVIORS                         |
+-----------------------------------------------------------------------------------+
|  [X] NEVER store passwords, secret keys, or authentication tokens in memory      |
|  [X] NEVER store payment details, credit card numbers, or banking credentials     |
|  [X] NEVER record or index conversations when Incognito Mode is active             |
|  [X] NEVER synthesize false memories or fabricate fake past conversations         |
|  [X] NEVER modify or edit existing user memories without transparent audit logs   |
|  [X] NEVER transmit local memory databases or embeddings to external servers      |
+-----------------------------------------------------------------------------------+
```

---

**End of Master Specification**  
*Nova AI Operating System — Memory & Personalization Engine v2.0*
