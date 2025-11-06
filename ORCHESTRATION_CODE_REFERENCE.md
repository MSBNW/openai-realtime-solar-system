# Agent Orchestration - Code Reference Guide

Quick index to understand the current architecture and where changes are needed.

---

## Key Files Overview

### Core Orchestration (1,895 total lines)

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `/lib/automation/agent-orchestrator.ts` | 868 | Main task executor with Claude API integration | ✓ Functional (sequential) |
| `/lib/automation/orchestration-mcp-server.js` | 438 | MCP server for agent coordination | ✗ Mock implementation |
| `/lib/automation/task-analyzer.ts` | 161 | Task classification and agent assignment | ✓ Functional (basic) |
| `/lib/automation/mcp-connection-manager.ts` | 601 | MCP server connection management | ✓ Functional (sequential) |
| `/lib/automation/conversation-manager.ts` | 265 | Conversation history persistence | ✓ Functional |

### API Routes
- `/app/api/automation/execute/route.ts` - Task execution entry point
- `/app/api/automation/status/[taskId]/route.ts` - Task status polling
- `/app/api/automation/tasks/route.ts` - Task listing
- `/app/api/automation/integrations/*` - MCP server management

---

## Critical Code Locations - Sequential Execution Problem

### 1. Sequential Tool Execution - MUST PARALLELIZE

**File:** `/lib/automation/agent-orchestrator.ts`
**Lines:** 482-555

```typescript
// CURRENT (SEQUENTIAL) - one tool at a time
const toolResults: any[] = [];
for (const toolUse of toolUseBlocks) {
  execution.logs.push(`  → Calling ${toolUse.name}...`);
  try {
    const result = await connectionManager.callTool(toolUse.name, toolUse.input);
    // Process result...
  } catch (error: any) {
    // Handle error...
  }
}
```

**Change Required:**
```typescript
// PARALLEL - all tools at once
const toolResults = await Promise.all(
  toolUseBlocks.map(toolUse =>
    connectionManager.callTool(toolUse.name, toolUse.input)
      .then(result => ({...}))
      .catch(error => ({...}))
  )
);
```

**Impact:** Would enable concurrent tool execution

---

### 2. Mock Agent Spawning - MUST IMPLEMENT REAL WORKERS

**File:** `/lib/automation/orchestration-mcp-server.js`
**Lines:** 263-296 (spawnAgent), 315-349 (task_orchestrate)

```javascript
// CURRENT (MOCK) - just stores metadata
spawnAgent(args) {
  const agentId = `agent-${nextAgentId++}`;
  
  const agent = {
    id: agentId,
    type,                    // NEVER USED
    status: 'active',        // HARDCODED - never updates
    progress: 0,             // NEVER UPDATES
    spawnedAt: new Date().toISOString()
  };
  
  agents.set(agentId, agent);
  
  // Returns but agent does NOTHING
  return {
    success: true,
    agentId,
    message: `Agent spawned...`
  };
}
```

**Required Implementation:**
1. Agent lifecycle management (idle → working → done)
2. Background worker execution
3. Status updates during execution
4. Progress tracking
5. Result aggregation

---

### 3. Fire-and-Forget Task Execution - NEEDS QUEUE

**File:** `/lib/automation/agent-orchestrator.ts`
**Lines:** 75-82

```typescript
// CURRENT - no queue management
async executeTask(taskId, taskDescription, analysis, conversationId) {
  const execution: TaskExecution = {
    taskId,
    status: 'queued',
    logs: []
  };
  
  this.executions.set(taskId, execution);
  
  // FIRE AND FORGET
  this.runTask(taskId, taskDescription, analysis, conversationId).catch(error => {
    execution.status = 'failed';
    execution.error = error.message;
  });
  
  return execution;  // Returns immediately - not queued properly
}
```

**Required Changes:**
1. Implement proper task queue (Bull, Bullmq, or custom)
2. Add concurrent task limit (semaphore)
3. Add priority support
4. Add task persistence
5. Add failure recovery

