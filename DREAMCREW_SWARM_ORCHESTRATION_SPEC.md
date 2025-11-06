# DreamCrew Multi-Agent Swarm Orchestration - Implementation Specification

**Version:** 1.0
**Date:** November 6, 2025
**Status:** Implementation Ready
**Target Platform:** DreamCrew (CopilotKit + Mastra + LiveKit)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema Extensions](#database-schema-extensions)
4. [Agent Spawning & Pool Management](#agent-spawning--pool-management)
5. [Task Distribution & Orchestration](#task-distribution--orchestration)
6. [Conversational Updates System](#conversational-updates-system)
7. [Shared Memory Integration](#shared-memory-integration)
8. [Multi-Modal Output System](#multi-modal-output-system)
9. [Scheduling & Approval Workflows](#scheduling--approval-workflows)
10. [Implementation Phases](#implementation-phases)
11. [Code Examples](#code-examples)
12. [API Endpoints](#api-endpoints)

---

## Executive Summary

### Problem Statement
DreamCrew currently executes tasks **sequentially** with a **single agent** per rep room session. Complex tasks (e.g., "increase revenue for gmax.co.il") require research, analysis, planning, and execution across multiple domains - taking 2-5 minutes in sequence when they could complete in 30-60 seconds with parallel execution.

### Solution: Swarm Orchestration
Enable **multiple specialized agents** to work **concurrently** on subtasks, coordinating through:
- **Shared memory** (existing `agent_memory_conversations`)
- **Real-time updates** (via LiveKit data channels + CopilotKit streaming)
- **Task coordination** (new task queue + agent pool)
- **Conversational progress** (voice/text updates as work happens)

### Key Capabilities
✅ **Parallel Execution**: 5+ agents working simultaneously
✅ **Conversational Updates**: Agents speak/write progress in real-time
✅ **Multi-Modal Output**: Display charts, tables, bullet points during execution
✅ **Shared Context**: All agents access conversation history
✅ **Task Persistence**: Projects and tasks in database for review/approval
✅ **Scheduled Execution**: Tasks can run now or at scheduled times
✅ **Human-in-Loop**: Approval workflows before critical actions

### Performance Impact
- **Current**: Sequential tool calls (2.5s for 5 tools × 10 turns = 25s)
- **Phase 1**: Parallel tools (0.7s for 5 tools × 10 turns = 7s) - **72% faster**
- **Phase 3**: Parallel agents (5 agents × 0.7s per turn = 3.5s total) - **86% faster**

---

## Architecture Overview

### Current DreamCrew Stack
```
┌─────────────────────────────────────────────────────────┐
│ Frontend (React + Vite)                                 │
│ - CopilotKit Provider (useCopilotChat)                  │
│ - VoiceCopilotBridge (TTS integration)                  │
│ - Rep Room UI components                                │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP/SSE
┌────────────────▼────────────────────────────────────────┐
│ Next.js API Gateway                                     │
│ - /api/copilotkit (proxy to Mastra)                     │
│ - /api/livekit (room tokens)                            │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐   ┌─────▼────────────────────────────────┐
│ LiveKit      │   │ Mastra Agents (Vercel)               │
│ Voice Agent  │   │ - Agent resolution by repRoomSlug    │
│ (Python)     │   │ - Tool execution                     │
│              │   │ - Memory storage                     │
│ - STT        │   │ - CopilotKit runtime                 │
│ - TTS        │   └──────────┬───────────────────────────┘
│ - Data Ch.   │              │
└──────┬───────┘              │
       │                      │
       └──────────┬───────────┘
                  │
┌─────────────────▼────────────────────────────────────────┐
│ PostgreSQL (Supabase)                                    │
│ - agent_memory_conversations                             │
│ - agent_memory_messages                                  │
│ - agentic_projects, agentic_project_tasks                │
│ - rep_rooms, rep_room_sessions                           │
└──────────────────────────────────────────────────────────┘
```

### Enhanced Architecture with Swarm Orchestration
```
┌─────────────────────────────────────────────────────────┐
│ Frontend (React + Vite)                                 │
│ + SwarmProgressDisplay (new component)                  │
│ + TaskApprovalPanel (new component)                     │
│ + MultiAgentStatusBar (new component)                   │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ Next.js API Gateway                                     │
│ + /api/swarm/spawn (new endpoint)                       │
│ + /api/swarm/status (new endpoint)                      │
│ + /api/tasks/approve (new endpoint)                     │
└────────────────┬────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────┐
│ Swarm Orchestrator (NEW - Node.js/TypeScript)          │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Task Analyzer                                       │ │
│ │ - Break complex task into subtasks                 │ │
│ │ - Classify by domain (research, SEO, content, etc.)│ │
│ │ - Assign priority and dependencies                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Agent Pool Manager                                  │ │
│ │ - Spawn specialized agent workers                  │ │
│ │ - Track agent status (idle/working/done)           │ │
│ │ - Handle agent failures and retries                │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Task Queue (Bull/BullMQ)                            │ │
│ │ - Priority queue for subtasks                      │ │
│ │ - Dependency resolution (task A before task B)     │ │
│ │ - Concurrent execution (max 5 agents)              │ │
│ │ - Retry logic with exponential backoff             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Progress Broadcaster                                │ │
│ │ - Send updates to rep room via data channel        │ │
│ │ - Stream agent outputs to CopilotKit               │ │
│ │ - Trigger TTS for conversational updates           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Result Consolidator                                 │ │
│ │ - Merge outputs from parallel agents               │ │
│ │ - Generate summary and recommendations             │ │
│ │ - Create tasks for approval                        │ │
│ └─────────────────────────────────────────────────────┘ │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐   ┌─────▼────────────────────────────────┐
│ Agent        │   │ Agent Workers (Parallel Instances)   │
│ Worker 1     │   │                                      │
│ (Research)   │   │ Worker 2    Worker 3    Worker 4     │
│              │   │ (SEO)       (Content)   (Analysis)   │
│ - Mastra     │   │                                      │
│ - Tools      │   │ Each worker:                         │
│ - Memory     │   │ - Independent Mastra agent instance  │
└──────┬───────┘   │ - Own tool execution context         │
       │           │ - Shared memory access               │
       │           │ - Progress reporting via callbacks   │
       │           └──────────┬───────────────────────────┘
       │                      │
       └──────────┬───────────┘
                  │
┌─────────────────▼────────────────────────────────────────┐
│ PostgreSQL (Supabase)                                    │
│ + swarm_executions (new table)                           │
│ + agent_workers (new table)                              │
│ + task_queue_jobs (new table)                            │
│ + agent_progress_events (new table)                      │
│ (Existing tables used: agent_memory_*, agentic_project*) │
└──────────────────────────────────────────────────────────┘
```

---

## Database Schema Extensions

### New Tables for Swarm Orchestration

#### 1. `swarm_executions`
Tracks swarm instances and their overall status.

```sql
CREATE TABLE swarm_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant & Session Context
  tenant_id UUID NOT NULL,
  rep_room_slug TEXT NOT NULL,
  session_id TEXT NOT NULL,
  conversation_id UUID NOT NULL REFERENCES agent_memory_conversations(id),

  -- User Request
  user_message TEXT NOT NULL,
  original_message_id TEXT,

  -- Swarm Configuration
  swarm_strategy TEXT DEFAULT 'parallel' CHECK (swarm_strategy IN ('parallel', 'sequential', 'hybrid')),
  max_agents INTEGER DEFAULT 5,

  -- Status & Progress
  status TEXT DEFAULT 'initializing' CHECK (status IN (
    'initializing',
    'analyzing',
    'spawning_agents',
    'executing',
    'consolidating',
    'completed',
    'failed',
    'cancelled'
  )),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

  -- Agents
  active_agent_count INTEGER DEFAULT 0,
  total_agent_count INTEGER DEFAULT 0,

  -- Results
  result_summary TEXT,
  tasks_created INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_swarm_executions_tenant_session
  ON swarm_executions(tenant_id, session_id);
CREATE INDEX idx_swarm_executions_status
  ON swarm_executions(status) WHERE status IN ('executing', 'initializing');
CREATE INDEX idx_swarm_executions_conversation
  ON swarm_executions(conversation_id);
```

#### 2. `agent_workers`
Individual agent instances within a swarm.

```sql
CREATE TABLE agent_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Swarm Context
  swarm_execution_id UUID NOT NULL REFERENCES swarm_executions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,

  -- Agent Identity
  worker_type TEXT NOT NULL, -- 'researcher', 'seo_specialist', 'content_writer', etc.
  agent_name TEXT,
  mastra_agent_id TEXT, -- Links to existing agent registry

  -- Task Assignment
  assigned_task_id UUID,
  task_description TEXT,
  task_priority INTEGER DEFAULT 5,

  -- Status
  status TEXT DEFAULT 'idle' CHECK (status IN (
    'idle',
    'initializing',
    'working',
    'waiting_for_dependency',
    'completed',
    'failed',
    'terminated'
  )),

  -- Progress
  progress_message TEXT,
  progress_percentage INTEGER DEFAULT 0,

  -- Output
  result JSONB,
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Resources
  tools_used TEXT[],
  tokens_consumed INTEGER,
  api_calls_made INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agent_workers_swarm
  ON agent_workers(swarm_execution_id);
CREATE INDEX idx_agent_workers_status
  ON agent_workers(status) WHERE status IN ('working', 'initializing');
CREATE INDEX idx_agent_workers_type
  ON agent_workers(worker_type);
```

#### 3. `swarm_subtasks`
Subtasks created from task decomposition.

```sql
CREATE TABLE swarm_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Swarm Context
  swarm_execution_id UUID NOT NULL REFERENCES swarm_executions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,

  -- Task Definition
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL, -- 'research', 'seo_analysis', 'content_creation', etc.

  -- Assignment
  assigned_agent_worker_id UUID REFERENCES agent_workers(id),

  -- Dependencies
  depends_on_task_ids UUID[], -- Array of task IDs that must complete first

  -- Priority & Scheduling
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  scheduled_for TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',
    'blocked',
    'queued',
    'in_progress',
    'completed',
    'failed',
    'cancelled'
  )),

  -- Results
  output JSONB,
  output_type TEXT, -- 'text', 'chart', 'table', 'recommendation', 'task_list'

  -- Creates Project Task?
  creates_project_task BOOLEAN DEFAULT false,
  project_task_id UUID REFERENCES agentic_project_tasks(id),

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_swarm_subtasks_swarm
  ON swarm_subtasks(swarm_execution_id);
CREATE INDEX idx_swarm_subtasks_status
  ON swarm_subtasks(status);
CREATE INDEX idx_swarm_subtasks_assigned
  ON swarm_subtasks(assigned_agent_worker_id) WHERE assigned_agent_worker_id IS NOT NULL;
CREATE INDEX idx_swarm_subtasks_scheduled
  ON swarm_subtasks(scheduled_for) WHERE scheduled_for IS NOT NULL;
```

#### 4. `agent_progress_events`
Real-time progress updates from agents for conversational feedback.

```sql
CREATE TABLE agent_progress_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  swarm_execution_id UUID NOT NULL REFERENCES swarm_executions(id) ON DELETE CASCADE,
  agent_worker_id UUID NOT NULL REFERENCES agent_workers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,

  -- Event Details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'started',
    'progress_update',
    'tool_call',
    'result_ready',
    'completed',
    'failed',
    'question'  -- Agent needs user input
  )),

  -- Message Content
  message TEXT,
  spoken_message TEXT, -- Shorter version for TTS

  -- Visual Output
  visual_type TEXT, -- 'chart', 'table', 'bullet_list', 'code', 'image'
  visual_data JSONB,

  -- Tool Call Info
  tool_name TEXT,
  tool_args JSONB,
  tool_result JSONB,

  -- Broadcast Settings
  broadcast_to_user BOOLEAN DEFAULT true,
  use_voice BOOLEAN DEFAULT false,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_agent_progress_events_swarm
  ON agent_progress_events(swarm_execution_id, created_at DESC);
CREATE INDEX idx_agent_progress_events_worker
  ON agent_progress_events(agent_worker_id, created_at DESC);
CREATE INDEX idx_agent_progress_events_broadcast
  ON agent_progress_events(broadcast_to_user) WHERE broadcast_to_user = true;
```

#### 5. Extensions to Existing Tables

**Add columns to `agentic_project_tasks`:**
```sql
-- Link tasks to swarm executions
ALTER TABLE agentic_project_tasks
  ADD COLUMN swarm_execution_id UUID REFERENCES swarm_executions(id),
  ADD COLUMN created_by_agent_worker_id UUID REFERENCES agent_workers(id),
  ADD COLUMN requires_approval BOOLEAN DEFAULT true,
  ADD COLUMN approved_by UUID REFERENCES users(id),
  ADD COLUMN approved_at TIMESTAMPTZ;

-- Index for pending approvals
CREATE INDEX idx_agentic_project_tasks_approval
  ON agentic_project_tasks(requires_approval, approved_by)
  WHERE requires_approval = true AND approved_by IS NULL;
```

**Add columns to `agent_memory_conversations`:**
```sql
-- Track active swarm
ALTER TABLE agent_memory_conversations
  ADD COLUMN active_swarm_execution_id UUID REFERENCES swarm_executions(id),
  ADD COLUMN swarm_mode BOOLEAN DEFAULT false;
```

---

## Agent Spawning & Pool Management

### Agent Worker Types

Define specialized agent types for different domains:

```typescript
// /mastra-agents/lib/swarm/agent-types.ts

export enum AgentWorkerType {
  // Research & Analysis
  RESEARCHER = 'researcher',
  SEO_SPECIALIST = 'seo_specialist',
  COMPETITOR_ANALYST = 'competitor_analyst',
  DATA_ANALYST = 'data_analyst',

  // Content & Marketing
  CONTENT_WRITER = 'content_writer',
  COPYWRITER = 'copywriter',
  SOCIAL_MEDIA_SPECIALIST = 'social_media_specialist',

  // Technical
  WEB_DEVELOPER = 'web_developer',
  TECHNICAL_SEO = 'technical_seo',

  // Strategy
  STRATEGIST = 'strategist',
  PROJECT_MANAGER = 'project_manager',

  // General
  GENERAL_ASSISTANT = 'general_assistant',
}

export const AGENT_TYPE_CONFIGS: Record<AgentWorkerType, AgentTypeConfig> = {
  [AgentWorkerType.RESEARCHER]: {
    name: 'Research Specialist',
    mastraAgentId: 'genesis-agent', // Reuse existing agent with custom context
    capabilities: ['web_search', 'data_extraction', 'summarization'],
    tools: ['tavily_search', 'tavily_extract', 'web_scraper'],
    systemPrompt: `You are a research specialist. Your job is to gather comprehensive information on topics, extract key data, and provide well-organized summaries. Be thorough and cite sources.`,
    maxConcurrent: 3,
  },

  [AgentWorkerType.SEO_SPECIALIST]: {
    name: 'SEO Specialist',
    mastraAgentId: 'genesis-agent',
    capabilities: ['seo_analysis', 'keyword_research', 'backlink_analysis'],
    tools: [
      'dataforseo_labs_google_ranked_keywords',
      'dataforseo_labs_google_domain_rank_overview',
      'dataforseo_labs_google_keyword_ideas',
      'backlinks_summary',
    ],
    systemPrompt: `You are an SEO specialist. Analyze websites for SEO performance, identify keyword opportunities, and provide actionable recommendations. Use data-driven insights.`,
    maxConcurrent: 2,
  },

  [AgentWorkerType.CONTENT_WRITER]: {
    name: 'Content Writer',
    mastraAgentId: 'genesis-agent',
    capabilities: ['writing', 'editing', 'content_strategy'],
    tools: ['web_search', 'content_analysis'],
    systemPrompt: `You are a professional content writer. Create engaging, SEO-optimized content that resonates with target audiences. Focus on clarity, value, and conversion.`,
    maxConcurrent: 2,
  },

  [AgentWorkerType.STRATEGIST]: {
    name: 'Strategy Specialist',
    mastraAgentId: 'genesis-agent',
    capabilities: ['strategic_planning', 'analysis', 'recommendations'],
    tools: ['web_search', 'data_analysis'],
    systemPrompt: `You are a business strategist. Analyze situations holistically, identify opportunities, and create actionable plans with prioritized recommendations.`,
    maxConcurrent: 1,
  },

  [AgentWorkerType.PROJECT_MANAGER]: {
    name: 'Project Manager',
    mastraAgentId: 'project-agent', // Dedicated project management agent
    capabilities: ['task_creation', 'coordination', 'progress_tracking'],
    tools: ['task_manager', 'calendar'],
    systemPrompt: `You are a project manager. Break down complex initiatives into tasks, assign priorities, set timelines, and track progress. Keep teams organized and on track.`,
    maxConcurrent: 1,
  },
};

interface AgentTypeConfig {
  name: string;
  mastraAgentId: string;
  capabilities: string[];
  tools: string[];
  systemPrompt: string;
  maxConcurrent: number;
}
```

### Agent Pool Manager

```typescript
// /mastra-agents/lib/swarm/agent-pool-manager.ts

import { Agent } from '@mastra/core';
import { createMemoryForAgentType } from '../memory';
import { openai } from '@ai-sdk/openai';
import { RuntimeContext } from '@mastra/core';

export class AgentPoolManager {
  private activeWorkers: Map<string, AgentWorker> = new Map();
  private workerQueue: WorkerRequest[] = [];
  private maxConcurrentWorkers = 10;

  constructor(
    private supabaseClient: SupabaseClient,
    private tenantId: string,
    private swarmExecutionId: string
  ) {}

  /**
   * Spawn a new agent worker for a specific task
   */
  async spawnWorker(
    workerType: AgentWorkerType,
    taskDescription: string,
    taskId: string,
    context: SwarmContext
  ): Promise<AgentWorker> {
    // Check concurrency limits
    const typeConfig = AGENT_TYPE_CONFIGS[workerType];
    const activeOfType = Array.from(this.activeWorkers.values())
      .filter(w => w.type === workerType && w.status === 'working').length;

    if (activeOfType >= typeConfig.maxConcurrent) {
      // Queue for later
      this.workerQueue.push({ workerType, taskDescription, taskId, context });
      throw new Error(`Max concurrent ${workerType} workers reached. Queued.`);
    }

    // Create worker record in database
    const { data: workerRecord, error } = await this.supabaseClient
      .from('agent_workers')
      .insert({
        swarm_execution_id: this.swarmExecutionId,
        tenant_id: this.tenantId,
        worker_type: workerType,
        agent_name: typeConfig.name,
        mastra_agent_id: typeConfig.mastraAgentId,
        assigned_task_id: taskId,
        task_description: taskDescription,
        status: 'initializing',
      })
      .select()
      .single();

    if (error) throw error;

    // Create Mastra agent instance
    const runtimeContext = new RuntimeContext();
    runtimeContext.set('agentName', typeConfig.name);
    runtimeContext.set('instruction', typeConfig.systemPrompt);
    runtimeContext.set('tenantId', this.tenantId);
    runtimeContext.set('swarmExecutionId', this.swarmExecutionId);
    runtimeContext.set('conversationId', context.conversationId);

    const mastraAgent = await this.createMastraAgent(
      typeConfig.mastraAgentId,
      runtimeContext
    );

    // Create worker wrapper
    const worker = new AgentWorker(
      workerRecord.id,
      workerType,
      mastraAgent,
      taskDescription,
      this.supabaseClient,
      context
    );

    this.activeWorkers.set(workerRecord.id, worker);

    // Emit progress event
    await this.emitProgressEvent(workerRecord.id, {
      event_type: 'started',
      message: `${typeConfig.name} started working on: ${taskDescription}`,
      spoken_message: `I'm bringing in a ${typeConfig.name.toLowerCase()} to handle ${this.summarizeTask(taskDescription)}`,
      broadcast_to_user: true,
      use_voice: true,
    });

    return worker;
  }

  /**
   * Execute task with worker
   */
  async executeTask(worker: AgentWorker): Promise<WorkerResult> {
    try {
      // Update status
      await this.updateWorkerStatus(worker.id, 'working');

      // Execute the task with the agent
      const result = await worker.execute();

      // Update status
      await this.updateWorkerStatus(worker.id, 'completed', result);

      // Emit completion event
      await this.emitProgressEvent(worker.id, {
        event_type: 'completed',
        message: result.summary,
        spoken_message: result.spokenSummary,
        broadcast_to_user: true,
        use_voice: true,
      });

      // Check queue for next worker
      await this.processQueue();

      return result;

    } catch (error) {
      await this.updateWorkerStatus(worker.id, 'failed', null, error.message);
      throw error;
    }
  }

  /**
   * Terminate a worker
   */
  async terminateWorker(workerId: string): Promise<void> {
    const worker = this.activeWorkers.get(workerId);
    if (!worker) return;

    await this.updateWorkerStatus(workerId, 'terminated');
    this.activeWorkers.delete(workerId);
  }

  /**
   * Get all active workers
   */
  getActiveWorkers(): AgentWorker[] {
    return Array.from(this.activeWorkers.values());
  }

  /**
   * Create Mastra agent instance
   */
  private async createMastraAgent(
    mastraAgentId: string,
    runtimeContext: RuntimeContext
  ): Promise<Agent> {
    // Import the agent from registry
    const { AGENT_REGISTRY } = await import('../agents');
    const baseAgent = AGENT_REGISTRY[mastraAgentId];

    if (!baseAgent) {
      throw new Error(`Agent ${mastraAgentId} not found in registry`);
    }

    // Agents already support runtime context via their instructions/model functions
    return baseAgent;
  }

  /**
   * Update worker status in database
   */
  private async updateWorkerStatus(
    workerId: string,
    status: string,
    result?: WorkerResult,
    errorMessage?: string
  ): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'completed' && result) {
      updates.result = result;
      updates.completed_at = new Date().toISOString();
      updates.progress_percentage = 100;
    }

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    await this.supabaseClient
      .from('agent_workers')
      .update(updates)
      .eq('id', workerId);
  }

  /**
   * Emit progress event for conversational updates
   */
  private async emitProgressEvent(
    workerId: string,
    event: Partial<AgentProgressEvent>
  ): Promise<void> {
    await this.supabaseClient
      .from('agent_progress_events')
      .insert({
        swarm_execution_id: this.swarmExecutionId,
        agent_worker_id: workerId,
        tenant_id: this.tenantId,
        ...event,
      });
  }

  /**
   * Process queued worker requests
   */
  private async processQueue(): Promise<void> {
    if (this.workerQueue.length === 0) return;

    const request = this.workerQueue.shift();
    if (!request) return;

    try {
      const worker = await this.spawnWorker(
        request.workerType,
        request.taskDescription,
        request.taskId,
        request.context
      );

      // Execute in background
      this.executeTask(worker).catch(console.error);
    } catch (error) {
      // Re-queue if still at capacity
      if (error.message.includes('Max concurrent')) {
        this.workerQueue.unshift(request);
      }
    }
  }

  private summarizeTask(task: string): string {
    if (task.length <= 50) return task;
    return task.substring(0, 50) + '...';
  }
}

/**
 * Individual Agent Worker
 */
export class AgentWorker {
  status: 'idle' | 'working' | 'completed' | 'failed' = 'idle';

  constructor(
    public id: string,
    public type: AgentWorkerType,
    private agent: Agent,
    private taskDescription: string,
    private supabase: SupabaseClient,
    private context: SwarmContext
  ) {}

  /**
   * Execute the assigned task
   */
  async execute(): Promise<WorkerResult> {
    this.status = 'working';

    const startTime = Date.now();

    try {
      // Build prompt for agent
      const prompt = this.buildTaskPrompt();

      // Execute agent with streaming
      const stream = await this.agent.generate(prompt, {
        runtimeContext: this.context.runtimeContext,
      });

      let fullResponse = '';
      const toolCalls: any[] = [];

      // Process stream
      for await (const chunk of stream) {
        if (chunk.type === 'text') {
          fullResponse += chunk.value;

          // Emit progress updates every 500ms
          await this.emitProgress(fullResponse);
        } else if (chunk.type === 'tool_call') {
          toolCalls.push(chunk);

          await this.emitToolCall(chunk);
        }
      }

      const duration = Date.now() - startTime;

      // Parse output for structured data
      const parsedOutput = this.parseAgentOutput(fullResponse);

      this.status = 'completed';

      return {
        success: true,
        output: fullResponse,
        parsedOutput,
        toolCalls,
        duration,
        summary: this.generateSummary(parsedOutput),
        spokenSummary: this.generateSpokenSummary(parsedOutput),
      };

    } catch (error) {
      this.status = 'failed';
      throw error;
    }
  }

  private buildTaskPrompt(): string {
    return `
Task: ${this.taskDescription}

Context:
- You are part of a swarm of agents working together
- Your specific role is: ${AGENT_TYPE_CONFIGS[this.type].name}
- Other agents are handling complementary tasks

Instructions:
1. Focus on your specific domain expertise
2. Be concise but thorough
3. Provide actionable insights
4. Use tools available to you
5. Format your response with clear sections

Deliver your findings in a structured format with:
- Executive Summary (2-3 sentences)
- Key Findings (bullet points)
- Recommendations (prioritized list)
- Next Steps (if applicable)
- Data/Evidence (if applicable)

Begin your analysis now.
`;
  }

  private async emitProgress(partialResponse: string): Promise<void> {
    // Throttled progress updates
    await this.supabase
      .from('agent_workers')
      .update({
        progress_message: this.extractLatestThought(partialResponse),
        updated_at: new Date().toISOString(),
      })
      .eq('id', this.id);
  }

  private async emitToolCall(toolCall: any): Promise<void> {
    await this.supabase
      .from('agent_progress_events')
      .insert({
        swarm_execution_id: this.context.swarmExecutionId,
        agent_worker_id: this.id,
        tenant_id: this.context.tenantId,
        event_type: 'tool_call',
        message: `Using ${toolCall.name}`,
        tool_name: toolCall.name,
        tool_args: toolCall.args,
        broadcast_to_user: false,
      });
  }

  private parseAgentOutput(output: string): ParsedOutput {
    // Extract structured sections from agent output
    // This is simplified - real implementation would use regex/parsing
    return {
      summary: this.extractSection(output, 'Executive Summary'),
      findings: this.extractBullets(output, 'Key Findings'),
      recommendations: this.extractBullets(output, 'Recommendations'),
      nextSteps: this.extractBullets(output, 'Next Steps'),
      rawOutput: output,
    };
  }

  private generateSummary(parsed: ParsedOutput): string {
    return parsed.summary || 'Task completed successfully';
  }

  private generateSpokenSummary(parsed: ParsedOutput): string {
    const findings = parsed.findings?.slice(0, 2).join(', ') || 'analysis complete';
    return `I've completed the ${this.type} analysis. ${findings}`;
  }

  private extractLatestThought(text: string): string {
    const lines = text.split('\n').filter(l => l.trim());
    return lines[lines.length - 1] || 'Working...';
  }

  private extractSection(text: string, header: string): string {
    const regex = new RegExp(`${header}:?\\n([^#]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  private extractBullets(text: string, header: string): string[] {
    const section = this.extractSection(text, header);
    return section
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
      .map(line => line.replace(/^[-*]\s*/, '').trim());
  }
}

// Types
interface WorkerRequest {
  workerType: AgentWorkerType;
  taskDescription: string;
  taskId: string;
  context: SwarmContext;
}

interface SwarmContext {
  tenantId: string;
  swarmExecutionId: string;
  conversationId: string;
  repRoomSlug: string;
  sessionId: string;
  runtimeContext: RuntimeContext;
}

interface WorkerResult {
  success: boolean;
  output: string;
  parsedOutput: ParsedOutput;
  toolCalls: any[];
  duration: number;
  summary: string;
  spokenSummary: string;
}

interface ParsedOutput {
  summary: string;
  findings: string[];
  recommendations: string[];
  nextSteps: string[];
  rawOutput: string;
}

interface AgentProgressEvent {
  event_type: string;
  message: string;
  spoken_message?: string;
  visual_type?: string;
  visual_data?: any;
  tool_name?: string;
  tool_args?: any;
  tool_result?: any;
  broadcast_to_user: boolean;
  use_voice: boolean;
}
```

---

## Task Distribution & Orchestration

### Task Analyzer

Breaks down complex user requests into subtasks.

```typescript
// /mastra-agents/lib/swarm/task-analyzer.ts

export class TaskAnalyzer {
  constructor(private openaiClient: OpenAI) {}

  /**
   * Analyze user message and decompose into subtasks
   */
  async analyzeAndDecompose(
    userMessage: string,
    context: AnalysisContext
  ): Promise<TaskDecomposition> {
    const systemPrompt = `You are a task decomposition specialist. Analyze user requests and break them down into parallel subtasks.

Your job:
1. Understand the user's goal
2. Identify distinct work streams that can run in parallel
3. Assign each subtask to an appropriate specialist
4. Determine dependencies between tasks
5. Set priorities

Available specialist types:
- researcher: Gather information, web research
- seo_specialist: SEO analysis, keyword research, backlink analysis
- competitor_analyst: Competitive analysis
- content_writer: Create written content
- strategist: Strategic planning and recommendations
- project_manager: Create implementation tasks

Output format (JSON):
{
  "goal": "Overall objective",
  "strategy": "High-level approach",
  "subtasks": [
    {
      "title": "Short title",
      "description": "Detailed description",
      "assignedTo": "specialist type",
      "priority": 1-10,
      "dependsOn": ["task_id"],
      "estimatedDuration": "5 minutes",
      "outputType": "text|chart|table|task_list"
    }
  ]
}`;

    const completion = await this.openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze and decompose this request:\n\n"${userMessage}"\n\nContext: ${JSON.stringify(context)}` }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const analysis = JSON.parse(completion.choices[0].message.content);

    return {
      goal: analysis.goal,
      strategy: analysis.strategy,
      subtasks: analysis.subtasks.map((st: any, idx: number) => ({
        id: `task_${idx}`,
        ...st,
      })),
      estimatedTotalDuration: this.calculateTotalDuration(analysis.subtasks),
      parallelizable: this.checkParallelizability(analysis.subtasks),
    };
  }

  private calculateTotalDuration(subtasks: any[]): number {
    // Simplified: assumes perfect parallelization
    const durations = subtasks.map(st => this.parseDuration(st.estimatedDuration));
    return Math.max(...durations);
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/(\d+)\s*(minute|second)/i);
    if (!match) return 300; // default 5 minutes

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    return unit.startsWith('minute') ? value * 60 : value;
  }

  private checkParallelizability(subtasks: any[]): boolean {
    // If most tasks have no dependencies, they're parallelizable
    const independent = subtasks.filter(st => !st.dependsOn || st.dependsOn.length === 0);
    return independent.length >= subtasks.length * 0.6;
  }
}

interface AnalysisContext {
  conversationHistory?: string[];
  domain?: string;
  urgency?: 'low' | 'medium' | 'high';
}

interface TaskDecomposition {
  goal: string;
  strategy: string;
  subtasks: Subtask[];
  estimatedTotalDuration: number;
  parallelizable: boolean;
}

interface Subtask {
  id: string;
  title: string;
  description: string;
  assignedTo: AgentWorkerType;
  priority: number;
  dependsOn: string[];
  estimatedDuration: string;
  outputType: 'text' | 'chart' | 'table' | 'task_list';
}
```

### Swarm Orchestrator (Main Coordinator)

```typescript
// /mastra-agents/lib/swarm/orchestrator.ts

export class SwarmOrchestrator {
  private poolManager: AgentPoolManager;
  private taskAnalyzer: TaskAnalyzer;
  private progressBroadcaster: ProgressBroadcaster;

  constructor(
    private supabase: SupabaseClient,
    private openaiClient: OpenAI,
    private tenantId: string,
    private repRoomSlug: string,
    private sessionId: string,
    private conversationId: string
  ) {
    this.taskAnalyzer = new TaskAnalyzer(openaiClient);
    this.progressBroadcaster = new ProgressBroadcaster(supabase, repRoomSlug, sessionId);
  }

  /**
   * Main entry point: Execute user request as swarm
   */
  async execute(userMessage: string, messageId: string): Promise<SwarmExecutionResult> {
    // 1. Create swarm execution record
    const swarmExecution = await this.createSwarmExecution(userMessage, messageId);

    // Initialize pool manager
    this.poolManager = new AgentPoolManager(
      this.supabase,
      this.tenantId,
      swarmExecution.id
    );

    try {
      // 2. Analyze and decompose task
      await this.updateSwarmStatus(swarmExecution.id, 'analyzing');
      await this.broadcastUpdate('Analyzing your request and planning the work...');

      const decomposition = await this.taskAnalyzer.analyzeAndDecompose(userMessage, {
        domain: await this.inferDomain(userMessage),
        urgency: 'medium',
      });

      // 3. Create subtasks in database
      const subtaskRecords = await this.createSubtasks(swarmExecution.id, decomposition.subtasks);

      // 4. Broadcast plan
      await this.broadcastPlan(decomposition);

      // 5. Spawn agents
      await this.updateSwarmStatus(swarmExecution.id, 'spawning_agents');
      await this.broadcastUpdate(`Bringing in ${decomposition.subtasks.length} specialists to work on this...`, true);

      const workers = await this.spawnWorkers(swarmExecution.id, subtaskRecords, decomposition);

      // 6. Execute tasks in parallel
      await this.updateSwarmStatus(swarmExecution.id, 'executing');

      const results = await this.executeInParallel(workers, subtaskRecords);

      // 7. Consolidate results
      await this.updateSwarmStatus(swarmExecution.id, 'consolidating');
      await this.broadcastUpdate('Consolidating findings from all specialists...');

      const consolidated = await this.consolidateResults(results, decomposition.goal);

      // 8. Create tasks for approval (if needed)
      const tasks = await this.createImplementationTasks(consolidated, swarmExecution.id);

      // 9. Complete
      await this.updateSwarmStatus(swarmExecution.id, 'completed');

      return {
        success: true,
        swarmExecutionId: swarmExecution.id,
        summary: consolidated.summary,
        findings: consolidated.findings,
        recommendations: consolidated.recommendations,
        tasksCreated: tasks.length,
        duration: Date.now() - new Date(swarmExecution.started_at).getTime(),
      };

    } catch (error) {
      await this.updateSwarmStatus(swarmExecution.id, 'failed');
      await this.broadcastUpdate(`Swarm execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute all workers in parallel with dependency resolution
   */
  private async executeInParallel(
    workers: AgentWorker[],
    subtasks: SubtaskRecord[]
  ): Promise<WorkerResult[]> {
    const results: Map<string, WorkerResult> = new Map();
    const pending = new Set(subtasks.map(st => st.id));

    while (pending.size > 0) {
      // Find tasks ready to execute (dependencies met)
      const ready = subtasks.filter(st =>
        pending.has(st.id) &&
        st.depends_on_task_ids.every(depId => results.has(depId))
      );

      if (ready.length === 0 && pending.size > 0) {
        throw new Error('Circular dependency detected in subtasks');
      }

      // Execute ready tasks in parallel
      const batch = await Promise.allSettled(
        ready.map(async (st) => {
          const worker = workers.find(w => w.id === st.assigned_agent_worker_id);
          if (!worker) throw new Error(`Worker not found for task ${st.id}`);

          const result = await this.poolManager.executeTask(worker);
          return { taskId: st.id, result };
        })
      );

      // Store results and mark as done
      batch.forEach((outcome, idx) => {
        const taskId = ready[idx].id;
        if (outcome.status === 'fulfilled') {
          results.set(taskId, outcome.value.result);
        } else {
          console.error(`Task ${taskId} failed:`, outcome.reason);
        }
        pending.delete(taskId);
      });
    }

    return Array.from(results.values());
  }

  /**
   * Consolidate results from all workers
   */
  private async consolidateResults(
    results: WorkerResult[],
    goal: string
  ): Promise<ConsolidatedResult> {
    const systemPrompt = `You are a results consolidation specialist. Your job is to merge outputs from multiple specialist agents into a coherent, actionable report.

Inputs: Multiple specialist reports (SEO analysis, research findings, etc.)
Output: Executive summary with key findings and recommendations

Format your response as:
# Executive Summary
[2-3 sentences summarizing everything]

# Key Findings
[Bullet points of most important insights across all reports]

# Recommendations
[Prioritized action items with rationale]

# Implementation Plan
[Step-by-step next actions]
`;

    const userPrompt = `Goal: ${goal}\n\nSpecialist Reports:\n\n${results.map((r, i) =>
      `## Report ${i + 1}\n${r.output}`
    ).join('\n\n')}\n\nPlease consolidate these into a cohesive report.`;

    const completion = await this.openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
    });

    const consolidated = completion.choices[0].message.content;

    // Broadcast final summary
    await this.broadcastUpdate(consolidated, true);

    return this.parseConsolidatedResult(consolidated);
  }

  private parseConsolidatedResult(text: string): ConsolidatedResult {
    return {
      summary: this.extractSection(text, 'Executive Summary'),
      findings: this.extractBullets(text, 'Key Findings'),
      recommendations: this.extractBullets(text, 'Recommendations'),
      implementationPlan: this.extractBullets(text, 'Implementation Plan'),
      fullReport: text,
    };
  }

  private async broadcastUpdate(message: string, useVoice: boolean = false): Promise<void> {
    await this.progressBroadcaster.broadcast({
      message,
      useVoice,
      type: 'swarm_update',
    });
  }

  private async broadcastPlan(decomposition: TaskDecomposition): Promise<void> {
    const planMessage = `I've analyzed your request. Here's my plan:\n\n${decomposition.strategy}\n\nI'll have ${decomposition.subtasks.length} specialists work on this in parallel:\n${decomposition.subtasks.map(st => `• ${st.title}`).join('\n')}`;

    await this.progressBroadcaster.broadcast({
      message: planMessage,
      useVoice: true,
      type: 'plan',
      visualData: {
        type: 'task_list',
        tasks: decomposition.subtasks,
      },
    });
  }

  // Helper methods

  private async createSwarmExecution(userMessage: string, messageId: string) {
    const { data, error } = await this.supabase
      .from('swarm_executions')
      .insert({
        tenant_id: this.tenantId,
        rep_room_slug: this.repRoomSlug,
        session_id: this.sessionId,
        conversation_id: this.conversationId,
        user_message: userMessage,
        original_message_id: messageId,
        status: 'initializing',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private async updateSwarmStatus(swarmId: string, status: string) {
    await this.supabase
      .from('swarm_executions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', swarmId);
  }

  private async createSubtasks(swarmId: string, subtasks: Subtask[]) {
    const { data, error } = await this.supabase
      .from('swarm_subtasks')
      .insert(
        subtasks.map(st => ({
          swarm_execution_id: swarmId,
          tenant_id: this.tenantId,
          title: st.title,
          description: st.description,
          task_type: st.assignedTo,
          priority: st.priority,
          depends_on_task_ids: st.dependsOn,
          status: 'pending',
        }))
      )
      .select();

    if (error) throw error;
    return data;
  }

  private async spawnWorkers(swarmId: string, subtasks: any[], decomposition: TaskDecomposition) {
    const workers: AgentWorker[] = [];

    for (const subtask of subtasks) {
      const workerType = subtask.task_type as AgentWorkerType;
      const context: SwarmContext = {
        tenantId: this.tenantId,
        swarmExecutionId: swarmId,
        conversationId: this.conversationId,
        repRoomSlug: this.repRoomSlug,
        sessionId: this.sessionId,
        runtimeContext: new RuntimeContext(),
      };

      const worker = await this.poolManager.spawnWorker(
        workerType,
        subtask.description,
        subtask.id,
        context
      );

      workers.push(worker);
    }

    return workers;
  }

  private async createImplementationTasks(consolidated: ConsolidatedResult, swarmId: string) {
    // Create project first
    const { data: project } = await this.supabase
      .from('agentic_projects')
      .insert({
        tenant_id: this.tenantId,
        name: `Implementation Plan - ${new Date().toLocaleDateString()}`,
        description: consolidated.summary,
      })
      .select()
      .single();

    // Create tasks from implementation plan
    const { data: tasks } = await this.supabase
      .from('agentic_project_tasks')
      .insert(
        consolidated.implementationPlan.map((item, idx) => ({
          project_id: project.id,
          tenant_id: this.tenantId,
          swarm_execution_id: swarmId,
          title: item,
          status: 'pending',
          priority: idx + 1,
          requires_approval: true,
        }))
      )
      .select();

    return tasks || [];
  }

  private extractSection(text: string, header: string): string {
    const regex = new RegExp(`#\\s*${header}\\s*\\n([^#]+)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : '';
  }

  private extractBullets(text: string, header: string): string[] {
    const section = this.extractSection(text, header);
    return section
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
      .map(line => line.replace(/^[-*]\s*/, '').trim());
  }

  private async inferDomain(message: string): Promise<string> {
    // Simple keyword-based domain detection
    const lower = message.toLowerCase();
    if (lower.includes('seo') || lower.includes('ranking') || lower.includes('keyword')) return 'seo';
    if (lower.includes('content') || lower.includes('blog') || lower.includes('article')) return 'content';
    if (lower.includes('revenue') || lower.includes('sales') || lower.includes('marketing')) return 'marketing';
    return 'general';
  }
}

interface ConsolidatedResult {
  summary: string;
  findings: string[];
  recommendations: string[];
  implementationPlan: string[];
  fullReport: string;
}

interface SwarmExecutionResult {
  success: boolean;
  swarmExecutionId: string;
  summary: string;
  findings: string[];
  recommendations: string[];
  tasksCreated: number;
  duration: number;
}

interface SubtaskRecord {
  id: string;
  task_type: string;
  description: string;
  depends_on_task_ids: string[];
  assigned_agent_worker_id: string;
}
```

---

## Conversational Updates System

### Real-Time Progress Broadcasting

Agents provide conversational updates as they work, creating a collaborative feel.

```typescript
// /mastra-agents/lib/swarm/progress-broadcaster.ts

export class ProgressBroadcaster {
  constructor(
    private supabase: SupabaseClient,
    private repRoomSlug: string,
    private sessionId: string
  ) {}

  /**
   * Broadcast update to rep room
   */
  async broadcast(update: ProgressUpdate): Promise<void> {
    // 1. Store in agent_memory_messages for persistence
    await this.storeInMemory(update);

    // 2. Send via Supabase Realtime for instant UI update
    await this.sendRealtimeUpdate(update);

    // 3. Trigger TTS if voice is enabled
    if (update.useVoice && update.message) {
      await this.triggerTTS(update);
    }

    // 4. If visual data, store and notify
    if (update.visualData) {
      await this.storeVisualData(update);
    }
  }

  private async storeInMemory(update: ProgressUpdate): Promise<void> {
    // Get conversation
    const { data: conversation } = await this.supabase
      .from('agent_memory_conversations')
      .select('id')
      .eq('session_id', this.sessionId)
      .single();

    if (!conversation) return;

    // Store message
    await this.supabase
      .from('agent_memory_messages')
      .insert({
        conversation_id: conversation.id,
        message_id: `swarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: update.message,
        participant_kind: 'agent',
        channel: update.useVoice ? 'voice' : 'chat',
        metadata: {
          type: update.type,
          visualData: update.visualData,
        },
      });
  }

  private async sendRealtimeUpdate(update: ProgressUpdate): Promise<void> {
    // Use Supabase Realtime channels
    const channel = this.supabase.channel(`rep_room_${this.repRoomSlug}`);

    await channel.send({
      type: 'broadcast',
      event: 'swarm_progress',
      payload: {
        message: update.message,
        type: update.type,
        visualData: update.visualData,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private async triggerTTS(update: ProgressUpdate): Promise<void> {
    // Send message via data channel to trigger TTS in frontend
    // This integrates with existing VoiceCopilotBridge
    const channel = this.supabase.channel(`rep_room_${this.repRoomSlug}`);

    await channel.send({
      type: 'broadcast',
      event: 'tts_request',
      payload: {
        text: update.message,
        priority: 'normal',
      },
    });
  }

  private async storeVisualData(update: ProgressUpdate): Promise<void> {
    // Store visualization data for later retrieval
    await this.supabase
      .from('agent_progress_events')
      .insert({
        swarm_execution_id: update.swarmExecutionId,
        agent_worker_id: update.agentWorkerId,
        tenant_id: update.tenantId,
        event_type: 'result_ready',
        visual_type: update.visualData?.type,
        visual_data: update.visualData,
        broadcast_to_user: true,
      });
  }
}

interface ProgressUpdate {
  message: string;
  type: 'swarm_update' | 'agent_update' | 'plan' | 'result' | 'question';
  useVoice?: boolean;
  visualData?: VisualData;
  swarmExecutionId?: string;
  agentWorkerId?: string;
  tenantId?: string;
}

interface VisualData {
  type: 'chart' | 'table' | 'bullet_list' | 'code' | 'task_list';
  data: any;
}
```

### Frontend Integration: SwarmProgressDisplay

```typescript
// /src/components/rep-room/SwarmProgressDisplay.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export function SwarmProgressDisplay({ repRoomSlug }: { repRoomSlug: string }) {
  const [swarmStatus, setSwarmStatus] = useState<SwarmStatus | null>(null);
  const [agentWorkers, setAgentWorkers] = useState<AgentWorker[]>([]);
  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>([]);

  useEffect(() => {
    // Subscribe to realtime updates
    const channel = supabase.channel(`rep_room_${repRoomSlug}`);

    channel
      .on('broadcast', { event: 'swarm_progress' }, (payload) => {
        handleProgressUpdate(payload.payload);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [repRoomSlug]);

  const handleProgressUpdate = (update: any) => {
    setProgressEvents(prev => [...prev, update]);

    // Trigger visual/audio feedback
    if (update.visualData) {
      renderVisualization(update.visualData);
    }
  };

  const renderVisualization = (visualData: VisualData) => {
    switch (visualData.type) {
      case 'task_list':
        return <TaskListView tasks={visualData.data.tasks} />;
      case 'chart':
        return <ChartView data={visualData.data} />;
      case 'table':
        return <TableView data={visualData.data} />;
      case 'bullet_list':
        return <BulletListView items={visualData.data} />;
      default:
        return null;
    }
  };

  return (
    <div className="swarm-progress-container">
      {swarmStatus && (
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">Swarm Progress</h3>
            <Badge variant={getStatusVariant(swarmStatus.status)}>
              {swarmStatus.status}
            </Badge>
          </div>

          <Progress value={swarmStatus.progress_percentage} className="mb-4" />

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Active Agents:</span>
              <span className="ml-2 font-medium">{swarmStatus.active_agent_count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tasks Created:</span>
              <span className="ml-2 font-medium">{swarmStatus.tasks_created}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <span className="ml-2 font-medium">{formatDuration(swarmStatus.duration_ms)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Agent Workers Status */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {agentWorkers.map(worker => (
          <Card key={worker.id} className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AgentAvatar type={worker.worker_type} />
                <div>
                  <p className="font-medium text-sm">{worker.agent_name}</p>
                  <p className="text-xs text-muted-foreground">{worker.task_description.substring(0, 40)}...</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {worker.status}
              </Badge>
            </div>
            {worker.progress_percentage > 0 && (
              <Progress value={worker.progress_percentage} className="mt-2 h-1" />
            )}
          </Card>
        ))}
      </div>

      {/* Progress Events Feed */}
      <div className="progress-feed space-y-2">
        {progressEvents.map((event, idx) => (
          <div key={idx} className="flex gap-2 items-start text-sm">
            <span className="text-muted-foreground text-xs">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <p className="flex-1">{event.message}</p>
            {event.visualData && renderVisualization(event.visualData)}
          </div>
        ))}
      </div>
    </div>
  );
}

function getStatusVariant(status: string) {
  const variants = {
    executing: 'default',
    completed: 'success',
    failed: 'destructive',
    analyzing: 'secondary',
  };
  return variants[status] || 'outline';
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}
```

---

## Multi-Modal Output System

### Chart Generation

```typescript
// /mastra-agents/lib/swarm/visualizations.ts

export class VisualizationGenerator {
  /**
   * Generate chart configuration from agent data
   */
  generateChart(data: any[], chartType: 'bar' | 'line' | 'pie'): ChartConfig {
    return {
      type: 'chart',
      chartType,
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          label: 'Data',
          data: data.map(d => d.value),
          backgroundColor: this.getChartColors(data.length),
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Analysis Results' },
        },
      },
    };
  }

  /**
   * Generate table from structured data
   */
  generateTable(data: any[], columns: string[]): TableConfig {
    return {
      type: 'table',
      columns: columns.map(col => ({ header: col, accessor: col })),
      rows: data,
    };
  }

  /**
   * Generate bullet list with categorization
   */
  generateBulletList(items: string[], categories?: string[]): BulletListConfig {
    return {
      type: 'bullet_list',
      items: items.map((item, idx) => ({
        text: item,
        category: categories?.[idx],
        priority: this.inferPriority(item),
      })),
    };
  }

  private inferPriority(text: string): 'high' | 'medium' | 'low' {
    const highWords = ['critical', 'urgent', 'immediate', 'must', 'essential'];
    const lowWords = ['consider', 'optional', 'nice to have'];

    const lower = text.toLowerCase();
    if (highWords.some(word => lower.includes(word))) return 'high';
    if (lowWords.some(word => lower.includes(word))) return 'low';
    return 'medium';
  }

  private getChartColors(count: number): string[] {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
    ];
    return colors.slice(0, count);
  }
}

interface ChartConfig {
  type: 'chart';
  chartType: 'bar' | 'line' | 'pie';
  data: any;
  options: any;
}

interface TableConfig {
  type: 'table';
  columns: { header: string; accessor: string }[];
  rows: any[];
}

interface BulletListConfig {
  type: 'bullet_list';
  items: {
    text: string;
    category?: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}
```

### Agent Output Formatting

Agents can emit structured output that gets converted to visualizations:

```typescript
// Example: SEO Specialist agent output

const seoAnalysisOutput = {
  summary: "The website ranks for 45 keywords but has significant technical SEO issues.",

  // This gets converted to a chart
  keywordData: [
    { label: 'Position 1-3', value: 5 },
    { label: 'Position 4-10', value: 12 },
    { label: 'Position 11-20', value: 18 },
    { label: 'Position 21+', value: 10 },
  ],

  // This gets converted to a table
  topKeywords: [
    { keyword: 'test prep Israel', position: 3, volume: 1200, difficulty: 45 },
    { keyword: 'psychometric course', position: 5, volume: 800, difficulty: 52 },
    { keyword: 'SAT prep online', position: 8, volume: 1500, difficulty: 68 },
  ],

  // This gets converted to a bullet list with priorities
  recommendations: [
    'CRITICAL: Fix 15 broken backlinks from high-authority domains',
    'High Priority: Optimize page speed (currently 4.2s load time)',
    'Medium Priority: Add schema markup for course pages',
    'Consider: Expand content library with blog posts',
  ],
};

// Agent formats this as visual output
await progressBroadcaster.broadcast({
  message: seoAnalysisOutput.summary,
  type: 'result',
  useVoice: true,
  visualData: {
    type: 'multi',
    components: [
      visualGenerator.generateChart(seoAnalysisOutput.keywordData, 'bar'),
      visualGenerator.generateTable(seoAnalysisOutput.topKeywords, ['keyword', 'position', 'volume', 'difficulty']),
      visualGenerator.generateBulletList(seoAnalysisOutput.recommendations),
    ],
  },
});
```

---

## Scheduling & Approval Workflows

### Task Approval System

```typescript
// /mastra-agents/app/api/tasks/approve/route.ts

export async function POST(req: Request) {
  const { taskId, approved, feedback, userId } = await req.json();

  const supabase = createServerClient();

  if (approved) {
    // Approve task
    await supabase
      .from('agentic_project_tasks')
      .update({
        requires_approval: false,
        approved_by: userId,
        approved_at: new Date().toISOString(),
        status: 'approved',
      })
      .eq('id', taskId);

    // Trigger execution if scheduled for immediate
    const { data: task } = await supabase
      .from('agentic_project_tasks')
      .select('*, swarm_execution_id')
      .eq('id', taskId)
      .single();

    if (!task.scheduled_for || new Date(task.scheduled_for) <= new Date()) {
      // Execute immediately
      await executeTask(task);
    }

  } else {
    // Reject with feedback
    await supabase
      .from('agentic_project_tasks')
      .update({
        status: 'rejected',
        metadata: { rejection_reason: feedback },
      })
      .eq('id', taskId);
  }

  return Response.json({ success: true });
}

async function executeTask(task: any) {
  // Implementation: Execute approved task
  // This could spawn a new swarm or execute single agent task
}
```

### Scheduled Task Execution

```typescript
// /mastra-agents/lib/scheduler/task-scheduler.ts

import cron from 'node-cron';

export class TaskScheduler {
  constructor(private supabase: SupabaseClient) {
    this.startScheduler();
  }

  private startScheduler() {
    // Check every minute for due tasks
    cron.schedule('* * * * *', async () => {
      await this.processDueTasks();
    });
  }

  private async processDueTasks() {
    const now = new Date().toISOString();

    // Get tasks scheduled for now or earlier
    const { data: tasks, error } = await this.supabase
      .from('swarm_subtasks')
      .select('*, swarm_executions(*)')
      .lte('scheduled_for', now)
      .eq('status', 'pending')
      .eq('requires_approval', false); // Only execute approved tasks

    if (error || !tasks || tasks.length === 0) return;

    // Execute each task
    for (const task of tasks) {
      try {
        await this.executeScheduledTask(task);
      } catch (error) {
        console.error(`Failed to execute scheduled task ${task.id}:`, error);
      }
    }
  }

  private async executeScheduledTask(task: any) {
    // Update status
    await this.supabase
      .from('swarm_subtasks')
      .update({ status: 'in_progress' })
      .eq('id', task.id);

    // Spawn agent and execute
    const orchestrator = new SwarmOrchestrator(
      this.supabase,
      task.swarm_executions.tenant_id,
      task.swarm_executions.rep_room_slug,
      task.swarm_executions.session_id,
      task.swarm_executions.conversation_id
    );

    // Execute single task
    // ... implementation
  }
}
```

---

## Implementation Phases

### Phase 1: Parallel Tool Execution (Week 1 - Quick Win)

**Goal**: 72% faster execution by parallelizing tool calls within existing single-agent system.

**Changes**:
1. Modify `/mastra-agents/lib/swarm/tool-executor.ts` to use `Promise.all()`
2. Add semaphore for rate limiting (max 5 concurrent tools)
3. No database changes required
4. No UI changes required

**Code Example**:
```typescript
// BEFORE (sequential)
for (const toolCall of toolCalls) {
  const result = await executeTool(toolCall);
  results.push(result);
}

// AFTER (parallel)
const results = await Promise.allSettled(
  toolCalls.map(async (toolCall) => {
    await semaphore.acquire();
    try {
      return await executeTool(toolCall);
    } finally {
      semaphore.release();
    }
  })
);
```

**Testing**: Benchmark existing workflows - should see 60-70% reduction in execution time.

**Risk**: Low - backward compatible, easy to rollback.

---

### Phase 2: Database & API Foundation (Week 2-3)

**Goal**: Add database tables and API endpoints for swarm orchestration.

**Changes**:
1. Run migrations to add 4 new tables (`swarm_executions`, `agent_workers`, `swarm_subtasks`, `agent_progress_events`)
2. Create API endpoints:
   - `POST /api/swarm/spawn`
   - `GET /api/swarm/status/:id`
   - `POST /api/tasks/approve`
3. No frontend changes yet - testing via API

**Migration Script**:
```sql
-- Run each CREATE TABLE from "Database Schema Extensions" section
-- Add indexes
-- Add foreign keys
-- Test with sample data
```

**Testing**:
- Unit tests for API endpoints
- Integration tests for database operations
- Load test with 10 concurrent swarm executions

**Risk**: Medium - requires database changes, but no breaking changes to existing features.

---

### Phase 3: Agent Pool & Task Distribution (Week 4-5)

**Goal**: Enable true parallel agent execution with task decomposition.

**Changes**:
1. Implement `TaskAnalyzer` class
2. Implement `AgentPoolManager` class
3. Implement `SwarmOrchestrator` class
4. Add specialized agent types to `AGENT_TYPE_CONFIGS`
5. Create background job processor for agent workers

**Implementation Order**:
1. Task decomposition (day 1-2)
2. Agent spawning (day 3-4)
3. Parallel execution (day 5-6)
4. Result consolidation (day 7)

**Testing**:
- Test with simple 2-agent swarm
- Test with complex 5-agent swarm
- Test dependency resolution
- Test failure handling and retries

**Risk**: High - core orchestration logic, requires thorough testing.

---

### Phase 4: Conversational Updates & Voice (Week 6)

**Goal**: Real-time progress updates via voice and text.

**Changes**:
1. Implement `ProgressBroadcaster` class
2. Add Supabase Realtime subscriptions
3. Create `SwarmProgressDisplay` frontend component
4. Integrate with existing `VoiceCopilotBridge` for TTS
5. Add multi-modal visualizations

**Implementation Order**:
1. Realtime broadcasting (day 1-2)
2. Frontend progress display (day 3-4)
3. Voice integration (day 5)
4. Visual output rendering (day 6-7)

**Testing**:
- Test realtime updates with multiple users
- Test voice output (no duplicate TTS)
- Test visual rendering for all types (chart, table, bullet list)

**Risk**: Medium - integrates with existing voice system, test carefully for conflicts.

---

### Phase 5: Scheduling & Approval Workflows (Week 7)

**Goal**: Human-in-the-loop approval and scheduled task execution.

**Changes**:
1. Add `TaskApprovalPanel` component
2. Implement task approval API
3. Create cron scheduler for due tasks
4. Add email notifications for pending approvals

**Implementation Order**:
1. Approval UI (day 1-2)
2. Approval API (day 3)
3. Scheduler (day 4-5)
4. Notifications (day 6-7)

**Testing**:
- Test approval workflow
- Test scheduled execution (future dates)
- Test notification delivery
- Test rejection with feedback

**Risk**: Low - optional feature, can be disabled if issues arise.

---

### Phase 6: Production Hardening (Week 8+)

**Goal**: Enterprise-ready reliability, monitoring, and optimization.

**Enhancements**:
1. Add comprehensive error handling and retries
2. Implement rate limiting per tenant
3. Add monitoring dashboards (agent performance, costs)
4. Optimize database queries with indexes
5. Add caching for agent configurations
6. Implement graceful degradation (fallback to single agent)
7. Add audit logging for all swarm executions
8. Create admin panel for swarm management

**Monitoring Metrics**:
- Swarm execution time (p50, p95, p99)
- Agent success rate
- Tool call latency
- Token consumption per swarm
- Cost per swarm execution
- User satisfaction (approval rate)

---

## API Endpoints

### 1. Spawn Swarm

```typescript
POST /api/swarm/spawn

Request:
{
  "repRoomSlug": "sales-demo",
  "sessionId": "session-xyz",
  "userMessage": "Increase revenue for gmax.co.il",
  "messageId": "msg-123",
  "options": {
    "maxAgents": 5,
    "strategy": "parallel",
    "urgency": "medium"
  }
}

Response:
{
  "success": true,
  "swarmExecutionId": "uuid",
  "status": "initializing",
  "estimatedDuration": 45, // seconds
  "agentsPlanned": 4
}
```

### 2. Get Swarm Status

```typescript
GET /api/swarm/status/:swarmExecutionId

Response:
{
  "id": "uuid",
  "status": "executing",
  "progress_percentage": 60,
  "active_agent_count": 3,
  "total_agent_count": 4,
  "started_at": "2025-11-06T10:00:00Z",
  "duration_ms": 27000,
  "agents": [
    {
      "id": "worker-uuid-1",
      "type": "researcher",
      "status": "completed",
      "progress_percentage": 100
    },
    {
      "id": "worker-uuid-2",
      "type": "seo_specialist",
      "status": "working",
      "progress_percentage": 75
    }
  ],
  "tasks_created": 12
}
```

### 3. Approve Task

```typescript
POST /api/tasks/approve

Request:
{
  "taskId": "task-uuid",
  "approved": true,
  "feedback": "Looks good, proceed",
  "userId": "user-uuid"
}

Response:
{
  "success": true,
  "taskStatus": "approved",
  "willExecuteAt": "2025-11-07T14:00:00Z" // or "immediately"
}
```

### 4. Get Pending Approvals

```typescript
GET /api/tasks/pending-approvals?tenantId=xxx

Response:
{
  "tasks": [
    {
      "id": "task-uuid",
      "title": "Optimize homepage meta tags",
      "description": "Based on SEO analysis...",
      "created_by_agent": "seo_specialist",
      "swarm_execution_id": "swarm-uuid",
      "created_at": "2025-11-06T10:30:00Z",
      "estimated_effort": "30 minutes",
      "priority": 8
    }
  ]
}
```

---

## Success Metrics

### Performance Metrics

| Metric | Current (Single Agent) | Phase 1 (Parallel Tools) | Phase 3 (Swarm) |
|--------|----------------------|-------------------------|-----------------|
| Simple query (1-2 tools) | 8-12s | 3-5s | 3-5s |
| Complex task (5+ tools) | 25-40s | 8-12s | 5-8s |
| Research + Analysis | 60-120s | 30-50s | 15-30s |
| Full strategy (research + SEO + content plan) | 180-300s | 90-120s | 30-60s |

### Business Metrics

- **User Satisfaction**: Approval rate >80% for swarm-generated tasks
- **Task Completion**: >90% of approved tasks execute successfully
- **Accuracy**: <5% error rate in agent outputs
- **Cost Efficiency**: Token cost per swarm <$0.50 on average

### Technical Metrics

- **Reliability**: 99.5% swarm execution success rate
- **Scalability**: Support 10+ concurrent swarms per tenant
- **Latency**: p95 swarm initialization <2s
- **Concurrency**: Max 5 agents per swarm, 50 agents across platform

---

## Conclusion

This specification provides a complete roadmap for implementing multi-agent swarm orchestration in DreamCrew. The phased approach minimizes risk while delivering incremental value:

- **Phase 1** (Week 1): Immediate 72% speedup with minimal changes
- **Phase 3** (Week 4-5): Full swarm capabilities with parallel agents
- **Phase 4** (Week 6): Conversational updates and voice integration
- **Phase 5** (Week 7): Human-in-the-loop workflows

The system integrates seamlessly with DreamCrew's existing architecture:
- Uses existing Mastra agents with runtime context
- Stores in existing PostgreSQL database
- Leverages existing CopilotKit streaming
- Integrates with existing LiveKit voice system
- Works within existing rep room sessions

Next steps:
1. Review this spec with the team
2. Estimate development timeline
3. Begin Phase 1 implementation
4. Set up monitoring for performance benchmarks
5. Create test cases for each phase

---

**Document Status**: Ready for Implementation
**Last Updated**: November 6, 2025
**Version**: 1.0
