# Complete Shared Memory System for Agents - Comprehensive Documentation

**Date Generated:** November 6, 2025  
**Status:** Production  
**Last Updated:** REP-4423, REP-4335, REP-4325

---

## Executive Summary

This document provides complete technical specification of the shared memory system that enables agents and humans to communicate persistently within Rep Room sessions. The system uses a 3-tier architecture:

```
Frontend (React/TypeScript) 
    ↓ (POST /api/memory/ingress)
Mastra Agents Server (Node.js/TypeScript)
    ↓ (PostgreSQL queries)
Supabase/PostgreSQL Database
```

Key capabilities:
- Multi-tenant conversation isolation
- Turn-based message storage with participant attribution
- Low-latency API (≤3 second timeout, typical 100-500ms)
- Support for both voice and chat channels
- Comprehensive action/tool logging
- Stable participant identity across sessions

---

## 1. CONVERSATION STORAGE

### 1.1 Database Schema

#### Table: `agent_memory_conversations`
Primary storage for conversation metadata and context.

```sql
CREATE TABLE agent_memory_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant & Isolation
  tenant_id UUID NOT NULL,
  resource_id TEXT NOT NULL,
  rep_room_slug TEXT NOT NULL,
  session_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  
  -- Metadata
  participant_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tenant_id, resource_id, thread_id),
  FOREIGN KEY (session_id) REFERENCES rep_room_sessions(session_id)
);

-- Indexes for fast queries
CREATE INDEX idx_agent_memory_conversations_tenant_resource_thread
  ON agent_memory_conversations(tenant_id, resource_id, thread_id);
CREATE INDEX idx_agent_memory_conversations_tenant_room_session
  ON agent_memory_conversations(tenant_id, rep_room_slug, session_id);
CREATE INDEX idx_agent_memory_conversations_tenant_created
  ON agent_memory_conversations(tenant_id, created_at DESC);
```

**Resource ID Format:** `tenant_{tenantId}_reproom_{repRoomSlug}_session_{sessionId}`

Example: `tenant_550e8400-e29b-41d4-a716-446655440000_reproom_sales-01_session_session-xyz-123`

#### Table: `agent_memory_messages`
Stores individual messages with turn-based indexing.

```sql
CREATE TABLE agent_memory_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  conversation_id UUID NOT NULL REFERENCES agent_memory_conversations(id) ON DELETE CASCADE,
  
  -- Message Identity
  message_id TEXT NOT NULL UNIQUE,
  
  -- Content & Role
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  
  -- Turn-Based Indexing
  turn_index INTEGER,
  
  -- Participant Attribution
  participant_id TEXT,
  participant_kind TEXT CHECK (participant_kind IN ('human', 'agent', 'system')),
  
  -- Channel Info
  channel TEXT DEFAULT 'chat' CHECK (channel IN ('chat', 'voice', 'system')),
  
  -- Deduplication
  dedupe_hash TEXT,
  
  -- Vector Embeddings (Future)
  embedding vector(1536),
  
  -- Storage Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX idx_agent_memory_messages_conversation_id
  ON agent_memory_messages(conversation_id);
CREATE INDEX idx_agent_memory_messages_created
  ON agent_memory_messages(created_at DESC);
CREATE INDEX idx_agent_memory_messages_role
  ON agent_memory_messages(role);
CREATE INDEX idx_agent_memory_messages_turn_index
  ON agent_memory_messages(conversation_id, turn_index);
```

#### Table: `agent_memory_actions`
Logs CopilotKit tool invocations and results.

```sql
CREATE TABLE agent_memory_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key
  conversation_id UUID NOT NULL REFERENCES agent_memory_conversations(id) ON DELETE CASCADE,
  
  -- Action Context
  turn_index INTEGER,
  tool_call_id TEXT,
  action_name TEXT NOT NULL,
  
  -- Action Data
  args JSONB,
  result JSONB,
  status TEXT CHECK (status IN ('started', 'succeeded', 'failed')),
  latency_ms INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 Message Format (TypeScript)

**Ingress Message Schema:**
```typescript
interface IngressMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  participantId?: string;
  participantKind?: 'human' | 'agent';
  channel?: 'voice' | 'chat' | 'system';
  messageId?: string;
  
  // Action logging (optional)
  actionName?: string;
  actionArgs?: Record<string, unknown>;
  actionResult?: Record<string, unknown>;
  actionStatus?: 'started' | 'succeeded' | 'failed';
}
```

**Stored Message Schema:**
```typescript
interface StoredMessage {
  id: string;                    // UUID
  conversationId: string;        // UUID
  messageId: string;             // Unique message ID
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  turnIndex: number;             // Monotonically increasing per conversation
  participantId: string | null;  // Browser fingerprint or user ID
  participantKind: 'human' | 'agent' | 'system';
  channel: 'chat' | 'voice' | 'system';
  dedupeHash: string;            // SHA1 hash for deduplication
  metadata: Record<string, unknown>;
  createdAt: string;             // ISO 8601 timestamp
}
```

**Metadata Structure:**
```typescript
interface MessageMetadata {
  // Voice-specific
  transcriptSource?: 'stt' | 'manual' | 'agent';
  confidenceScore?: number;
  
