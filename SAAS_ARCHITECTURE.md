# Multi-Tenant Content Marketing SaaS with Claude-Flow

## Architecture Design

### Technology Stack

**Frontend**
- Next.js 14+ (React framework)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- TanStack Query (data fetching)

**Backend**
- Node.js + Express
- TypeScript
- PostgreSQL (tenant data)
- Redis (job queues, caching)
- SQLite (per-tenant claude-flow memory)

**AI Orchestration**
- claude-flow (MIT licensed, can be used commercially)
- Anthropic Claude API
- ruv-swarm (included with claude-flow)

**Infrastructure**
- Docker containers
- Kubernetes (optional, for scale)
- AWS/GCP/Vercel

---

## 1. Project Structure

```
content-marketing-saas/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   └── api/
│   │   ├── components/
│   │   └── lib/
│   │
│   └── api/                    # Backend API
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   │   ├── claude-flow-service.ts  # Claude-Flow wrapper
│       │   │   ├── content-service.ts
│       │   │   └── tenant-service.ts
│       │   ├── models/
│       │   ├── middleware/
│       │   └── workers/         # Background jobs
│       └── tests/
│
├── packages/
│   ├── database/               # Prisma schema & migrations
│   ├── shared-types/           # TypeScript types
│   └── ui/                     # Shared components
│
└── docker/
    ├── Dockerfile.api
    └── Dockerfile.web
```

---

## 2. Core Implementation

### A. Claude-Flow Service Wrapper

