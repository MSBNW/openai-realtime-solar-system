# Swarm Orchestration - MCP Server Integration Addendum

**Date:** November 6, 2025
**Purpose:** Address critical MCP server integration for multi-agent swarms
**Relates to:** DREAMCREW_SWARM_ORCHESTRATION_SPEC.md

---

## Critical Oversight Addressed

The original spec missed a **fundamental aspect** of DreamCrew's architecture: **MCP (Model Context Protocol) server integration**. Agents must be able to access tools from:

1. **System-wide MCP servers** (DataForSEO, Tavily) - pre-configured for all tenants
2. **User-configured MCP servers** (HubSpot, Gmail, Google Sheets, WordPress, etc.) - tenant-specific

This addendum specifies how swarm agents discover, authenticate, and use MCP-provided tools.

---

## Current MCP Architecture (From Documentation)

### Database Schema

```sql
-- From docs/knowledge/DATABASE_SCHEMA_COMPLETE_MAPPING_20251106.md

CREATE TABLE mcp_servers (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL, -- Tenant isolation
  name TEXT NOT NULL,
  server_type TEXT NOT NULL CHECK (server_type IN ('stdio', 'sse')),

  -- Connection details
  config JSONB NOT NULL, -- { command, args, env }
  secrets BYTEA, -- ENCRYPTED credentials

  -- Status
  status TEXT DEFAULT 'active',
  is_system_server BOOLEAN DEFAULT false, -- System vs user-configured

  -- Metadata
  available_tools JSONB, -- List of tool names/descriptions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mcp_servers_tenant ON mcp_servers(tenant_id);
CREATE INDEX idx_mcp_servers_system ON mcp_servers(is_system_server)
  WHERE is_system_server = true;
```

### System-Wide MCP Servers

**Pre-configured for all tenants:**
- `dataforseo` - SEO analysis, keyword research, backlinks, SERP data
- `tavily` - Web search, content extraction, site mapping

### User-Configured MCP Servers

**Tenant-specific integrations:**
- `hubspot` - CRM operations, contact management, deal creation
- `gmail` - Email sending, inbox management
- `google-sheets` - Spreadsheet creation, data manipulation
- `wordpress` - Content publishing, post management
- `slack` - Message sending, channel management
- `stripe` - Payment processing, invoice management
- Custom MCP servers built by users

---

## How Swarm Agents Should Use MCP Servers

### 1. Agent Specialization Based on MCP Access

Agents should be **dynamically configured** based on available MCP servers:

```typescript
// /mastra-agents/lib/swarm/mcp-agent-configurator.ts

export class MCPAgentConfigurator {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get MCP servers available to tenant
   */
  async getAvailableMCPServers(tenantId: string): Promise<MCPServer[]> {
    const { data: servers, error } = await this.supabase
      .from('mcp_servers')
      .select('*')
      .or(`tenant_id.eq.${tenantId},is_system_server.eq.true`)
      .eq('status', 'active');

    if (error) throw error;

    return servers.map(server => ({
      id: server.id,
      name: server.name,
      type: server.server_type,
      availableTools: server.available_tools || [],
      isSystem: server.is_system_server,
      config: server.config,
    }));
  }

  /**
   * Configure agent with appropriate MCP servers
   */
  async configureAgentMCPAccess(
    agentType: AgentWorkerType,
    tenantId: string
  ): Promise<AgentMCPConfiguration> {
    const availableServers = await this.getAvailableMCPServers(tenantId);

    // Map agent types to required MCP servers
    const mcpMapping: Record<AgentWorkerType, string[]> = {
      [AgentWorkerType.RESEARCHER]: ['tavily', 'dataforseo'],
      [AgentWorkerType.SEO_SPECIALIST]: ['dataforseo', 'tavily'],
      [AgentWorkerType.CONTENT_WRITER]: ['wordpress', 'tavily'],
      [AgentWorkerType.COMPETITOR_ANALYST]: ['dataforseo', 'tavily'],
      [AgentWorkerType.DATA_ANALYST]: ['google-sheets', 'dataforseo'],
      [AgentWorkerType.STRATEGIST]: ['dataforseo', 'tavily', 'google-sheets'],
      [AgentWorkerType.PROJECT_MANAGER]: ['hubspot', 'google-sheets', 'slack'],
      [AgentWorkerType.GENERAL_ASSISTANT]: [], // All available
    };

    const requiredServers = mcpMapping[agentType] || [];

    // Filter to only available servers
    const assignedServers = availableServers.filter(server =>
      requiredServers.length === 0 || requiredServers.includes(server.name)
    );

    // Extract tool names from all assigned servers
    const availableTools = assignedServers.flatMap(server =>
      (server.availableTools as any[]).map(tool => ({
        toolName: tool.name,
        serverName: server.name,
        serverId: server.id,
        description: tool.description,
      }))
    );

    return {
      assignedServers,
      availableTools,
      toolCount: availableTools.length,
    };
  }
}

interface AgentMCPConfiguration {
  assignedServers: MCPServer[];
  availableTools: ToolDefinition[];
  toolCount: number;
}

interface MCPServer {
  id: string;
  name: string;
  type: 'stdio' | 'sse';
  availableTools: any[];
  isSystem: boolean;
  config: any;
}

interface ToolDefinition {
  toolName: string;
  serverName: string;
  serverId: string;
  description: string;
}
```