  // CopilotKit-specific
  copilotKitSessionId?: string;
  copilotKitRunId?: string;
  
  // Custom attributes
  [key: string]: unknown;
}
```

---

## 2. AGENT CONTEXT & MEMORY RETRIEVAL

### 2.1 Context Window Management

When an agent spawns or reconnects, it receives memory context through:

**A. Recent Messages (Last N)**
```typescript
// Default: 20 messages
const lastMessages = 20;

// Agent gets the most recent N messages from the conversation
const contextMessages = await memory.query({
  threadId: conversationId,
  selectBy: { last: 20 }
});
```

**B. Semantic Search (Optional, not currently enabled)**
```typescript
// If pgvector configured:
const relevantMessages = await memory.query({
  threadId: conversationId,
  semantic: {
    query: "customer budget concerns",
    topK: 3,  // Return 3 most relevant
    messageRange: {
      before: 2,  // Include 2 messages before
      after: 1    // Include 1 message after
    }
  }
});
```

**C. Turn-Based Boundaries**
```typescript
// Get all messages from current turn
const turnMessages = await supabase
  .from('agent_memory_messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .eq('turn_index', currentTurnIndex)
  .order('created_at', { ascending: true });
```

### 2.2 Memory Hydration Flow

**New Agent Spawn:**
```
1. Frontend calls /api/memory/ingress (role: 'user')
2. MemoryBroker.beginTurn() creates new turn context
3. MemoryBroker.nextTurnIndex() gets turn = 1
4. Agent receives context with last 20 messages from conversation
5. Agent processes user message with full context
6. Agent responds (stored at end-of-stream)
```

**Agent Reconnect:**
```
1. Page refresh or reconnection
2. Frontend calls /api/memory/list to hydrate conversation
3. API returns all messages for this resource_id
4. Frontend renders conversation history
5. Agent receives last 20 messages from new context
6. Conversation continues with maintained context
```

### 2.3 Memory Query API

**Frontend Memory List Endpoint:**

```typescript
// GET /api/memory/list
export async function getConversationMessages(options: {
  repRoomSlug: string;
  sessionId: string;
  tenantId: string;
  participantId?: string;
  scope?: 'all' | 'mine';  // Filter by participant
  limit?: number;           // Default: 50
}): Promise<StoredMessage[]> {
  const url = new URL('/api/memory/list', window.location.origin);
  
  const response = await fetch(url, {
    headers: {
      'x-rep-room-slug': options.repRoomSlug,
      'x-session-id': options.sessionId,
      'x-tenant-id': options.tenantId,
      'x-participant-id': options.participantId || ''
    }
  });
  
  return response.json();
}
```

**Request Parameters:**
```
Headers:
  x-rep-room-slug: string      (required)
  x-session-id: string         (required)
  x-tenant-id: string          (optional, server resolves if missing)
  x-participant-id: string     (optional, for participant filtering)

Query Parameters:
  scope: 'all' | 'mine'        (default: 'all')
  threadId: string             (default: 'main_conversation' or all threads)
  limit: number                (default: 50, max context window)
```

**Response Format:**
```typescript
{
  success: boolean;
  messages: StoredMessage[];
  conversationId: string | null;
  resourceId: string;
  totalMessages: number;
}
```

---

## 3. LONG-TERM VS WORKING MEMORY

### 3.1 Short-Term Memory (Current Conversation)

**What:** Last 20-50 messages in current turn context
**Where:** Loaded into agent context window at request time
**Lifetime:** Duration of turn (seconds to minutes)
**Scope:** Per conversation

```typescript
// Agent receives in context
const memory = new Memory({
  options: {
    lastMessages: 20,  // Include 20 recent messages
    workingMemory: {
      enabled: true,
      template: `# User Profile
- Name: 
- Preferences: 
- Previous Topics: 
- Conversation Context:
`
    }
  }
});
```

### 3.2 Long-Term Memory (Conversation History)

**What:** All messages ever sent in this conversation
**Where:** PostgreSQL (agent_memory_messages table)
**Lifetime:** Indefinite (retention policy per tenant)
**Scope:** Per conversation, cross-participant visible

```typescript
// Persistent storage
const { data } = await supabase
  .from('agent_memory_messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .order('created_at', { ascending: true });

// Accessible across multiple agent generations
// Enables continuity even if agent instance restarted
```

### 3.3 Memory Persistence Strategy

**Ingress Path (Write):**
```
1. User/agent sends message
2. POST /api/memory/ingress with message content
3. MemoryBroker.writeMessage() inserts into agent_memory_messages
4. Deduplication check via dedupe_hash
5. Turn index auto-incremented
6. Response: { ok: true, turnContext: { conversationId, turnIndex } }
```

**List Path (Read):**
```
1. Frontend needs history
2. GET /api/memory/list with resource_id
3. Query agent_memory_conversations by resource_id
4. Get all messages for that conversation_id
5. Filter by participant if requested
6. Order by created_at (ascending)
7. Return paginated results
```

### 3.4 Memory Cleanup/Archival

Currently: **No automatic cleanup** - all messages retained indefinitely

Future considerations:
```typescript
// Potential archival strategy
const archiveOldMessages = async (conversationId: string, olderThan: Date) => {
  // Move messages older than threshold to archive table
  const { data } = await supabase
    .from('agent_memory_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .lt('created_at', olderThan.toISOString());
  
  // Insert into agent_memory_messages_archive
  // Delete from agent_memory_messages
};
```

---

## 4. MEMORY INDEXING

### 4.1 Vector Embeddings (Pgvector - Not Currently Active)

**Schema:**
```sql
ALTER TABLE agent_memory_messages ADD COLUMN embedding vector(1536);

CREATE INDEX ON agent_memory_messages USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Future Implementation:**
```typescript
// Generate embeddings using OpenAI
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: message.content
});

// Store embedding for semantic search
await supabase
  .from('agent_memory_messages')
  .update({ embedding: embedding.data[0].embedding })
  .eq('id', messageId);

// Semantic retrieval
const { data: similarMessages } = await supabase.rpc(
  'match_memory_messages',
  {
    query_embedding: queryEmbedding,
    similarity_threshold: 0.7,
    match_count: 5,
    conversation_id: conversationId
  }
);
```

### 4.2 Full-Text Search Implementation

**Database Setup:**
```sql
-- Create full-text search index
CREATE INDEX idx_agent_memory_messages_content_fts
ON agent_memory_messages 
USING GIN (to_tsvector('english', content));
```

**Query Pattern:**
```typescript
// Search across conversation history
const { data: searchResults } = await supabase
  .from('agent_memory_messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .ilike('content', `%${searchTerm}%`)  // Simple substring search
  .order('created_at', { ascending: false });
```

### 4.3 Turn Index for Message Ordering

**Purpose:** Maintain conversation turn structure for replay and analysis

```typescript
// Turn Index Atomic Generation
const { data: nextIndex } = await supabase.rpc(
  'agent_memory_next_turn_index',
  { p_conv_id: conversationId }
);

// All messages in a turn share same turn_index
// Turn Index = 1 for first user message + all related agent responses
// Turn Index = 2 for second user message + all related agent responses
```

### 4.4 Deduplication Hash

**Purpose:** Prevent duplicate message storage from network retries

```typescript
function dedupeHash(message: {
  conversationId: string;
  content: string;
  role: string;
  participantId?: string;
}): string {
  const contents = {
    conversationId: message.conversationId,
    content: message.content,
    role: message.role,
    participantId: message.participantId
  };
  
  return crypto
    .createHash('sha1')
    .update(JSON.stringify(contents))
    .digest('hex');
}

// Store in dedupe_hash column
// Check before insert to prevent duplicates
```

---

## 5. MASTRA MEMORY INTEGRATION

### 5.1 Mastra Configuration

**Memory Instance Creation:**
```typescript
// mastra-agents/lib/memory/memory-config.ts
import { Memory } from "@mastra/memory";
import { PostgresStore } from "@mastra/pg";

export function createMemoryInstance(): Memory {
  const memory = new Memory({
    storage: new PostgresStore({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    }),
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        template: `# User Profile
- Name:
- Preferences:
- Previous Topics:
- Conversation Context:
`
      },
      threads: {
        generateTitle: true
      }
    }
  });
  
  return memory;
}
```

### 5.2 Mastra Memory Views

**Compatibility Layer (Mastra → Agent Memory):**

```sql
-- Create mapping views for Mastra compatibility
CREATE OR REPLACE VIEW mastra_memory_threads AS
SELECT
  id,
  resource_id,
  COALESCE((metadata->>'title'), CONCAT('Rep Room - ', rep_room_slug)) as title,
  metadata,
  created_at,
  updated_at
FROM agent_memory_conversations;

CREATE OR REPLACE VIEW mastra_memory_messages AS
SELECT
  m.id,
  m.conversation_id as thread_id,
  m.role,
  m.content,
  m.metadata,
  m.created_at
FROM agent_memory_messages m
JOIN agent_memory_conversations c ON m.conversation_id = c.id;
```

### 5.3 Agent-Side Memory Retrieval

**Pattern: Query → Memory Load → Process**

```typescript
// Inside agent handler
import { Memory } from "@mastra/memory";

export const salesAgent = new Agent({
  async onMessage(message: Message, { memory }: Context) {
    // Get conversation context
    const resourceId = buildResourceId({
      tenantId: context.tenantId,
      repRoomSlug: context.repRoomSlug,
      sessionId: context.sessionId
    });
    
    // Query last 20 messages
    const result = await memory.query({
      threadId: resourceId,
      selectBy: { last: 20 }
    });
    
    // Inject into system prompt
    const systemPrompt = `
You are a sales agent with the following context:

${result.messages.map(m => 
  `${m.role.toUpperCase()}: ${m.content}`
).join('\n')}

Current message: ${message.content}
`;
    
    // Process with context
    const response = await generateResponse(systemPrompt, message);
    
    // Store assistant response
    await memory.addMessage({
      role: 'assistant',
      content: response
    });
  }
});
```

### 5.4 Memory Configuration Per Agent Type

```typescript
// Different memory contexts for different agent types
export const MEMORY_TEMPLATES = {
  sales: {
    template: `# Sales Conversation Context
- Lead Status: 
- Interest Level: 
- Budget Range: 
- Timeline: 
- Pain Points: 
- Previous Interactions: 
`,
    lastMessages: 25
  },
  support: {
    template: `# Support Conversation Context
- Issue Type: 
- Severity: 
- Previous Solutions Tried: 
- Customer Satisfaction: 
- Follow-up Required: 
`,
    lastMessages: 30
  },
  general: {
    template: `# General Conversation Context
- Topics Discussed: 
- User Preferences: 
- Conversation Tone: 
- Key Information: 
`,
    lastMessages: 20
  }
};
```

---

## 6. PARTICIPANT ATTRIBUTION

### 6.1 Participant ID System

**Generation (Frontend):**
```typescript
// src/utils/memoryHelpers.ts
function getStableHumanParticipantId(sessionId: string): string {
  try {
    const browserId = localStorage.getItem('browser_fingerprint') || 'anon';
    
    // Add random suffix for anonymous users
    if (browserId === 'anon') {
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      return `user-anon-${sessionId}-${randomSuffix}`;
    }
    
    return `user-${browserId}-${sessionId}`;
  } catch {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `user-anon-${sessionId}-${randomSuffix}`;
  }
}

function getAgentParticipantId(repRoomSlug: string): string {
  return `agent-${repRoomSlug || 'unknown'}`;
}
```

**Format Conventions:**
```
Human participants: user-{browserId}-{sessionId}-{randomSuffix}
Agent participants:  agent-{repRoomSlug}
System messages:     system
Tool messages:       tool-{toolName}
```

### 6.2 Multi-Participant Conversations

**Participant Count Tracking:**
```sql
-- Automatic trigger maintains participant count
CREATE TRIGGER update_participant_count
AFTER INSERT ON agent_memory_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_participant_count();

-- Stored function
CREATE OR REPLACE FUNCTION update_conversation_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE agent_memory_conversations
  SET participant_count = (
    SELECT COUNT(DISTINCT participant_id)
    FROM agent_memory_messages
    WHERE conversation_id = NEW.conversation_id
      AND participant_id IS NOT NULL
  ),
  updated_at = NOW()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Participant Filtering:**
```typescript
// Get only messages from specific participant
const { data } = await supabase
  .from('agent_memory_messages')
  .select('*')
  .eq('conversation_id', conversationId)
  .eq('participant_id', currentParticipantId)
  .order('created_at', { ascending: true });
```

### 6.3 Message Attribution Display

```typescript
interface AttributedMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  participantId: string;
  participantKind: 'human' | 'agent';
  isCurrentUser: boolean;
  senderLabel: string;  // "You" or "Participant 2"
  timestamp: string;
}

// Frontend rendering
function formatMessageDisplay(msg: AttributedMessage, currentParticipantId: string): string {
  const sender = msg.participantId === currentParticipantId 
    ? 'You' 
    : `Participant - ${msg.participantId.substring(0, 8)}`;
    
  return `[${msg.timestamp}] ${sender}: ${msg.content}`;
}
```

---

## 7. API ENDPOINTS REFERENCE

### 7.1 Memory Ingress Endpoint

**Endpoint:** `POST /api/memory/ingress`

**Purpose:** Store messages from users and agents

**Headers:**
```
Content-Type: application/json
x-rep-room-slug: string           (required)
x-session-id: string              (required)
x-tenant-id: string               (optional, server resolves if missing)
x-participant-id: string          (optional, auto-detected from body)
x-agent-id: string                (optional, context)
```

**Request Body:**
```json
{
  "role": "user|assistant|system|tool",
  "content": "message content",
  "participantId": "user-browser-session-abc123",
  "participantKind": "human|agent",
  "channel": "chat|voice|system",
  "messageId": "msg_1234567890_abc123def456",
  "actionName": "web_search",
  "actionArgs": {"query": "example"},
  "actionResult": {"results": []},
  "actionStatus": "succeeded"
}
```

**Response (Success):**
```json
{
  "ok": true,
  "turnContext": {
    "conversationId": "uuid",
    "turnIndex": 1,
    "resourceId": "tenant_xxx_reproom_yyy_session_zzz"
  }
}
```

**Response (Error):**
```json
{
  "error": true,
  "message": "ingress error: ...",
  "context": {
    "tenantId": "...",
    "repRoomSlug": "...",
    "sessionId": "...",
    "timestamp": "2025-11-06T..."
  }
}
```

**Error Codes:**
```
400 - Missing required headers
500 - Database error, timeout, or invalid context
```

**Implementation Location:**
- `/home/user/ng53116-dc2-core-platform-repo-v07/mastra-agents/app/api/memory/ingress/route.ts`

### 7.2 Memory List Endpoint

**Endpoint:** `GET /api/memory/list`

**Purpose:** Retrieve conversation history for frontend hydration

**Headers:**
```
x-rep-room-slug: string           (required)
x-session-id: string              (required)
x-tenant-id: string               (optional, server resolves if missing)
x-participant-id: string          (optional, for filtering)
```

**Query Parameters:**
```
scope: 'all' | 'mine'             (default: 'all')
threadId: string                  (default: all threads)
limit: number                     (default: 50)
filter: 'all' | 'mine'            (alias for scope)
```

**Response:**
```json
{
  "success": true,
  "messages": [
    {
      "messageId": "msg_...",
      "role": "user|assistant|system|tool",
      "content": "...",
      "createdAt": "2025-11-06T...",
      "participantId": "user-...",
      "participantKind": "human|agent",
      "channel": "chat|voice|system",
      "turnIndex": 1,
      "metadata": {}
    }
  ],
  "conversationId": "uuid",
  "resourceId": "tenant_xxx_reproom_yyy_session_zzz",
  "totalMessages": 42
}
```

**Implementation Location:**
- `/home/user/ng53116-dc2-core-platform-repo-v07/mastra-agents/app/api/memory/list/route.ts`

### 7.3 Client-Side Memory Helpers

**Frontend API Wrapper:**

```typescript
// src/utils/memoryHelpers.ts
import { PostMemoryOptions } from './memoryHelpers';

export async function postMemoryMessage(options: PostMemoryOptions): Promise<boolean> {
  const {
    role,
    content,
    messageId,
    participantId,
    sessionId,
    repRoomSlug,
    tenantId,
    participantKind,
    maxRetries = 3,
    retryDelay = 1000,
    enableGracefulDegradation = true
  } = options;
  
  // Retry logic with exponential backoff
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const endpoint = getMemoryIngressEndpoint();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-rep-room-slug': repRoomSlug,
          'x-session-id': sessionId,
          'x-participant-id': participantId,
          ...(tenantId && { 'x-tenant-id': tenantId })
        },
        body: JSON.stringify({
          role,
          content,
          messageId,
          participantId,
          participantKind
        })
      });
      
      if (response.ok) return true;
      
      if (response.status >= 500 && attempt < maxRetries) {
        // Retry on server error
        const delay = Math.min(retryDelay * Math.pow(2, attempt), 5000);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      if (enableGracefulDegradation) {
        return false;  // Continue conversation without memory
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt === maxRetries) {
        if (enableGracefulDegradation) return false;
        throw error;
      }
    }
  }
  
  return false;
}

