# DreamCrew Meta Play - Comprehensive Implementation Plan

**Last Updated:** November 6, 2025
**Objective:** Enable AI-driven self-service provisioning via MCP server exposure
**Timeline:** 10 weeks for MVP, 24 weeks for complete vision

---

## 📋 TABLE OF CONTENTS

1. [Phase 1: MCP Server Infrastructure](#phase-1-mcp-server-infrastructure) (Weeks 1-3)
2. [Phase 2: Unified Provisioning APIs](#phase-2-unified-provisioning-apis) (Weeks 3-4)
3. [Phase 3: Knowledge Base RAG Pipeline](#phase-3-knowledge-base-rag-pipeline) (Weeks 4-10)
4. [Phase 4: Testing & Integration](#phase-4-testing--integration) (Week 10)
5. [Deployment & Launch](#deployment--launch)
6. [Post-Launch Monitoring](#post-launch-monitoring)

---

## PHASE 1: MCP SERVER INFRASTRUCTURE (Weeks 1-3)

**Goal:** Expose DreamCrew as an MCP server that external AI agents can call

### Week 1: Foundation & Architecture

#### Day 1-2: Project Setup

**Step 1.1: Create MCP Server Package Structure**

```bash
# Create new package in monorepo
mkdir -p packages/mcp-server
cd packages/mcp-server

# Initialize package
npm init -y

# Install dependencies
npm install @modelcontextprotocol/sdk zod
npm install -D typescript @types/node tsx
```

**File Structure:**
```
packages/mcp-server/
├── src/
│   ├── index.ts              # Main entry point
│   ├── server.ts             # MCP server setup
│   ├── tools/
│   │   ├── index.ts          # Tool registry
│   │   ├── create-tenant.ts  # Tool 1
│   │   ├── create-agent.ts   # Tool 2
│   │   ├── populate-kb.ts    # Tool 3 (stub)
│   │   ├── create-tasks.ts   # Tool 4
│   │   ├── generate-widget.ts # Tool 5
│   │   └── send-email.ts     # Tool 6
│   ├── types/
│   │   └── schemas.ts        # Zod schemas
│   └── utils/
│       ├── supabase.ts       # Supabase client
│       └── errors.ts         # Error handling
├── package.json
├── tsconfig.json
└── README.md
```

**Step 1.2: Create Main Server Entry Point**

File: `packages/mcp-server/src/index.ts`

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { toolRegistry } from './tools/index.js';

async function main() {
  const server = new Server(
    {
      name: 'dreamcrew-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register all tools
  server.setRequestHandler('tools/list', async () => {
    return {
      tools: toolRegistry.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.schema,
      })),
    };
  });

  // Handle tool execution
  server.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;

    const tool = toolRegistry.find(t => t.name === name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await tool.execute(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('DreamCrew MCP Server running on stdio');
}

main().catch(console.error);
```

**Step 1.3: Update package.json**

File: `packages/mcp-server/package.json`

```json
{
  "name": "@dreamcrew/mcp-server",
  "version": "1.0.0",
  "description": "DreamCrew MCP Server for AI-driven provisioning",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "dreamcrew-mcp": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "test": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "@supabase/supabase-js": "^2.39.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "tsx": "^4.7.0",
    "vitest": "^1.0.0"
  }
}
```

**Step 1.4: Create Supabase Client Utility**

File: `packages/mcp-server/src/utils/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

**Testing Step 1:**
```bash
cd packages/mcp-server
npm run build
npm run dev

# In another terminal, test with MCP inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

Expected output: MCP server starts, inspector connects, empty tool list shown.

---

#### Day 3-4: Implement Tool 1 (create_tenant_account)

**Step 2.1: Define Zod Schema**

File: `packages/mcp-server/src/types/schemas.ts`

```typescript
import { z } from 'zod';

export const CreateTenantAccountSchema = z.object({
  parentOrganizationId: z.string().uuid(),
  companyName: z.string().min(1).max(100),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(1).max(100),
  plan: z.enum(['starter', 'pro', 'enterprise']),
  credits: z.number().min(0).max(1000000),
  agentLimit: z.number().int().min(0).max(100),
  customization: z.object({
    brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    logo: z.string().url().optional(),
  }),
});

export type CreateTenantAccountInput = z.infer<typeof CreateTenantAccountSchema>;
```

**Step 2.2: Implement Tool Logic**

File: `packages/mcp-server/src/tools/create-tenant.ts`

```typescript
import { supabase } from '../utils/supabase.js';
import { CreateTenantAccountSchema, CreateTenantAccountInput } from '../types/schemas.js';

export const createTenantAccountTool = {
  name: 'create_tenant_account',
  description: 'Create a new tenant organization with initial setup, user invitation, and credit allocation',
  schema: CreateTenantAccountSchema,

  async execute(input: CreateTenantAccountInput) {
    // Step 1: Create organization
    const { data: orgData, error: orgError } = await supabase.functions.invoke(
      'organizations-create',
      {
        body: {
          name: input.companyName,
          org_type: 'tenant',
          parent_org_id: input.parentOrganizationId,
          status: 'active',
        },
      }
    );

    if (orgError || !orgData) {
      throw new Error(`Failed to create organization: ${orgError?.message || 'Unknown error'}`);
    }

    const tenantId = orgData.id;

    try {
      // Step 2: Allocate credits
      const { error: creditsError } = await supabase.functions.invoke(
        'credits-allocate',
        {
          body: {
            from_organization_id: input.parentOrganizationId,
            to_organization_id: tenantId,
            amount: input.credits,
          },
        }
      );

      if (creditsError) {
        throw new Error(`Failed to allocate credits: ${creditsError.message}`);
      }

      // Step 3: Set agent limit
      const { error: billingError } = await supabase.functions.invoke(
        'billing-settings-update',
        {
          body: {
            organization_id: tenantId,
            activated_agent_limit: input.agentLimit,
          },
        }
      );

      if (billingError) {
        throw new Error(`Failed to set agent limit: ${billingError.message}`);
      }

      // Step 4: Create user invitation
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke(
        'invitations-create',
        {
          body: {
            organization_id: tenantId,
            email: input.ownerEmail,
            role: 'tenant_admin',
            metadata: {
              owner_name: input.ownerName,
              plan: input.plan,
            },
          },
        }
      );

      if (inviteError || !inviteData) {
        throw new Error(`Failed to create invitation: ${inviteError?.message || 'Unknown error'}`);
      }

      // Step 5: Apply branding customization
      if (input.customization.brandColor || input.customization.logo) {
        const { error: brandingError } = await supabase.functions.invoke(
          'branding-update',
          {
            body: {
              organization_id: tenantId,
              brand_colors: {
                primary: input.customization.brandColor,
              },
              logo_url: input.customization.logo,
            },
          }
        );

        if (brandingError) {
          console.error('Warning: Failed to apply branding:', brandingError.message);
        }
      }

      // Success! Return complete setup info
      return {
        success: true,
        tenantId,
        inviteLink: inviteData.invite_link,
        organizationDetails: {
          name: input.companyName,
          credits: input.credits,
          agentLimit: input.agentLimit,
          status: 'active',
        },
      };

    } catch (error) {
      // Rollback: Delete organization if any step fails
      await supabase.functions.invoke('organizations-delete', {
        body: { organization_id: tenantId },
      });

      throw error;
    }
  },
};
```

**Step 2.3: Register Tool**

File: `packages/mcp-server/src/tools/index.ts`

```typescript
import { createTenantAccountTool } from './create-tenant.js';

export const toolRegistry = [
  createTenantAccountTool,
  // ... more tools will be added here
];
```

**Testing Step 2:**

Create test file: `packages/mcp-server/tests/create-tenant.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { createTenantAccountTool } from '../src/tools/create-tenant.js';

describe('create_tenant_account', () => {
  it('should create tenant account successfully', async () => {
    const result = await createTenantAccountTool.execute({
      parentOrganizationId: 'test-parent-uuid',
      companyName: 'Test Kitchen',
      ownerEmail: 'owner@testkitchen.com',
      ownerName: 'John Doe',
      plan: 'pro',
      credits: 5000,
      agentLimit: 3,
      customization: {
        brandColor: '#FF6B35',
      },
    });

    expect(result.success).toBe(true);
    expect(result.tenantId).toBeDefined();
    expect(result.inviteLink).toContain('http');
  });
});
```

Run tests:
```bash
npm test
```

---

#### Day 5-7: Implement Remaining Tools (4, 5, 6)

**Step 3.1: Tool 4 - create_implementation_tasks**

File: `packages/mcp-server/src/tools/create-tasks.ts`

```typescript
import { z } from 'zod';
import { supabase } from '../utils/supabase.js';

const CreateImplementationTasksSchema = z.object({
  tenantId: z.string().uuid(),
  projectName: z.string().min(1).max(255),
  tasks: z.array(z.object({
    title: z.string().min(1).max(255),
    description: z.string(),
    priority: z.number().int().min(1).max(4),
    dueDate: z.string().datetime().optional(),
    assignee: z.string().optional(),
  })),
});

export const createImplementationTasksTool = {
  name: 'create_implementation_tasks',
  description: 'Create a project with multiple implementation tasks',
  schema: CreateImplementationTasksSchema,

  async execute(input: z.infer<typeof CreateImplementationTasksSchema>) {
    // Step 1: Create project (insert into agentic_projects)
    const { data: projectData, error: projectError } = await supabase
      .from('agentic_projects')
      .insert({
        organization_id: input.tenantId,
        name: input.projectName,
        status: 'active',
        priority: 'high',
      })
      .select()
      .single();

    if (projectError) {
      throw new Error(`Failed to create project: ${projectError.message}`);
    }

    const projectId = projectData.id;

    // Step 2: Create tasks
    const taskIds: string[] = [];

    for (const task of input.tasks) {
      const { data: taskData, error: taskError } = await supabase.functions.invoke(
        'task-create',
        {
          body: {
            projectId,
            taskType: 'agent_execution',
            title: task.title,
            description: task.description,
            priority: ['low', 'medium', 'high', 'urgent'][task.priority - 1],
            inputPayload: {},
            metadata: {
              dueDate: task.dueDate,
              assignee: task.assignee,
            },
          },
        }
      );

      if (taskError) {
        console.error(`Warning: Failed to create task "${task.title}":`, taskError.message);
      } else {
        taskIds.push(taskData.task.id);
      }
    }

    return {
      success: true,
      projectId,
      taskIds,
      tasksCreated: taskIds.length,
    };
  },
};
```

**Step 3.2: Tool 5 - generate_widget_code**

File: `packages/mcp-server/src/tools/generate-widget.ts`

```typescript
import { z } from 'zod';
import { supabase } from '../utils/supabase.js';

const GenerateWidgetCodeSchema = z.object({
  repRoomId: z.string().uuid(),
  widgetConfig: z.object({
    position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']),
    size: z.enum(['small', 'medium', 'large']),
    trigger: z.enum(['immediate', 'delayed', 'scroll']),
    displayMode: z.enum(['floating', 'center-screen']),
    skipPhases: z.boolean(),
  }),
});

export const generateWidgetCodeTool = {
  name: 'generate_widget_code',
  description: 'Generate widget embed code for a rep room',
  schema: GenerateWidgetCodeSchema,

  async execute(input: z.infer<typeof GenerateWidgetCodeSchema>) {
    // Step 1: Create widget
    const { data: widgetData, error: widgetError } = await supabase
      .from('chat_widgets')
      .insert({
        rep_room_id: input.repRoomId,
        display_mode: input.widgetConfig.displayMode,
        skip_phases: input.widgetConfig.skipPhases,
        title: 'Chat Widget',
      })
      .select()
      .single();

    if (widgetError) {
      throw new Error(`Failed to create widget: ${widgetError.message}`);
    }

    const widgetId = widgetData.id;

    // Step 2: Generate embed code
    const embedCode = `<!-- DreamCrew Chat Widget -->
<script src="https://platform.dreamcrew.ai/widget.js?id=${widgetId}"></script>
<script>
  window.DreamCrewWidget.init({
    widgetId: '${widgetId}',
    position: '${input.widgetConfig.position}',
    size: '${input.widgetConfig.size}',
    trigger: '${input.widgetConfig.trigger}',
  });
</script>`;

    return {
      success: true,
      widgetId,
      embedCode,
    };
  },
};
```

**Step 3.3: Tool 6 - send_onboarding_email**

File: `packages/mcp-server/src/tools/send-email.ts`

```typescript
import { z } from 'zod';
import { supabase } from '../utils/supabase.js';

const SendOnboardingEmailSchema = z.object({
  tenantId: z.string().uuid(),
  recipientEmail: z.string().email(),
  templateData: z.object({
    companyName: z.string(),
    agentName: z.string(),
    repRoomUrl: z.string().url(),
    loginUrl: z.string().url(),
    widgetCode: z.string(),
    planDetails: z.object({
      credits: z.number(),
      agentLimit: z.number(),
      plan: z.string(),
    }),
  }),
});

export const sendOnboardingEmailTool = {
  name: 'send_onboarding_email',
  description: 'Send onboarding email to new tenant with setup details',
  schema: SendOnboardingEmailSchema,

  async execute(input: z.infer<typeof SendOnboardingEmailSchema>) {
    // Generate email HTML
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f5f5f5; }
    .button { display: inline-block; padding: 12px 24px; background: #1976d2; color: white; text-decoration: none; border-radius: 4px; }
    .code-block { background: #263238; color: #aed581; padding: 15px; border-radius: 4px; overflow-x: auto; }
    pre { margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${input.templateData.companyName}!</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>Your AI assistant "${input.templateData.agentName}" is ready! Here's everything you need to get started:</p>

      <h3>🎉 Your Account Details</h3>
      <ul>
        <li><strong>Plan:</strong> ${input.templateData.planDetails.plan}</li>
        <li><strong>Credits:</strong> ${input.templateData.planDetails.credits}</li>
        <li><strong>Agent Limit:</strong> ${input.templateData.planDetails.agentLimit}</li>
      </ul>

      <h3>🔗 Quick Links</h3>
      <p><a href="${input.templateData.loginUrl}" class="button">Access Your Dashboard</a></p>
      <p><a href="${input.templateData.repRoomUrl}" target="_blank">Try Your AI Assistant</a></p>

      <h3>📋 Widget Embed Code</h3>
      <p>Add this code to your website to embed your AI assistant:</p>
      <div class="code-block">
        <pre>${input.templateData.widgetCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
      </div>

      <p>Need help? Reply to this email or visit our support center.</p>
      <p>Best regards,<br>The DreamCrew Team</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send via Supabase Edge Function (assumes email function exists)
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: input.recipientEmail,
        subject: `Welcome to ${input.templateData.companyName} - Your AI Assistant is Ready!`,
        html: emailHTML,
      },
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }

    return {
      success: true,
      emailSent: true,
      messageId: data?.messageId,
    };
  },
};
```

**Step 3.4: Update Tool Registry**

File: `packages/mcp-server/src/tools/index.ts`

```typescript
import { createTenantAccountTool } from './create-tenant.js';
import { createImplementationTasksTool } from './create-tasks.js';
import { generateWidgetCodeTool } from './generate-widget.js';
import { sendOnboardingEmailTool } from './send-email.js';

export const toolRegistry = [
  createTenantAccountTool,
  createImplementationTasksTool,
  generateWidgetCodeTool,
  sendOnboardingEmailTool,
  // Tool 2 and 3 will be added in Phase 2 and 3
];
```

**Testing Step 3:**

Run full integration test:

```bash
npm run build

# Test with Claude Desktop
# Add to Claude Desktop config (~/.config/Claude/claude_desktop_config.json)
{
  "mcpServers": {
    "dreamcrew": {
      "command": "node",
      "args": ["/path/to/packages/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "your-url",
        "SUPABASE_SERVICE_ROLE_KEY": "your-key"
      }
    }
  }
}
```

Open Claude Desktop and verify:
- ✅ 4 tools appear in tool list
- ✅ Can call create_tenant_account with sample data
- ✅ Receives success response with tenantId

---

### Week 2: Tool 2 Implementation (Consolidated Agent Clone Creation)

**Goal:** Create unified endpoint that combines tenant activation + user clone + rep room creation

#### Day 8-10: Build Consolidated Edge Function

**Step 4.1: Create New Edge Function**

File: `supabase/functions/agent-clone-provision/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

interface ProvisionAgentCloneRequest {
  tenantId: string;
  baseAgentId: string;
  customization: {
    name: string;
    instructions: string;
    voice: string | { elevenLabsVoiceId: string };
    avatar?: string;
  };
  repRoomConfig: {
    publicSlug: string;
    title: string;
    themeColor: string;
    greetingMessage: string;
    suggestedPrompts: string[];
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: ProvisionAgentCloneRequest = await req.json();

    // Validate tenant exists
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('organizations')
      .select('id')
      .eq('id', requestData.tenantId)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Step 1: Check if agent is exposed to tenant
    const { data: agentExposure } = await supabaseClient
      .from('organization_agent_exposures')
      .select('enabled')
      .eq('organization_id', requestData.tenantId)
      .eq('agent_id', requestData.baseAgentId)
      .single();

    if (!agentExposure || !agentExposure.enabled) {
      return new Response(
        JSON.stringify({ error: 'Agent not available to this tenant' }),
        { status: 403, headers: corsHeaders }
      );
    }

    // Step 2: Create tenant agent activation
    const { data: activation, error: activationError } = await supabaseClient
      .from('tenant_agent_activations')
      .insert({
        tenant_id: requestData.tenantId,
        agent_id: requestData.baseAgentId,
        status: 'active',
        custom_parameters: {
          instructions: requestData.customization.instructions,
        },
        voice_settings: typeof requestData.customization.voice === 'string'
          ? { voice_id: requestData.customization.voice }
          : requestData.customization.voice,
      })
      .select()
      .single();

    if (activationError) {
      throw new Error(`Failed to create activation: ${activationError.message}`);
    }

    // Step 3: Create user agent clone
    // Note: Using service role to bypass user context requirement
    const { data: userClone, error: cloneError } = await supabaseClient
      .from('user_agent_clones')
      .insert({
        tenant_activation_id: activation.id,
        tenant_id: requestData.tenantId,
        user_id: null, // System-created, not user-created
        name: requestData.customization.name,
        custom_parameters: {
          avatar: requestData.customization.avatar,
        },
        status: 'active',
      })
      .select()
      .single();

    if (cloneError) {
      // Rollback activation
      await supabaseClient
        .from('tenant_agent_activations')
        .delete()
        .eq('id', activation.id);

      throw new Error(`Failed to create clone: ${cloneError.message}`);
    }

    // Step 4: Generate unique slug if collision detected
    let finalSlug = requestData.repRoomConfig.publicSlug;
    let slugAttempt = 0;

    while (slugAttempt < 10) {
      const { data: existingRoom } = await supabaseClient
        .from('rep_rooms')
        .select('id')
        .eq('public_slug', finalSlug)
        .single();

      if (!existingRoom) break;

      slugAttempt++;
      finalSlug = `${requestData.repRoomConfig.publicSlug}-${slugAttempt}`;
    }

    // Step 5: Create rep room
    const { data: repRoom, error: repRoomError } = await supabaseClient
      .from('rep_rooms')
      .insert({
        user_agent_clone_id: userClone.id,
        public_slug: finalSlug,
        title: requestData.repRoomConfig.title,
        is_enabled: true,
        settings: {
          appearance: {
            theme_color: requestData.repRoomConfig.themeColor,
          },
          behavior: {
            greeting_message: requestData.repRoomConfig.greetingMessage,
            suggested_prompts: requestData.repRoomConfig.suggestedPrompts,
          },
        },
      })
      .select()
      .single();

    if (repRoomError) {
      // Rollback clone and activation
      await supabaseClient.from('user_agent_clones').delete().eq('id', userClone.id);
      await supabaseClient.from('tenant_agent_activations').delete().eq('id', activation.id);

      throw new Error(`Failed to create rep room: ${repRoomError.message}`);
    }

    // Success!
    const repRoomUrl = `https://platform.dreamcrew.ai/r/${finalSlug}`;

    return new Response(
      JSON.stringify({
        success: true,
        agentCloneId: userClone.id,
        activationId: activation.id,
        repRoomId: repRoom.id,
        repRoomUrl,
        publicSlug: finalSlug,
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
```

**Step 4.2: Deploy Edge Function**

```bash
cd supabase
supabase functions deploy agent-clone-provision
```

**Step 4.3: Add MCP Tool Wrapper**

File: `packages/mcp-server/src/tools/create-agent.ts`

```typescript
import { z } from 'zod';
import { supabase } from '../utils/supabase.js';

const CreateAgentCloneSchema = z.object({
  tenantId: z.string().uuid(),
  baseAgentId: z.string(),
  customization: z.object({
    name: z.string().min(1).max(255),
    instructions: z.string().min(1),
    voice: z.union([
      z.string(),
      z.object({ elevenLabsVoiceId: z.string() }),
    ]),
    avatar: z.string().url().optional(),
  }),
  repRoomConfig: z.object({
    publicSlug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1).max(100),
    themeColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    greetingMessage: z.string().min(1),
    suggestedPrompts: z.array(z.string()).min(1).max(5),
  }),
});

export const createAgentCloneTool = {
  name: 'create_agent_clone_for_tenant',
  description: 'Create a fully configured AI agent clone with rep room for a tenant',
  schema: CreateAgentCloneSchema,

  async execute(input: z.infer<typeof CreateAgentCloneSchema>) {
    const { data, error } = await supabase.functions.invoke(
      'agent-clone-provision',
      { body: input }
    );

    if (error) {
      throw new Error(`Failed to create agent clone: ${error.message}`);
    }

    return data;
  },
};
```

**Step 4.4: Update Tool Registry**

File: `packages/mcp-server/src/tools/index.ts`

```typescript
import { createTenantAccountTool } from './create-tenant.js';
import { createAgentCloneTool } from './create-agent.js';
import { createImplementationTasksTool } from './create-tasks.js';
import { generateWidgetCodeTool } from './generate-widget.js';
import { sendOnboardingEmailTool } from './send-email.js';

export const toolRegistry = [
  createTenantAccountTool,
  createAgentCloneTool, // Now added!
  createImplementationTasksTool,
  generateWidgetCodeTool,
  sendOnboardingEmailTool,
];
```

**Testing Step 4:**

```bash
# Rebuild MCP server
cd packages/mcp-server
npm run build

# Test via Claude Desktop
# Try calling create_agent_clone_for_tenant with sample data
```

Expected: Agent clone created, rep room accessible via URL

---

### Week 3: Testing, Documentation, and Polish

#### Day 11-12: Comprehensive Testing

**Step 5.1: Create End-to-End Test Suite**

File: `packages/mcp-server/tests/e2e.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { toolRegistry } from '../src/tools/index.js';

describe('End-to-End Meta Play Workflow', () => {
  let tenantId: string;
  let repRoomUrl: string;

  it('Step 1: Create tenant account', async () => {
    const createTenant = toolRegistry.find(t => t.name === 'create_tenant_account');

    const result = await createTenant!.execute({
      parentOrganizationId: process.env.TEST_AGENCY_ID!,
      companyName: 'E2E Test Kitchen',
      ownerEmail: 'e2e-test@example.com',
      ownerName: 'E2E Tester',
      plan: 'pro',
      credits: 1000,
      agentLimit: 2,
      customization: {
        brandColor: '#FF5722',
      },
    });

    expect(result.success).toBe(true);
    expect(result.tenantId).toBeDefined();

    tenantId = result.tenantId;
  });

  it('Step 2: Create agent clone', async () => {
    const createAgent = toolRegistry.find(t => t.name === 'create_agent_clone_for_tenant');

    const result = await createAgent!.execute({
      tenantId,
      baseAgentId: process.env.TEST_AGENT_ID!,
      customization: {
        name: 'E2E Test Agent',
        instructions: 'You are a test assistant',
        voice: 'alloy',
      },
      repRoomConfig: {
        publicSlug: `e2e-test-${Date.now()}`,
        title: 'E2E Test Rep Room',
        themeColor: '#FF5722',
        greetingMessage: 'Hello from E2E test!',
        suggestedPrompts: ['Test prompt 1', 'Test prompt 2'],
      },
    });

    expect(result.success).toBe(true);
    expect(result.repRoomUrl).toContain('/r/');

    repRoomUrl = result.repRoomUrl;
  });

  it('Step 3: Create implementation tasks', async () => {
    const createTasks = toolRegistry.find(t => t.name === 'create_implementation_tasks');

    const result = await createTasks!.execute({
      tenantId,
      projectName: 'E2E Onboarding',
      tasks: [
        { title: 'Task 1', description: 'Test task', priority: 1 },
        { title: 'Task 2', description: 'Test task', priority: 2 },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.taskIds.length).toBe(2);
  });

  it('Step 4: Generate widget code', async () => {
    // First get rep room ID from URL
    const slugMatch = repRoomUrl.match(/\/r\/([^/]+)$/);
    expect(slugMatch).toBeDefined();

    // Query for rep room ID
    const { data: repRoom } = await supabase
      .from('rep_rooms')
      .select('id')
      .eq('public_slug', slugMatch![1])
      .single();

    const generateWidget = toolRegistry.find(t => t.name === 'generate_widget_code');

    const result = await generateWidget!.execute({
      repRoomId: repRoom!.id,
      widgetConfig: {
        position: 'bottom-right',
        size: 'medium',
        trigger: 'immediate',
        displayMode: 'floating',
        skipPhases: false,
      },
    });

    expect(result.success).toBe(true);
    expect(result.embedCode).toContain('<script');
  });

  it('Step 5: Send onboarding email', async () => {
    const sendEmail = toolRegistry.find(t => t.name === 'send_onboarding_email');

    const result = await sendEmail!.execute({
      tenantId,
      recipientEmail: 'e2e-test@example.com',
      templateData: {
        companyName: 'E2E Test Kitchen',
        agentName: 'E2E Test Agent',
        repRoomUrl,
        loginUrl: 'https://platform.dreamcrew.ai/login?invite=test',
        widgetCode: '<script>test</script>',
        planDetails: {
          credits: 1000,
          agentLimit: 2,
          plan: 'pro',
        },
      },
    });

    expect(result.success).toBe(true);
    expect(result.emailSent).toBe(true);
  });
});
```

Run tests:
```bash
npm test
```

**Step 5.2: Performance Testing**

File: `packages/mcp-server/tests/performance.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { createTenantAccountTool } from '../src/tools/create-tenant.js';

describe('Performance Tests', () => {
  it('should create tenant in < 10 seconds', async () => {
    const startTime = Date.now();

    const result = await createTenantAccountTool.execute({
      parentOrganizationId: process.env.TEST_AGENCY_ID!,
      companyName: 'Perf Test',
      ownerEmail: 'perf@example.com',
      ownerName: 'Perf Tester',
      plan: 'starter',
      credits: 100,
      agentLimit: 1,
      customization: { brandColor: '#000000' },
    });

    const duration = Date.now() - startTime;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(10000); // 10 seconds
  });
});
```

#### Day 13-14: Documentation

**Step 6.1: Create README**

File: `packages/mcp-server/README.md`

```markdown
# DreamCrew MCP Server

MCP server for AI-driven tenant provisioning on DreamCrew platform.

## Installation

```bash
npm install -g @dreamcrew/mcp-server
```

## Configuration

Add to Claude Desktop config (`~/.config/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "dreamcrew": {
      "command": "dreamcrew-mcp",
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## Available Tools

### 1. create_tenant_account

Create a new tenant organization with initial setup.

**Input:**
```json
{
  "parentOrganizationId": "uuid",
  "companyName": "Kitchen Pro",
  "ownerEmail": "owner@kitchenpro.com",
  "ownerName": "John Doe",
  "plan": "pro",
  "credits": 5000,
  "agentLimit": 3,
  "customization": {
    "brandColor": "#FF6B35"
  }
}
```

**Output:**
```json
{
  "success": true,
  "tenantId": "uuid",
  "inviteLink": "https://...",
  "organizationDetails": {...}
}
```

### 2. create_agent_clone_for_tenant

Create a fully configured AI agent clone.

[... full documentation for all 6 tools ...]

## Testing

```bash
npm test
```

## Development

```bash
npm run dev
```
```

**Step 6.2: Create Usage Examples**

File: `packages/mcp-server/examples/complete-provisioning.md`

````markdown
# Complete Provisioning Example

This example shows how Claude uses all 6 tools to provision a new tenant.

## Scenario

AgencyHub's AI sales rep talks to KitchenPro owner and provisions their account.

## Conversation

**Sales Rep:** "I see you offer Italian cuisine delivery. Let me set up your AI assistant."

[Sales rep internally uses tavily to scrape kitchenpro.com]

**Prospect:** "Yes, let's try it!"

**Sales Rep:** [Calls DreamCrew MCP tools]

```typescript
// Step 1: Create tenant account
const tenant = await create_tenant_account({
  parentOrganizationId: "agencyhub-uuid",
  companyName: "Kitchen Pro",
  ownerEmail: "owner@kitchenpro.com",
  ownerName: "John Doe",
  plan: "pro",
  credits: 5000,
  agentLimit: 3,
  customization: {
    brandColor: "#FF6B35"
  }
});
// Returns: { tenantId: "...", inviteLink: "..." }

// Step 2: Create agent clone
const agent = await create_agent_clone_for_tenant({
  tenantId: tenant.tenantId,
  baseAgentId: "house-restaurant-agent-uuid",
  customization: {
    name: "Sarah - Kitchen Pro Assistant",
    instructions: "You are Sarah, the AI assistant for Kitchen Pro...",
    voice: "alloy"
  },
  repRoomConfig: {
    publicSlug: "kitchenpro-sarah",
    title: "Chat with Sarah",
    themeColor: "#FF6B35",
    greetingMessage: "Hi! I'm Sarah from Kitchen Pro.",
    suggestedPrompts: ["Show me today's specials", "What are your hours?"]
  }
});
// Returns: { agentCloneId: "...", repRoomUrl: "..." }

// Step 3: Create tasks
const project = await create_implementation_tasks({
  tenantId: tenant.tenantId,
  projectName: "Kitchen Pro Onboarding",
  tasks: [
    { title: "Add menu items", description: "...", priority: 1 },
    { title: "Test AI assistant", description: "...", priority: 2 },
    { title: "Install widget", description: "...", priority: 3 }
  ]
});
// Returns: { projectId: "...", taskIds: [...] }

// Step 4: Generate widget
const widget = await generate_widget_code({
  repRoomId: agent.repRoomId,
  widgetConfig: {
    position: "bottom-right",
    size: "medium",
    trigger: "delayed",
    displayMode: "floating",
    skipPhases: false
  }
});
// Returns: { widgetId: "...", embedCode: "..." }

// Step 5: Send email
const email = await send_onboarding_email({
  tenantId: tenant.tenantId,
  recipientEmail: "owner@kitchenpro.com",
  templateData: {
    companyName: "Kitchen Pro",
    agentName: "Sarah",
    repRoomUrl: agent.repRoomUrl,
    loginUrl: tenant.inviteLink,
    widgetCode: widget.embedCode,
    planDetails: { credits: 5000, agentLimit: 3, plan: "pro" }
  }
});
// Returns: { emailSent: true, messageId: "..." }
```

**Sales Rep:** "✅ Your account is ready! Check your email at owner@kitchenpro.com for login details."

**Total Time:** ~25 seconds

## Result

Prospect receives email with:
- Login credentials
- Fully working AI assistant (Sarah)
- Widget embed code for their website
- Implementation plan with 3 tasks
````

#### Day 15: Deployment

**Step 7.1: Publish npm Package**

```bash
cd packages/mcp-server

# Build
npm run build

# Update version
npm version 1.0.0

# Publish
npm publish --access public
```

**Step 7.2: Deploy Edge Functions**

```bash
cd supabase

# Deploy new edge function
supabase functions deploy agent-clone-provision

# Verify all functions working
supabase functions list
```

**Step 7.3: Update Claude Desktop Config Template**

Create documentation file showing users how to configure:

File: `docs/CLAUDE_DESKTOP_SETUP.md`

```markdown
# Claude Desktop Setup for DreamCrew MCP

## Step 1: Install Package

```bash
npm install -g @dreamcrew/mcp-server
```

## Step 2: Get Credentials

1. Log into Supabase dashboard
2. Go to Settings → API
3. Copy:
   - Project URL
   - Service role key (secret!)

## Step 3: Configure Claude Desktop

Edit config file:
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

Add configuration:

```json
{
  "mcpServers": {
    "dreamcrew": {
      "command": "dreamcrew-mcp",
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## Step 4: Restart Claude Desktop

Completely quit and reopen Claude Desktop.

## Step 5: Verify

In Claude Desktop, check MCP settings. You should see:
- ✅ dreamcrew server connected
- ✅ 5 tools available (6 when knowledge base launches)

## Troubleshooting

### Server not connecting
- Check credentials are correct
- Ensure `dreamcrew-mcp` is in PATH
- Check logs: `tail -f ~/Library/Logs/Claude/mcp*.log`

### Tools not appearing
- Restart Claude Desktop
- Verify JSON syntax in config file
- Check environment variables set correctly
```

**Phase 1 Complete!**

🎉 **Deliverables:**
- ✅ MCP server package published
- ✅ 5 tools working (Tool 3 stubbed)
- ✅ Edge functions deployed
- ✅ Documentation complete
- ✅ Test suite passing

---

## PHASE 2: UNIFIED PROVISIONING APIS (Week 3-4)

**Goal:** Polish existing tools, add error handling, implement rollback

This phase is mostly complete from Phase 1, but needs:

### Week 4: Refinement

#### Day 16-17: Error Handling & Rollback

**Step 8.1: Add Transaction Wrapper**

File: `packages/mcp-server/src/utils/transaction.ts`

```typescript
export class ProvisioningTransaction {
  private rollbackStack: Array<() => Promise<void>> = [];

  async addRollback(fn: () => Promise<void>) {
    this.rollbackStack.push(fn);
  }

  async rollback() {
    console.error('Rolling back transaction...');

    for (const fn of this.rollbackStack.reverse()) {
      try {
        await fn();
      } catch (error) {
        console.error('Rollback step failed:', error);
      }
    }
  }
}
```

**Step 8.2: Update create_tenant_account with Transaction**

File: `packages/mcp-server/src/tools/create-tenant.ts` (updated)

```typescript
import { ProvisioningTransaction } from '../utils/transaction.js';

export const createTenantAccountTool = {
  // ... schema unchanged ...

  async execute(input: CreateTenantAccountInput) {
    const transaction = new ProvisioningTransaction();

    try {
      // Step 1: Create organization
      const { data: orgData, error: orgError } = await supabase.functions.invoke(
        'organizations-create',
        { body: { /* ... */ } }
      );

      if (orgError || !orgData) {
        throw new Error(`Failed to create organization: ${orgError?.message}`);
      }

      const tenantId = orgData.id;

      // Add rollback for organization
      transaction.addRollback(async () => {
        await supabase.functions.invoke('organizations-delete', {
          body: { organization_id: tenantId },
        });
      });

      // Step 2: Allocate credits
      const { error: creditsError } = await supabase.functions.invoke(
        'credits-allocate',
        { body: { /* ... */ } }
      );

      if (creditsError) {
        throw new Error(`Failed to allocate credits: ${creditsError.message}`);
      }

      // Step 3-5: Continue with rollback points...

      return { success: true, tenantId, /* ... */ };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
```

#### Day 18-19: Rate Limiting & Retry Logic

**Step 9.1: Add Retry Utility**

File: `packages/mcp-server/src/utils/retry.ts`

```typescript
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = delayMs * Math.pow(2, attempt); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}
```

**Step 9.2: Add Rate Limiting**

File: `packages/mcp-server/src/utils/rate-limit.ts`

```typescript
class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async check(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);

      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.check(); // Retry after waiting
    }

    this.requests.push(now);
  }
}

export const supabaseRateLimiter = new RateLimiter(100, 60000); // 100 req/min
```

#### Day 20-21: Monitoring & Logging

**Step 10.1: Add Structured Logging**

File: `packages/mcp-server/src/utils/logger.ts`

```typescript
export class Logger {
  log(level: 'info' | 'warn' | 'error', message: string, metadata?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata,
    };

    console.error(JSON.stringify(logEntry));
  }

  info(message: string, metadata?: any) {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: any) {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: any) {
    this.log('error', message, metadata);
  }
}

export const logger = new Logger();
```

**Step 10.2: Add Monitoring Metrics**

File: `packages/mcp-server/src/utils/metrics.ts`

```typescript
interface Metric {
  toolName: string;
  duration: number;
  success: boolean;
  timestamp: number;
}

class MetricsCollector {
  private metrics: Metric[] = [];

  record(toolName: string, duration: number, success: boolean) {
    this.metrics.push({
      toolName,
      duration,
      success,
      timestamp: Date.now(),
    });

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  getStats() {
    return {
      totalCalls: this.metrics.length,
      successRate: this.metrics.filter(m => m.success).length / this.metrics.length,
      averageDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length,
      byTool: Object.groupBy(this.metrics, m => m.toolName),
    };
  }
}

export const metricsCollector = new MetricsCollector();
```

**Phase 2 Complete!**

---

## PHASE 3: KNOWLEDGE BASE RAG PIPELINE (Weeks 4-10)

**Goal:** Build complete knowledge base ingestion and retrieval system

### Week 5-6: Database & Schema

#### Day 22-25: Database Schema Implementation

**Step 11.1: Create Migration**

File: `supabase/migrations/20251106000000_create_knowledge_base.sql`

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base items table
CREATE TABLE IF NOT EXISTS company_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Content
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'review', 'faq', 'product', 'case_study', 'webpage')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL, -- For deduplication

  -- Embeddings
  embedding vector(1536), -- OpenAI ada-002

  -- Image analysis (GPT-4 Vision)
  image_url TEXT,
  image_analysis JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  source_url TEXT,
  tags TEXT[],

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending_review')),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT content_hash_unique UNIQUE (tenant_id, content_hash)
);

-- Indexes
CREATE INDEX idx_knowledge_tenant ON company_knowledge_items(tenant_id);
CREATE INDEX idx_knowledge_content_type ON company_knowledge_items(content_type);
CREATE INDEX idx_knowledge_status ON company_knowledge_items(status);
CREATE INDEX idx_knowledge_tags ON company_knowledge_items USING GIN(tags);

-- Vector index (IVFFlat for performance)
CREATE INDEX idx_knowledge_embedding ON company_knowledge_items
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RLS Policies
ALTER TABLE company_knowledge_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_tenant_view"
  ON company_knowledge_items FOR SELECT
  USING (tenant_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "knowledge_tenant_manage"
  ON company_knowledge_items FOR ALL
  USING (tenant_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
    AND role IN ('tenant_admin', 'tenant_manager')
  ));

CREATE POLICY "knowledge_house_view_all"
  ON company_knowledge_items FOR SELECT
  USING (get_my_role() = 'house_admin');

-- Vector search function
CREATE OR REPLACE FUNCTION search_knowledge_base(
  p_tenant_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 10,
  p_content_types TEXT[] DEFAULT NULL,
  p_similarity_threshold FLOAT DEFAULT 0.7
) RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  content_type TEXT,
  similarity FLOAT,
  metadata JSONB,
  image_url TEXT,
  image_analysis JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cki.id,
    cki.title,
    cki.content,
    cki.content_type,
    1 - (cki.embedding <=> p_query_embedding) AS similarity,
    cki.metadata,
    cki.image_url,
    cki.image_analysis
  FROM company_knowledge_items cki
  WHERE cki.tenant_id = p_tenant_id
    AND cki.status = 'active'
    AND (p_content_types IS NULL OR cki.content_type = ANY(p_content_types))
    AND (1 - (cki.embedding <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY cki.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_knowledge_timestamp
  BEFORE UPDATE ON company_knowledge_items
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

COMMENT ON TABLE company_knowledge_items IS 'Stores company-specific knowledge base items with vector embeddings for semantic search';
```

**Step 11.2: Deploy Migration**

```bash
supabase db push
```

### Week 7-8: RAG Pipeline Implementation

#### Day 26-30: Build Ingestion Pipeline

**Step 12.1: Create Edge Function for Knowledge Base Import**

File: `supabase/functions/knowledge-base-import/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

interface KnowledgeItem {
  type: 'text' | 'image' | 'review' | 'faq' | 'product';
  title: string;
  content: string;
  imageUrl?: string;
  sourceUrl?: string;
  metadata?: Record<string, any>;
}

// Recursive text splitter
function splitText(text: string, chunkSize: number = 1500, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at sentence boundary
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > start) {
        end = breakPoint + 1;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlap;
  }

  return chunks;
}

// Generate content hash for deduplication
function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tenantId, content }: { tenantId: string; content: KnowledgeItem[] } = await req.json();

    const results = {
      itemsCreated: 0,
      itemsSkipped: 0,
      embeddingsGenerated: 0,
      processingErrors: [] as Array<{ index: number; error: string }>,
      totalTokens: 0,
      estimatedCost: 0,
    };

    for (let i = 0; i < content.length; i++) {
      const item = content[i];

      try {
        // Step 1: Chunk text
        const chunks = splitText(item.content);

        for (const chunk of chunks) {
          const contentHash = generateContentHash(chunk);

          // Step 2: Check for duplicates
          const { data: existing } = await supabaseClient
            .from('company_knowledge_items')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('content_hash', contentHash)
            .single();

          if (existing) {
            results.itemsSkipped++;
            continue;
          }

          // Step 3: Generate embedding
          const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: chunk,
          });

          const embedding = embeddingResponse.data[0].embedding;
          results.totalTokens += embeddingResponse.usage.total_tokens;

          // Step 4: Analyze image if provided
          let imageAnalysis = {};
          if (item.imageUrl) {
            const visionResponse = await openai.chat.completions.create({
              model: 'gpt-4-vision-preview',
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'Analyze this image and extract: description, objects present, any text detected, colors, and style. Return as JSON.',
                    },
                    {
                      type: 'image_url',
                      image_url: { url: item.imageUrl },
                    },
                  ],
                },
              ],
              max_tokens: 300,
            });

            imageAnalysis = JSON.parse(visionResponse.choices[0].message.content || '{}');
          }

          // Step 5: Insert into database
          const { error: insertError } = await supabaseClient
            .from('company_knowledge_items')
            .insert({
              tenant_id: tenantId,
              content_type: item.type,
              title: item.title,
              content: chunk,
              content_hash: contentHash,
              embedding,
              image_url: item.imageUrl,
              image_analysis: imageAnalysis,
              source_url: item.sourceUrl,
              metadata: item.metadata,
            });

          if (insertError) {
            throw new Error(`Database insert failed: ${insertError.message}`);
          }

          results.itemsCreated++;
          results.embeddingsGenerated++;
        }
      } catch (error) {
        results.processingErrors.push({
          index: i,
          error: error.message,
        });
      }
    }

    // Calculate cost (OpenAI pricing: $0.0001 per 1K tokens)
    results.estimatedCost = (results.totalTokens / 1000) * 0.0001;

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 12.2: Deploy Edge Function**

```bash
supabase functions deploy knowledge-base-import
```

**Step 12.3: Add MCP Tool Wrapper**

File: `packages/mcp-server/src/tools/populate-kb.ts`

```typescript
import { z } from 'zod';
import { supabase } from '../utils/supabase.js';

const PopulateKnowledgeBaseSchema = z.object({
  tenantId: z.string().uuid(),
  content: z.array(z.object({
    type: z.enum(['text', 'image', 'review', 'faq', 'product']),
    title: z.string().min(1),
    content: z.string().min(1),
    imageUrl: z.string().url().optional(),
    sourceUrl: z.string().url().optional(),
    metadata: z.record(z.any()).optional(),
  })),
});

export const populateKnowledgeBaseTool = {
  name: 'populate_knowledge_base',
  description: 'Bulk import company knowledge base items with automatic embedding generation',
  schema: PopulateKnowledgeBaseSchema,

  async execute(input: z.infer<typeof PopulateKnowledgeBaseSchema>) {
    const { data, error } = await supabase.functions.invoke(
      'knowledge-base-import',
      { body: input }
    );

    if (error) {
      throw new Error(`Failed to populate knowledge base: ${error.message}`);
    }

    return data;
  },
};
```

**Step 12.4: Update Tool Registry**

File: `packages/mcp-server/src/tools/index.ts`

```typescript
import { createTenantAccountTool } from './create-tenant.js';
import { createAgentCloneTool } from './create-agent.js';
import { populateKnowledgeBaseTool } from './populate-kb.js'; // Now added!
import { createImplementationTasksTool } from './create-tasks.js';
import { generateWidgetCodeTool } from './generate-widget.js';
import { sendOnboardingEmailTool } from './send-email.js';

export const toolRegistry = [
  createTenantAccountTool,
  createAgentCloneTool,
  populateKnowledgeBaseTool, // Complete!
  createImplementationTasksTool,
  generateWidgetCodeTool,
  sendOnboardingEmailTool,
];
```

### Week 9-10: Agent Integration & Testing

#### Day 31-35: Agent Context Retrieval

**Step 13.1: Create Knowledge Base Retrieval Function**

File: `src/lib/services/knowledge-base-service.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: import.meta.env.VITE_OPENAI_API_KEY });

export async function retrieveRelevantKnowledge(
  tenantId: string,
  query: string,
  limit: number = 5
) {
  // Step 1: Generate query embedding
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });

  const queryEmbedding = embeddingResponse.data[0].embedding;

  // Step 2: Search knowledge base
  const { data, error } = await supabase.rpc('search_knowledge_base', {
    p_tenant_id: tenantId,
    p_query_embedding: queryEmbedding,
    p_limit: limit,
    p_content_types: null,
    p_similarity_threshold: 0.7,
  });

  if (error) {
    console.error('Knowledge base search failed:', error);
    return [];
  }

  return data;
}
```

**Step 13.2: Integrate with Agent System Prompt**

File: `src/mastra/agents/dynamic-agent.ts`

```typescript
import { retrieveRelevantKnowledge } from '@/lib/services/knowledge-base-service';

export async function enhanceSystemPromptWithKnowledge(
  basePrompt: string,
  tenantId: string,
  userQuery: string
): Promise<string> {
  // Retrieve relevant knowledge
  const knowledge = await retrieveRelevantKnowledge(tenantId, userQuery);

  if (knowledge.length === 0) {
    return basePrompt;
  }

  // Build knowledge context
  const knowledgeContext = knowledge.map((item, index) => `
[Source ${index + 1}: ${item.title}]
${item.content}
${item.image_url ? `\n[Image: ${item.image_url}]` : ''}
${item.image_analysis?.description ? `\nImage shows: ${item.image_analysis.description}` : ''}
  `).join('\n\n');

  // Enhance prompt
  const enhancedPrompt = `${basePrompt}

## Company Knowledge Base

You have access to the following company-specific information. Use this to provide accurate, personalized responses:

${knowledgeContext}

When referencing this information, cite the source (e.g., "According to our menu...").`;

  return enhancedPrompt;
}
```

**Step 13.3: Update Agent Execution Flow**

File: `src/lib/services/agent-execution-service.ts`

```typescript
import { enhanceSystemPromptWithKnowledge } from '@/mastra/agents/dynamic-agent';

export async function executeAgentTask(
  agentId: string,
  userQuery: string,
  tenantId: string
) {
  // Get agent configuration
  const { data: agentConfig } = await supabase
    .from('user_agent_clones')
    .select('custom_parameters, tenant_activation_id')
    .eq('id', agentId)
    .single();

  // Get base system prompt
  const basePrompt = agentConfig.custom_parameters.instructions;

  // Enhance with knowledge base
  const enhancedPrompt = await enhanceSystemPromptWithKnowledge(
    basePrompt,
    tenantId,
    userQuery
  );

  // Execute agent with enhanced prompt
  const response = await mastraAgent.generate({
    systemPrompt: enhancedPrompt,
    userMessage: userQuery,
  });

  return response;
}
```

#### Day 36-40: Testing & Optimization

**Step 14.1: Create Knowledge Base Test Suite**

File: `supabase/functions/knowledge-base-import/tests/integration.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { populateKnowledgeBaseTool } from '@/tools/populate-kb';

describe('Knowledge Base Integration', () => {
  it('should ingest 50 items in < 15 seconds', async () => {
    const items = Array.from({ length: 50 }, (_, i) => ({
      type: 'text' as const,
      title: `Test Item ${i}`,
      content: `This is test content for item ${i}. It contains information about our services and products.`,
    }));

    const startTime = Date.now();

    const result = await populateKnowledgeBaseTool.execute({
      tenantId: process.env.TEST_TENANT_ID!,
      content: items,
    });

    const duration = Date.now() - startTime;

    expect(result.itemsCreated).toBe(50);
    expect(duration).toBeLessThan(15000);
  });

  it('should retrieve relevant items with > 0.8 similarity', async () => {
    // First, populate some test data
    await populateKnowledgeBaseTool.execute({
      tenantId: process.env.TEST_TENANT_ID!,
      content: [
        {
          type: 'faq',
          title: 'Business Hours',
          content: 'We are open Monday-Friday 9am-5pm EST.',
        },
        {
          type: 'product',
          title: 'Premium Plan',
          content: 'Our premium plan includes 10,000 credits and unlimited agents.',
        },
      ],
    });

    // Query for hours
    const results = await retrieveRelevantKnowledge(
      process.env.TEST_TENANT_ID!,
      'What are your hours?'
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe('Business Hours');
    expect(results[0].similarity).toBeGreaterThan(0.8);
  });
});
```

**Step 14.2: Performance Optimization**

Create index tuning:

```sql
-- Adjust IVFFlat lists based on data size
-- Rule: lists = sqrt(num_rows)
-- For 10,000 items: lists = 100
-- For 100,000 items: lists = 316

-- Drop old index
DROP INDEX idx_knowledge_embedding;

-- Create optimized index
CREATE INDEX idx_knowledge_embedding ON company_knowledge_items
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 316);

-- Analyze table for query planner
ANALYZE company_knowledge_items;
```

**Phase 3 Complete!**

🎉 **All 6 MCP Tools Now Working:**
1. ✅ create_tenant_account
2. ✅ create_agent_clone_for_tenant
3. ✅ populate_knowledge_base ← Just completed!
4. ✅ create_implementation_tasks
5. ✅ generate_widget_code
6. ✅ send_onboarding_email

---

## PHASE 4: TESTING & INTEGRATION (Week 10)

### Week 10: End-to-End Testing

#### Day 41-43: Complete E2E Testing

**Step 15.1: Create Full Workflow Test**

File: `packages/mcp-server/tests/full-workflow.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { toolRegistry } from '../src/tools/index.js';

describe('Complete Meta Play Workflow', () => {
  let tenantId: string;
  let agentCloneId: string;
  let repRoomUrl: string;
  let widgetCode: string;

  it('Complete provisioning in < 60 seconds', async () => {
    const startTime = Date.now();

    // Step 1: Create tenant
    const createTenant = toolRegistry.find(t => t.name === 'create_tenant_account')!;
    const tenantResult = await createTenant.execute({
      parentOrganizationId: process.env.TEST_AGENCY_ID!,
      companyName: 'Full Workflow Kitchen',
      ownerEmail: 'workflow-test@example.com',
      ownerName: 'Workflow Tester',
      plan: 'pro',
      credits: 5000,
      agentLimit: 3,
      customization: { brandColor: '#2196F3' },
    });

    tenantId = tenantResult.tenantId;

    // Step 2: Create agent clone
    const createAgent = toolRegistry.find(t => t.name === 'create_agent_clone_for_tenant')!;
    const agentResult = await createAgent.execute({
      tenantId,
      baseAgentId: process.env.TEST_AGENT_ID!,
      customization: {
        name: 'Workflow Test Agent',
        instructions: 'You are a test assistant for Full Workflow Kitchen.',
        voice: 'alloy',
      },
      repRoomConfig: {
        publicSlug: `workflow-test-${Date.now()}`,
        title: 'Chat with Workflow Agent',
        themeColor: '#2196F3',
        greetingMessage: 'Welcome to Full Workflow Kitchen!',
        suggestedPrompts: ['Tell me about your menu', 'What are your hours?'],
      },
    });

    agentCloneId = agentResult.agentCloneId;
    repRoomUrl = agentResult.repRoomUrl;

    // Step 3: Populate knowledge base
    const populateKB = toolRegistry.find(t => t.name === 'populate_knowledge_base')!;
    await populateKB.execute({
      tenantId,
      content: [
        {
          type: 'faq',
          title: 'Business Hours',
          content: 'We are open Tuesday-Sunday, 5pm-10pm.',
        },
        {
          type: 'product',
          title: 'Signature Dish',
          content: 'Our signature dish is the Chicken Parmigiana with homemade marinara sauce.',
        },
        {
          type: 'review',
          title: 'Customer Review',
          content: 'Amazing food! The pasta was fresh and the service was excellent. 5/5 stars.',
        },
      ],
    });

    // Step 4: Create tasks
    const createTasks = toolRegistry.find(t => t.name === 'create_implementation_tasks')!;
    await createTasks.execute({
      tenantId,
      projectName: 'Workflow Test Onboarding',
      tasks: [
        { title: 'Add full menu', description: 'Upload complete menu with prices', priority: 1 },
        { title: 'Test AI responses', description: 'Verify agent responds accurately', priority: 2 },
      ],
    });

    // Step 5: Generate widget
    const generateWidget = toolRegistry.find(t => t.name === 'generate_widget_code')!;
    const widgetResult = await generateWidget.execute({
      repRoomId: agentResult.repRoomId,
      widgetConfig: {
        position: 'bottom-right',
        size: 'medium',
        trigger: 'delayed',
        displayMode: 'floating',
        skipPhases: false,
      },
    });

    widgetCode = widgetResult.embedCode;

    // Step 6: Send email
    const sendEmail = toolRegistry.find(t => t.name === 'send_onboarding_email')!;
    await sendEmail.execute({
      tenantId,
      recipientEmail: 'workflow-test@example.com',
      templateData: {
        companyName: 'Full Workflow Kitchen',
        agentName: 'Workflow Test Agent',
        repRoomUrl,
        loginUrl: tenantResult.inviteLink,
        widgetCode,
        planDetails: { credits: 5000, agentLimit: 3, plan: 'pro' },
      },
    });

    const duration = Date.now() - startTime;

    // Assertions
    expect(tenantId).toBeDefined();
    expect(agentCloneId).toBeDefined();
    expect(repRoomUrl).toContain('/r/');
    expect(widgetCode).toContain('<script');
    expect(duration).toBeLessThan(60000); // 60 seconds
  });
});
```

Run:
```bash
npm test -- full-workflow
```

Expected: ✅ All steps complete in < 60 seconds

#### Day 44-45: Performance & Load Testing

**Step 16.1: Load Test**

File: `packages/mcp-server/tests/load.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

describe('Load Tests', () => {
  it('should handle 10 concurrent tenant creations', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      createTenantAccountTool.execute({
        parentOrganizationId: process.env.TEST_AGENCY_ID!,
        companyName: `Load Test ${i}`,
        ownerEmail: `load-test-${i}@example.com`,
        ownerName: `Tester ${i}`,
        plan: 'starter',
        credits: 1000,
        agentLimit: 1,
        customization: { brandColor: '#000000' },
      })
    );

    const results = await Promise.all(promises);

    expect(results.every(r => r.success)).toBe(true);
  });
});
```

---

## DEPLOYMENT & LAUNCH

### Pre-Launch Checklist

**Infrastructure:**
- [ ] MCP server package published to npm
- [ ] All edge functions deployed
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Rate limits configured

**Testing:**
- [ ] Unit tests passing (100% coverage for critical paths)
- [ ] Integration tests passing
- [ ] E2E workflow test passing
- [ ] Load test passing (10 concurrent requests)
- [ ] Performance test passing (< 60s total)

**Documentation:**
- [ ] README complete with examples
- [ ] API documentation published
- [ ] Claude Desktop setup guide complete
- [ ] Troubleshooting guide complete
- [ ] Video tutorial recorded

**Security:**
- [ ] Service role keys secured
- [ ] API rate limiting enabled
- [ ] Input validation on all tools
- [ ] Rollback mechanisms tested
- [ ] Error messages sanitized

### Launch Sequence

**Day 1: Soft Launch**
1. Deploy to staging environment
2. Test with 3 pilot agencies
3. Monitor for 24 hours
4. Collect feedback

**Day 2-3: Refinement**
1. Fix any issues discovered
2. Update documentation based on feedback
3. Performance tuning

**Day 4: Production Launch**
1. Deploy to production
2. Announce via email/Slack
3. Monitor metrics dashboard
4. Be ready for support requests

---

## POST-LAUNCH MONITORING

### Key Metrics to Track

**Performance:**
- Tool execution time (average, p95, p99)
- Success rate per tool
- Error rate by error type
- Knowledge base query latency

**Usage:**
- Tool invocation count
- Most used tools
- Peak usage times
- User adoption rate

**Business:**
- Tenant accounts created
- Agent activations
- Knowledge base items ingested
- Revenue impact

### Monitoring Dashboard

Create dashboard in Supabase:

```sql
-- Daily metrics view
CREATE VIEW daily_mcp_metrics AS
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE org_type = 'tenant') as tenants_created,
  COUNT(*) FILTER (WHERE org_type = 'tenant' AND created_at > NOW() - INTERVAL '24 hours') as tenants_created_today,
  (SELECT COUNT(*) FROM tenant_agent_activations WHERE created_at > NOW() - INTERVAL '24 hours') as agents_activated_today,
  (SELECT COUNT(*) FROM company_knowledge_items WHERE created_at > NOW() - INTERVAL '24 hours') as knowledge_items_added_today
FROM organizations
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## SUCCESS CRITERIA

### MVP Success (Week 10)
- ✅ All 6 MCP tools working
- ✅ End-to-end provisioning in < 60 seconds
- ✅ Knowledge base with ≥ 50 items per tenant
- ✅ Vector search returns relevant results (> 0.8 similarity)
- ✅ Zero manual intervention required

### Long-term Success (Month 3)
- 100+ tenants provisioned via meta play
- 95% success rate on provisioning
- < 30 second average provisioning time
- 90% user satisfaction score

---

**End of Implementation Plan**

This plan provides step-by-step instructions for implementing the complete DreamCrew meta play vision in 10 weeks. Each phase builds on the previous, with clear deliverables, testing requirements, and success criteria.
