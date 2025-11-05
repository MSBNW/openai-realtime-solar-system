# DreamCrew Multi-Agent Orchestration Implementation Spec

## Executive Summary

This document specifies how to implement real-time multi-agent orchestration with MCP tool integration in DreamCrew, enabling conversational business automation like "I need more revenue" → AI interviews user → crafts strategy → implements actions over time.

---

## What We Learned from This Experiment

### ✅ What Worked
1. **MCP Integration Pattern** - Connecting external tools via Model Context Protocol
2. **Task Analysis** - Breaking down natural language into agent requirements
3. **UI Visualization** - Showing agent coordination and tool usage
4. **Persistent Connections** - File-based MCP connection storage
5. **Tool Response Parsing** - Handling MCP's content array format

### ❌ What Didn't Work
1. **Mock Orchestration** - Our orchestration server just created metadata, not real agents
2. **No Live Updates** - UI is static after initial display
3. **Single AI Instance** - Only one Claude doing work despite showing multiple "agents"
4. **No Async Execution** - Everything sequential, not parallel

### 🎯 What's Actually Needed
**Real concurrent AI agents with live status streaming**

---

## Architecture for DreamCrew

### Stack Integration

```
┌─────────────────────────────────────────────────────┐
│ DreamCrew SaaS (Multi-Tenant)                       │
├─────────────────────────────────────────────────────┤
│ Frontend: CopilotKit AG-UI + LiveKit Voice          │
│ - Conversational UI with real-time agent status     │
│ - Voice input via Deepgram/ElevenLabs              │
│ - Live agent activity feed                          │
├─────────────────────────────────────────────────────┤
│ Backend: Mastra Framework + Supabase                │
│ - Tenant isolation (Row Level Security)            │
│ - Real-time subscriptions for agent updates        │
│ - Background job processing (pgboss or inngest)    │
├─────────────────────────────────────────────────────┤
│ NEW: Multi-Agent Orchestration Layer                │
│ - Agent Spawner: Concurrent Claude API calls       │
│ - Agent Coordinator: Task decomposition & routing  │
│ - Status Streamer: Real-time progress via Supabase │
│ - Result Aggregator: Combines agent outputs        │
├─────────────────────────────────────────────────────┤
│ NEW: MCP Integration Layer                          │
│ - Connection Manager: Per-tenant MCP configs       │
│ - Tool Registry: Available MCP servers             │
│ - Execution Engine: Route tool calls to servers    │
├─────────────────────────────────────────────────────┤
│ Data Layer: Supabase PostgreSQL                     │
│ - tenants, users, subscriptions                    │
│ - agent_swarms, agent_instances, agent_status      │
│ - mcp_connections, tool_executions                 │
│ - conversation_history, strategy_documents         │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema (Supabase)

```sql
-- Agent Swarms (per conversation)
CREATE TABLE agent_swarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  conversation_id UUID NOT NULL,
  task TEXT NOT NULL,
  topology TEXT NOT NULL, -- 'mesh', 'hierarchical', 'pipeline'
  status TEXT NOT NULL, -- 'initializing', 'running', 'completed', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Individual Agent Instances
CREATE TABLE agent_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swarm_id UUID NOT NULL REFERENCES agent_swarms(id),
  agent_type TEXT NOT NULL, -- 'researcher', 'analyzer', 'coder', 'writer', etc.
  task TEXT NOT NULL,
  status TEXT NOT NULL, -- 'spawned', 'working', 'completed', 'failed'
  progress INTEGER DEFAULT 0, -- 0-100
  current_action TEXT,
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MCP Connections (per tenant)
CREATE TABLE mcp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  server_id TEXT NOT NULL, -- 'tavily', 'wordpress', 'gmail', etc.
  config JSONB NOT NULL,
  credentials JSONB NOT NULL, -- encrypted
  status TEXT NOT NULL, -- 'connected', 'disconnected', 'error'
  tools JSONB, -- cached tool list
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, server_id)
);