// Endpoint resolution with production fallback
export function getMemoryIngressEndpoint(): string {
  const baseUrl = (import.meta as any).env.VITE_MEMORY_API_BASE_URL;
  
  if (baseUrl && typeof baseUrl === 'string' && baseUrl.trim() !== '') {
    return `${baseUrl.trim()}/api/memory/ingress`;
  }
  
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '/api/memory/ingress';  // Relative URL (proxied)
  }
  
  return 'https://mastra-agents-ten.vercel.app/api/memory/ingress';
}
```

---

## 8. ARCHITECTURE DIAGRAMS

### 8.1 Message Flow Diagram

```
CHAT MESSAGE FLOW:
─────────────────

User Types Message in Chat UI
        ↓
React Component captures input
        ↓
postMemoryMessage({ 
  role: 'user',
  content: 'Hello',
  participantId: 'user-...'
})
        ↓
POST /api/memory/ingress (mastra-agents)
        ↓
MemoryBroker.beginTurn(contextHeaders)
        ├─→ Ensure conversation exists
        ├─→ Get next turn index (atomic RPC)
        └─→ Return { conversationId, turnIndex }
        ↓
MemoryBroker.writeMessage(turnContext, messagePayload)
        ├─→ Generate message ID
        ├─→ Compute dedupe hash
        ├─→ Insert into agent_memory_messages
        └─→ Return success
        ↓