### 2. Dynamic Tool Discovery During Agent Spawn

Modify `AgentPoolManager.spawnWorker()` to include MCP configuration:

```typescript
// Update from DREAMCREW_SWARM_ORCHESTRATION_SPEC.md

export class AgentPoolManager {
  private mcpConfigurator: MCPAgentConfigurator;

  constructor(
    private supabaseClient: SupabaseClient,
    private tenantId: string,
    private swarmExecutionId: string
  ) {
    this.mcpConfigurator = new MCPAgentConfigurator(supabaseClient);
  }

  async spawnWorker(
    workerType: AgentWorkerType,
    taskDescription: string,
    taskId: string,
    context: SwarmContext
  ): Promise<AgentWorker> {

    // *** NEW: Get MCP configuration for this agent type ***
    const mcpConfig = await this.mcpConfigurator.configureAgentMCPAccess(
      workerType,
      this.tenantId
    );

    // Check if agent has required tools
    if (mcpConfig.toolCount === 0) {
      throw new Error(
        `Agent type ${workerType} requires MCP servers that are not configured for this tenant. ` +
        `Please configure the required integrations.`
      );
    }

    // Create worker record in database with MCP info
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
        metadata: {
          mcpServers: mcpConfig.assignedServers.map(s => s.name),
          availableToolCount: mcpConfig.toolCount,
        },
      })
      .select()
      .single();

    if (error) throw error;

    // *** NEW: Inject MCP tools into runtime context ***
    const runtimeContext = new RuntimeContext();
    runtimeContext.set('agentName', typeConfig.name);
    runtimeContext.set('instruction', typeConfig.systemPrompt);
    runtimeContext.set('tenantId', this.tenantId);
    runtimeContext.set('swarmExecutionId', this.swarmExecutionId);
    runtimeContext.set('conversationId', context.conversationId);

    // NEW: Add MCP configuration
    runtimeContext.set('mcpServers', mcpConfig.assignedServers);
    runtimeContext.set('availableTools', mcpConfig.availableTools);

    // Create Mastra agent instance with MCP tools
    const mastraAgent = await this.createMastraAgentWithMCP(
      typeConfig.mastraAgentId,
      runtimeContext,
      mcpConfig
    );

    // Rest of spawn logic...
  }

  /**
   * Create Mastra agent with MCP tools dynamically loaded
   */
  private async createMastraAgentWithMCP(
    mastraAgentId: string,
    runtimeContext: RuntimeContext,
    mcpConfig: AgentMCPConfiguration
  ): Promise<Agent> {
    const { AGENT_REGISTRY } = await import('../agents');
    const baseAgent = AGENT_REGISTRY[mastraAgentId];

    if (!baseAgent) {
      throw new Error(`Agent ${mastraAgentId} not found in registry`);
    }

    // *** CRITICAL: Load MCP tools dynamically ***
    const mcpTools = await this.loadMCPTools(mcpConfig);

    // Clone agent with additional MCP tools
    const agentWithMCPTools = new Agent({
      name: baseAgent.name,
      model: baseAgent.model,
      instructions: baseAgent.instructions,
      memory: baseAgent.memory,

      // *** NEW: Merge base tools with MCP tools ***
      tools: {
        ...baseAgent.tools, // Existing static tools
        ...mcpTools,        // Dynamically loaded MCP tools
      },
    });

    return agentWithMCPTools;
  }

  /**
   * Load tools from MCP servers
   */
  private async loadMCPTools(mcpConfig: AgentMCPConfiguration): Promise<Record<string, Tool>> {
    const tools: Record<string, Tool> = {};

    for (const server of mcpConfig.assignedServers) {
      // Connect to MCP server
      const mcpConnection = await this.connectToMCPServer(server);

      // Get tools from this server
      const serverTools = await mcpConnection.listTools();

      // Convert MCP tools to Mastra tool format
      for (const mcpTool of serverTools) {
        tools[mcpTool.name] = this.convertMCPToolToMastra(
          mcpTool,
          mcpConnection,
          server
        );
      }
    }

    return tools;
  }

  /**
   * Connect to MCP server (stdio or SSE)
   */
  private async connectToMCPServer(server: MCPServer): Promise<MCPConnection> {
    if (server.type === 'stdio') {
      return await MCPStdioConnection.connect(server.config);
    } else {
      return await MCPSSEConnection.connect(server.config);
    }
  }

  /**
   * Convert MCP tool definition to Mastra tool
   */
  private convertMCPToolToMastra(
    mcpTool: MCPToolDefinition,
    connection: MCPConnection,
    server: MCPServer
  ): Tool {
    return {
      description: mcpTool.description,
      parameters: z.object(
        this.convertMCPSchemaToZod(mcpTool.inputSchema)
      ),
      execute: async (args: any) => {
        try {
          // Call MCP server
          const result = await connection.callTool(mcpTool.name, args);

          // Emit progress event
          await this.emitToolCallEvent(server.name, mcpTool.name, args, result);

          return result;
        } catch (error) {
          await this.emitToolErrorEvent(server.name, mcpTool.name, error);
          throw error;
        }
      },
    };
  }

  /**
   * Convert MCP JSON schema to Zod schema
   */
  private convertMCPSchemaToZod(schema: any): Record<string, z.ZodTypeAny> {
    const zodSchema: Record<string, z.ZodTypeAny> = {};

    for (const [key, value] of Object.entries(schema.properties || {})) {
      const prop = value as any;

      if (prop.type === 'string') {
        zodSchema[key] = schema.required?.includes(key)
          ? z.string()
          : z.string().optional();
      } else if (prop.type === 'number') {
        zodSchema[key] = schema.required?.includes(key)
          ? z.number()
          : z.number().optional();
      } else if (prop.type === 'boolean') {
        zodSchema[key] = schema.required?.includes(key)
          ? z.boolean()
          : z.boolean().optional();
      } else if (prop.type === 'array') {
        zodSchema[key] = z.array(z.any()).optional();
      } else {
        zodSchema[key] = z.any().optional();
      }
    }

    return zodSchema;
  }

  private async emitToolCallEvent(
    serverName: string,
    toolName: string,
    args: any,
    result: any
  ): Promise<void> {
    await this.supabaseClient
      .from('agent_progress_events')
      .insert({
        swarm_execution_id: this.swarmExecutionId,
        agent_worker_id: this.currentWorkerId,
        tenant_id: this.tenantId,
        event_type: 'tool_call',
        message: `Called ${toolName} on ${serverName}`,
        tool_name: toolName,
        tool_args: args,
        tool_result: result,
        metadata: {
          mcpServer: serverName,
        },
        broadcast_to_user: false, // Internal tracking only
      });
  }
}
```

