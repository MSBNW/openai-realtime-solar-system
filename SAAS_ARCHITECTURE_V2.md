# Universal Business Automation SaaS with Claude-Flow
## Multi-Purpose AI Agent Platform with Custom MCP Integrations

---

## Vision: The Universal Business Automation Platform

Instead of limiting to content creation, build a platform where:

1. **Tenants connect their tools** (HubSpot, Google Workspace, SEO tools, etc.)
2. **Request any business task** in natural language
3. **System dynamically creates agent crews** based on task requirements
4. **Agents use connected tools** to complete work automatically

### Examples of What Becomes Possible:

**"Generate 10 blog posts about our new product, optimize for SEO, and schedule them"**
→ Crew: Content writers + SEO specialists + Calendar agent
→ Tools: DataForSEO + Google Calendar + CMS

**"Find 50 leads in the fintech space and enrich their data"**
→ Crew: Researchers + Data enrichers + CRM agent
→ Tools: Tavily + Clearbit + HubSpot

**"Follow up with all leads who haven't responded in 7 days"**
→ Crew: Analyst + Copywriter + Email agent
→ Tools: HubSpot CRM + Gmail/SendGrid

**"Analyze competitor content and create better versions"**
→ Crew: Researchers + Analysts + Writers + SEO
→ Tools: Tavily + DataForSEO + Ahrefs API

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              Universal Automation Platform                   │
├─────────────────────────────────────────────────────────────┤
│  Frontend Dashboard                                          │
│  - Natural language task input                               │
│  - MCP server marketplace & connection UI                    │
│  - Workflow builder (optional)                               │
│  - Real-time task monitoring                                 │
│  - Integration management                                    │
├─────────────────────────────────────────────────────────────┤
│  Task Intelligence Layer                                     │
│  - Natural language understanding                            │
│  - Task decomposition                                        │
│  - Required capabilities detection                           │
│  - Dynamic crew composition                                  │
│  - Tool selection & routing                                  │
├─────────────────────────────────────────────────────────────┤
│  MCP Integration Hub                                         │
│  - Tenant-specific MCP server connections                    │
│  - Tool capability registry                                  │
│  - Authentication & credential management                    │
│  - Request routing & rate limiting                           │
│  - Usage tracking per integration                            │
├─────────────────────────────────────────────────────────────┤
│  Claude-Flow Orchestration Engine                            │
│  - Dynamic swarm creation                                    │
│  - Agent specialization & assignment                         │
│  - Inter-agent communication                                 │
│  - Task execution coordination                               │
│  - Memory & context management                               │
├─────────────────────────────────────────────────────────────┤
│  Connected MCP Servers (Per Tenant)                          │
│  ┌──────────────┬──────────────┬──────────────┐             │
│  │ Business     │ Marketing    │ Development  │             │
│  ├──────────────┼──────────────┼──────────────┤             │
│  │• HubSpot     │• DataForSEO  │• GitHub      │             │
│  │• Salesforce  │• Ahrefs      │• Jira        │             │
│  │• Pipedrive   │• SEMrush     │• Linear      │             │
│  ├──────────────┼──────────────┼──────────────┤             │
│  │ Productivity │ Research     │ Communication│             │
│  ├──────────────┼──────────────┼──────────────┤             │
│  │• Google WS   │• Tavily      │• Slack       │             │
│  │• Microsoft   │• Perplexity  │• Discord     │             │
│  │• Notion      │• Exa         │• Email APIs  │             │
│  └──────────────┴──────────────┴──────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Implementation

### 1. MCP Connection Manager