---

### 4. Task Analyzer Not Actually Spawning Agents - DISCONNECT

**File:** `/lib/automation/task-analyzer.ts`
**Lines:** 51-66, 69-104

```typescript
// CURRENT - just creates role descriptions
private getAgentsForTask(
  taskType: TaskAnalysis['taskType'],
  complexity: TaskAnalysis['complexity']
): AgentSpec[] {
  const agentTemplates: Record<string, AgentSpec[]> = {
    code_analysis: [
      { role: 'Code Analyzer', responsibility: 'Analyze code...' },
      { role: 'Documentation Specialist', responsibility: 'Document...' }
    ],
    // ...
  };
  
  return agents;  // STATIC ROLES ONLY
}
```

**Issue:** This is just for prompt building, not actual agent spawning. Description is misleading.

---

### 5. In-Memory Execution Map - NOT PERSISTENT

**File:** `/lib/automation/agent-orchestrator.ts`
**Line:** 37

```typescript
export class AgentOrchestrator {
  private executions: Map<string, TaskExecution> = new Map();
  // ALL TASK STATE LOST ON RESTART
}
```

**Required:**
- Database (PostgreSQL, MongoDB, etc.)
- Persistence layer for task execution state
- Recovery mechanism on restart

---

## Agentic Loop - Current Implementation

**File:** `/lib/automation/agent-orchestrator.ts`
**Lines:** 399-583

### Structure:
```
while (conversationTurns < 10):
  1. Send messages + tools to Claude API
  2. If Claude responds with tool_use blocks:
     a. FOR LOOP: Execute each tool sequentially
     b. Collect results
     c. Add results back to conversation
     d. Continue loop
  3. If Claude responds with text only:
     a. Save result
     b. Break loop (task complete)
  4. Handle errors and log everything
```

### Key Functions:
- `executeWithAnthropic()` - Main agentic loop (lines 253-593)
- `summarizeToolResult()` - Summarize large outputs (lines 319-396)
- Tool calling: `connectionManager.callTool()` (line 487)
- Result processing: lines 493-555

### Problem Areas:
1. **Sequential tool execution** - line 482
2. **No parallel capability** - for loop instead of Promise.all
3. **Context window management** - line 306, limits to 3 messages
4. **Max 10 turns** - line 316, prevents complex workflows

---

## MCP Tool Definitions

**File:** `/app/api/automation/integrations/available/route.ts`

### Orchestration Server (Lines 9-20)
```javascript
orchestration: {
  id: 'orchestration',
  name: 'Multi-Agent Orchestration',
  command: 'node',
  args: ['lib/automation/orchestration-mcp-server.js'],
  capabilities: [
    'swarm_init',      // Creates swarm metadata only
    'agent_spawn',     // Creates agent metadata only
    'task_orchestrate', // Simulates orchestration
    'agent_status',    // Returns metadata
    'memory_store'     // Key-value storage
  ]
}
```

**All capabilities are SIMULATED - no actual work performed**

---

## Execution Flow

### Current Sequential Flow

```
POST /api/automation/execute
  ↓ (immediate response)
executeTask(taskId, task, analysis)
  ↓ (async, background)
runTask() 
  ↓
executeWithAnthropic()
  ↓
while conversationTurns < 10:
  ├─ POST /messages to Claude API
  ├─ IF tool_use blocks:
  │  ├─ FOR each tool (SEQUENTIAL):
  │  │  └─ await callTool() 
  │  └─ Collect results
  └─ Continue loop
```

### Status Polling
```
GET /api/automation/status/[taskId]
  ↓
orchestrator.getExecution(taskId)
  ↓
Return current execution state with logs
```

---

## Conversation Memory

**File:** `/lib/automation/conversation-manager.ts`

### Storage
- Location: `./.conversations/` directory
- Format: JSON per conversation
- Persistence: ✓ Survives restarts

### Integration with Orchestrator
- Lines 283-297 in agent-orchestrator.ts
- Creates new conversation if none provided
- Saves messages with attachments (tool outputs)
- Limits to 3 most recent messages for context (line 306)