### 3. MCP Connection Management

Create a connection pool for MCP servers:

```typescript
// /mastra-agents/lib/swarm/mcp-connection-pool.ts

import { Client as StdioClient } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client as SSEClient } from '@modelcontextprotocol/sdk/client/sse.js';

export class MCPConnectionPool {
  private connections: Map<string, MCPConnection> = new Map();

  /**
   * Get or create connection to MCP server
   */
  async getConnection(server: MCPServer, credentials?: any): Promise<MCPConnection> {
    const cacheKey = `${server.id}_${server.tenant_id}`;

    if (this.connections.has(cacheKey)) {
      return this.connections.get(cacheKey)!;
    }

    const connection = await this.createConnection(server, credentials);
    this.connections.set(cacheKey, connection);

    return connection;
  }

  private async createConnection(
    server: MCPServer,
    credentials?: any
  ): Promise<MCPConnection> {
    if (server.type === 'stdio') {
      return new MCPStdioConnection(server, credentials);
    } else {
      return new MCPSSEConnection(server, credentials);
    }
  }

  /**
   * Close all connections
   */
  async closeAll(): Promise<void> {
    for (const connection of this.connections.values()) {
      await connection.close();
    }
    this.connections.clear();
  }
}

export class MCPStdioConnection implements MCPConnection {
  private client: StdioClient;
  private tools: Map<string, MCPToolDefinition> = new Map();

  constructor(
    private server: MCPServer,
    private credentials?: any
  ) {}

  async connect(): Promise<void> {
    const config = this.server.config as any;

    // Inject credentials into environment
    const env = {
      ...process.env,
      ...config.env,
      ...(this.credentials || {}),
    };

    this.client = new StdioClient({
      command: config.command,
      args: config.args,
      env,
    });

    await this.client.connect();

    // Load available tools
    const toolList = await this.client.listTools();
    for (const tool of toolList.tools) {
      this.tools.set(tool.name, tool as MCPToolDefinition);
    }
  }

  async listTools(): Promise<MCPToolDefinition[]> {
    return Array.from(this.tools.values());
  }

  async callTool(toolName: string, args: any): Promise<any> {
    const result = await this.client.callTool({ name: toolName, arguments: args });
    return result.content;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

export class MCPSSEConnection implements MCPConnection {
  private client: SSEClient;
  private tools: Map<string, MCPToolDefinition> = new Map();

  constructor(
    private server: MCPServer,
    private credentials?: any
  ) {}

  async connect(): Promise<void> {
    const config = this.server.config as any;

    this.client = new SSEClient({
      url: config.url,
      headers: {
        ...config.headers,
        'Authorization': this.credentials?.apiKey
          ? `Bearer ${this.credentials.apiKey}`
          : undefined,
      },
    });

    await this.client.connect();

    // Load available tools
    const toolList = await this.client.listTools();
    for (const tool of toolList.tools) {
      this.tools.set(tool.name, tool as MCPToolDefinition);
    }
  }

  async listTools(): Promise<MCPToolDefinition[]> {
    return Array.from(this.tools.values());
  }

  async callTool(toolName: string, args: any): Promise<any> {
    const result = await this.client.callTool({ name: toolName, arguments: args });
    return result.content;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}

export interface MCPConnection {
  connect(): Promise<void>;
  listTools(): Promise<MCPToolDefinition[]>;
  callTool(toolName: string, args: any): Promise<any>;
  close(): Promise<void>;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}
```