```typescript
// apps/api/src/services/mcp-connection-manager.ts

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface MCPServerConfig {
  id: string;
  tenantId: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  capabilities?: string[];
  category: 'business' | 'marketing' | 'productivity' | 'research' | 'communication' | 'development';
}

export interface MCPTool {
  serverId: string;
  name: string;
  description: string;
  inputSchema: any;
  category: string;
}

export class MCPConnectionManager {
  private connections: Map<string, Client> = new Map();
  private toolRegistry: Map<string, MCPTool[]> = new Map();

  /**
   * Connect tenant to an MCP server
   */
  async connectServer(config: MCPServerConfig): Promise<void> {
    const connectionKey = `${config.tenantId}:${config.id}`;

    // Create transport
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: {
        ...process.env,
        ...config.env
      }
    });

    // Create and connect client
    const client = new Client({
      name: `tenant-${config.tenantId}`,
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await client.connect(transport);

    // Store connection
    this.connections.set(connectionKey, client);

    // Discover and register tools
    await this.discoverTools(config);

    // Save to database
    await prisma.mcpConnection.create({
      data: {
        id: config.id,
        tenantId: config.tenantId,
        name: config.name,
        command: config.command,
        args: config.args,
        env: config.env,
        category: config.category,
        status: 'connected'
      }
    });
  }

  /**
   * Discover tools available from MCP server
   */
  private async discoverTools(config: MCPServerConfig): Promise<void> {
    const connectionKey = `${config.tenantId}:${config.id}`;
    const client = this.connections.get(connectionKey);

    if (!client) return;

    // List available tools
    const { tools } = await client.listTools();

    // Register tools in our registry
    const mcpTools: MCPTool[] = tools.map(tool => ({
      serverId: config.id,
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema,
      category: config.category
    }));

    this.toolRegistry.set(connectionKey, mcpTools);

    // Save to database for quick lookup
    await prisma.mcpTool.createMany({
      data: mcpTools.map(tool => ({
        serverId: config.id,
        tenantId: config.tenantId,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        category: tool.category
      }))
    });
  }

  /**
   * Execute tool on connected MCP server
   */
  async executeTool(
    tenantId: string,
    serverId: string,
    toolName: string,
    args: any
  ): Promise<any> {
    const connectionKey = `${tenantId}:${serverId}`;
    const client = this.connections.get(connectionKey);

    if (!client) {
      throw new Error(`No connection found for ${connectionKey}`);
    }

    const result = await client.callTool({
      name: toolName,
      arguments: args
    });

    return result;
  }

  /**
   * Get all tools available to a tenant
   */
  async getTenantTools(tenantId: string): Promise<MCPTool[]> {
    const connections = await prisma.mcpConnection.findMany({
      where: {
        tenantId,
        status: 'connected'
      },
      include: {
        tools: true
      }
    });

    return connections.flatMap(conn =>
      conn.tools.map(tool => ({
        serverId: conn.id,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        category: conn.category
      }))
    );
  }

  /**
   * Find tools by capability
   */
  async findToolsByCapability(
    tenantId: string,
    capability: string
  ): Promise<MCPTool[]> {
    const allTools = await this.getTenantTools(tenantId);

    // Use semantic matching to find relevant tools
    return allTools.filter(tool =>
      tool.description.toLowerCase().includes(capability.toLowerCase()) ||
      tool.name.toLowerCase().includes(capability.toLowerCase())
    );
  }

  /**
   * Disconnect MCP server
   */
  async disconnectServer(tenantId: string, serverId: string): Promise<void> {
    const connectionKey = `${tenantId}:${serverId}`;
    const client = this.connections.get(connectionKey);

    if (client) {
      await client.close();
      this.connections.delete(connectionKey);
      this.toolRegistry.delete(connectionKey);
    }

    await prisma.mcpConnection.update({
      where: { id: serverId },
      data: { status: 'disconnected' }
    });
  }
}
```

### 2. Task Intelligence Engine

```typescript
// apps/api/src/services/task-intelligence-engine.ts

import Anthropic from '@anthropic-ai/sdk';
import { MCPConnectionManager } from './mcp-connection-manager';

export interface TaskAnalysis {
  taskType: string;
  complexity: 'simple' | 'medium' | 'complex';
  requiredCapabilities: string[];
  suggestedAgents: AgentSpec[];
  requiredTools: string[];
  estimatedDuration: number;
  steps: TaskStep[];
}

export interface AgentSpec {
  role: string;
  responsibilities: string[];
  requiredTools: string[];
}

export interface TaskStep {
  order: number;
  description: string;
  agent: string;
  tools: string[];
  dependencies: number[];
}

export class TaskIntelligenceEngine {
  private anthropic: Anthropic;
  private mcpManager: MCPConnectionManager;

  constructor(mcpManager: MCPConnectionManager) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.mcpManager = mcpManager;
  }

  /**
   * Analyze task and plan execution
   */
  async analyzeTask(
    tenantId: string,
    taskDescription: string
  ): Promise<TaskAnalysis> {
    // Get available tools for tenant
    const availableTools = await this.mcpManager.getTenantTools(tenantId);

    // Use Claude to analyze the task
    const analysisPrompt = `
