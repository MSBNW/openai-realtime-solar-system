# Agent Orchestration Architecture - Visual Diagrams

Visual representations of current vs desired architecture.

---

## 1. Current Sequential Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                   Single-Agent Sequential Model                  │
└────────────────────────────────────────────────────────────────┘

TIME →

┌─────────────────┐
│ POST /execute   │
│ task: "..."     │
└────────┬────────┘
         │
         │ (1ms)
         ▼
    ┌─────────────────────────────────┐
    │ TaskAnalyzer.analyzeTask()       │
    │ - Classify task                  │
    │ - Return static agent roles      │
    │ - Estimate time                  │
    └────────┬────────────────────────┘
             │ (0.5ms)
             ▼
    ┌──────────────────────────────────┐
    │ executeTask()                     │
    │ Create execution record           │
    │ Return taskId immediately ✓       │
    └────────┬─────────────────────────┘
             │
             │ (BACKGROUND ASYNC)
             ▼
    ┌──────────────────────────────────┐
    │ runTask() → executeWithAnthropic()│
    │                                   │
    │ AGENTIC LOOP (max 10 turns):      │
    │ ┌────────────────────────────────┐
    │ │ Turn 1:                         │
    │ │ - POST to Claude API            │ (1-2s)
    │ │ - Claude returns tool_use[5]    │
    │ │ - FOR i=0 to 4:                 │
    │ │   ├─ Call tool[i], await ✓      │ (0.5s each)
    │ │   └─ Next                       │
    │ │ - Total: 2.5s (sequential)      │
    │ │ - Return results to Claude      │
    │ └────────────────────────────────┘
    │ ┌────────────────────────────────┐
    │ │ Turn 2:                         │
    │ │ - Similar flow                  │
    │ │ - More tools (3x)               │
    │ │ - Total: 1.5s (sequential)      │
    │ └────────────────────────────────┘
    │ ┌────────────────────────────────┐
    │ │ Turn 3:                         │
    │ │ - Final response (no tools)     │ (1s)
    │ │ - Save result                   │
    │ │ - Break loop                    │
    │ └────────────────────────────────┘
    │
    │ TOTAL: ~7 seconds
    │
    └──────────────────────────────────┘


TIMELINE:
[0ms]    Task submitted
[1ms]    Analyzed
[2ms]    Queued (in Map only)
[2-7000ms] Executing (background)
         Turn 1: ~2500ms (sequential tools)
         Turn 2: ~1500ms (sequential tools)
         Turn 3: ~1000ms (final response)
[7000ms] Complete
```

### Key Problems:
- Tools execute sequentially: (2.5s when could be 0.5s)
- No actual agent spawning
- No queue management
- Single process, single thread
- Status only updates in .catch() on error

---

## 2. Desired Parallel Architecture (Phase 1)

```
┌────────────────────────────────────────────────────────────────┐
│             Parallel Tool Execution (Quick Win)                 │
└────────────────────────────────────────────────────────────────┘

SAME AGENTIC LOOP but with parallel tool calls:

Turn 1: Claude returns tool_use[5]
┌──────────────────────────────────────────────────────────────┐
│ Promise.all([                                                │
│   call_tool_1(),  ─┐                                         │
│   call_tool_2(),  ─├─ PARALLEL (concurrently)                │
│   call_tool_3(),  ─│                                         │
│   call_tool_4(),  ─│                                         │
│   call_tool_5()   ─┘                                         │
│ ])                                                           │
└──────────────────────────────────────────────────────────────┘

TIMELINE:
[0ms]    Tools start (all at once)
[500ms]  Tool 1 completes ✓
[500ms]  Tool 2 completes ✓
[500ms]  Tool 3 completes ✓
[500ms]  Tool 4 completes ✓
[700ms]  Tool 5 completes ✓ (takes longer)
[700ms]  All tools done, continue

SAVINGS: 2.5s → 0.7s per turn = 64% faster

---

FILE CHANGES NEEDED:
/lib/automation/agent-orchestrator.ts lines 482-555

BEFORE:
const toolResults: any[] = [];
for (const toolUse of toolUseBlocks) {
  const result = await connectionManager.callTool(...);
  toolResults.push(result);
}

AFTER:
const toolResults = await Promise.all(
  toolUseBlocks.map(toolUse =>
    connectionManager.callTool(toolUse.name, toolUse.input)
  )
);
```

---

## 3. Desired Full Swarm Architecture (Phases 2-4)

```
┌────────────────────────────────────────────────────────────────┐
│          Multi-Agent Parallel Swarm Model (Production)          │
└────────────────────────────────────────────────────────────────┘