Response: { ok: true, turnContext: {...} }
        ↓
CopilotKit receives message, processes it
        ↓
Agent generates response
        ↓
postMemoryMessage({ 
  role: 'assistant',
  content: 'Response...',
  participantId: 'agent-...'
})
        ↓
POST /api/memory/ingress (mastra-agents)
        ↓
MemoryBroker.ensureConversation() (already exists)
        ↓
MemoryBroker.nextTurnIndex() (get current = 1)
        ↓
MemoryBroker.writeMessage(turnContext, messagePayload)
        ↓
Message stored with same turnIndex as user message
        ↓
Response: { ok: true, ... }
```

### 8.2 System Architecture

```
┌─────────────────────────────────────┐
│      Frontend (React/Vite)          │
│   Port 8080 / 5173 (dev)            │
│                                     │
│  ┌─ ConversationControls.tsx        │
│  ├─ UnifiedVoiceContext.tsx         │
│  └─ CopilotKitConversationFlow.tsx  │
│                                     │
│  Uses: postMemoryMessage()          │
│        getMemoryListEndpoint()      │
└────────────┬────────────────────────┘
             │
             │ POST /api/memory/ingress
             │ GET /api/memory/list
             │
             ↓
┌─────────────────────────────────────┐
│    Mastra Agents (Next.js)          │
│    Port 3000 (dev) / Vercel (prod)  │
│                                     │
│  ┌─ app/api/memory/ingress/...     │
│  ├─ app/api/memory/list/...        │
│  ├─ lib/memory/broker.ts           │
│  └─ lib/memory/supabase.ts         │
│                                     │
│  ┌─ lib/agents/sales-agent.ts      │
│  ├─ lib/agents/support-agent.ts    │
│  └─ lib/agents/general-agent.ts    │
└────────────┬────────────────────────┘
             │
             │ SQL INSERT/SELECT
             │
             ↓