You are a task planning AI. Analyze this business task and create an execution plan.

Task: ${taskDescription}

Available Tools:
${availableTools.map(t => `- ${t.name} (${t.category}): ${t.description}`).join('\n')}

Provide a JSON response with:
1. Task type (content, sales, marketing, research, automation)
2. Complexity level
3. Required capabilities (e.g., "web search", "CRM access", "content writing")
4. Suggested agent crew with roles and responsibilities
5. Which tools each agent needs
6. Step-by-step execution plan
7. Estimated duration in minutes

Format as JSON.
`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: analysisPrompt
      }]
    });

    const analysis = JSON.parse(
      response.content[0].type === 'text'
        ? response.content[0].text
        : '{}'
    );

    return {
      taskType: analysis.taskType,
      complexity: analysis.complexity,
      requiredCapabilities: analysis.requiredCapabilities,
      suggestedAgents: analysis.agents,
      requiredTools: analysis.tools,
      estimatedDuration: analysis.estimatedDuration,
      steps: analysis.steps
    };
  }

  /**
   * Validate if tenant has required tools
   */
  async validateToolAvailability(
    tenantId: string,
    analysis: TaskAnalysis
  ): Promise<{
    canExecute: boolean;
    missingTools: string[];
    suggestions: string[];
  }> {
    const availableTools = await this.mcpManager.getTenantTools(tenantId);
    const availableToolNames = new Set(availableTools.map(t => t.name));

    const missingTools = analysis.requiredTools.filter(
      tool => !availableToolNames.has(tool)
    );

    const suggestions = missingTools.map(tool => {
      // Suggest which MCP server to connect
      const suggestions: Record<string, string> = {
        'search': 'Connect Tavily or Perplexity for web search',
        'crm': 'Connect HubSpot or Salesforce for CRM access',
        'seo': 'Connect DataForSEO or Ahrefs for SEO tools',
        'calendar': 'Connect Google Calendar or Microsoft Calendar',
        'email': 'Connect Gmail or SendGrid for email',
      };

      return suggestions[tool] || `Connect an MCP server that provides: ${tool}`;
    });

    return {
      canExecute: missingTools.length === 0,
      missingTools,
      suggestions
    };
  }
}
```

### 3. Dynamic Swarm Orchestrator