### 4. Credential Management for User-Configured MCP Servers

Agents need to access encrypted credentials:

```typescript
// /mastra-agents/lib/swarm/mcp-credential-manager.ts

import { createClient } from '@supabase/supabase-js';

export class MCPCredentialManager {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get decrypted credentials for MCP server
   * This uses Supabase's vault for encryption/decryption
   */
  async getCredentials(serverId: string, tenantId: string): Promise<any> {
    // Verify tenant has access to this server
    const { data: server, error } = await this.supabase
      .from('mcp_servers')
      .select('id, tenant_id, secrets')
      .eq('id', serverId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !server) {
      throw new Error('MCP server not found or access denied');
    }

    // Decrypt secrets using Supabase vault
    // Note: In production, use Supabase's vault.decrypt_secret()
    const { data: decrypted } = await this.supabase.rpc('decrypt_mcp_secrets', {
      server_id: serverId,
    });

    return decrypted;
  }
}
```

### 5. Update Agent Type Configurations

Modify agent type configs to specify MCP server requirements:

```typescript
// /mastra-agents/lib/swarm/agent-types.ts (UPDATED)

export const AGENT_TYPE_CONFIGS: Record<AgentWorkerType, AgentTypeConfig> = {
  [AgentWorkerType.RESEARCHER]: {
    name: 'Research Specialist',
    mastraAgentId: 'genesis-agent',
    capabilities: ['web_search', 'data_extraction', 'summarization'],

    // *** NEW: Required MCP servers ***
    requiredMCPServers: ['tavily'], // Must have Tavily
    optionalMCPServers: ['dataforseo'], // Nice to have

    tools: [], // Tools will be loaded dynamically from MCP
    systemPrompt: `You are a research specialist with access to web search and data extraction tools...`,
    maxConcurrent: 3,
  },

  [AgentWorkerType.SEO_SPECIALIST]: {
    name: 'SEO Specialist',
    mastraAgentId: 'genesis-agent',
    capabilities: ['seo_analysis', 'keyword_research', 'backlink_analysis'],

    // *** NEW: Required MCP servers ***
    requiredMCPServers: ['dataforseo'], // Must have DataForSEO
    optionalMCPServers: ['tavily'],

    tools: [],
    systemPrompt: `You are an SEO specialist with access to comprehensive SEO analysis tools...`,
    maxConcurrent: 2,
  },

  [AgentWorkerType.CONTENT_WRITER]: {
    name: 'Content Writer',
    mastraAgentId: 'genesis-agent',
    capabilities: ['writing', 'editing', 'content_strategy', 'publishing'],

    // *** NEW: Required MCP servers ***
    requiredMCPServers: [], // Can work without MCP
    optionalMCPServers: ['wordpress', 'tavily'], // Can publish if configured

    tools: [],
    systemPrompt: `You are a professional content writer...`,
    maxConcurrent: 2,
  },

  [AgentWorkerType.PROJECT_MANAGER]: {
    name: 'Project Manager',
    mastraAgentId: 'project-agent',
    capabilities: ['task_creation', 'coordination', 'progress_tracking', 'crm_integration'],

    // *** NEW: Required MCP servers ***
    requiredMCPServers: [],
    optionalMCPServers: ['hubspot', 'google-sheets', 'slack'], // Enhanced with integrations

    tools: [],
    systemPrompt: `You are a project manager...`,
    maxConcurrent: 1,
  },
};

interface AgentTypeConfig {
  name: string;
  mastraAgentId: string;
  capabilities: string[];
  requiredMCPServers: string[]; // NEW
  optionalMCPServers: string[]; // NEW
  tools: string[]; // Deprecated - use MCP
  systemPrompt: string;
  maxConcurrent: number;
}
```