```typescript
// apps/api/src/services/claude-flow-service.ts

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { EventEmitter } from 'events';

export interface SwarmConfig {
  tenantId: string;
  topology: 'hierarchical' | 'mesh' | 'star' | 'ring';
  maxAgents: number;
  task: string;
  memoryKey?: string;
}

export interface ContentTask {
  type: 'blog' | 'social' | 'email' | 'ad-copy';
  brief: string;
  keywords?: string[];
  tone?: string;
  length?: number;
}

export class ClaudeFlowService extends EventEmitter {
  private tenantWorkspaces: Map<string, string> = new Map();

  constructor() {
    super();
  }

  /**
   * Initialize isolated workspace for tenant
   */
  async initTenantWorkspace(tenantId: string): Promise<string> {
    const workspaceDir = path.join(
      process.env.WORKSPACES_ROOT || '/app/workspaces',
      tenantId
    );

    await fs.ensureDir(workspaceDir);
    await fs.ensureDir(path.join(workspaceDir, 'memory'));
    await fs.ensureDir(path.join(workspaceDir, 'output'));

    // Initialize claude-flow for this tenant
    await this.execClaudeFlow(tenantId, ['init', '--force']);

    this.tenantWorkspaces.set(tenantId, workspaceDir);
    return workspaceDir;
  }

  /**
   * Create content generation swarm
   */
  async generateContent(
    tenantId: string,
    task: ContentTask
  ): Promise<{ taskId: string; status: string }> {
    const workspace = await this.ensureWorkspace(tenantId);
    const taskId = `task_${Date.now()}`;

    // Store task context in memory
    await this.storeMemory(tenantId, `task/${taskId}/brief`, task);

    // Build swarm prompt
    const prompt = this.buildContentPrompt(task);

    // Initialize swarm
    const swarmConfig: SwarmConfig = {
      tenantId,
      topology: 'hierarchical',
      maxAgents: this.getAgentCount(task.type),
      task: prompt,
      memoryKey: `task/${taskId}`
    };

    // Execute swarm
    await this.execSwarm(swarmConfig);

    return { taskId, status: 'processing' };
  }

  /**
   * Execute claude-flow swarm command
   */
  private async execSwarm(config: SwarmConfig): Promise<void> {
    const args = [
      'swarm',
      config.task,
      '--topology', config.topology,
      '--max-agents', config.maxAgents.toString(),
      '--memory'
    ];

    await this.execClaudeFlow(config.tenantId, args);
  }

  /**
   * Execute claude-flow CLI command
   */
  private async execClaudeFlow(
    tenantId: string,
    args: string[]
  ): Promise<string> {
    const workspace = this.tenantWorkspaces.get(tenantId);

    return new Promise((resolve, reject) => {
      const process = spawn('npx', ['claude-flow@2.0.0-alpha.2', ...args], {
        cwd: workspace,
        env: {
          ...process.env,
          CLAUDE_FLOW_MEMORY_PATH: path.join(workspace, 'memory'),
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
          TENANT_ID: tenantId
        }
      });

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
        this.emit('progress', { tenantId, output: data.toString() });
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Claude-flow failed: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Store data in tenant-specific memory
   */
  async storeMemory(
    tenantId: string,
    key: string,
    value: any
  ): Promise<void> {
    const args = [
      'memory',
      'store',
      key,
      JSON.stringify(value)
    ];

    await this.execClaudeFlow(tenantId, args);
  }

  /**
   * Retrieve data from tenant-specific memory
   */
  async getMemory(tenantId: string, key: string): Promise<any> {
    const args = ['memory', 'get', key];
    const output = await this.execClaudeFlow(tenantId, args);
    return JSON.parse(output);
  }

  /**
   * Build content generation prompt
   */
  private buildContentPrompt(task: ContentTask): string {
    const prompts = {
      blog: `Write a comprehensive blog post about: ${task.brief}.
             Keywords: ${task.keywords?.join(', ')}.
             Tone: ${task.tone || 'professional'}.
             Length: ${task.length || 1500} words.`,

      social: `Create engaging social media posts for: ${task.brief}.
               Include 3 variations for different platforms.
               Tone: ${task.tone || 'conversational'}.`,

      email: `Write a compelling email campaign for: ${task.brief}.
              Include subject line, preview text, and body.
              Tone: ${task.tone || 'friendly'}.`,

      'ad-copy': `Create persuasive ad copy for: ${task.brief}.
                  Include headlines, descriptions, and CTAs.
                  Tone: ${task.tone || 'compelling'}.`
    };

    return prompts[task.type];
  }

  /**
   * Determine agent count based on task complexity
   */
  private getAgentCount(type: ContentTask['type']): number {
    const agentMap = {
      blog: 5,      // Researcher, Writer, Editor, SEO, Proofreader
      social: 3,    // Copywriter, Designer, Strategist
      email: 4,     // Copywriter, Strategist, Designer, Tester
      'ad-copy': 3  // Copywriter, Strategist, Optimizer
    };

    return agentMap[type];
  }

  /**
   * Ensure workspace exists for tenant
   */
  private async ensureWorkspace(tenantId: string): Promise<string> {
    let workspace = this.tenantWorkspaces.get(tenantId);

    if (!workspace) {
      workspace = await this.initTenantWorkspace(tenantId);
    }

    return workspace;
  }

  /**
   * Clean up tenant workspace (on subscription end)
   */
  async cleanupTenant(tenantId: string): Promise<void> {
    const workspace = this.tenantWorkspaces.get(tenantId);

    if (workspace) {
      await fs.remove(workspace);
      this.tenantWorkspaces.delete(tenantId);
    }
  }
}
```

### B. Content Service (Business Logic)