```typescript
// apps/api/src/services/dynamic-swarm-orchestrator.ts

import { ClaudeFlowService } from './claude-flow-service';
import { TaskIntelligenceEngine, TaskAnalysis } from './task-intelligence-engine';
import { MCPConnectionManager } from './mcp-connection-manager';

export class DynamicSwarmOrchestrator {
  private claudeFlow: ClaudeFlowService;
  private taskIntelligence: TaskIntelligenceEngine;
  private mcpManager: MCPConnectionManager;

  constructor() {
    this.mcpManager = new MCPConnectionManager();
    this.taskIntelligence = new TaskIntelligenceEngine(this.mcpManager);
    this.claudeFlow = new ClaudeFlowService();
  }

  /**
   * Execute any business task
   */
  async executeTask(
    tenantId: string,
    userId: string,
    taskDescription: string
  ): Promise<{ taskId: string; status: string; analysis: TaskAnalysis }> {
    // 1. Analyze the task
    const analysis = await this.taskIntelligence.analyzeTask(
      tenantId,
      taskDescription
    );

    // 2. Validate tool availability
    const validation = await this.taskIntelligence.validateToolAvailability(
      tenantId,
      analysis
    );

    if (!validation.canExecute) {
      throw new Error(
        `Missing required tools: ${validation.missingTools.join(', ')}. ` +
        `Suggestions: ${validation.suggestions.join('; ')}`
      );
    }

    // 3. Create task record
    const task = await prisma.businessTask.create({
      data: {
        tenantId,
        userId,
        description: taskDescription,
        type: analysis.taskType,
        complexity: analysis.complexity,
        status: 'planning',
        analysis: analysis as any,
        estimatedDuration: analysis.estimatedDuration
      }
    });

    // 4. Initialize swarm with dynamic configuration
    const swarmConfig = this.buildSwarmConfig(tenantId, task.id, analysis);
    await this.claudeFlow.initDynamicSwarm(swarmConfig);

    // 5. Create specialized agents
    for (const agentSpec of analysis.suggestedAgents) {
      await this.claudeFlow.spawnAgent(tenantId, {
        taskId: task.id,
        role: agentSpec.role,
        responsibilities: agentSpec.responsibilities,
        tools: agentSpec.requiredTools
      });
    }

    // 6. Start execution
    await this.executeSteps(tenantId, task.id, analysis.steps);

    return {
      taskId: task.id,
      status: 'executing',
      analysis
    };
  }

  /**
   * Build swarm configuration based on task analysis
   */
  private buildSwarmConfig(
    tenantId: string,
    taskId: string,
    analysis: TaskAnalysis
  ): any {
    // Determine topology based on complexity
    const topology = analysis.complexity === 'complex'
      ? 'hierarchical'
      : analysis.complexity === 'medium'
      ? 'mesh'
      : 'star';

    // Determine agent count
    const maxAgents = analysis.suggestedAgents.length;

    // Build execution strategy
    const strategy = analysis.steps.some(s => s.dependencies.length > 0)
      ? 'sequential'
      : 'parallel';

    return {
      tenantId,
      taskId,
      topology,
      maxAgents,
      strategy,
      memoryKey: `task/${taskId}`
    };
  }

  /**
   * Execute task steps with agent coordination
   */
  private async executeSteps(
    tenantId: string,
    taskId: string,
    steps: any[]
  ): Promise<void> {
    // Group steps by dependency level
    const stepLevels = this.groupStepsByDependency(steps);

    for (const level of stepLevels) {
      // Execute all steps at this level in parallel
      await Promise.all(
        level.map(step => this.executeStep(tenantId, taskId, step))
      );
    }
  }

  /**
   * Execute individual step
   */
  private async executeStep(
    tenantId: string,
    taskId: string,
    step: any
  ): Promise<void> {
    // Store step context in memory
    await this.claudeFlow.storeMemory(
      tenantId,
      `task/${taskId}/step/${step.order}/context`,
      step
    );

    // Build prompt for the assigned agent
    const prompt = `
Execute this step: ${step.description}

Available tools: ${step.tools.join(', ')}

Previous step results: ${await this.getPreviousStepResults(tenantId, taskId, step.dependencies)}

Provide your result in structured format.
`;

    // Execute via claude-flow
    await this.claudeFlow.executeAgentTask(tenantId, {
      agent: step.agent,
      prompt,
      tools: step.tools
    });
  }

  /**
   * Get results from previous steps
   */
  private async getPreviousStepResults(
    tenantId: string,
    taskId: string,
    dependencies: number[]
  ): Promise<string> {
    if (dependencies.length === 0) {
      return 'None (first step)';
    }

    const results = await Promise.all(
      dependencies.map(stepOrder =>
        this.claudeFlow.getMemory(
          tenantId,
          `task/${taskId}/step/${stepOrder}/result`
        )
      )
    );

    return JSON.stringify(results);
  }

  /**
   * Group steps by dependency level for parallel execution
   */
  private groupStepsByDependency(steps: any[]): any[][] {
    const levels: any[][] = [];
    const processed = new Set<number>();

    while (processed.size < steps.length) {
      const currentLevel = steps.filter(step =>
        !processed.has(step.order) &&
        step.dependencies.every((dep: number) => processed.has(dep))
      );

      if (currentLevel.length === 0) break;

      levels.push(currentLevel);
      currentLevel.forEach(step => processed.add(step.order));
    }

    return levels;
  }
}
```

### 4. MCP Integration Examples