---

## User Experience: MCP-Powered Swarms

### Scenario 1: User Has All Required MCP Servers

**User Request**: "Increase revenue for gmax.co.il and create HubSpot deals for leads"

**User's configured MCP servers:**
- ✅ DataForSEO
- ✅ Tavily
- ✅ HubSpot
- ✅ WordPress

**Swarm spawns:**
1. **SEO Specialist** → Uses DataForSEO MCP
2. **Researcher** → Uses Tavily MCP
3. **Strategist** → Uses DataForSEO + Tavily
4. **Project Manager** → Uses HubSpot MCP to create deals
5. **Content Writer** → Uses WordPress MCP to publish content

**User sees progress:**
- "SEO Specialist: Using DataForSEO to analyze gmax.co.il..."
- "Researcher: Using Tavily to research test prep market in Israel..."
- "Project Manager: Created 3 HubSpot deals for potential leads"
- "Content Writer: Published blog post to your WordPress site"

### Scenario 2: User Missing Required MCP Server

**User Request**: "Analyze SEO for mysite.com"

**User's configured MCP servers:**
- ✅ Tavily
- ❌ DataForSEO (not configured)

**System response:**
```
❌ Cannot spawn SEO Specialist agent

The SEO Specialist requires DataForSEO integration which is not configured
for your account.

Would you like to:
1. Configure DataForSEO integration now
2. Use a general researcher instead (limited SEO capabilities)
3. Cancel this request

[Configure DataForSEO] [Use Researcher] [Cancel]
```