-- Tool Executions (audit trail)
CREATE TABLE tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agent_instances(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  tool_name TEXT NOT NULL,
  input JSONB NOT NULL,
  output JSONB,
  success BOOLEAN,
  error TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE agent_swarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (tenant isolation)
CREATE POLICY tenant_isolation ON agent_swarms
  USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY tenant_isolation ON agent_instances
  USING (swarm_id IN (SELECT id FROM agent_swarms WHERE tenant_id = auth.jwt() ->> 'tenant_id'));

CREATE POLICY tenant_isolation ON mcp_connections
  USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY tenant_isolation ON tool_executions
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

---

## Core Components

### 1. MCP Connection Manager (`/lib/mcp/connection-manager.ts`)

**Purpose:** Manage tenant-specific MCP server connections

```typescript
interface MCPConnectionManager {
  // Connect to MCP server for tenant
  connect(tenantId: string, serverId: string, config: MCPConfig): Promise<void>;

  // Disconnect
  disconnect(tenantId: string, serverId: string): Promise<void>;

  // Get all tools available to tenant
  getAvailableTools(tenantId: string): Promise<MCPTool[]>;

  // Execute tool call
  executeTool(tenantId: string, toolName: string, params: any): Promise<any>;

  // Store/retrieve connection configs
  saveConnection(tenantId: string, serverId: string, config: MCPConfig): Promise<void>;
  loadConnections(tenantId: string): Promise<MCPConnection[]>;
}
```

**Key Features:**
- Tenant isolation via Supabase RLS
- Auto-reconnect on app startup
- Credential encryption (Supabase Vault)
- Support both stdio (local) and SSE (remote) transports
- Parse MCP response format: `{ content: [{ type: 'text', text: '...' }] }`

**Implementation Notes:**
- Store credentials in `mcp_connections.credentials` (encrypted column)
- Cache tools in `mcp_connections.tools` JSONB field
- Use connection pooling for stdio processes

---

### 2. Agent Orchestrator (`/lib/agents/orchestrator.ts`)

**Purpose:** Spawn and coordinate real concurrent AI agents

```typescript
interface AgentOrchestrator {
  // Orchestrate task across multiple agents
  orchestrate(request: OrchestrationRequest): Promise<SwarmExecution>;

  // Spawn individual agent
  spawnAgent(swarmId: string, agentType: string, task: string): Promise<AgentInstance>;

  // Get real-time status
  getStatus(swarmId: string): Promise<SwarmStatus>;

  // Stop execution
  stop(swarmId: string): Promise<void>;
}

interface OrchestrationRequest {
  tenantId: string;
  conversationId: string;
  task: string;
  agentTypes?: string[]; // auto-select if omitted
  parallel: boolean; // true = concurrent, false = sequential
  mcpTools: MCPTool[]; // available tools
}

interface SwarmExecution {
  swarmId: string;
  agents: AgentInstance[];
  status: 'running' | 'completed' | 'failed';
  results: any[];
}
```

**Key Features:**
- **Real concurrent execution:** Use `Promise.all()` for parallel agents
- **Live status updates:** Write to `agent_instances.status` via Supabase realtime
- **Task decomposition:** Smart agent selection based on task keywords
- **Result aggregation:** Combine outputs from all agents

**Implementation Pattern:**

```typescript
async orchestrate(request: OrchestrationRequest): Promise<SwarmExecution> {
  // 1. Create swarm record
  const swarm = await createSwarm(request);

  // 2. Select agent types
  const agentTypes = request.agentTypes || this.selectAgents(request.task);

  // 3. Spawn agents concurrently
  const agentPromises = agentTypes.map(type =>
    this.spawnAndExecuteAgent(swarm.id, type, request)
  );

  // 4. Execute in parallel or sequential
  const results = request.parallel
    ? await Promise.all(agentPromises)
    : await this.sequential(agentPromises);

  // 5. Aggregate results
  return this.aggregateResults(swarm.id, results);
}

async spawnAndExecuteAgent(swarmId: string, agentType: string, request: OrchestrationRequest) {
  // Create agent record
  const agent = await supabase.from('agent_instances').insert({
    swarm_id: swarmId,
    agent_type: agentType,
    task: this.decomposeTask(request.task, agentType),
    status: 'spawned'
  }).select().single();

  // Update status: working
  await this.updateAgentStatus(agent.id, 'working', 'Initializing...');

  // Execute with real Claude API call
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const messages = [
    {
      role: 'user',
      content: this.buildAgentPrompt(agentType, request.task, request.mcpTools)
    }
  ];

  let conversationTurns = 0;
  const maxTurns = 10;

  // Agentic loop with live updates
  while (conversationTurns < maxTurns) {
    // Update status
    await this.updateAgentStatus(agent.id, 'working', `Turn ${conversationTurns + 1}...`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 8096,
      messages,
      tools: request.mcpTools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema
      }))
    });

    // Check if done
    const toolUses = response.content.filter(b => b.type === 'tool_use');
    if (toolUses.length === 0) {
      // Agent finished
      const finalText = response.content.find(b => b.type === 'text')?.text;
      await this.updateAgentStatus(agent.id, 'completed', 'Task completed', { result: finalText });
      return { agentId: agent.id, result: finalText };
    }

    // Execute tools and continue
    messages.push({ role: 'assistant', content: response.content });

    const toolResults = [];
    for (const toolUse of toolUses) {
      await this.updateAgentStatus(agent.id, 'working', `Using tool: ${toolUse.name}`);

      const result = await this.executeTool(request.tenantId, toolUse.name, toolUse.input);

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result)
      });
    }

    messages.push({ role: 'user', content: toolResults });
    conversationTurns++;
  }
}

async updateAgentStatus(agentId: string, status: string, action: string, result?: any) {
  await supabase.from('agent_instances').update({
    status,
    current_action: action,
    result: result || null,
    updated_at: new Date().toISOString()
  }).eq('id', agentId);
}
```

---

### 3. Frontend: Real-Time Agent Status Display

**CopilotKit Integration:**

```tsx
// components/AgentSwarmDisplay.tsx
'use client';

import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';

export function AgentSwarmDisplay({ swarmId }: { swarmId: string }) {
  // Subscribe to real-time agent updates
  const agents = useSupabaseRealtime('agent_instances', {
    filter: `swarm_id=eq.${swarmId}`
  });

  return (
    <div className="space-y-4">
      <h3>🤖 Active Agents ({agents.length})</h3>

      {agents.map(agent => (
        <div key={agent.id} className="border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <StatusIndicator status={agent.status} />
            <span className="font-semibold">{agent.agent_type}</span>
          </div>

          <div className="text-sm text-gray-600 mt-2">
            Task: {agent.task}
          </div>

          {agent.current_action && (
            <div className="text-sm text-blue-600 mt-2 animate-pulse">
              🔄 {agent.current_action}
            </div>
          )}

          {agent.status === 'completed' && agent.result && (
            <details className="mt-2">
              <summary>View Result</summary>
              <pre className="text-xs bg-gray-100 p-2 rounded mt-2">
                {JSON.stringify(agent.result, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ))}
    </div>
  );
}

// Hook for Supabase Realtime
function useSupabaseRealtime(table: string, options: { filter: string }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: options.filter
        },
        (payload) => {
          // Update local state based on change
          if (payload.eventType === 'INSERT') {
            setData(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setData(prev => prev.map(item =>
              item.id === payload.new.id ? payload.new : item
            ));
          } else if (payload.eventType === 'DELETE') {
            setData(prev => prev.filter(item => item.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Initial fetch
    supabase.from(table).select('*').then(({ data }) => setData(data || []));

    return () => { channel.unsubscribe(); };
  }, [table, options.filter]);

  return data;
}
```

---

### 4. Conversational Flow with Voice

**LiveKit + CopilotKit Integration:**

```tsx
// app/chat/page.tsx
'use client';

import { CopilotKit } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import { useLiveKitRoom } from '@livekit/components-react';

export default function ChatPage() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <VoiceEnabledChat />
    </CopilotKit>
  );
}

function VoiceEnabledChat() {
  const [swarmId, setSwarmId] = useState<string | null>(null);

  useCopilotAction({
    name: 'startBusinessAnalysis',
    description: 'Start analyzing user business to increase revenue',
    parameters: [
      { name: 'initialGoal', type: 'string', description: 'What user wants to achieve' }
    ],
    handler: async ({ initialGoal }) => {
      // 1. Start conversation
      const questions = [
        'What industry are you in?',
        'What\'s your current monthly revenue?',
        'What\'s your marketing budget?',
        'Who is your target audience?'
      ];

      const answers = await interviewUser(questions);

      // 2. Spawn agent swarm
      const response = await fetch('/api/agents/orchestrate', {
        method: 'POST',
        body: JSON.stringify({
          task: `Analyze business and create revenue growth strategy. Goal: ${initialGoal}. Context: ${JSON.stringify(answers)}`,
          parallel: true,
          agentTypes: ['researcher', 'analyzer', 'planner', 'writer']
        })
      });

      const { swarmId } = await response.json();
      setSwarmId(swarmId);

      return `Started analysis with ${agentTypes.length} agents working in parallel. You'll see live updates below.`;
    }
  });

  return (
    <div className="flex h-screen">
      <div className="flex-1 p-6">
        <CopilotSidebar />
      </div>

      {swarmId && (
        <div className="w-96 border-l p-6 overflow-y-auto">
          <AgentSwarmDisplay swarmId={swarmId} />
        </div>
      )}
    </div>
  );
}
```

---

## MCP Server Catalog

### Pre-configured Servers for DreamCrew

```typescript
// lib/mcp/catalog.ts
export const MCP_SERVERS = {
  // Research & Data
  tavily: {
    id: 'tavily',
    name: 'Tavily Search',
    transport: 'sse',
    url: 'https://mcp.tavily.com/mcp/',
    envVars: ['TAVILY_API_KEY'],
    capabilities: ['web_search', 'news_search', 'research']
  },

  dataforseo: {
    id: 'dataforseo',
    name: 'DataForSEO',
    transport: 'sse',
    url: 'https://mcp.dataforseo.com/',
    envVars: ['DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD'],
    capabilities: ['serp_analysis', 'competitor_research', 'keyword_data']
  },

  // Content Management
  wordpress: {
    id: 'wordpress',
    name: 'WordPress',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-wordpress'],
    envVars: ['WP_URL', 'WP_USERNAME', 'WP_APPLICATION_PASSWORD'],
    capabilities: ['create_post', 'update_post', 'upload_media']
  },

  // Communication
  gmail: {
    id: 'gmail',
    name: 'Gmail',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-gmail'],
    envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'],
    capabilities: ['send_email', 'search_emails', 'create_draft']
  },

  slack: {
    id: 'slack',
    name: 'Slack',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    envVars: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'],
    capabilities: ['send_message', 'schedule_message', 'get_channel_history']
  },

  // Development
  github: {
    id: 'github',
    name: 'GitHub',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    envVars: ['GITHUB_TOKEN'],
    capabilities: ['create_issue', 'create_pr', 'search_code']
  },

  // Business Tools
  hubspot: {
    id: 'hubspot',
    name: 'HubSpot CRM',
    transport: 'sse',
    url: 'https://mcp.hubspot.com/',
    envVars: ['HUBSPOT_API_KEY'],
    capabilities: ['create_contact', 'send_email_campaign', 'log_activity']
  },

  stripe: {
    id: 'stripe',
    name: 'Stripe',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-stripe'],
    envVars: ['STRIPE_SECRET_KEY'],
    capabilities: ['get_customers', 'get_revenue', 'create_invoice']
  }
};
```

---

## API Endpoints

### `/api/agents/orchestrate` (POST)

**Request:**
```json
{
  "task": "Create revenue growth strategy for e-commerce business",
  "agentTypes": ["researcher", "analyzer", "planner", "writer"],
  "parallel": true,
  "context": {
    "industry": "e-commerce",
    "revenue": 50000,
    "budget": 5000
  }
}
```

**Response:**
```json
{
  "swarmId": "swarm-abc123",
  "agents": [
    {
      "id": "agent-1",
      "type": "researcher",
      "status": "spawned",
      "task": "Research e-commerce growth strategies..."
    }
  ],
  "message": "Spawned 4 agents working in parallel"
}
```

### `/api/agents/status/:swarmId` (GET)

**Response:**
```json
{
  "swarmId": "swarm-abc123",
  "status": "running",
  "agents": [
    {
      "id": "agent-1",
      "type": "researcher",
      "status": "working",
      "progress": 60,
      "currentAction": "Analyzing competitor pricing strategies"
    }
  ]
}
```

### `/api/mcp/connect` (POST)

**Request:**
```json
{
  "serverId": "wordpress",
  "credentials": {
    "WP_URL": "https://example.com",
    "WP_USERNAME": "admin",
    "WP_APPLICATION_PASSWORD": "xxxx"
  }
}
```

---

## Implementation Phases

### Phase 1: MCP Foundation (Week 1)
- [ ] Create `mcp_connections` table
- [ ] Build MCP Connection Manager
- [ ] Add MCP server catalog
- [ ] Test with Tavily (SSE) and GitHub (stdio)
- [ ] Build tenant isolation with RLS

### Phase 2: Basic Orchestration (Week 2)
- [ ] Create `agent_swarms`, `agent_instances` tables
- [ ] Build Agent Orchestrator (parallel execution)
- [ ] Implement real-time status updates via Supabase
- [ ] Add agent status UI component
- [ ] Test with 2-3 concurrent agents

### Phase 3: CopilotKit Integration (Week 3)
- [ ] Add CopilotKit actions for orchestration
- [ ] Build conversational interview flow
- [ ] Integrate LiveKit for voice input
- [ ] Add Deepgram transcription
- [ ] Add ElevenLabs voice responses

### Phase 4: Advanced Features (Week 4)
- [ ] Long-running tasks (background jobs)
- [ ] Scheduled actions (send emails at optimal time)
- [ ] Result persistence and history
- [ ] Agent performance metrics
- [ ] Cost tracking per tenant

---

## Example User Flow

### "I need more revenue"

**1. User Says:** "I need more revenue"

**2. AI Responds:** "I can help with that! Let me understand your business better..."

**3. Interview (via voice or text):**
- What industry? → "E-commerce, selling outdoor gear"
- Current revenue? → "$50k/month"
- Budget? → "$5k/month"
- Top challenges? → "Traffic is good but conversion is low"

**4. AI Orchestrates:**
```
🤖 Spawning analyst team...