TIME →

┌──────────────────────────┐
│  REST API Entry Point    │
│  POST /api/automation... │
└────────────┬─────────────┘
             │
             ▼
    ┌────────────────────────────────┐
    │ TaskAnalyzer                    │
    │ - Classify                      │
    │ - Decompose into subtasks       │
    └─────────┬──────────────────────┘
              │
              ▼
    ┌────────────────────────────────┐
    │ Task Queue (Bull/Redis)         │
    │ ┌─────────────────────────────┐│
    │ │ Task1 (priority: high)      ││
    │ │ Task2 (priority: medium)    ││
    │ │ Task3 (priority: low)       ││
    │ │ Task4 (priority: high)      ││
    │ └─────────────────────────────┘│
    │ Handles: retries, persistence  │
    │ Max concurrent: 10             │
    └─────────┬──────────────────────┘
              │
              ▼
    ┌────────────────────────────────┐
    │ Semaphore (Max 10 concurrent)   │
    └─────────┬──────────────────────┘
              │
    ┌─────────┴────────────┬────────────┬──────────────┐
    │                      │            │              │
    ▼                      ▼            ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Worker       │  │ Worker       │  │ Worker       │  │ Worker       │
│ (Core 1)     │  │ (Core 2)     │  │ (Core 3)     │  │ (Core 4)     │
│              │  │              │  │              │  │              │
│ Task: Code   │  │ Task: Report │  │ Task: Deploy │  │ Task: Test   │
│ Status: Busy │  │ Status: Busy │  │ Status: Idle │  │ Status: Busy │
│ Progress:75% │  │ Progress:45% │  │ Progress: 0% │  │ Progress:30% │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │                │
       │ (Each worker)   │                 │                │
       │ - Agent Lifecycle         │                │
       │ - Subtask execution       │                │
       │ - Tool invocation         │                │
       │ - Result collection       │                │
       │                           │                │
       └───────────────┬───────────┴────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ Result Aggregator            │
        │ Combine all worker results   │
        │ Resolve dependencies         │
        │ Ensure consistency           │
        └────────────┬─────────────────┘
                     │
                     ▼
        ┌──────────────────────────────┐
        │ Final Output                 │
        │ Return to API caller         │
        │ Store in Database            │
        │ Update conversation          │
        └──────────────────────────────┘
```

### Timeline Comparison:
```
SEQUENTIAL (Current):
Task1 [████████████████] 5s
Task2 [████████████████] 5s
Task3 [████████████████] 5s
TOTAL: 15 seconds

PARALLEL (Desired with 4 workers):
Task1 [████████] \
Task2 [████████]  ├─ ALL CONCURRENT
Task3 [████████] /
TOTAL: 5 seconds (3x faster)
```

---

## 4. Agent Lifecycle State Machine

### CURRENT (Broken):
```
┌─────────────┐
│   CREATED   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   ACTIVE    │ ◄─── STUCK HERE FOREVER
└─────────────┘      status NEVER CHANGES
       │              progress NEVER UPDATES
       │              (even though agent did nothing)
       │
       X BROKEN - no way to reach other states
```

### DESIRED (Agent Lifecycle):
```
┌──────────────┐
│   IDLE       │ (Agent pool, waiting for work)
└──────┬───────┘
       │
       │ Task assigned
       ▼
┌──────────────┐
│ INITIALIZING │ (Load task, setup context)
└──────┬───────┘
       │
       │ Ready to work
       ▼
┌──────────────┐
│  WORKING     │ (Executing subtask)
│              │ (Progress: 0-100%)
└──────┬───────┘
       │
       │ Work done (success or fail)
       ▼
┌──────────────┐
│ COMPLETING   │ (Aggregate results)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ COMPLETED    │ (Return to pool)
└──────┬───────┘
       │
       └──► IDLE (ready for next task)

TRANSITIONS:
IDLE → INITIALIZING → WORKING → COMPLETING → COMPLETED → IDLE
```

---

## 5. Task Queue Flow

### CURRENT (No Queue):
```
POST /api/automation/execute
         │
         ├─ Create TaskExecution record
         ├─ Store in Map<string, TaskExecution>
         └─ Start fire-and-forget task
                 │
                 └─ If error: update status to 'failed'
                    If success: update status to 'completed'
                    