┌─────────────────────────────────────┐
│   Supabase/PostgreSQL               │
│                                     │
│  ┌─ agent_memory_conversations    │
│  ├─ agent_memory_messages         │
│  ├─ agent_memory_actions          │
│  └─ RPC functions                  │
│     - agent_memory_next_turn_index │
│     - match_memory_messages (TODO) │
└─────────────────────────────────────┘

CROSS-CUTTING CONCERNS:
─────────────────────
✓ Tenant Isolation: resource_id includes tenant_id
✓ RLS Policies: Row-level security on all tables
✓ CORS: Headers configured for cross-origin
✓ Timeouts: 3s for write, 2s for read
✓ Deduplication: SHA1 hash prevents duplicate storage
✓ Retries: Client-side exponential backoff
```

### 8.3 Conversation State Machine

```
CONVERSATION LIFECYCLE:
──────────────────────

[NO CONVERSATION]
        ↓
        │ First user message
        ↓
[CONVERSATION CREATED]
  ├─ resource_id: tenant_xxx_reproom_yyy_session_zzz
  ├─ thread_id: main_conversation
  ├─ turn_index: 0
  └─ participant_count: 1
        ↓
        │ Turn 1:
        │ ├─ User message (turn_index: 1)
        │ └─ Agent response (turn_index: 1)
        ↓