### Scenario 3: Graceful Degradation

**User Request**: "Create content strategy and publish to WordPress"

**User's configured MCP servers:**
- ✅ Tavily
- ✅ DataForSEO
- ❌ WordPress (not configured)

**System behavior:**
```
✅ Swarm spawned successfully

Agents working:
- Strategist: Creating content strategy... ✓
- Researcher: Analyzing market... ✓
- Content Writer: Drafting blog posts... ✓

⚠️ WordPress publishing unavailable

I've created 5 blog post drafts for you to review. To enable automatic
publishing, please configure WordPress integration.

[View Drafts] [Configure WordPress]
```

---

## Database Schema Updates

Add MCP tracking to agent workers:

```sql
-- Update agent_workers table to track MCP usage

ALTER TABLE agent_workers
  ADD COLUMN mcp_servers_used TEXT[], -- Array of MCP server names
  ADD COLUMN mcp_tool_calls INTEGER DEFAULT 0, -- Count of MCP tool calls
  ADD COLUMN mcp_errors INTEGER DEFAULT 0; -- Count of MCP errors

-- Index for MCP server usage analytics
CREATE INDEX idx_agent_workers_mcp_servers
  ON agent_workers USING GIN (mcp_servers_used);
```

---

## API Endpoint: MCP Status

Add endpoint to check MCP availability before spawning swarm:

```typescript
// /mastra-agents/app/api/swarm/mcp-check/route.ts

export async function POST(req: Request) {
  const { tenantId, requiredAgentTypes } = await req.json();

  const supabase = createServerClient();

  // Get tenant's MCP servers
  const { data: mcpServers } = await supabase
    .from('mcp_servers')
    .select('name, status, available_tools')
    .or(`tenant_id.eq.${tenantId},is_system_server.eq.true`)
    .eq('status', 'active');

  const availableServerNames = mcpServers.map(s => s.name);

  // Check each required agent type
  const agentChecks = requiredAgentTypes.map((agentType: AgentWorkerType) => {
    const config = AGENT_TYPE_CONFIGS[agentType];

    const missingRequired = config.requiredMCPServers.filter(
      server => !availableServerNames.includes(server)
    );

    const availableOptional = config.optionalMCPServers.filter(
      server => availableServerNames.includes(server)
    );

    return {
      agentType,
      canSpawn: missingRequired.length === 0,
      missingRequired,
      availableOptional,
      toolCount: mcpServers
        .filter(s => [...config.requiredMCPServers, ...config.optionalMCPServers].includes(s.name))
        .reduce((sum, s) => sum + (s.available_tools?.length || 0), 0),
    };
  });

  return Response.json({
    tenantId,
    totalMCPServers: mcpServers.length,
    availableServerNames,
    agentChecks,
    canProceed: agentChecks.every(c => c.canSpawn),
  });
}
```

---

## Testing Strategy

### Unit Tests

1. **MCP Connection Pool**
   - Test stdio connections
   - Test SSE connections
   - Test connection reuse
   - Test credential injection

2. **Tool Discovery**
   - Test dynamic tool loading
   - Test MCP-to-Mastra conversion
   - Test schema parsing

3. **Agent Configuration**
   - Test MCP server assignment
   - Test tool availability checks
   - Test missing server detection

### Integration Tests