PROBLEM: No queue management, no concurrency control
```

### DESIRED (With Queue):
```
┌─────────────────────────────────────────────┐
│           Task Queue (Bull/Redis)           │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ High Priority Queue                 │  │
│  │ [Task-urgent-001, Task-urgent-002] │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ Normal Priority Queue               │  │
│  │ [Task-001, Task-002, Task-003, ...] │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ Low Priority Queue                  │  │
│  │ [Task-background-001, ...]          │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  Persistence: Redis/Database                │
│  Retries: Automatic with exponential backoff│
│  Concurrency: Configurable limit (e.g., 10)│
└─────────────────────────────────────────────┘
         │
         │ Dequeue by priority
         ▼
    ┌──────────────┐
    │ Semaphore    │ (Limit concurrent execution)
    │ Available: 7 │ (out of max 10)
    └──────┬───────┘
           │
           ├─► Worker 1 (executing)
           ├─► Worker 2 (executing)
           ├─► Worker 3 (executing)
           ├─ Worker 4 - IDLE
           ├─ Worker 5 - IDLE
           ├─ Worker 6 - IDLE
           └─ Worker 7 - IDLE
```

---

## 6. Current vs Desired - Side by Side

```
┌───────────────────────────────┬───────────────────────────────┐
│     CURRENT ARCHITECTURE      │   DESIRED ARCHITECTURE        │
├───────────────────────────────┼───────────────────────────────┤
│                               │                               │
│ Task Execution:               │ Task Execution:               │
│  - Sequential only            │  - Parallel with queue        │
│  - Single for loop            │  - Promise.all() for tools    │
│  - 1 task at a time           │  - Multiple tasks concurrent  │
│                               │                               │
│ Agents:                       │ Agents:                       │
│  - Static roles only          │  - Real worker spawning       │
│  - No spawning                │  - Lifecycle management       │
│  - No state changes           │  - State machine              │
│  - No real work               │  - Actual work execution      │
│                               │                               │
│ Tool Execution:               │ Tool Execution:               │
│  - Sequential (for loop)      │  - Parallel (Promise.all)     │
│  - One await at a time        │  - All concurrent             │
│  - ~2.5s for 5 tools          │  - ~0.7s for 5 tools          │
│                               │                               │
│ Persistence:                  │ Persistence:                  │
│  - In-memory Map only         │  - Database backed            │
│  - Lost on restart            │  - Survives restarts          │
│  - No failure recovery        │  - Retry logic                │
│                               │                               │
│ Concurrency:                  │ Concurrency:                  │
│  - Single thread, single proc │  - Semaphore control          │
│  - Unlimited tasks (risk)     │  - Configurable limits        │
│  - No load balancing          │  - Distributed workers        │
│                               │                               │
│ Storage:                      │ Storage:                      │
│  - Conversation files (.json) │  - Database (PostgreSQL)      │
│  - No task persistence        │  - Full audit trail           │
│  - Text logs                  │  - Structured metrics         │
│                               │                               │
└───────────────────────────────┴───────────────────────────────┘
```

---

## 7. Tool Calling - Before & After

### BEFORE (Sequential for loop):
```
Turn 1: Claude API requests 5 tools

callTool('web_search', {query: "..."})      Start: 0ms ──────────┐
                                            End: 500ms           │
                                                                  │
callTool('analyze', {data: "..."})          Start: 500ms ────────┤
                                            End: 1000ms          │
                                                                  │
callTool('summarize', {content: "..."})     Start: 1000ms ───────┤
                                            End: 1500ms          ├─ 2500ms total
                                                                  │
callTool('rank', {items: [...]})            Start: 1500ms ───────┤
                                            End: 2000ms          │
                                                                  │
callTool('report', {findings: [...]})       Start: 2000ms ───────┤
                                            End: 2500ms          │
                                                                  ┘
SEQUENTIAL EXECUTION TIME: 2500ms
```

### AFTER (Parallel with Promise.all):
```
Turn 1: Claude API requests 5 tools

callTool('web_search', {query: "..."})      Start: 0ms ────────┐
                                            End: 500ms         │
callTool('analyze', {data: "..."})          Start: 0ms ────────┤
                                            End: 500ms         │
callTool('summarize', {content: "..."})     Start: 0ms ────────┼─ 700ms total
                                            End: 400ms         │
callTool('rank', {items: [...]})            Start: 0ms ────────┤
                                            End: 600ms         │