---

## MCP Connection Management

**File:** `/lib/automation/mcp-connection-manager.ts`

### Two Transport Types:
1. **stdio** (local) - Lines 201-262
   - Spawns child process
   - JSON-RPC via stdin/stdout
   - Used for: orchestration-mcp-server, GitHub, Google Drive, Slack, PostgreSQL

2. **SSE** (remote) - Lines 134-196
   - HTTP POST with JSON-RPC
   - Used for: Tavily, DataForSEO

### Tool Execution (Lines 326-351)
```typescript
async callTool(toolName: string, parameters: any): Promise<any> {
  // Find server with tool (linear search)
  for (const connection of this.connections.values()) {
    if (connection.connected && connection.tools.some(...)) {
      targetConnection = connection;
      break;  // ONE AT A TIME
    }
  }
  
  if (targetConnection.transport === 'sse') {
    return this.sendRequestSSE(...);  // Single await
  } else {
    return this.sendRequestStdio(...); // Single await
  }
}
```

**Problem:** Serial execution, not parallel

---

## What Needs to Be Built

### Priority 1 - Parallelization (Quick Wins)
```
1. Parallel tool calling in agent-orchestrator.ts line 482
2. Promise.all() for concurrent execution
3. Concurrent semaphore to limit parallel tasks

Files to modify:
- /lib/automation/agent-orchestrator.ts
- /lib/automation/mcp-connection-manager.ts
```

### Priority 2 - Task Queue
```
Files to create:
- /lib/automation/task-queue.ts
- /lib/automation/queue-manager.ts

Files to modify:
- /lib/automation/agent-orchestrator.ts (hook into queue)
- /app/api/automation/execute/route.ts (submit to queue)
```

### Priority 3 - Agent Workers
```
Files to create:
- /lib/automation/agent-worker.ts (base class)
- /lib/automation/agent-pool.ts (worker management)
- /lib/automation/agent-lifecycle.ts (state machine)

Files to modify:
- /lib/automation/orchestration-mcp-server.js (real spawning)
- /lib/automation/agent-orchestrator.ts (spawn real workers)
```

### Priority 4 - Persistence
```
Files to create:
- /lib/automation/persistence.ts (database layer)
- Database schema files

Files to modify:
- /lib/automation/agent-orchestrator.ts (save to DB)
- /lib/automation/conversation-manager.ts (use DB)
```

---

## Test Strategy

### Current Test Gaps
- No unit tests for agent orchestration
- No integration tests for parallel execution
- No load tests for concurrency

### Required Tests
1. Parallel tool execution
2. Agent spawning and lifecycle
3. Task queue behavior
4. Failure recovery
5. Concurrent task limits

### Test Commands (when implemented)
```bash
npm run test:orchestration
npm run test:agents
npm run test:queue
npm run test:integration
```

---

## Metrics & Monitoring

### Current Logging
- Console logs in orchestration
- File logs in .automation-workspace/
- No structured metrics

### Should Track
- Task execution time
- Concurrent tasks count
- Tool call latency
- Error rates
- Queue depth
- Worker utilization

---

## Documentation Files

| File | Content |
|------|---------|
| `/AGENT_ORCHESTRATION_ANALYSIS.md` | Detailed architectural analysis |
| `/ORCHESTRATION_CODE_REFERENCE.md` | This file - quick reference |
| `/CLAUDE.md` | Project configuration (outdated re: orchestration) |
| `/MVP_DEMO.md` | Demo walkthrough (still accurate) |

---

## Key Takeaways

1. **Current State:** Sequential single-agent executor
2. **Main Gap:** No parallel execution, mock agents
3. **Quickest Win:** Parallelize tool calls (line 482)
4. **Real Gap:** No actual worker spawning or queue
5. **Production Gap:** No persistence or recovery
6. **Architecture:** MVP-level, needs refactoring for production

Start with parallel tool calls, then build proper queue/worker infrastructure.