```typescript
// apps/api/src/services/content-service.ts

import { ClaudeFlowService } from './claude-flow-service';
import { prisma } from '@/lib/prisma';
import { Queue } from 'bull';

export class ContentService {
  private claudeFlow: ClaudeFlowService;
  private contentQueue: Queue;

  constructor() {
    this.claudeFlow = new ClaudeFlowService();
    this.contentQueue = new Queue('content-generation', {
      redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });

    this.setupQueueProcessor();
  }

  /**
   * Create new content generation job
   */
  async createContentJob(userId: string, task: ContentTask) {
    // Get user's tenant
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true }
    });

    if (!user || !user.tenant) {
      throw new Error('User or tenant not found');
    }

    // Check tenant limits
    await this.checkTenantLimits(user.tenant.id);

    // Create job record
    const job = await prisma.contentJob.create({
      data: {
        tenantId: user.tenant.id,
        userId: userId,
        type: task.type,
        brief: task.brief,
        status: 'queued',
        config: task
      }
    });

    // Add to queue
    await this.contentQueue.add({
      jobId: job.id,
      tenantId: user.tenant.id,
      task
    });

    return job;
  }

  /**
   * Process content generation jobs
   */
  private setupQueueProcessor() {
    this.contentQueue.process(async (job) => {
      const { jobId, tenantId, task } = job.data;

      try {
        // Update status
        await prisma.contentJob.update({
          where: { id: jobId },
          data: { status: 'processing' }
        });

        // Generate content using claude-flow
        const result = await this.claudeFlow.generateContent(tenantId, task);

        // Retrieve generated content from memory
        const content = await this.claudeFlow.getMemory(
          tenantId,
          `task/${result.taskId}/output`
        );

        // Save result
        await prisma.contentJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            output: content,
            completedAt: new Date()
          }
        });

        // Update usage metrics
        await this.updateUsageMetrics(tenantId, task.type);

        return { success: true, jobId };

      } catch (error) {
        // Handle failure
        await prisma.contentJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            error: error.message
          }
        });

        throw error;
      }
    });
  }

  /**
   * Check if tenant is within usage limits
   */
  private async checkTenantLimits(tenantId: string): Promise<void> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true }
    });

    if (!tenant?.subscription) {
      throw new Error('No active subscription');
    }

    // Get current month usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await prisma.contentJob.count({
      where: {
        tenantId,
        createdAt: { gte: startOfMonth },
        status: { in: ['completed', 'processing'] }
      }
    });

    const limit = tenant.subscription.contentLimit;

    if (usage >= limit) {
      throw new Error('Content generation limit reached for this month');
    }
  }

  /**
   * Update tenant usage metrics
   */
  private async updateUsageMetrics(
    tenantId: string,
    type: string
  ): Promise<void> {
    await prisma.usageMetric.create({
      data: {
        tenantId,
        contentType: type,
        timestamp: new Date()
      }
    });
  }
}
```

### C. API Routes

```typescript
// apps/api/src/routes/content.routes.ts

import express from 'express';
import { ContentService } from '../services/content-service';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = express.Router();
const contentService = new ContentService();

/**
 * POST /api/content/generate
 * Create new content generation job
 */
router.post(
  '/generate',
  authenticate,
  validateRequest({
    type: 'required|string|in:blog,social,email,ad-copy',
    brief: 'required|string|min:10',
    keywords: 'array',
    tone: 'string',
    length: 'number'
  }),
  async (req, res) => {
    try {
      const job = await contentService.createContentJob(
        req.user.id,
        req.body
      );

      res.json({
        success: true,
        jobId: job.id,
        status: job.status
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/content/jobs/:jobId
 * Get job status and results
 */
router.get(
  '/jobs/:jobId',
  authenticate,
  async (req, res) => {
    try {
      const job = await prisma.contentJob.findFirst({
        where: {
          id: req.params.jobId,
          userId: req.user.id
        }
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        });
      }

      res.json({
        success: true,
        job: {
          id: job.id,
          status: job.status,
          type: job.type,
          output: job.output,
          createdAt: job.createdAt,
          completedAt: job.completedAt
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/content/history
 * Get user's content history
 */
router.get(
  '/history',
  authenticate,
  async (req, res) => {
    try {
      const jobs = await prisma.contentJob.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      res.json({
        success: true,
        jobs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

export default router;
```

---

## 3. Database Schema

```prisma
// packages/database/schema.prisma

model Tenant {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  users        User[]
  subscription Subscription?
  contentJobs  ContentJob[]
  usageMetrics UsageMetric[]
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  tenantId  String
  role      String   @default("member")
  createdAt DateTime @default(now())

  tenant      Tenant       @relation(fields: [tenantId], references: [id])
  contentJobs ContentJob[]
}

model Subscription {
  id            String   @id @default(cuid())
  tenantId      String   @unique
  plan          String   // starter, pro, enterprise
  status        String   // active, cancelled, past_due
  contentLimit  Int      // monthly content generation limit
  stripeId      String?
  currentPeriodEnd DateTime

  tenant Tenant @relation(fields: [tenantId], references: [id])
}

model ContentJob {
  id          String   @id @default(cuid())
  tenantId    String
  userId      String
  type        String   // blog, social, email, ad-copy
  brief       String   @db.Text
  config      Json
  status      String   // queued, processing, completed, failed
  output      Json?
  error       String?
  createdAt   DateTime @default(now())
  completedAt DateTime?

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   User   @relation(fields: [userId], references: [id])
}

model UsageMetric {
  id          String   @id @default(cuid())
  tenantId    String
  contentType String
  timestamp   DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])
}
```

---

## 4. Frontend Components

### Content Brief Builder