[FIRST TURN COMPLETE]
  └─ participant_count: 2
        ↓
        │ Turn 2:
        │ ├─ User message (turn_index: 2)
        │ ├─ Tool invocation (turn_index: 2)
        │ └─ Agent response (turn_index: 2)
        ↓
[MULTIPLE TURNS]
        ↓
        │ Page refresh
        ↓
[HYDRATION]
  ├─ Frontend calls GET /api/memory/list
  ├─ Loads all previous messages
  ├─ Agent gets last 20 messages
  └─ Conversation continues with turn_index: N+1
        ↓
[PERSISTENT HISTORY]
  └─ Available indefinitely (retention policy)
```

---

## 9. COMPLETE CODE EXAMPLES

### 9.1 Frontend: Storing a Message

```typescript
// src/components/rep-room/ConversationControls.tsx
import { postMemoryMessage } from '../utils/memoryHelpers';

export async function handleUserMessage(content: string, context: {
  repRoomSlug: string;
  sessionId: string;
  tenantId?: string;
  participantId: string;
}) {
  try {
    // Store in memory
    const success = await postMemoryMessage({
      role: 'user',
      content,
      messageId: generateMessageId(),
      participantId: context.participantId,
      sessionId: context.sessionId,
      repRoomSlug: context.repRoomSlug,
      tenantId: context.tenantId,
      participantKind: 'human',
      maxRetries: 3,
      enableGracefulDegradation: true
    });
    
    if (!success) {
      console.warn('Failed to store message, but conversation continues');
    }
    
    // Send to agent
    sendToAgent(content);
  } catch (error) {
    console.error('Error handling message:', error);
  }
}
```

### 9.2 Backend: Processing Ingress

```typescript
// mastra-agents/app/api/memory/ingress/route.ts
import { MemoryBroker } from '../../../lib/memory/broker';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { role, content, participantId, participantKind, channel } = body;
  
  const contextHeaders = {
    repRoomSlug: req.headers.get('x-rep-room-slug') || 'unknown',
    sessionId: req.headers.get('x-session-id') || 'unknown',
    tenantId: resolveTenantId(req),  // Smart resolution
    agentId: req.headers.get('x-agent-id') || 'unknown'
  };
  
  const memoryBroker = new MemoryBroker();
  
  // Handle new user turn
  if (role === 'user') {
    const turnContext = await memoryBroker.beginTurn(contextHeaders);
    
    if (participantId) {
      await memoryBroker.addParticipant(
        turnContext.conversationId,
        participantId,
        participantKind || 'human'
      );
    }
    
    await memoryBroker.writeMessage(turnContext, {
      role: 'user',
      text: content,
      participantId,
      participantKind: participantKind || 'human',
      channel: channel || 'chat'
    });
    
    return Response.json({ ok: true, turnContext });
  }
  
  // Handle assistant/system messages
  const { id: conversationId } = await memoryBroker.ensureConversation(contextHeaders);
  const turnIndex = Math.max(0, await memoryBroker.nextTurnIndex(conversationId) - 1);
  
  await memoryBroker.writeMessage(
    { resourceId: '', conversationId, turnIndex },
    {
      role: role === 'tool' ? 'system' : role,
      text: content,
      participantId,
      participantKind: participantKind || 'agent',
      channel: channel || 'chat'
    }
  );
  
  return Response.json({ ok: true });
}
```

### 9.3 Agent: Loading Context

```typescript
// mastra-agents/lib/agents/sales-agent.ts
import { Memory } from "@mastra/memory";
import { createMemoryForAgentType } from '../memory/memory-config';