```typescript
// apps/api/src/integrations/mcp-presets.ts

export const MCP_SERVER_PRESETS = {
  // Marketing & SEO
  dataforseo: {
    name: 'DataForSEO',
    category: 'marketing',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-dataforseo'],
    env: {
      DATAFORSEO_LOGIN: '{{TENANT_CREDENTIAL}}',
      DATAFORSEO_PASSWORD: '{{TENANT_CREDENTIAL}}'
    },
    capabilities: ['seo_analysis', 'keyword_research', 'serp_data']
  },

  // Research
  tavily: {
    name: 'Tavily Search',
    category: 'research',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-tavily'],
    env: {
      TAVILY_API_KEY: '{{TENANT_CREDENTIAL}}'
    },
    capabilities: ['web_search', 'news_search', 'research']
  },

  // CRM - HubSpot
  hubspot: {
    name: 'HubSpot',
    category: 'business',
    command: 'npx',
    args: ['-y', 'mcp-server-hubspot'],
    env: {
      HUBSPOT_API_KEY: '{{TENANT_CREDENTIAL}}'
    },
    capabilities: ['crm', 'contacts', 'deals', 'companies', 'tasks']
  },

  // Productivity - Google Workspace
  google_workspace: {
    name: 'Google Workspace',
    category: 'productivity',
    command: 'npx',
    args: ['-y', 'mcp-server-google'],
    env: {
      GOOGLE_CLIENT_ID: '{{TENANT_CREDENTIAL}}',
      GOOGLE_CLIENT_SECRET: '{{TENANT_CREDENTIAL}}',
      GOOGLE_REFRESH_TOKEN: '{{TENANT_CREDENTIAL}}'
    },
    capabilities: ['calendar', 'gmail', 'sheets', 'docs', 'drive']
  },

  // Development
  github: {
    name: 'GitHub',
    category: 'development',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: {
      GITHUB_TOKEN: '{{TENANT_CREDENTIAL}}'
    },
    capabilities: ['code_repository', 'issues', 'pull_requests', 'actions']
  },

  // Communication
  slack: {
    name: 'Slack',
    category: 'communication',
    command: 'npx',
    args: ['-y', 'mcp-server-slack'],
    env: {
      SLACK_BOT_TOKEN: '{{TENANT_CREDENTIAL}}',
      SLACK_APP_TOKEN: '{{TENANT_CREDENTIAL}}'
    },
    capabilities: ['messaging', 'channels', 'files', 'users']
  }
};

// Usage example:
// const mcpManager = new MCPConnectionManager();
// await mcpManager.connectServer({
//   id: generateId(),
//   tenantId: 'tenant-123',
//   ...MCP_SERVER_PRESETS.hubspot,
//   env: {
//     HUBSPOT_API_KEY: tenant.credentials.hubspot_key
//   }
// });
```

---

## API Routes for Universal Platform

```typescript
// apps/api/src/routes/automation.routes.ts

import express from 'express';
import { DynamicSwarmOrchestrator } from '../services/dynamic-swarm-orchestrator';
import { MCPConnectionManager } from '../services/mcp-connection-manager';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const orchestrator = new DynamicSwarmOrchestrator();
const mcpManager = new MCPConnectionManager();

/**
 * POST /api/automation/execute
 * Execute any business task
 */
router.post('/execute', authenticate, async (req, res) => {
  try {
    const { task } = req.body;
    const result = await orchestrator.executeTask(
      req.user.tenantId,
      req.user.id,
      task
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/integrations/connect
 * Connect an MCP server
 */
router.post('/integrations/connect', authenticate, async (req, res) => {
  try {
    const { server, credentials } = req.body;

    await mcpManager.connectServer({
      id: generateId(),
      tenantId: req.user.tenantId,
      ...MCP_SERVER_PRESETS[server],
      env: credentials
    });

    res.json({
      success: true,
      message: `Connected to ${server}`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/integrations
 * List connected integrations
 */
router.get('/integrations', authenticate, async (req, res) => {
  try {
    const connections = await prisma.mcpConnection.findMany({
      where: { tenantId: req.user.tenantId }
    });

    res.json({
      success: true,
      integrations: connections
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/integrations/available
 * List available MCP servers to connect
 */
router.get('/integrations/available', authenticate, async (req, res) => {
  res.json({
    success: true,
    servers: Object.entries(MCP_SERVER_PRESETS).map(([key, preset]) => ({
      id: key,
      name: preset.name,
      category: preset.category,
      capabilities: preset.capabilities
    }))
  });
});

export default router;
```