1. **End-to-End with MCP**
   - Spawn swarm with MCP-dependent agents
   - Execute tools from multiple MCP servers
   - Verify results in database

2. **Error Handling**
   - Missing MCP server
   - MCP server connection failure
   - Tool call timeout
   - Invalid credentials

### Load Tests

1. **Concurrent MCP Usage**
   - 10 agents calling same MCP server simultaneously
   - Rate limiting verification
   - Connection pool efficiency

---

## Security Considerations

1. **Credential Isolation**
   - Tenant A cannot access Tenant B's MCP credentials
   - Service role bypasses RLS only for system servers

2. **MCP Server Permissions**
   - Validate tenant owns MCP server before connecting
   - Audit log all MCP tool calls
   - Rate limit per tenant per MCP server

3. **Secrets Management**
   - Use Supabase vault for encryption at rest
   - Never log decrypted credentials
   - Rotate credentials periodically

---

## Migration Path

### Phase 1: MCP Integration Foundation (Week 2)

Add during "Database & API Foundation" phase:
1. Update `agent_workers` schema
2. Implement `MCPAgentConfigurator`
3. Implement `MCPConnectionPool`
4. Add MCP check API endpoint

### Phase 2: Dynamic Tool Loading (Week 3)

Before implementing agent pool:
1. Implement `convertMCPToolToMastra()`
2. Implement `loadMCPTools()`
3. Test with DataForSEO and Tavily

### Phase 3: User-Configured MCP Support (Week 5)

After basic swarms work:
1. Implement credential management
2. Add graceful degradation for missing servers
3. Add configuration prompts in UI

---

## Example: SEO Specialist with DataForSEO MCP

```typescript
// When swarm spawns SEO Specialist agent:

// 1. Check tenant has DataForSEO configured
const mcpConfig = await mcpConfigurator.configureAgentMCPAccess(
  AgentWorkerType.SEO_SPECIALIST,
  tenantId
);
// Result: { assignedServers: [dataforseo], availableTools: [
//   'dataforseo_labs_google_ranked_keywords',
//   'dataforseo_labs_google_domain_rank_overview',
//   ... 100+ tools
// ]}

// 2. Connect to DataForSEO MCP server
const mcpConnection = await connectionPool.getConnection(
  mcpConfig.assignedServers.find(s => s.name === 'dataforseo')
);

// 3. Load tools dynamically
const tools = await mcpConnection.listTools();
// Result: [
//   { name: 'dataforseo_labs_google_ranked_keywords', inputSchema: {...} },
//   { name: 'dataforseo_labs_google_domain_rank_overview', inputSchema: {...} },
//   ...
// ]

// 4. Create agent with MCP tools
const seoAgent = new Agent({
  name: 'SEO Specialist',
  model: openai('gpt-4o'),
  instructions: 'You are an SEO specialist...',
  tools: {
    // Dynamically loaded from DataForSEO MCP
    'dataforseo_labs_google_ranked_keywords': convertMCPToolToMastra(tools[0]),
    'dataforseo_labs_google_domain_rank_overview': convertMCPToolToMastra(tools[1]),
    // ... all other DataForSEO tools
  },
});

// 5. Agent uses tools
const result = await seoAgent.generate('Analyze SEO for gmax.co.il');
// Agent calls: dataforseo_labs_google_domain_rank_overview({ target: 'gmax.co.il' })
// → MCP connection → DataForSEO API → Results back to agent
```

---

## Conclusion

MCP integration is **critical** for swarm orchestration because:

1. **Specialized agents need specialized tools** - Can't have SEO agent without DataForSEO
2. **User integrations enable action** - Can't publish to WordPress, create HubSpot deals, send emails without user's configured MCP servers
3. **Dynamic tool discovery** - Agents adapt to what's available per tenant
4. **Permission-based access** - Tenant isolation enforced at MCP layer

This addendum must be integrated into the main spec before implementation begins.

---

**Document Status**: Critical Addition
**Last Updated**: November 6, 2025
**Version**: 1.0