export async function handleSalesMessage(
  userMessage: string,
  context: {
    conversationId: string;
    repRoomSlug: string;
    tenantId: string;
  }
) {
  // Create memory instance
  const memory = createMemoryForAgentType('sales');
  
  // Build resource ID (matches frontend)
  const resourceId = buildResourceId({
    tenantId: context.tenantId,
    repRoomSlug: context.repRoomSlug,
    sessionId: context.sessionId
  });
  
  // Query conversation history
  const result = await memory.query({
    threadId: resourceId,
    selectBy: { last: 25 }  // Sales agents get 25 messages
  });
  
  // Build system prompt with context
  const contextMessages = result.messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');
  
  const systemPrompt = `You are a sales agent.
  
CONVERSATION HISTORY:
${contextMessages}

Current message from customer: ${userMessage}

Focus on: lead qualification, objection handling, closing techniques.
`;
  
  // Generate response using OpenAI or Claude
  const response = await generateResponse(systemPrompt, userMessage);
  
  // Store response in memory
  await memory.addMessage({
    role: 'assistant',
    content: response
  });
  
  return response;
}
```

---

## 10. TROUBLESHOOTING & OBSERVABILITY

### 10.1 Key Logs to Monitor

```
Frontend:
  🧠 Memory Helper: Posting message
  ⚠️ Memory Helper: HTTP error on attempt
  ✅ Memory Helper: Successfully stored message
  🛡️ Memory Helper: Graceful degradation