---

## Real-World Use Cases

### 1. Lead Generation & Enrichment

**Task:** "Find 50 SaaS companies in the fintech space, enrich their data, and add to HubSpot"

**Agent Crew:**
- Researcher: Uses Tavily to find companies
- Data Enricher: Uses Clearbit/DataForSEO for company data
- CRM Agent: Uses HubSpot MCP to add contacts
- Quality Checker: Validates data completeness

**Tools:** Tavily + DataForSEO + HubSpot

---

### 2. Content Marketing Campaign

**Task:** "Create 10 blog posts about AI automation, optimize for SEO, and schedule on our blog"

**Agent Crew:**
- SEO Researcher: Uses DataForSEO for keyword research
- Content Writers (3): Write different posts
- Editor: Reviews and improves content
- SEO Optimizer: Adds meta tags, internal links
- Publisher: Uses WordPress/Ghost API to publish
- Scheduler: Uses Google Calendar to track

**Tools:** DataForSEO + WordPress MCP + Google Calendar

---

### 3. Sales Follow-Up Automation

**Task:** "Follow up with all leads who haven't responded in 7 days with personalized emails"

**Agent Crew:**
- Analyst: Uses HubSpot to identify leads
- Researcher: Uses Tavily to find recent company news
- Copywriter: Writes personalized emails
- Email Agent: Uses Gmail/SendGrid to send
- Tracker: Updates CRM with activities

**Tools:** HubSpot + Tavily + Gmail + Google Sheets

---

### 4. Competitive Analysis

**Task:** "Analyze our top 5 competitors' content strategy and create better content"

**Agent Crew:**
- Researchers (5): Each analyzes one competitor
- SEO Analyst: Identifies content gaps
- Strategist: Creates content plan
- Writers (3): Create superior content
- Publisher: Schedules and publishes

**Tools:** Tavily + DataForSEO + Ahrefs + WordPress

---

### 5. Customer Onboarding Automation

**Task:** "Send onboarding sequence to new customers, schedule kickoff calls, and create Notion docs"

**Agent Crew:**
- Email Agent: Sends welcome sequence
- Calendar Agent: Schedules calls
- Documentation Agent: Creates Notion pages
- Task Agent: Creates tasks in project management
- Notification Agent: Updates Slack

**Tools:** SendGrid + Google Calendar + Notion + Linear + Slack

---

## Database Schema Updates

```prisma
model MCPConnection {
  id        String   @id @default(cuid())
  tenantId  String
  name      String
  command   String
  args      Json
  env       Json
  category  String
  status    String   @default("pending")
  createdAt DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])
  tools  MCPTool[]
}

model MCPTool {
  id           String   @id @default(cuid())
  serverId     String
  tenantId     String
  name         String
  description  String
  inputSchema  Json
  category     String

  server MCPConnection @relation(fields: [serverId], references: [id])
}

model BusinessTask {
  id                String   @id @default(cuid())
  tenantId          String
  userId            String
  description       String   @db.Text
  type              String
  complexity        String
  status            String   // planning, executing, completed, failed
  analysis          Json
  estimatedDuration Int      // minutes
  actualDuration    Int?
  result            Json?
  error             String?
  createdAt         DateTime @default(now())
  completedAt       DateTime?

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   User   @relation(fields: [userId], references: [id])
  steps  TaskStep[]
}

model TaskStep {
  id          String   @id @default(cuid())
  taskId      String
  order       Int
  description String
  agent       String
  tools       Json
  status      String
  result      Json?
  startedAt   DateTime?
  completedAt DateTime?

  task BusinessTask @relation(fields: [taskId], references: [id])
}
```

---

## Frontend: Universal Task Interface