✅ Researcher (spawned) → Analyzing outdoor gear market
✅ Analyzer (spawned) → Reviewing your website conversion funnel
✅ Strategist (spawned) → Crafting revenue growth plan
✅ Content Writer (spawned) → Preparing content recommendations
```

**5. Live Updates (Supabase Realtime):**
```
🔄 Researcher: Searching competitor pricing strategies... (tavily_search)
🔄 Analyzer: Analyzing your website heatmaps... (requesting Google Analytics data)
🔄 Strategist: Reviewing budget allocation...
🔄 Writer: Drafting blog post on "Top 10 Hiking Essentials"
```

**6. Results Presented:**
- **Strategy Document** (generated by Strategist)
- **Content Calendar** (3 blog posts drafted by Writer)
- **Conversion Improvements** (5 specific recommendations from Analyzer)

**7. Implementation (with user approval):**
```
AI: "Should I publish the first blog post to your WordPress?"
User: "Yes"
AI: *Uses wordpress MCP tool to publish*
AI: "Post published! Should I schedule social media posts?"
```

---

## Key Differences from Prototype

| Prototype | DreamCrew Production |
|-----------|---------------------|
| Mock agents (metadata only) | Real concurrent Claude API calls |
| Static UI after initial load | Live updates via Supabase Realtime |
| Single conversation | Multi-tenant with isolation |
| Manual task submission | Voice + text conversational flow |
| File-based storage | Supabase PostgreSQL with RLS |
| No background jobs | Long-running tasks via pgboss/inngest |
| Simple MCP test | Full MCP ecosystem (10+ servers) |

---

## Critical Implementation Notes

### 1. MCP Response Parsing
All MCP tools return:
```json
{
  "content": [
    { "type": "text", "text": "{actual data as JSON string}" }
  ]
}
```

**Always parse:** `JSON.parse(result.content[0].text)`

### 2. Tenant Isolation
- **Every query must filter by tenant_id**
- Use Supabase RLS policies
- Encrypt MCP credentials in database
- Separate MCP connection pools per tenant

### 3. Cost Management
- Track API costs per tenant
- Set usage limits
- Monitor token consumption
- Bill based on agent hours

### 4. Error Handling
- Agent failures should not crash entire swarm
- Retry failed tool calls (max 3 attempts)
- Graceful degradation if MCP server disconnects
- Store errors in `agent_instances.result`

### 5. Real-Time Performance
- Use Supabase Realtime for agent status
- Update `agent_instances.updated_at` frequently
- Keep UI responsive with optimistic updates
- Throttle status updates (max 1/second per agent)

---

## Testing Strategy

### Unit Tests
- MCP connection/disconnection
- Tool execution with mock responses
- Agent spawning logic
- Task decomposition

### Integration Tests
- Multi-agent parallel execution
- Real-time status updates
- Tenant isolation
- MCP server communication

### Load Tests
- 10 concurrent swarms per tenant
- 50 agents running simultaneously
- Supabase connection pool limits
- API rate limiting

---

## Monitoring & Observability

### Metrics to Track
- Agent spawn time
- Average task completion time
- Tool execution success rate
- MCP server uptime
- Cost per tenant per day
- Active swarms by tenant

### Alerts
- Agent failure rate > 10%
- MCP server disconnected > 5min
- Tenant over usage limit
- Database connection pool exhausted

---

## Cost Estimates

### Per Agent Execution
- Average: 20k tokens = $0.60 (Claude Sonnet 4.5)
- 4 agents in parallel = $2.40
- MCP tool calls: ~$0.10 (external API costs)
- **Total per orchestration: ~$2.50**

### Pricing Strategy
- Starter: 10 orchestrations/month = $50
- Pro: 50 orchestrations/month = $200
- Enterprise: Unlimited = Custom

---

## Next Steps for AI Coder

1. **Review Mastra framework docs** - How to integrate custom agents
2. **Set up Supabase tables** - Run the SQL schema
3. **Implement MCP Connection Manager first** - Test with Tavily
4. **Build basic orchestration** - 2 agents in parallel
5. **Add Supabase Realtime subscriptions** - Live UI updates
6. **Integrate with existing CopilotKit setup**
7. **Add voice flow with LiveKit**

---

## Questions for Clarification

1. **Billing:** Are MCP tool costs passed to tenant or absorbed?
2. **Agent Limits:** Max concurrent agents per tenant?
3. **Data Retention:** How long to keep agent execution history?
4. **Voice Priority:** Is voice the primary interface or text + voice?
5. **Existing Mastra Agents:** How to integrate with current agents?

---

## Files to Review in This Prototype

```
lib/automation/mcp-connection-manager.ts   ← MCP integration pattern
lib/automation/agent-orchestrator.ts       ← Orchestration logic (needs real agents)
lib/automation/orchestration-mcp-server.js ← Mock server (shows MCP protocol)
app/automation/page.tsx                    ← UI for agent display
app/automation/integrations/page.tsx       ← MCP connection UI
app/api/automation/integrations/          ← API routes
```

---

**Document Version:** 1.0
**Created:** 2025-11-05
**Target Platform:** DreamCrew SaaS
**Estimated Implementation:** 3-4 weeks (with 1 senior developer)