Backend:
  🧠 Memory Ingress: Processing user message
  🔄 Memory Ingress: Beginning turn for user message
  💾 Memory Ingress: Writing user message to memory
  ✅ Memory Ingress: Successfully stored message
  🚨 Memory: REP-4909: Message insert TIMEOUT

Database:
  [Memory] Conversation already exists
  [Memory] REP-4335D: Participant tracking handled by database
  [Memory] Message saved successfully
```

### 10.2 Metrics to Track

```
Response Times:
  - Memory ingress latency (p50, p95, p99): Should be <500ms
  - Memory list latency: Should be <300ms
  - Database query time: Should be <250ms
  
Success Rates:
  - Message storage success rate: Should be >99%
  - Memory retrieval success rate: Should be 100%
  - Conversation creation success: Should be 100%

Errors:
  - Timeout errors: Should be <1%
  - Duplicate key errors: Should be <0.1%
  - Database connection errors: Should be 0%
```

### 10.3 Common Issues

**Issue:** Messages not storing
```
Root Causes:
  1. tenantId resolves to "unknown" → UUID validation fails
  2. Timeout (>3 seconds) → graceful degradation
  3. Network error → retry logic exhausted
  
Solution:
  - Check x-tenant-id header or environment variable
  - Monitor server response times
  - Check Supabase connection
```

**Issue:** Partial assistant messages stored
```
Root Cause: CopilotKit streaming not complete
  
Solution:
  - Ensure end-of-stream detection in CopilotKitConversationFlow
  - Check isLoading state transition
  - Scan for last TextMessage with Role.Assistant
```

**Issue:** Participant count wrong
```
Root Cause: Manual participant increment (deprecated)
  
Solution:
  - Database trigger now auto-calculates with DISTINCT count
  - No manual increments needed
  - Verify trigger exists: update_conversation_participant_count
```

---

## 11. SECURITY CONSIDERATIONS

### 11.1 Tenant Isolation

All queries include tenant_id:
```sql
-- All reads filtered by tenant
SELECT * FROM agent_memory_messages m
JOIN agent_memory_conversations c ON m.conversation_id = c.id
WHERE c.tenant_id = $1;  -- Always filter by tenant_id
```

Resource ID includes tenant:
```
tenant_{tenantId}_reproom_{repRoomSlug}_session_{sessionId}
```

### 11.2 Participant Privacy

Messages include participant attribution but not PII:
```
participant_id: 'user-browserfingerprint-sessionid-suffix'
               (NOT email, name, or other PII)
```

### 11.3 API Security

- Service role key required for write operations
- RLS policies enforce tenant boundaries
- CORS headers configured appropriately
- No sensitive data in logs

---

## 12. ENVIRONMENT VARIABLES

**Frontend (.env / .env.local):**
```
VITE_MEMORY_API_BASE_URL=https://mastra-agents-ten.vercel.app  # Production
# VITE_MEMORY_API_BASE_URL=                                     # Local dev (commented out)
```

**Backend (mastra-agents/.env):**
```
SUPABASE_URL=https://kjkehonxatogcwrybslr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://user:pass@host/db
NEXT_PUBLIC_SUPABASE_URL=https://kjkehonxatogcwrybslr.supabase.co
```

---

## 13. FILE REFERENCE

**Core Memory Files:**
```
/mastra-agents/app/lib/memory/
  ├─ broker.ts              (MemoryBroker class - main logic)
  ├─ types.ts               (TypeScript interfaces)
  ├─ id.ts                  (Resource ID building)
  └─ supabase.ts            (Supabase client)

/mastra-agents/app/api/memory/
  ├─ ingress/route.ts       (POST /api/memory/ingress)
  └─ list/route.ts          (GET /api/memory/list)

/src/
  ├─ utils/memoryHelpers.ts (Frontend API wrapper)
  └─ hooks/useSharedRoomMessages.ts (React hook for memory)

/supabase/migrations/
  ├─ 20250901174000_add_shared_agent_memory_tables.sql
  └─ 20250905_create_mastra_memory_tables.sql
```

---

## 14. RELATED DOCUMENTATION

- REP-4335: Unified conversation memory system
- REP-4325: Shared room chat with participant attribution
- REP-4305: Memory ingress API production routing
- REP-4308: Assistant message partial content fix
- REP-4423: Memory ingress concurrency fix
- REP-4343: Production localhost API security fix

---

**Document Status:** ✅ Complete  
**Last Verified:** November 6, 2025  
**Maintainers:** Platform Team, AI Developers