callTool('report', {findings: [...]})       Start: 0ms ────────┤
                                            End: 700ms         │
                                                                 ┘
PARALLEL EXECUTION TIME: 700ms

IMPROVEMENT: 2500ms → 700ms = 72% faster per turn
```

---

## 8. Complete Request Flow - Current

```
CLIENT REQUEST
┌──────────────────────────────┐
│ POST /api/automation/execute │
│ Body: {                      │
│   task: "Build a website"    │
│ }                            │
└──────────┬───────────────────┘
           │
           ▼
    ┌─────────────────────┐
    │ Route Handler       │
    │ (route.ts)          │
    └─────────┬───────────┘
              │
              ▼
    ┌────────────────────────────┐
    │ TaskAnalyzer.analyzeTask() │
    │ Returns: {                 │
    │   type: 'general',         │
    │   complexity: 'medium',    │
    │   agents: [                │
    │     {role: 'Architect'},   │
    │     {role: 'Developer'}    │
    │   ]                        │
    │ }                          │
    └─────────┬──────────────────┘
              │
              ▼
    ┌────────────────────────────┐
    │ Orchestrator.executeTask() │
    │ Creates execution record    │
    │ Stores in Map              │
    │ Returns taskId immediately │
    │ ↓                          │
    │ BACKGROUND (async):        │
    │ - runTask()                │
    │   - executeWithAnthropic() │
    │     - while loop (10 turns)│
    │     - tool calling         │
    │     - result processing    │
    │     - saves to .json files │
    └─────────┬──────────────────┘
              │
              ▼
    ┌────────────────────────────┐
    │ Return to Client:          │
    │ {                          │
    │   success: true,           │
    │   taskId: "task_xxx",      │
    │   status: "queued",        │
    │   logs: [...]              │
    │ }                          │
    └────────────────────────────┘

CLIENT POLLS STATUS
└──────────────────────────────┐
   GET /api/automation/status/ │
            │                  │
            └──► taskId ───────┘
                 │
                 ▼
         ┌──────────────────┐
         │ Get execution    │
         │ from Map         │
         │ Return status &  │
         │ logs             │
         └──────────────────┘
```

---

## Summary Table: Sequential vs Parallel

```
┌──────────────────┬──────────────┬───────────────┬──────────────┐
│ Metric           │ Sequential   │ Parallel (P1) │ Swarm (P2-4) │
├──────────────────┼──────────────┼───────────────┼──────────────┤
│ Tool Call Time   │ 2.5s (5x)    │ 0.7s (P.all)  │ 0.7s         │
│ Task Throughput  │ 1 task/10s   │ 1 task/10s*   │ 10 tasks/10s │
│ Concurrency      │ None         │ None          │ 10 workers   │
│ Persistence      │ None         │ None          │ Database     │
│ Failure Recovery │ None         │ None          │ Auto-retry   │
│ Agent Spawning   │ Mock         │ Mock          │ Real workers │
│ Complexity       │ Simple       │ Simple        │ Complex      │
│ Effort to Impl   │ N/A          │ 2-4 hours     │ 2-3 weeks    │
├──────────────────┼──────────────┼───────────────┼──────────────┤
│ Suitable for     │ MVP/demo     │ SMB           │ Enterprise   │
└──────────────────┴──────────────┴───────────────┴──────────────┘

* = Same 1 task/10s unless improved elsewhere
```

---

## Implementation Roadmap

```
Phase 1 (Week 1-2): Parallel Tool Calling
└─ Goal: 72% speedup per turn
   Files: agent-orchestrator.ts (lines 482-555)
   Effort: 2-4 hours
   Impact: Immediate 64-72% latency reduction

Phase 2 (Week 3-4): Task Queue System
└─ Goal: Support 3-5 concurrent tasks
   Files: Create task-queue.ts, queue-manager.ts
   Dependencies: Bull or custom queue
   Effort: 4-6 hours
   Impact: Parallel task execution

Phase 3 (Week 5-6): Agent Workers
└─ Goal: Actual agent spawning and execution
   Files: Create agent-worker.ts, agent-pool.ts
   Effort: 8-12 hours
   Impact: Real parallelism, not just sequential

Phase 4 (Week 7-8): Persistence & Recovery
└─ Goal: Production-ready with auto-recovery
   Files: Create persistence.ts, database schema
   Dependencies: PostgreSQL
   Effort: 6-8 hours
   Impact: Data durability, failure recovery
```

---