```typescript
// apps/web/components/universal-task-input.tsx

'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export function UniversalTaskInput() {
  const [task, setTask] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const analyzeMutation = useMutation({
    mutationFn: async (taskDescription: string) => {
      const res = await fetch('/api/automation/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskDescription })
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAnalysis(data.analysis);
    }
  });

  const executeMutation = useMutation({
    mutationFn: async (taskDescription: string) => {
      const res = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskDescription })
      });
      return res.json();
    },
    onSuccess: (data) => {
      window.location.href = `/dashboard/tasks/${data.taskId}`;
    }
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">What do you need to automate?</h1>

      <div className="space-y-4">
        <Textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={6}
          placeholder="Describe any business task in natural language...

Examples:
• Generate 10 blog posts about AI and schedule them
• Find 50 leads in fintech and add them to HubSpot
• Follow up with leads who haven't responded in 7 days
• Analyze competitor content and create better versions
• Send onboarding emails to new customers and schedule calls"
        />

        <div className="flex gap-2">
          <Button
            onClick={() => analyzeMutation.mutate(task)}
            disabled={!task || analyzeMutation.isPending}
            variant="outline"
          >
            {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze Task'}
          </Button>

          <Button
            onClick={() => executeMutation.mutate(task)}
            disabled={!task || executeMutation.isPending}
          >
            {executeMutation.isPending ? 'Starting...' : 'Execute Task'}
          </Button>
        </div>

        {analysis && (
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Task Analysis</h3>

            <div className="flex gap-2">
              <Badge>{analysis.taskType}</Badge>
              <Badge variant="outline">{analysis.complexity}</Badge>
              <Badge variant="secondary">
                ~{analysis.estimatedDuration} min
              </Badge>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Agent Crew:</p>
              <ul className="text-sm space-y-1">
                {analysis.suggestedAgents.map((agent, i) => (
                  <li key={i}>• {agent.role}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Required Tools:</p>
              <div className="flex gap-2">
                {analysis.requiredTools.map((tool, i) => (
                  <Badge key={i} variant="outline">{tool}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <TaskExamples />
    </div>
  );
}
```

---

## Pricing for Universal Platform

### Starter - $99/mo
- 50 automation tasks/month
- 5 MCP integrations
- Basic agent crews (3-5 agents)
- Email support

### Professional - $299/mo
- 200 automation tasks/month
- 15 MCP integrations
- Advanced crews (5-10 agents)
- Priority support
- Custom workflows

### Enterprise - Custom
- Unlimited tasks
- Unlimited integrations
- Full agent swarms (10+ agents)
- Dedicated support
- Custom MCP server development
- White-label options

---

## Key Advantages Over Content-Only Approach

1. **Broader Market**: Every business needs automation, not just content
2. **Higher Value**: Solve more problems = higher willingness to pay
3. **Stickier**: Integrated into their tools = harder to leave
4. **Scalable**: Not limited to one use case
5. **Competitive Moat**: Much harder to replicate than simple content generation
6. **Network Effects**: More integrations = more valuable
7. **Upsell Opportunities**: Start with one use case, expand to others

---

## Implementation Roadmap

### Phase 1: MVP (8 weeks)
- Task intelligence engine
- MCP connection manager
- 3 preset integrations (HubSpot, Tavily, Google)
- Basic dashboard
- Simple use cases (content + lead gen)

### Phase 2: Integration Marketplace (8 weeks)
- 10+ MCP integrations
- Integration marketplace UI
- Credential management
- Workflow templates

### Phase 3: Advanced Features (12 weeks)
- Custom workflow builder
- Advanced task decomposition
- Multi-step orchestration
- Analytics & reporting

### Phase 4: Enterprise (Ongoing)
- Custom MCP server development
- White-label platform
- Advanced security & compliance
- Dedicated infrastructure

---

## Summary

**This is a much better business!**

You're building **"The Universal Business Automation Platform"** where:
- Any business can connect their tools
- Request any task in natural language
- AI agent swarms execute automatically
- Works across all business functions

**Market Size:**
- Content creation: $10B
- Business automation: $500B+
- You're playing in the bigger market

**Competitive Position:**
- Not competing with Jasper/Copy.ai (content only)
- Competing with Zapier/Make.com (but with AI agents!)
- Creating new category: "AI Agent Automation Platform"

This approach leverages claude-flow's orchestration while building a platform that can automate virtually any business task through dynamic agent crews and MCP integrations.