```typescript
// apps/web/components/content-brief-builder.tsx

'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

export function ContentBriefBuilder() {
  const [brief, setBrief] = useState('');
  const [type, setType] = useState<'blog' | 'social' | 'email' | 'ad-copy'>('blog');
  const [tone, setTone] = useState('professional');

  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Redirect to job status page
      window.location.href = `/dashboard/jobs/${data.jobId}`;
    }
  });

  const handleSubmit = () => {
    generateMutation.mutate({
      type,
      brief,
      tone,
      keywords: extractKeywords(brief)
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Create Content</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Content Type
          </label>
          <Select value={type} onValueChange={setType}>
            <option value="blog">Blog Post</option>
            <option value="social">Social Media</option>
            <option value="email">Email Campaign</option>
            <option value="ad-copy">Ad Copy</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Content Brief
          </label>
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={8}
            placeholder="Describe what you want to create..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Tone
          </label>
          <Select value={tone} onValueChange={setTone}>
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="friendly">Friendly</option>
            <option value="authoritative">Authoritative</option>
          </Select>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!brief || generateMutation.isPending}
          className="w-full"
        >
          {generateMutation.isPending ? 'Generating...' : 'Generate Content'}
        </Button>
      </div>
    </div>
  );
}

function extractKeywords(text: string): string[] {
  // Simple keyword extraction (you'd want something more sophisticated)
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 5)
    .slice(0, 5);
}
```

---

## 5. Deployment Configuration

### Docker Compose

```yaml
# docker-compose.yml

version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: content_saas
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  api:
    build:
      context: .
      dockerfile: docker/Dockerfile.api
    environment:
      DATABASE_URL: postgresql://admin:${DB_PASSWORD}@postgres:5432/content_saas
      REDIS_HOST: redis
      REDIS_PORT: 6379
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      WORKSPACES_ROOT: /app/workspaces
    volumes:
      - workspaces:/app/workspaces
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis

  web:
    build:
      context: .
      dockerfile: docker/Dockerfile.web
    environment:
      NEXT_PUBLIC_API_URL: http://api:3001
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
  workspaces:
```

---

## 6. Key Features to Implement

### Content Marketing Specific Features:

1. **Content Calendar**
   - Schedule content generation
   - Track publishing dates
   - Coordinate campaigns

2. **Brand Voice Training**
   - Store brand guidelines in memory
   - Train swarms on brand examples
   - Maintain consistent tone

3. **SEO Optimization**
   - Keyword integration
   - Meta description generation
   - Content structure optimization

4. **Multi-Channel Support**
   - Blog posts
   - Social media (Twitter, LinkedIn, Instagram)
   - Email campaigns
   - Ad copy (Google Ads, Facebook)

5. **Collaboration Tools**
   - Team comments and feedback
   - Approval workflows
   - Version history

6. **Analytics Dashboard**
   - Content performance
   - Usage metrics
   - ROI tracking

---

## 7. Pricing Tiers

**Starter** - $49/month
- 20 content pieces/month
- Basic swarm (3 agents)
- Email support

**Pro** - $149/month
- 100 content pieces/month
- Advanced swarm (5-8 agents)
- Priority support
- Brand voice training

**Enterprise** - Custom
- Unlimited content
- Full swarm (10+ agents)
- Dedicated support
- Custom integrations

---

## 8. Next Steps to Build

1. **Phase 1: MVP (4-6 weeks)**
   - Setup project structure
   - Implement claude-flow wrapper
   - Basic authentication
   - Single content type (blog posts)
   - Simple dashboard

2. **Phase 2: Core Features (6-8 weeks)**
   - Multi-content types
   - Team collaboration
   - Usage tracking
   - Billing integration

3. **Phase 3: Advanced (8-12 weeks)**
   - Brand voice training
   - Content calendar
   - Analytics dashboard
   - API for integrations

4. **Phase 4: Scale (Ongoing)**
   - Performance optimization
   - Additional content types
   - Advanced AI features
   - Enterprise features

---

## Summary

**You DON'T need to recreate claude-flow!**

✅ Use it as a dependency (MIT license)
✅ Wrap it in your API layer
✅ Add tenant isolation
✅ Build your SaaS features on top

The key is treating claude-flow as your AI orchestration engine while you build the business logic, multi-tenancy, billing, and UI around it.
