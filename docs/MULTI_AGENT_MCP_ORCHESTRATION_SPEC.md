# DreamCrew Multi-Agent MCP Orchestration Platform
## Complete Technical Specification

**Document Version:** 1.0
**Date:** November 6, 2025
**Status:** Ready for Implementation
**Target Audience:** DreamCrew Platform Coder

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Vision & Philosophy](#vision--philosophy)
3. [Architecture Overview](#architecture-overview)
4. [Core Components](#core-components)
5. [MCP Server Integration](#mcp-server-integration)
6. [Multi-Agent Swarm Orchestration](#multi-agent-swarm-orchestration)
7. [Human Collaboration System](#human-collaboration-system)
8. [Project & Task Management](#project--task-management)
9. [Agent Reasoning Engine](#agent-reasoning-engine)
10. [Database Schema](#database-schema)
11. [API Design](#api-design)
12. [Implementation Roadmap](#implementation-roadmap)
13. [Code Examples](#code-examples)

---

## EXECUTIVE SUMMARY

### What We're Building

A **multi-agent orchestration platform** where:

- **Agents collaborate in parallel** to complete complex projects faster
- **Everything is an MCP server** - internal tools, tenant tools, knowledge bases, even DreamCrew itself
- **Agents reason through problems** instead of following pre-scripted instructions
- **Humans collaborate conversationally** - before, during, and after conversations
- **Projects span time** - real-time during calls OR long-running over days/weeks
- **Knowledge is hierarchical** - company-wide AND user-specific
- **Communication is flexible** - Email, Slack, or any MCP server the tenant configures

### Key Differentiators

1. **Reasoning Over Scripts**: Agents figure out HOW to achieve goals, not just execute predefined steps
2. **MCP-Native**: Everything exposed and consumed as MCP servers
3. **Parallel Execution**: 5-10 agents working simultaneously on subtasks
4. **Conversational HITL**: Humans approve/modify via natural conversation, not forms
5. **Hierarchical Knowledge**: Tenant-level + User-level knowledge bases
6. **Meta Play**: DreamCrew exposes itself as MCP server for account provisioning

---

## VISION & PHILOSOPHY

### The Core Insight

> **"Give agents tools and goals, let them figure out the path."**

Instead of:
```
IF user asks about pricing THEN fetch_pricing() AND respond_with_template()
```

We want:
```
GOAL: "Help the user understand our pricing"
TOOLS: [knowledge_base, web_search, calculate]
REASONING: Agent figures out best approach based on context
```

### Design Principles

1. **Tool-First Design**: Every capability is an MCP server
2. **Agent Autonomy**: Agents reason through problems
3. **Human-Agent Partnership**: Conversational collaboration, not forms
4. **Parallel by Default**: Decompose and distribute work
5. **Knowledge Hierarchy**: Company → Team → User
6. **Flexible Communication**: Use whatever channels the tenant prefers

---

## ARCHITECTURE OVERVIEW

### System Layers

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                        │
│  (Rep Rooms, Widgets, Voice Calls, Slack Integrations)  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              ORCHESTRATION LAYER                         │
│  • SwarmOrchestrator (parallel agent coordination)      │
│  • TaskDecomposer (AI-powered task breakdown)           │
│  • AgentPoolManager (spawn/manage agents)               │
│  • HumanCollaborationManager (conversational HITL)      │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 MCP INTEGRATION LAYER                    │
│  • MCPServerRegistry (discover available servers)       │
│  • MCPConnectionPool (manage connections)               │
│  • MCPToolResolver (map tools to agents)                │
│  • MCPCredentialManager (secure secrets)                │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    MCP SERVERS                           │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────┐ │
│  │   Internal   │ │ Tenant-Added │ │   Knowledge     │ │
│  │              │ │              │ │      Bases      │ │
│  │ • DataForSEO │ │ • WordPress  │ │                 │ │
│  │ • Tavily     │ │ • HubSpot    │ │ • Tenant KB     │ │
│  │ • Perplexity │ │ • Google Ads │ │ • User KB       │ │
│  │ • DreamCrew  │ │ • Slack      │ │                 │ │
│  │   MetaPlay   │ │ • Email      │ │                 │ │
│  └──────────────┘ └──────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   DATA LAYER                             │
│  • PostgreSQL + pgvector (knowledge, embeddings)        │
│  • Supabase Realtime (live updates)                     │
│  • Credit tracking, audit logs                          │
└─────────────────────────────────────────────────────────┘
```

### Request Flow Example

**User Request:** "Help me launch a Google Ads campaign for my kitchen remodeling business"

```
1. User → Rep Room (voice/text)
2. Rep Room → Orchestration Layer
3. Orchestrator:
   a. Analyzes request
   b. Identifies needed tools: [tenant_knowledge_base, dataforseo, google_ads_mcp]
   c. Decomposes into parallel tasks:
      - Task 1: Research keywords (dataforseo)
      - Task 2: Analyze competitor ads (tavily)
      - Task 3: Get company info (tenant_knowledge_base)
      - Task 4: Draft ad copy (with context from 1-3)
   d. Spawns 3 agents in parallel for tasks 1-3
   e. Waits for completion
   f. Spawns agent for task 4 with results
4. Agent 4 realizes it needs approval before creating campaign
5. HumanCollaborationManager:
   a. Sends conversational message to user via configured channel (Slack)
   b. "I've drafted 3 ad variations. Which one do you prefer?"
   c. User responds conversationally: "I like #2 but make it more casual"
   d. Agent refines ad copy
6. Agent creates campaign via google_ads_mcp
7. Orchestrator sends confirmation via email_mcp
```

**Total Time:** ~45 seconds (vs 5+ minutes sequential)

---

## CORE COMPONENTS

### 1. Multi-Agent Swarm Orchestrator

**Purpose:** Coordinate multiple agents working on parallel subtasks

**Responsibilities:**
- Receive high-level goals from users
- Decompose into parallelizable subtasks
- Spawn agent workers with appropriate MCP tools
- Track progress across all agents
- Aggregate results
- Handle dependencies between tasks

**Key Classes:**

#### `SwarmOrchestrator`

```typescript
class SwarmOrchestrator {
  constructor(
    private tenantId: string,
    private projectId: string,
    private mcpRegistry: MCPServerRegistry,
    private humanCollab: HumanCollaborationManager
  ) {}

  async executeGoal(goal: string, context: ExecutionContext): Promise<SwarmResult> {
    // 1. Decompose goal into tasks
    const tasks = await this.taskDecomposer.analyze(goal, context);

    // 2. Identify dependencies
    const taskGraph = this.buildDependencyGraph(tasks);

    // 3. Spawn agents for independent tasks
    const agents = await this.spawnAgents(taskGraph);

    // 4. Execute in waves (respecting dependencies)
    const results = await this.executeInWaves(agents, taskGraph);

    // 5. Aggregate and return
    return this.aggregateResults(results);
  }

  private async spawnAgents(taskGraph: TaskGraph): Promise<AgentWorker[]> {
    const agents: AgentWorker[] = [];

    for (const task of taskGraph.nodes) {
      // Get required MCP servers for this task
      const requiredTools = await this.mcpRegistry.resolveToolsForTask(
        task,
        this.tenantId
      );

      // Spawn agent with tools
      const agent = await this.agentPool.spawn({
        taskId: task.id,
        tools: requiredTools,
        systemPrompt: this.generateAgentPrompt(task, requiredTools),
        onProgress: (update) => this.broadcastProgress(update),
        onNeedHumanInput: (question) => this.humanCollab.ask(question),
      });

      agents.push(agent);
    }

    return agents;
  }

  private generateAgentPrompt(task: Task, tools: MCPTool[]): string {
    return `
You are an AI agent working on a specific subtask as part of a larger project.

GOAL: ${task.goal}
CONTEXT: ${task.context}

AVAILABLE TOOLS:
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

INSTRUCTIONS:
1. Analyze the goal and determine the best approach
2. Use the available tools to gather information and take actions
3. If you need human input, ask conversationally (don't use forms)
4. Report progress as you work
5. When done, summarize what you accomplished

IMPORTANT:
- You have autonomy to figure out HOW to achieve the goal
- Think through the problem step-by-step
- Ask for human input when you're uncertain
- Cite your sources when using knowledge base information
    `.trim();
  }
}
```

---

### 2. MCP Integration Layer

**Purpose:** Abstract MCP server connections and tool invocation

**Responsibilities:**
- Discover available MCP servers (internal + tenant-added)
- Manage connections (stdio, SSE)
- Route tool calls to appropriate servers
- Handle credentials securely
- Cache tool schemas for performance
- Track usage for billing

**Key Components:**

#### `MCPServerRegistry`

```typescript
interface MCPServerConfig {
  id: string;
  name: string;
  publicName: string; // Anonymized name shown to users
  type: 'internal' | 'tenant_added' | 'knowledge_base';
  connectionType: 'stdio' | 'sse';
  command?: string; // For stdio
  url?: string; // For SSE
  scope: 'house' | 'tenant' | 'user';
  scopeId: string; // organization_id or user_id
  credentialsRequired: boolean;
  credentialsSchema?: JSONSchema;
  status: 'active' | 'inactive' | 'error';
}

class MCPServerRegistry {
  private connections = new Map<string, MCPConnection>();

  async discoverAvailableServers(
    tenantId: string,
    userId?: string
  ): Promise<MCPServerConfig[]> {
    const servers: MCPServerConfig[] = [];

    // 1. Get internal servers (available to all)
    const internal = await this.getInternalServers();
    servers.push(...internal);

    // 2. Get tenant-configured servers
    const tenantServers = await this.db
      .from('mcp_servers')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    servers.push(...tenantServers.map(this.toMCPServerConfig));

    // 3. Get user-specific servers (if userId provided)
    if (userId) {
      const userServers = await this.db
        .from('mcp_servers')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

      servers.push(...userServers.map(this.toMCPServerConfig));
    }

    return servers;
  }

  async resolveToolsForTask(
    task: Task,
    tenantId: string,
    userId?: string
  ): Promise<MCPTool[]> {
    // Get available servers
    const servers = await this.discoverAvailableServers(tenantId, userId);

    // Use AI to determine which tools are relevant
    const relevantServerIds = await this.aiToolSelector.selectTools(
      task.goal,
      task.context,
      servers
    );

    // Connect to servers and list tools
    const tools: MCPTool[] = [];

    for (const serverId of relevantServerIds) {
      const server = servers.find(s => s.id === serverId);
      if (!server) continue;

      const connection = await this.getOrCreateConnection(server);
      const serverTools = await connection.listTools();

      tools.push(...serverTools.map(tool => ({
        ...tool,
        serverId: server.id,
        serverName: server.publicName, // Anonymized
      })));
    }

    return tools;
  }

  private async getInternalServers(): Promise<MCPServerConfig[]> {
    return [
      {
        id: 'internal-dataforseo',
        name: 'dataforseo',
        publicName: 'SEO Analysis',
        type: 'internal',
        connectionType: 'stdio',
        command: 'npx @dataforseo/mcp-server',
        scope: 'house',
        scopeId: 'system',
        credentialsRequired: false,
        status: 'active',
      },
      {
        id: 'internal-tavily',
        name: 'tavily',
        publicName: 'Web Research',
        type: 'internal',
        connectionType: 'stdio',
        command: 'npx @tavily/mcp-server',
        scope: 'house',
        scopeId: 'system',
        credentialsRequired: false,
        status: 'active',
      },
      {
        id: 'internal-perplexity',
        name: 'perplexity',
        publicName: 'Deep Research',
        type: 'internal',
        connectionType: 'sse',
        url: 'https://mcp.perplexity.ai',
        scope: 'house',
        scopeId: 'system',
        credentialsRequired: true,
        status: 'active',
      },
    ];
  }
}
```

#### `MCPConnectionPool`

```typescript
class MCPConnectionPool {
  private connections = new Map<string, MCPConnection>();
  private maxConnectionsPerServer = 10;

  async getConnection(serverId: string): Promise<MCPConnection> {
    const existing = this.connections.get(serverId);

    if (existing && existing.isHealthy()) {
      return existing;
    }

    // Create new connection
    const serverConfig = await this.registry.getServerConfig(serverId);
    const connection = await this.createConnection(serverConfig);

    this.connections.set(serverId, connection);

    return connection;
  }

  private async createConnection(config: MCPServerConfig): Promise<MCPConnection> {
    if (config.connectionType === 'stdio') {
      return new StdioMCPConnection(config);
    } else {
      return new SSEMCPConnection(config);
    }
  }

  async invokeTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolResult> {
    const connection = await this.getConnection(serverId);

    // Track usage for billing
    await this.usageTracker.recordToolInvocation(serverId, toolName);

    try {
      const result = await connection.callTool(toolName, args);
      return result;
    } catch (error) {
      // Log error and mark connection as unhealthy
      this.logger.error('Tool invocation failed', { serverId, toolName, error });
      connection.markUnhealthy();
      throw error;
    }
  }
}
```

---

### 3. Knowledge Base MCP Servers

**Purpose:** Expose company and user knowledge as MCP servers

**Two Levels:**
1. **Tenant Knowledge Base** - Company-wide knowledge
2. **User Knowledge Base** - Personal knowledge (e.g., specific to a salesperson)

#### Tenant Knowledge Base MCP Server

**Implementation:**

```typescript
// File: packages/tenant-kb-mcp-server/src/index.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  const tenantId = process.env.TENANT_ID!;

  const server = new Server(
    {
      name: 'tenant-knowledge-base',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Tool 1: Search knowledge base
  server.setRequestHandler('tools/list', async () => {
    return {
      tools: [
        {
          name: 'search_knowledge',
          description: 'Search the company knowledge base for relevant information',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query',
              },
              content_types: {
                type: 'array',
                items: { type: 'string' },
                description: 'Filter by content types: text, image, review, faq, product',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 5)',
                default: 5,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'list_knowledge_categories',
          description: 'List all available knowledge categories',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ],
    };
  });

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'search_knowledge') {
      // Generate embedding for query
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: args.query,
      });

      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Search knowledge base
      const { data, error } = await supabase.rpc('search_knowledge_base', {
        p_tenant_id: tenantId,
        p_query_embedding: queryEmbedding,
        p_limit: args.limit || 5,
        p_content_types: args.content_types || null,
        p_similarity_threshold: 0.7,
      });

      if (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      }

      // Format results
      const results = data.map((item, index) => `
[Result ${index + 1}] ${item.title}
Content: ${item.content}
Type: ${item.content_type}
Similarity: ${(item.similarity * 100).toFixed(1)}%
${item.source_url ? `Source: ${item.source_url}` : ''}
      `).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${data.length} relevant items:\n\n${results}`,
          },
        ],
      };
    }

    if (name === 'list_knowledge_categories') {
      const { data } = await supabase
        .from('company_knowledge_items')
        .select('content_type, tags')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      const categories = new Set<string>();
      const tags = new Set<string>();

      data?.forEach(item => {
        categories.add(item.content_type);
        item.tags?.forEach((tag: string) => tags.add(tag));
      });

      return {
        content: [
          {
            type: 'text',
            text: `
Categories: ${Array.from(categories).join(', ')}
Tags: ${Array.from(tags).join(', ')}
            `,
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  // Expose resources (for context)
  server.setRequestHandler('resources/list', async () => {
    const { data } = await supabase
      .from('company_knowledge_items')
      .select('id, title, content_type')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .limit(100);

    return {
      resources: data?.map(item => ({
        uri: `knowledge://${item.id}`,
        name: item.title,
        mimeType: 'text/plain',
        description: `${item.content_type} content`,
      })) || [],
    };
  });

  server.setRequestHandler('resources/read', async (request) => {
    const uri = request.params.uri as string;
    const itemId = uri.replace('knowledge://', '');

    const { data } = await supabase
      .from('company_knowledge_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (!data) {
      return {
        contents: [
          { uri, mimeType: 'text/plain', text: 'Not found' },
        ],
      };
    }

    return {
      contents: [
        {
          uri,
          mimeType: 'text/plain',
          text: `${data.title}\n\n${data.content}`,
        },
      ],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Tenant Knowledge Base MCP Server running');
}

main().catch(console.error);
```

**Package Configuration:**

```json
{
  "name": "@dreamcrew/tenant-kb-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "tenant-kb-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "@supabase/supabase-js": "^2.39.0",
    "openai": "^4.20.0"
  }
}
```

#### User Knowledge Base MCP Server

**Same structure as tenant KB, but:**
- Filters by `user_id` instead of `tenant_id`
- Stored in `user_knowledge_items` table
- Contains personal notes, contacts, testimonials specific to that user

---

### 4. DreamCrew Meta Play MCP Server

**Purpose:** Expose DreamCrew provisioning as MCP server for conversational account creation

**Implementation:**

```typescript
// File: packages/dreamcrew-metaplay-mcp-server/src/index.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const server = new Server(
    {
      name: 'dreamcrew-metaplay',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler('tools/list', async () => {
    return {
      tools: [
        {
          name: 'create_tenant_account',
          description: 'Create a new tenant organization with initial setup',
          inputSchema: {
            type: 'object',
            properties: {
              companyName: { type: 'string' },
              ownerEmail: { type: 'string' },
              ownerName: { type: 'string' },
              industry: { type: 'string' },
              website: { type: 'string' },
              plan: { type: 'string', enum: ['starter', 'pro', 'enterprise'] },
              credits: { type: 'number' },
              agentLimit: { type: 'number' },
            },
            required: ['companyName', 'ownerEmail', 'ownerName', 'plan'],
          },
        },
        {
          name: 'analyze_prospect_website',
          description: 'Analyze a prospect website to extract company info for setup',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string' },
            },
            required: ['url'],
          },
        },
        {
          name: 'provision_ai_assistant',
          description: 'Create and configure an AI assistant for the tenant',
          inputSchema: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              assistantName: { type: 'string' },
              industry: { type: 'string' },
              tone: { type: 'string', enum: ['professional', 'friendly', 'casual'] },
              primaryGoal: { type: 'string' },
            },
            required: ['tenantId', 'assistantName', 'industry'],
          },
        },
        {
          name: 'populate_initial_knowledge',
          description: 'Populate knowledge base with info extracted from website/docs',
          inputSchema: {
            type: 'object',
            properties: {
              tenantId: { type: 'string' },
              websiteUrl: { type: 'string' },
              additionalUrls: { type: 'array', items: { type: 'string' } },
            },
            required: ['tenantId', 'websiteUrl'],
          },
        },
      ],
    };
  });

  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    // Implementation of each tool...
    // (See IMPLEMENTATION_PLAN_COMPREHENSIVE.md for full code)

    if (name === 'create_tenant_account') {
      // Create org, allocate credits, send invitation
      // Return tenantId and invite link
    }

    if (name === 'analyze_prospect_website') {
      // Use tavily or web scraping to extract company info
      // Return structured data
    }

    if (name === 'provision_ai_assistant') {
      // Create agent activation, clone, rep room
      // Return agent details
    }

    if (name === 'populate_initial_knowledge') {
      // Scrape website, extract content, generate embeddings
      // Return count of items added
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('DreamCrew Meta Play MCP Server running');
}

main().catch(console.error);
```

**Usage Example:**

An agency's AI sales rep (built on DreamCrew) can now:

```
Sales Rep: *uses tavily to research prospect*
Sales Rep: *calls analyze_prospect_website(url="kitchenpro.com")*
Sales Rep: "I see you specialize in Italian cuisine. Would you like an AI assistant?"
Prospect: "Yes, how much?"
Sales Rep: *references pricing knowledge base*
Sales Rep: "For restaurants, our Pro plan is $299/month. Should I set you up?"
Prospect: "Sure!"
Sales Rep: *calls create_tenant_account(...)*
Sales Rep: *calls provision_ai_assistant(...)*
Sales Rep: *calls populate_initial_knowledge(...)*
Sales Rep: "Done! Check your email - your AI assistant is ready."
```

**Total time:** ~30 seconds (agent reasons through the process)

---

### 5. Human Collaboration System

**Purpose:** Enable conversational human-in-the-loop collaboration

**Key Insight:** Humans shouldn't fill out forms. They should have natural conversations with agents who ask for input when needed.

#### `HumanCollaborationManager`

```typescript
interface CollaborationSession {
  id: string;
  projectId: string;
  agentId: string;
  userId: string;
  status: 'active' | 'waiting_response' | 'completed';
  context: {
    currentTask: string;
    partialResults: any;
    questionAsked: string;
  };
  conversationHistory: Message[];
  communicationChannel: 'rep_room' | 'slack' | 'email' | 'sms';
}

class HumanCollaborationManager {
  async askForInput(
    agentId: string,
    question: string,
    context: any,
    options?: {
      urgency?: 'low' | 'medium' | 'high';
      suggestedResponses?: string[];
      requiresApproval?: boolean;
    }
  ): Promise<string> {
    // 1. Determine communication channel
    const channel = await this.getPreferredChannel(context.userId);

    // 2. Create collaboration session
    const session = await this.createSession({
      projectId: context.projectId,
      agentId,
      userId: context.userId,
      questionAsked: question,
      context,
    });

    // 3. Send message via appropriate MCP server
    if (channel === 'slack') {
      await this.mcpPool.invokeTool('slack-mcp', 'send_message', {
        userId: context.userId,
        text: question,
        thread_id: session.id,
        blocks: options?.suggestedResponses ? [
          {
            type: 'actions',
            elements: options.suggestedResponses.map(text => ({
              type: 'button',
              text: { type: 'plain_text', text },
              value: text,
            })),
          },
        ] : undefined,
      });
    } else if (channel === 'email') {
      await this.mcpPool.invokeTool('email-mcp', 'send_email', {
        to: context.userEmail,
        subject: `Input needed: ${context.currentTask}`,
        body: `
Hi,

I'm working on: ${context.currentTask}

${question}

${options?.suggestedResponses ?
  `Quick options:\n${options.suggestedResponses.map((r, i) => `${i+1}. ${r}`).join('\n')}`
  : ''}

Reply to this email with your response.

Best,
Your AI Assistant
        `,
        replyToSessionId: session.id,
      });
    } else {
      // Default: Rep room (realtime)
      await this.realtimeManager.sendMessage(context.repRoomId, {
        role: 'assistant',
        content: question,
        sessionId: session.id,
        requiresResponse: true,
      });
    }

    // 4. Wait for response (with timeout)
    const response = await this.waitForResponse(session.id, {
      timeout: options?.urgency === 'high' ? 5 * 60 * 1000 : 30 * 60 * 1000,
    });

    return response;
  }

  private async waitForResponse(
    sessionId: string,
    options: { timeout: number }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      // Subscribe to Supabase Realtime for response
      const subscription = this.supabase
        .channel(`collab-session:${sessionId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'collaboration_sessions',
          filter: `id=eq.${sessionId}`,
        }, (payload) => {
          if (payload.new.status === 'completed') {
            resolve(payload.new.user_response);
            subscription.unsubscribe();
          }
        })
        .subscribe();

      // Timeout
      setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error('User response timeout'));
      }, options.timeout);
    });
  }

  async recordUserResponse(sessionId: string, response: string) {
    await this.supabase
      .from('collaboration_sessions')
      .update({
        status: 'completed',
        user_response: response,
        responded_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  }
}
```

---

### 6. Agent Reasoning Engine

**Purpose:** Enable agents to reason through problems and plan their approach

**Key Components:**

#### `AgentReasoningEngine`

```typescript
class AgentReasoningEngine {
  async generatePlan(
    goal: string,
    availableTools: MCPTool[],
    context: any
  ): Promise<ExecutionPlan> {
    // Use LLM to generate step-by-step plan

    const planningPrompt = `
You are an AI planning agent. Given a goal and available tools, create a step-by-step execution plan.

GOAL: ${goal}

CONTEXT:
${JSON.stringify(context, null, 2)}

AVAILABLE TOOLS:
${availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Create a plan that:
1. Breaks down the goal into logical steps
2. Identifies which tools to use for each step
3. Notes dependencies between steps
4. Identifies where human input might be needed

Return as JSON:
{
  "steps": [
    {
      "id": "step-1",
      "description": "...",
      "tool": "tool_name",
      "args": {...},
      "dependencies": [],
      "needsHumanApproval": false,
      "reasoning": "Why this step is necessary"
    }
  ],
  "estimatedDuration": "2 minutes",
  "confidence": 0.9
}
    `;

    const response = await this.llm.generate({
      model: 'gpt-4',
      messages: [{ role: 'user', content: planningPrompt }],
      response_format: { type: 'json_object' },
    });

    const plan = JSON.parse(response.content);

    return this.validateAndOptimizePlan(plan, availableTools);
  }

  private async validateAndOptimizePlan(
    plan: any,
    availableTools: MCPTool[]
  ): Promise<ExecutionPlan> {
    // Validate that all tools exist
    for (const step of plan.steps) {
      if (!availableTools.find(t => t.name === step.tool)) {
        throw new Error(`Tool ${step.tool} not available`);
      }
    }

    // Identify parallel execution opportunities
    const optimized = this.identifyParallelSteps(plan);

    return optimized;
  }

  private identifyParallelSteps(plan: any): ExecutionPlan {
    // Build dependency graph
    // Group independent steps into "waves"
    // Return optimized plan with parallel execution groups

    const waves: Step[][] = [];
    const completed = new Set<string>();

    while (completed.size < plan.steps.length) {
      const wave: Step[] = [];

      for (const step of plan.steps) {
        if (completed.has(step.id)) continue;

        // Check if all dependencies are met
        const depsMet = step.dependencies.every((dep: string) =>
          completed.has(dep)
        );

        if (depsMet) {
          wave.push(step);
        }
      }

      if (wave.length === 0) {
        throw new Error('Circular dependency detected');
      }

      waves.push(wave);
      wave.forEach(step => completed.add(step.id));
    }

    return {
      ...plan,
      waves,
      parallelizationFactor: waves.reduce((max, wave) =>
        Math.max(max, wave.length), 0
      ),
    };
  }

  async executeStep(
    step: Step,
    context: ExecutionContext
  ): Promise<StepResult> {
    // 1. If needs approval, ask human
    if (step.needsHumanApproval) {
      const approval = await this.humanCollab.askForInput(
        context.agentId,
        `I'm about to ${step.description}. Is this okay?`,
        context,
        { suggestedResponses: ['Yes', 'No', 'Modify'] }
      );

      if (approval.toLowerCase() === 'no') {
        return { success: false, error: 'User declined' };
      }

      if (approval.toLowerCase() === 'modify') {
        const modification = await this.humanCollab.askForInput(
          context.agentId,
          'How would you like me to modify this step?',
          context
        );

        // Re-plan with modification
        step = await this.modifyStep(step, modification);
      }
    }

    // 2. Execute tool
    try {
      const result = await this.mcpPool.invokeTool(
        step.tool,
        step.toolName,
        step.args
      );

      // 3. Analyze result and update context
      return {
        success: true,
        result,
        updatedContext: this.mergeContext(context, result),
      };

    } catch (error) {
      // 4. Handle errors with retry/recovery
      if (step.retries < 3) {
        await this.delay(1000 * Math.pow(2, step.retries));
        step.retries++;
        return this.executeStep(step, context);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

---

## DATABASE SCHEMA

### New Tables

#### `mcp_servers`

```sql
CREATE TABLE mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = tenant-level

  -- Server identity
  name TEXT NOT NULL, -- Internal name (e.g., "wordpress-adapter")
  public_name TEXT NOT NULL, -- Display name (e.g., "Content Management")
  description TEXT,
  icon TEXT, -- Emoji or URL

  -- Connection
  connection_type TEXT NOT NULL CHECK (connection_type IN ('stdio', 'sse')),
  connection_config JSONB NOT NULL, -- { command, args } or { url }

  -- Credentials
  credentials_required BOOLEAN DEFAULT false,
  credentials_schema JSONB, -- JSON Schema for required credentials
  encrypted_credentials JSONB, -- Encrypted with Supabase Vault

  -- Metadata
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  last_health_check TIMESTAMPTZ,
  error_message TEXT,

  -- Usage
  total_invocations INTEGER DEFAULT 0,
  total_credits_consumed NUMERIC(12,2) DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_name_per_tenant UNIQUE (tenant_id, name),
  CONSTRAINT tenant_or_user CHECK (
    (tenant_id IS NOT NULL AND user_id IS NULL) OR
    (tenant_id IS NULL AND user_id IS NOT NULL)
  )
);

CREATE INDEX idx_mcp_servers_tenant ON mcp_servers(tenant_id);
CREATE INDEX idx_mcp_servers_user ON mcp_servers(user_id);
CREATE INDEX idx_mcp_servers_status ON mcp_servers(status);

-- RLS Policies
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mcp_servers_tenant_manage"
  ON mcp_servers FOR ALL
  USING (
    tenant_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('tenant_admin', 'tenant_manager')
    )
  );

CREATE POLICY "mcp_servers_user_manage"
  ON mcp_servers FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "mcp_servers_house_view_all"
  ON mcp_servers FOR SELECT
  USING (get_my_role() = 'house_admin');
```

#### `user_knowledge_items`

```sql
CREATE TABLE user_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Content
  content_type TEXT NOT NULL CHECK (content_type IN ('note', 'contact', 'testimonial', 'file', 'link')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,

  -- Embeddings
  embedding vector(1536),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[],

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT content_hash_unique UNIQUE (user_id, content_hash)
);

CREATE INDEX idx_user_knowledge_user ON user_knowledge_items(user_id);
CREATE INDEX idx_user_knowledge_embedding ON user_knowledge_items
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS
ALTER TABLE user_knowledge_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_knowledge_own_only"
  ON user_knowledge_items FOR ALL
  USING (user_id = auth.uid());
```

#### `collaboration_sessions`

```sql
CREATE TABLE collaboration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  project_id UUID REFERENCES agentic_projects(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),

  -- State
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'waiting_response', 'completed', 'timed_out')),

  -- Communication
  communication_channel TEXT NOT NULL CHECK (communication_channel IN ('rep_room', 'slack', 'email', 'sms')),
  question_asked TEXT NOT NULL,
  user_response TEXT,

  -- Context
  execution_context JSONB NOT NULL,
  conversation_history JSONB DEFAULT '[]'::jsonb,

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  timeout_at TIMESTAMPTZ,

  -- Metadata
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  requires_approval BOOLEAN DEFAULT false
);

CREATE INDEX idx_collab_sessions_user ON collaboration_sessions(user_id);
CREATE INDEX idx_collab_sessions_status ON collaboration_sessions(status);
CREATE INDEX idx_collab_sessions_project ON collaboration_sessions(project_id);

-- RLS
ALTER TABLE collaboration_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collab_sessions_user_view_own"
  ON collaboration_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "collab_sessions_system_manage"
  ON collaboration_sessions FOR ALL
  USING (true); -- Managed by service role
```

#### `swarm_executions`

```sql
CREATE TABLE swarm_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  project_id UUID REFERENCES agentic_projects(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  initiated_by_user_id UUID REFERENCES users(id),

  -- Goal
  goal TEXT NOT NULL,
  initial_context JSONB NOT NULL,

  -- Execution
  status TEXT DEFAULT 'planning' CHECK (status IN (
    'planning', 'executing', 'waiting_human_input',
    'completed', 'failed', 'cancelled'
  )),
  execution_plan JSONB, -- Generated plan with steps and waves

  -- Progress
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  failed_tasks INTEGER DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0,

  -- Results
  final_result JSONB,
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Credits
  estimated_credits NUMERIC(12,2),
  actual_credits_consumed NUMERIC(12,2) DEFAULT 0
);

CREATE INDEX idx_swarm_executions_project ON swarm_executions(project_id);
CREATE INDEX idx_swarm_executions_org ON swarm_executions(organization_id);
CREATE INDEX idx_swarm_executions_status ON swarm_executions(status);

-- RLS
ALTER TABLE swarm_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "swarm_executions_tenant_view"
  ON swarm_executions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

#### `agent_workers`

```sql
CREATE TABLE agent_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  swarm_execution_id UUID NOT NULL REFERENCES swarm_executions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES agentic_project_tasks(id),

  -- Agent config
  agent_type TEXT NOT NULL, -- 'researcher', 'coder', 'analyst', etc.
  system_prompt TEXT NOT NULL,
  assigned_tools JSONB NOT NULL, -- List of MCP tools

  -- Status
  status TEXT DEFAULT 'queued' CHECK (status IN (
    'queued', 'initializing', 'executing',
    'waiting_input', 'completed', 'failed'
  )),

  -- Execution
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Results
  result JSONB,
  error_message TEXT,

  -- Credits
  tokens_used INTEGER DEFAULT 0,
  credits_consumed NUMERIC(12,2) DEFAULT 0
);

CREATE INDEX idx_agent_workers_swarm ON agent_workers(swarm_execution_id);
CREATE INDEX idx_agent_workers_task ON agent_workers(task_id);
CREATE INDEX idx_agent_workers_status ON agent_workers(status);
```

#### `mcp_tool_invocations`

```sql
CREATE TABLE mcp_tool_invocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  agent_worker_id UUID REFERENCES agent_workers(id),

  -- Tool
  mcp_server_id UUID NOT NULL REFERENCES mcp_servers(id),
  tool_name TEXT NOT NULL,
  input_args JSONB NOT NULL,

  -- Result
  success BOOLEAN NOT NULL,
  result JSONB,
  error_message TEXT,

  -- Performance
  duration_ms INTEGER,

  -- Credits
  credits_consumed NUMERIC(12,2) DEFAULT 0,

  -- Timestamp
  invoked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mcp_invocations_tenant ON mcp_tool_invocations(tenant_id);
CREATE INDEX idx_mcp_invocations_server ON mcp_tool_invocations(mcp_server_id);
CREATE INDEX idx_mcp_invocations_worker ON mcp_tool_invocations(agent_worker_id);
CREATE INDEX idx_mcp_invocations_timestamp ON mcp_tool_invocations(invoked_at);
```

---

## API DESIGN

### New Edge Functions

#### 1. `swarm-execute`

**Purpose:** Start a swarm execution for a goal

**Endpoint:** `POST /functions/v1/swarm-execute`

**Request:**
```typescript
{
  projectId?: string; // Optional: link to project
  goal: string;
  context: {
    userMessage?: string;
    repRoomId?: string;
    additionalContext?: Record<string, unknown>;
  };
  options?: {
    maxParallelAgents?: number; // Default: 5
    communicationChannel?: 'rep_room' | 'slack' | 'email';
  };
}
```

**Response:**
```typescript
{
  swarmExecutionId: string;
  status: 'planning' | 'executing';
  estimatedDuration: string;
  plan: {
    totalTasks: number;
    waves: number;
    estimatedCredits: number;
  };
}
```

#### 2. `mcp-servers-test-connection`

**Purpose:** Test an MCP server connection

**Endpoint:** `POST /functions/v1/mcp-servers-test-connection`

**Request:**
```typescript
{
  serverId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  availableTools: Array<{
    name: string;
    description: string;
  }>;
  latency: number; // ms
  error?: string;
}
```

#### 3. `collaboration-respond`

**Purpose:** User responds to agent question

**Endpoint:** `POST /functions/v1/collaboration-respond`

**Request:**
```typescript
{
  sessionId: string;
  response: string;
  additionalContext?: Record<string, unknown>;
}
```

**Response:**
```typescript
{
  success: boolean;
  agentAcknowledgement: string;
  nextSteps: string;
}
```

#### 4. `knowledge-user-import`

**Purpose:** Import items to user's personal knowledge base

**Endpoint:** `POST /functions/v1/knowledge-user-import`

**Request:**
```typescript
{
  userId: string;
  items: Array<{
    type: 'note' | 'contact' | 'testimonial' | 'file' | 'link';
    title: string;
    content: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }>;
}
```

**Response:**
```typescript
{
  success: boolean;
  itemsCreated: number;
  itemsSkipped: number;
}
```

---

## IMPLEMENTATION ROADMAP

### Phase 1: MCP Infrastructure (Weeks 1-3)

**Week 1: Core MCP Integration**
- [ ] Create `MCPServerRegistry` class
- [ ] Create `MCPConnectionPool` class
- [ ] Implement stdio connection handler
- [ ] Implement SSE connection handler
- [ ] Create `mcp_servers` table and RLS policies
- [ ] Build MCP server CRUD APIs

**Week 2: Knowledge Base MCP Servers**
- [ ] Create `@dreamcrew/tenant-kb-mcp-server` package
- [ ] Create `@dreamcrew/user-kb-mcp-server` package
- [ ] Create `user_knowledge_items` table
- [ ] Implement `search_knowledge()` tool
- [ ] Implement `list_knowledge_categories()` tool
- [ ] Test with Claude Desktop

**Week 3: DreamCrew Meta Play MCP Server**
- [ ] Create `@dreamcrew/metaplay-mcp-server` package
- [ ] Implement `create_tenant_account` tool
- [ ] Implement `analyze_prospect_website` tool
- [ ] Implement `provision_ai_assistant` tool
- [ ] Implement `populate_initial_knowledge` tool
- [ ] Test end-to-end provisioning flow

### Phase 2: Multi-Agent Orchestration (Weeks 4-6)

**Week 4: Swarm Core**
- [ ] Create `SwarmOrchestrator` class
- [ ] Create `TaskDecomposer` class
- [ ] Create `AgentPoolManager` class
- [ ] Create database tables (swarm_executions, agent_workers)
- [ ] Implement task dependency graph builder

**Week 5: Agent Reasoning**
- [ ] Create `AgentReasoningEngine` class
- [ ] Implement plan generation with LLM
- [ ] Implement step execution with retry logic
- [ ] Implement parallel execution waves
- [ ] Add progress tracking

**Week 6: Testing & Integration**
- [ ] Test with simple goals (3 steps)
- [ ] Test with complex goals (10+ steps)
- [ ] Test parallel execution (5 agents)
- [ ] Performance optimization
- [ ] Error handling and recovery

### Phase 3: Human Collaboration (Weeks 7-8)

**Week 7: Collaboration Core**
- [ ] Create `HumanCollaborationManager` class
- [ ] Create `collaboration_sessions` table
- [ ] Implement `askForInput()` method
- [ ] Implement multi-channel messaging (Slack, Email, Rep Room)
- [ ] Implement response waiting with timeout

**Week 8: Conversational HITL**
- [ ] Build conversational approval UI in rep rooms
- [ ] Integrate with Slack MCP server
- [ ] Integrate with Email MCP server
- [ ] Test approval flows
- [ ] Test modification flows

### Phase 4: Integration & Polish (Weeks 9-10)

**Week 9: End-to-End Testing**
- [ ] Test full workflow: Goal → Planning → Execution → HITL → Completion
- [ ] Test with multiple MCP servers (5+)
- [ ] Test credit consumption tracking
- [ ] Test error scenarios
- [ ] Load testing (10 concurrent swarms)

**Week 10: Documentation & Launch**
- [ ] Write developer documentation
- [ ] Create video tutorials
- [ ] Write user guides
- [ ] Deploy to production
- [ ] Monitor metrics

**Total Timeline:** 10 weeks

---

## CODE EXAMPLES

### Example 1: Complete Swarm Execution

```typescript
// User requests: "Help me launch a Google Ads campaign"

// 1. Orchestrator receives goal
const swarmExecution = await swarmOrchestrator.executeGoal(
  "Launch a Google Ads campaign for kitchen remodeling business",
  {
    tenantId: 'tenant-uuid',
    userId: 'user-uuid',
    repRoomId: 'reproom-uuid',
    communicationChannel: 'slack',
  }
);

// 2. Orchestrator uses AI to decompose goal
const plan = await taskDecomposer.analyze(goal, context);
// Returns:
// {
//   tasks: [
//     { id: 't1', description: 'Research keywords', tool: 'dataforseo', dependencies: [] },
//     { id: 't2', description: 'Analyze competitors', tool: 'tavily', dependencies: [] },
//     { id: 't3', description: 'Get company info', tool: 'tenant_kb', dependencies: [] },
//     { id: 't4', description: 'Draft ad copy', tool: 'llm', dependencies: ['t1', 't2', 't3'] },
//     { id: 't5', description: 'Create campaign', tool: 'google_ads', dependencies: ['t4'], needsApproval: true },
//   ],
//   waves: [
//     ['t1', 't2', 't3'], // Parallel
//     ['t4'],            // Sequential
//     ['t5'],            // Sequential + approval
//   ]
// }

// 3. Execute wave 1 (parallel)
const wave1Agents = await agentPool.spawnMultiple([
  { taskId: 't1', tools: ['dataforseo'] },
  { taskId: 't2', tools: ['tavily'] },
  { taskId: 't3', tools: ['tenant_kb'] },
]);

const wave1Results = await Promise.all(
  wave1Agents.map(agent => agent.execute())
);

// 4. Execute wave 2 (sequential)
const wave2Agent = await agentPool.spawn({
  taskId: 't4',
  tools: ['llm'],
  context: {
    keywords: wave1Results[0],
    competitors: wave1Results[1],
    companyInfo: wave1Results[2],
  },
});

const adCopy = await wave2Agent.execute();

// 5. Execute wave 3 (needs approval)
const wave3Agent = await agentPool.spawn({
  taskId: 't5',
  tools: ['google_ads'],
  onNeedApproval: async (draft) => {
    const approval = await humanCollab.askForInput(
      wave3Agent.id,
      `I've drafted this Google Ads campaign:\n\n${JSON.stringify(draft, null, 2)}\n\nShould I create it?`,
      context,
      { urgency: 'medium', suggestedResponses: ['Yes', 'Modify', 'No'] }
    );

    if (approval === 'Modify') {
      const modification = await humanCollab.askForInput(
        wave3Agent.id,
        'What changes would you like?',
        context
      );

      return { action: 'modify', changes: modification };
    }

    return { action: approval.toLowerCase() };
  },
});

const campaignResult = await wave3Agent.execute();

// 6. Send confirmation
await mcpPool.invokeTool('slack-mcp', 'send_message', {
  userId: context.userId,
  text: `✅ Google Ads campaign created successfully!\n\nCampaign ID: ${campaignResult.campaignId}\nBudget: $${campaignResult.dailyBudget}/day\nKeywords: ${campaignResult.keywords.length}`,
});
```

### Example 2: Agent Reasoning Through Problem

```typescript
// Agent receives goal: "Find contact info for prospects in my CRM"

// 1. Agent analyzes available tools
const availableTools = await mcpRegistry.discoverAvailableServers(tenantId, userId);
// Returns: [
//   { name: 'hubspot-mcp', description: 'Access HubSpot CRM' },
//   { name: 'apollo-mcp', description: 'Find contact information' },
//   { name: 'email-mcp', description: 'Send emails' }
// ]

// 2. Agent generates plan
const plan = await reasoningEngine.generatePlan(
  "Find contact info for prospects in my CRM",
  availableTools,
  context
);
// Returns:
// {
//   steps: [
//     {
//       id: 'step-1',
//       description: 'List all prospects in HubSpot without phone numbers',
//       tool: 'hubspot-mcp',
//       toolName: 'search_contacts',
//       args: { filters: { phone: { exists: false } } },
//       reasoning: 'Need to identify which prospects are missing contact info',
//     },
//     {
//       id: 'step-2',
//       description: 'For each prospect, find their phone number using Apollo',
//       tool: 'apollo-mcp',
//       toolName: 'find_contact_info',
//       args: { /* will be filled per prospect */ },
//       dependencies: ['step-1'],
//       reasoning: 'Apollo can enrich contact data with phone numbers',
//     },
//     {
//       id: 'step-3',
//       description: 'Update HubSpot with new phone numbers',
//       tool: 'hubspot-mcp',
//       toolName: 'update_contact',
//       args: { /* will be filled per prospect */ },
//       dependencies: ['step-2'],
//       reasoning: 'Need to save the enriched data back to CRM',
//     },
//   ],
//   estimatedDuration: '5 minutes',
//   confidence: 0.85,
// }

// 3. Execute plan
for (const step of plan.steps) {
  const result = await reasoningEngine.executeStep(step, context);

  if (!result.success) {
    // Agent reasons about error and adapts
    const recovery = await reasoningEngine.recoverFromError(
      step,
      result.error,
      availableTools
    );

    if (recovery.canRecover) {
      // Try alternative approach
      await reasoningEngine.executeStep(recovery.alternativeStep, context);
    } else {
      // Ask human for help
      await humanCollab.askForInput(
        agentId,
        `I encountered an error: ${result.error}. How should I proceed?`,
        context
      );
    }
  }
}
```

### Example 3: Hierarchical Knowledge Base Access

```typescript
// Agent needs information - checks user KB first, then tenant KB

async function searchWithFallback(
  query: string,
  userId: string,
  tenantId: string
): Promise<KnowledgeResult[]> {
  // 1. Search user's personal knowledge base
  const userResults = await mcpPool.invokeTool(
    'user-kb-mcp',
    'search_knowledge',
    {
      query,
      limit: 5,
    },
    { userId } // User-scoped MCP server
  );

  // 2. If user results are relevant enough, use them
  if (userResults.some((r: any) => r.similarity > 0.85)) {
    return userResults.map((r: any) => ({
      ...r,
      source: 'personal',
    }));
  }

  // 3. Otherwise, search tenant knowledge base
  const tenantResults = await mcpPool.invokeTool(
    'tenant-kb-mcp',
    'search_knowledge',
    {
      query,
      limit: 5,
    },
    { tenantId } // Tenant-scoped MCP server
  );

  return [
    ...userResults.map((r: any) => ({ ...r, source: 'personal' })),
    ...tenantResults.map((r: any) => ({ ...r, source: 'company' })),
  ];
}

// Usage in agent
const relevantInfo = await searchWithFallback(
  "What's our pricing for the pro plan?",
  userId,
  tenantId
);

// Agent can now see:
// - If salesperson has personal notes about pricing (userResults)
// - Company-wide pricing info (tenantResults)
// - Source of each piece of information
```

---

## SUCCESS CRITERIA

### Technical Metrics

- [ ] **Parallel Speedup**: 5 agents execute 5x faster than sequential
- [ ] **MCP Server Discovery**: < 100ms to discover available servers
- [ ] **Tool Invocation Latency**: < 500ms average
- [ ] **Plan Generation**: < 3 seconds for complex goals
- [ ] **Human Response Time**: User responds within 5 minutes (on average)
- [ ] **Knowledge Search**: < 200ms, relevance > 0.8 similarity
- [ ] **Credit Tracking Accuracy**: 100% of tool invocations tracked

### Business Metrics

- [ ] **Agent Autonomy**: 80% of tasks completed without human input
- [ ] **User Satisfaction**: 4.5+ / 5 rating for conversational HITL
- [ ] **Adoption Rate**: 50% of tenants configure custom MCP servers within 30 days
- [ ] **Meta Play Success**: 90%+ successful account provisioning
- [ ] **Knowledge Base Usage**: Agents cite knowledge base in 60%+ of responses

### Operational Metrics

- [ ] **Uptime**: 99.9% for MCP connection pool
- [ ] **Error Rate**: < 1% tool invocation failures
- [ ] **Recovery Rate**: 95% of errors recovered automatically
- [ ] **Support Tickets**: < 5% increase despite 10x feature complexity

---

## APPENDICES

### Appendix A: MCP Server Configuration Examples

#### Slack MCP Server Configuration

```json
{
  "name": "slack-adapter",
  "publicName": "Team Communication",
  "connectionType": "stdio",
  "command": "npx",
  "args": ["@slack/mcp-server"],
  "credentialsRequired": true,
  "credentialsSchema": {
    "type": "object",
    "properties": {
      "botToken": {
        "type": "string",
        "description": "Slack Bot User OAuth Token (starts with xoxb-)"
      },
      "signingSecret": {
        "type": "string",
        "description": "Slack App Signing Secret"
      }
    },
    "required": ["botToken"]
  },
  "tools": [
    "send_message",
    "send_dm",
    "list_channels",
    "get_channel_history",
    "react_to_message"
  ]
}
```

#### WordPress MCP Server Configuration

```json
{
  "name": "wordpress-adapter",
  "publicName": "Content Management",
  "connectionType": "sse",
  "url": "https://wordpress-mcp-server.example.com",
  "credentialsRequired": true,
  "credentialsSchema": {
    "type": "object",
    "properties": {
      "siteUrl": {
        "type": "string",
        "description": "WordPress site URL (e.g., https://myblog.com)"
      },
      "applicationPassword": {
        "type": "string",
        "description": "WordPress Application Password"
      }
    },
    "required": ["siteUrl", "applicationPassword"]
  },
  "tools": [
    "create_post",
    "update_post",
    "list_posts",
    "upload_media",
    "get_site_stats"
  ]
}
```

### Appendix B: Agent Prompt Templates

#### Generic Task Agent Prompt

```
You are an AI agent specialized in [SPECIALTY]. You are working on a subtask as part of a larger project.

YOUR GOAL:
[GOAL_DESCRIPTION]

CONTEXT:
[CONTEXT_JSON]

AVAILABLE TOOLS:
[TOOL_LIST_WITH_DESCRIPTIONS]

APPROACH:
1. Analyze the goal and context carefully
2. Determine the best sequence of tool invocations
3. Execute tools and analyze results
4. If you encounter uncertainty, ask the human for clarification
5. When complete, provide a clear summary of what you accomplished

GUIDELINES:
- Cite sources when using information from knowledge bases
- Ask for approval before taking destructive actions (delete, publish, etc.)
- Provide progress updates as you work
- If a tool fails, try an alternative approach or ask for help
- Be efficient but thorough

Remember: You have the autonomy to figure out HOW to achieve the goal. Think step-by-step and use your reasoning abilities.
```

### Appendix C: Error Recovery Strategies

| Error Type | Recovery Strategy |
|------------|------------------|
| **Tool Invocation Failure** | 1. Retry with exponential backoff (3x)<br>2. Try alternative tool if available<br>3. Ask human for guidance |
| **MCP Server Unreachable** | 1. Mark server as unhealthy<br>2. Attempt reconnection after 60s<br>3. Use cached results if available<br>4. Notify tenant admin |
| **Human Response Timeout** | 1. Send reminder after 50% of timeout<br>2. On timeout, pause execution<br>3. Create notification in dashboard<br>4. Resume when user responds |
| **Insufficient Credits** | 1. Pause execution immediately<br>2. Notify tenant admin via email<br>3. Provide credit top-up link<br>4. Resume when credits added |
| **Invalid Tool Arguments** | 1. Use AI to fix arguments based on schema<br>2. If can't fix, ask human for correct values<br>3. Log invalid calls for debugging |

---

## CONCLUSION

This specification provides a complete blueprint for transforming DreamCrew into a **reasoning-first, MCP-native, multi-agent orchestration platform**.

**Key Innovations:**

1. **Everything is an MCP Server** - Consistent interface for all capabilities
2. **Agents Reason, Not Script** - They figure out HOW to achieve goals
3. **Parallel by Default** - 5-10x faster than sequential execution
4. **Conversational HITL** - Natural collaboration, not forms
5. **Hierarchical Knowledge** - Personal + Company knowledge bases
6. **Meta Play** - DreamCrew provisions itself via MCP

**Implementation Path:**

- **Phase 1 (Weeks 1-3):** MCP infrastructure + knowledge base servers
- **Phase 2 (Weeks 4-6):** Multi-agent orchestration + reasoning
- **Phase 3 (Weeks 7-8):** Human collaboration system
- **Phase 4 (Weeks 9-10):** Testing + launch

**Total Effort:** ~400-500 hours over 10 weeks

---

**Ready for implementation by DreamCrew coder.**

**Document Version:** 1.0
**Status:** ✅ Complete and Ready
**Next Step:** Begin Phase 1 - Week 1 implementation
