# 🚀 DREAMCREW SWARM ORCHESTRATION — UNIFIED SPECIFICATION V3
## FULL ENTERPRISE BLUEPRINT

**Version:** 3.0 Final
**Last Updated:** 2025-01-14
**Status:** Production-Ready Specification

---

# 📋 EXECUTIVE SUMMARY

This specification defines the **DreamCrew Swarm Orchestration System** - an industry-agnostic, white-label, multi-agent platform that enables businesses of any type to achieve goals through conversational AI collaboration.

**Key Differentiators:**
- ✅ Industry-agnostic (works for gyms, SAT prep, veterans services, marketing agencies, etc.)
- ✅ White-label ready (agencies can resell and rebrand)
- ✅ Hierarchical (House → Super Agency → Agency → Tenant)
- ✅ Usage-based billing (credits + packages + Stripe)
- ✅ Conversational-first (Rep Rooms as primary UX)
- ✅ Multi-agent collaboration (visible to humans in real-time)
- ✅ Long-running workflows (projects span hours/days, not just single responses)

---

# 0. GLOBAL GROUND RULES (READ FIRST)

## 0.1 Who You Are

You are **Claude Code (AI coder)** working inside **Claude Code on the web**.

Your mission: **Extend the existing DreamCrew platform** by implementing the swarm orchestration system defined in this spec.

## 0.2 Critical Constraints

### Development vs Runtime Separation

**Development MCPs (NOT shipped to production):**
- `mastra` - DreamCrew docs
- `copilotkit` - Remote tools
- `tavily` - Web search
- `perplexity` - Deep research
- `supabase` - Database dev

These help you BUILD. Production doesn't use them.

**Runtime MCPs (what production uses):**
- `DreamCrew Control MCP` - Platform control plane
- `Stripe MCP` - Billing
- `Content MCP` - File storage/search
- `Tenant MCPs` - User-connected (CRM, calendar, email, etc.)

### Industry-Agnostic Rule (Non-Negotiable)

**FORBIDDEN in core code:**
- ❌ "gym", "membership", "trainer"
- ❌ "SAT", "student", "tutor"
- ❌ "veteran", "claim", "PTSD"
- ❌ "campaign", "ad", "client"
- ❌ ANY industry-specific terms

**ALLOWED locations for industry logic:**
- ✅ Tenant knowledge bases
- ✅ Agent prompts (tenant-scoped)
- ✅ Tenant MCP connectors
- ✅ `/examples/` directory

**Test:** If we onboard a law firm, telecom, or ecommerce brand tomorrow, core code should work with zero changes.

---

# 1. HIERARCHY & WHITE-LABEL

## 1.1 Organizational Structure

```
House (DreamCrew Platform)
  │
  ├─ Super Agency: VCS
  │   │  - White-label branding
  │   │  - Own Stripe account
  │   │  - Resells to agencies
  │   │
  │   ├─ Agency: Texas Veterans Services
  │   │   │  - Agency branding
  │   │   │  - Defines packages
  │   │   │  - Sales agents
  │   │   │
  │   │   └─ Tenant: TVS Client Portal
  │   │       - Rep Rooms
  │   │       - Agents
  │   │       - MCP Connectors
  │   │
  │   └─ Agency: California Vets United
  │       └─ Tenant: CVU Portal
  │
  └─ Super Agency: Marketing Pro
      ├─ Agency: Fitness Brands
      │   ├─ Tenant: Gym Chain A
      │   └─ Tenant: Gym Chain B
      └─ Agency: Education Tech
          └─ Tenant: SAT Prep School
```

## 1.2 Capabilities by Tier

| Tier | Creates | Configures | Billing |
|------|---------|------------|---------|
| **House** | Super Agencies | Platform settings | N/A |
| **Super Agency** | Agencies | White-label, packages | Own Stripe |
| **Agency** | Tenants | Packages, templates | Own or parent's Stripe |
| **Tenant** | Rep Rooms, Agents | Prompts, MCPs, content | Pays agency |

## 1.3 White-Label Features

Each Super Agency/Agency configures:
- **Branding:** Logo, colors, fonts, domain
- **Packages:** Pricing tiers, credit allocations
- **Templates:** Pre-configured agent setups
- **Knowledge:** Starter knowledge bases

---

# 2. PACKAGES, CREDITS & BILLING

## 2.1 Package Structure

```typescript
interface Package {
  id: string
  name: string                    // "Starter", "Pro", "Enterprise"
  monthlyCredits: number          // 10,000 credits/month
  maxAgents: number               // 5 agents
  maxRepRooms: number             // 3 Rep Rooms
  features: string[]              // ["voice", "multi-agent"]
  stripeProductId: string
  stripePriceId: string
}
```

## 2.2 Credit Usage

| Action | Cost |
|--------|------|
| 1 text word | 1 credit |
| 1 image | 10 credits |
| 1 min voice | 100 credits |
| 1 min Rep Room | 50 credits |
| 1 MCP call | 5-50 credits (configurable) |

## 2.3 Billing Flow

```
1. Agency creates package → Stripe product
2. Sales agent onboards prospect → Stripe customer
3. Payment via Stripe Checkout → Stripe subscription
4. DreamCrew Control MCP → create tenant, assign package
5. Tenant uses platform → credits debited
6. Monthly renewal → Stripe charges, credits replenished
```

**Key:** Sales agents are normal agents that call:
- **DreamCrew Control MCP** (create tenant/agents/Rep Rooms)
- **Stripe MCP** (subscriptions/charges)

No hardcoded sales logic.

---

# 3. PRODUCT VISION

## 3.1 Core Flow

```
Human states goal in Rep Room
    ↓
SwarmCoordinator creates project
    ↓
Tasks dispatched to specialist agents
    ↓
Agents collaborate via MCPs
    ↓
Consensus for decisions
    ↓
Human approval for high-impact
    ↓
Execution (minutes/hours/days)
    ↓
Results delivered
```

## 3.2 Example Scenarios (Same Platform)

**SAT Prep School:**
- Goal: "AI tutors for 50 students"
- Agents: Testing, Planning, Tutoring, Progress Tracker
- MCPs: LMS, Calendar, Content, Email

**Veterans Claims:**
- Goal: "Automate intake and filing"
- Agents: Intake, Document Analyzer, Claims Filer
- MCPs: Document storage, VA forms API, Calendar

**Gym:**
- Goal: "Automate membership sales"
- Agents: Sales, Billing, Onboarding
- MCPs: CRM, Stripe, Calendar, Email

**Marketing Agency:**
- Goal: "Manage campaigns for 20 clients"
- Agents: Strategy, Campaign, Content, Analytics
- MCPs: Google Ads, Facebook Ads, Analytics

## 3.3 Rep Rooms

**Routes:** `/rr/:accountSlug/:sessionId?mode=voice|chat`

**Features:**
- Multiple agents (primary, workers, observers)
- Multiple human types (business users, customers)
- Real-time collaboration visible
- Approval requests
- Content presentation

---

# 4. SYSTEM ARCHITECTURE

## 4.1 Component Diagram

```
Rep Rooms (Frontend)
    ↓
SwarmCoordinator
    ├─ TaskDispatcher
    ├─ ConsensusEngine
    ├─ CollaborationHub
    └─ HealthMonitor
        ↓
Worker Agents
    ├─ Research Agent
    ├─ Content Agent
    ├─ CRM Agent
    ├─ SEO Agent
    └─ Observer Agents
        ↓
Runtime MCPs
    ├─ DreamCrew Control MCP
    ├─ Stripe MCP
    ├─ Content MCP
    └─ Tenant MCPs (CRM, Calendar, etc.)
        ↓
Supabase (State & Data)
```

## 4.2 Data Flow: Goal to Completion

```
1. Human: "I need to increase revenue"
2. SwarmCoordinator interprets → Project
3. Breaks into tasks:
   - Research competitors [Research Agent]
   - SEO strategy [SEO Agent]
   - Email campaign [CRM Agent]
4. TaskDispatcher assigns by capabilities
5. Agents execute using MCPs
6. ConsensusEngine votes on strategy choice
7. Observer detects high-impact action → human approval
8. Execution continues
9. Results: Report with metrics
```

---

# 5. COMPONENTS TO IMPLEMENT

## 5.1 SwarmCoordinator

**Location:** `/backend/swarm/coordinator/`

**Responsibilities:**
- Interpret natural language goals
- Create projects and tasks
- Manage global swarm state
- Communicate with Rep Rooms
- Request human approvals

**Core Functions:**
```typescript
interface SwarmCoordinator {
  planGoal(goalText: string, context: Context): Promise<ProjectPlan>
  createProject(plan: ProjectPlan): Promise<Project>
  dispatchTasks(tasks: Task[]): Promise<void>
  notifyRepRoom(message: string, data?: any): Promise<void>
  requestApproval(decision: Decision): Promise<ApprovalResponse>
}
```

---

## 5.2 TaskDispatcher

**Location:** `/backend/swarm/dispatcher/`

**Responsibilities:**
- Maintain priority queues
- Match tasks to agent capabilities
- Load balancing
- Task lifecycle management
- Retry logic

**Core Functions:**
```typescript
interface TaskDispatcher {
  enqueueTask(task: Task, priority: Priority): Promise<string>
  assignToAgent(taskId: string): Promise<TaskAssignment>
  updateStatus(taskId: string, status: TaskStatus): Promise<void>
  getOptimalAgent(task: Task): Promise<Agent>
}
```

**Algorithms:**
- Capability matching (semantic similarity)
- Load balancing (round-robin, least-loaded, capability-weighted)
- Priority queue (urgent, normal, low)

---

## 5.3 Worker Replicas

**Location:** `/replicas/workers/`

### Research Agent
**Capabilities:** `["web_search", "competitive_analysis", "market_research"]`
**MCPs:** Tavily (if runtime), Perplexity (if runtime), Content MCP

### Content Agent
**Capabilities:** `["content_generation", "copywriting", "image_selection"]`
**MCPs:** Content MCP, LLM APIs

### CRM Agent
**Capabilities:** `["contact_management", "email_campaigns", "pipeline_updates"]`
**MCPs:** Tenant CRM (HubSpot, Salesforce, etc.), Email MCP

### SEO Agent
**Capabilities:** `["keyword_research", "seo_analysis", "content_optimization"]`
**MCPs:** DataForSEO, Tavily

### Calendar Agent
**Capabilities:** `["scheduling", "calendar_management", "meeting_coordination"]`
**MCPs:** Tenant Calendar (Google, Outlook)

### Observer Agents
**Sales Observer:** Detect buying signals, trigger CRM logging
**Risk Observer:** Detect frustration/churn, escalate to human
**Compliance Observer:** Monitor PII, policy violations

---

## 5.4 CollaborationHub

**Location:** `/backend/swarm/collaboration/`

**Responsibilities:**
- Agent-to-agent messaging
- Shared context management
- Pub/sub event streaming

**Core Functions:**
```typescript
interface CollaborationHub {
  publish(channel: string, message: AgentMessage): Promise<void>
  subscribe(agentId: string, channel: string): Promise<void>
  appendContext(taskId: string, update: ContextUpdate): Promise<void>
  getContext(taskId: string): Promise<SharedContext>
}
```

---

## 5.5 ConsensusEngine

**Location:** `/backend/swarm/consensus/`

**Responsibilities:**
- Multi-agent voting
- Conflict resolution
- Decision audit trails

**Algorithms:**
- Simple majority
- Confidence-weighted voting
- Human tiebreaker escalation

**Core Functions:**
```typescript
interface ConsensusEngine {
  createProposal(topic: string, options: string[], agents: string[]): Promise<Proposal>
  submitVote(proposalId: string, agentId: string, vote: Vote): Promise<void>
  resolveConflict(proposalId: string): Promise<Decision>
}
```

---

## 5.6 HealthMonitor

**Location:** `/backend/swarm/monitoring/`

**Responsibilities:**
- Agent uptime tracking
- Performance metrics
- Anomaly detection
- Alerting

**Metrics:**
- Agent uptime (>99.5%)
- Task completion rate (>95%)
- Average latency (<5min simple tasks)
- Error rate (<10%)
- Queue depth monitoring

---

## 5.7 Content MCP

**Location:** `/backend/content/`

**Purpose:** File uploads, computer vision, semantic search

**Processing Pipeline:**
1. Upload file (PDF, image, video)
2. Extract content:
   - Images: labels, OCR, faces
   - Documents: full text, entities, summary
   - Videos: keyframes, transcript, scenes
3. Generate embeddings
4. Store in DB with metadata
5. Provide semantic search API

**Core Functions:**
```typescript
interface ContentMCP {
  uploadFile(file: File, metadata: FileMetadata): Promise<ContentItem>
  searchContent(query: string, filters?: ContentFilters): Promise<ContentItem[]>
  getRelevantContent(context: ConversationContext): Promise<ContentItem[]>
}
```

---

## 5.8 DreamCrew Control MCP (NEW)

**Location:** `/backend/control/`

**Purpose:** Runtime control plane for platform management

**Who Uses It:**
- Sales agents (create tenants, assign packages)
- Ops agents (manage infrastructure)
- Internal services (provisioning)

**Tool Surface:**
```typescript
tools: [
  {
    name: "create_tenant",
    input: {
      superAgencyId: string,
      agencyId: string,
      tenantName: string,
      branding: BrandingConfig,
      initialPackageId: string
    }
  },
  {
    name: "configure_rep_room",
    input: {
      tenantId: string,
      slug: string,           // "sales", "support", "tutoring"
      defaultAgentId: string,
      mode: "voice" | "chat" | "both"
    }
  },
  {
    name: "create_agent",
    input: {
      tenantId: string,
      name: string,
      role: string,           // "sales", "support", "tutor"
      model: string,
      systemPrompt: string,
      toolsAllowed: string[]
    }
  },
  {
    name: "assign_package_to_tenant",
    input: {
      tenantId: string,
      packageId: string,
      startDate?: string,
      trialDays?: number
    }
  },
  {
    name: "set_tenant_credits",
    input: {
      tenantId: string,
      deltaCredits: number,   // + or -
      reason: string
    }
  }
]
```

**Example: Sales Agent Workflow**

```typescript
// 1. Converses with prospect in agency's Rep Room
// 2. Gathers: company name, use case, volume
// 3. Recommends package

// 4. Create Stripe customer
await stripe_mcp.create_customer({
  email: "prospect@company.com",
  name: "Acme Corp"
})

// 5. Create checkout session
const session = await stripe_mcp.create_checkout_session({
  customerId: "cus_xxx",
  priceId: package.stripePriceId,
  successUrl: "https://...",
  cancelUrl: "https://..."
})

// 6. After payment confirmed (webhook)...

// 7. Create tenant
const tenant = await dreamcrew_control_mcp.create_tenant({
  agencyId: "agency_123",
  tenantName: "Acme Corp",
  branding: { logo: "...", primaryColor: "#FF5733" },
  initialPackageId: "pkg_pro"
})

// 8. Create agents
await dreamcrew_control_mcp.create_agent({
  tenantId: tenant.id,
  name: "Sales Copilot",
  role: "sales",
  model: "gpt-4o",
  systemPrompt: "You are a sales assistant for Acme Corp...",
  toolsAllowed: ["crm", "email", "calendar"]
})

// 9. Configure Rep Room
await dreamcrew_control_mcp.configure_rep_room({
  tenantId: tenant.id,
  slug: "sales",
  defaultAgentId: "agent_sales_copilot",
  mode: "both"
})
```

---

## 5.9 Stripe MCP Integration

**Purpose:** Billing and subscriptions

**Tools (from Stripe's MCP):**
```typescript
tools: [
  {
    name: "create_stripe_customer",
    input: { email: string, name?: string }
  },
  {
    name: "create_checkout_session",
    input: {
      customerId: string,
      priceId: string,
      successUrl: string,
      cancelUrl: string
    }
  },
  {
    name: "retrieve_subscription",
    input: { subscriptionId: string }
  },
  {
    name: "create_product",
    input: { name: string, description?: string }
  },
  {
    name: "create_price",
    input: {
      productId: string,
      unitAmount: number,
      currency: string,
      interval: "month" | "year"
    }
  }
]
```

**Security:** Agents never handle raw card numbers. Only safe tokens and Checkout URLs.

---

# 6. DATABASE SCHEMA

## 6.1 Organizational Hierarchy

```sql
CREATE TABLE org_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL,       -- 'house', 'super_agency', 'agency', 'tenant'
  parent_id UUID REFERENCES org_units(id),
  name TEXT NOT NULL,
  branding JSONB,                  -- logo, colors, domain
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_units_type ON org_units(type);
CREATE INDEX idx_org_units_parent ON org_units(parent_id);
```

## 6.2 Billing & Packages

```sql
CREATE TABLE agency_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_level VARCHAR(20) NOT NULL,   -- 'super_agency' or 'agency'
  scope_id UUID REFERENCES org_units(id),
  name TEXT NOT NULL,
  description TEXT,
  monthly_credits BIGINT NOT NULL,
  max_agents INT NOT NULL,
  max_rep_rooms INT NOT NULL,
  features TEXT[],
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES org_units(id),
  package_id UUID REFERENCES agency_packages(id),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status VARCHAR(20) NOT NULL,       -- 'trial', 'active', 'past_due', 'canceled'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  credits_remaining BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES org_units(id),
  change BIGINT NOT NULL,            -- + or -
  reason TEXT NOT NULL,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_ledger_tenant ON credit_ledger(tenant_id);
CREATE INDEX idx_credit_ledger_created ON credit_ledger(created_at);
```

## 6.3 Swarm Core Tables

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES org_units(id),
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,  -- 'planning', 'active', 'paused', 'completed', 'failed'
  created_by UUID,
  assigned_coordinator UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL,  -- 'planned', 'waiting_approval', 'in_progress', 'completed', 'failed'
  priority INT DEFAULT 0,
  assigned_agent UUID,
  required_capabilities TEXT[],
  mcp_capability VARCHAR(50),
  dependencies UUID[],
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE swarm_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES org_units(id),
  agent_type VARCHAR(50) NOT NULL,  -- 'coordinator', 'research', 'content', 'crm', 'seo'
  capabilities TEXT[] NOT NULL,
  status VARCHAR(20) NOT NULL,      -- 'active', 'idle', 'busy', 'error', 'offline'
  current_task_id UUID REFERENCES tasks(id),
  config JSONB,
  metadata JSONB,
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE swarm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(20) NOT NULL,
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE swarm_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES swarm_agents(id),
  metric_type VARCHAR(50) NOT NULL,
  value NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE swarm_consensus_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL,
  agent_id UUID REFERENCES swarm_agents(id),
  option VARCHAR(255) NOT NULL,
  confidence NUMERIC(3,2),
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE swarm_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID UNIQUE NOT NULL,
  project_id UUID REFERENCES projects(id),
  task_id UUID REFERENCES tasks(id),
  topic TEXT NOT NULL,
  options TEXT[] NOT NULL,
  decision VARCHAR(255),
  confidence NUMERIC(3,2),
  vote_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

## 6.4 Content Tables

```sql
CREATE EXTENSION IF NOT EXISTS vector;  -- pgvector

CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES org_units(id),
  filename TEXT NOT NULL,
  mime_type VARCHAR(100),
  file_size_bytes BIGINT,
  storage_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,      -- 'processing', 'ready', 'failed'
  analysis JSONB,
  tags TEXT[],
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_tenant ON content_items(tenant_id);
CREATE INDEX idx_content_embeddings_vector ON content_embeddings USING ivfflat (embedding vector_cosine_ops);
```

## 6.5 MCP Connectors

```sql
CREATE TABLE tenant_mcp_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES org_units(id),
  mcp_type VARCHAR(50) NOT NULL,    -- 'crm', 'calendar', 'email', 'cms'
  provider VARCHAR(50),              -- 'hubspot', 'google', etc.
  config JSONB NOT NULL,             -- encrypted credentials
  capabilities TEXT[] NOT NULL,
  status VARCHAR(20) NOT NULL,       -- 'active', 'error', 'disabled'
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mcp_connectors_tenant ON tenant_mcp_connectors(tenant_id);
```

---

# 7. IMPLEMENTATION WORKFLOW

## 7.1 Execution Order (6 Phases)

### Phase 1: Foundation (Week 1)

- [ ] Set up Supabase project
- [ ] Create migration files (001-007)
- [ ] Run migrations, verify schema
- [ ] Set up row-level security policies
- [ ] Configure 5 dev MCPs (Mastra, Tavily, Perplexity, Supabase, CopilotKit)
- [ ] Test MCP connectivity
- [ ] Create directory structure (`/backend/swarm/`, `/replicas/`, `/infra/`, `/docs/`, `/tests/`)
- [ ] Set up TypeScript config
- [ ] Install dependencies

### Phase 2: Core Swarm (Week 2-3)

- [ ] Implement SwarmCoordinator (goal interpretation, project creation, task breakdown)
- [ ] Implement TaskDispatcher (queue, capability matching, load balancing)
- [ ] Create Research Agent (Tavily + Perplexity)
- [ ] Create Content Agent (Content MCP)
- [ ] Test basic workflow: goal → project → tasks → execution

### Phase 3: Coordination (Week 3-4)

- [ ] Implement CollaborationHub (pub/sub, shared context)
- [ ] Implement ConsensusEngine (voting, conflict resolution)
- [ ] Implement HealthMonitor (heartbeats, metrics, anomalies)
- [ ] Test multi-agent coordination

### Phase 4: Control & Billing (Week 4-5)

- [ ] Implement DreamCrew Control MCP (create tenant/agent/Rep Room tools)
- [ ] Integrate Stripe MCP (products, prices, customers, subscriptions)
- [ ] Create billing tables and credit ledger
- [ ] Test sales agent workflow end-to-end

### Phase 5: Content & Additional Agents (Week 5-6)

- [ ] Implement Content MCP (upload, CV pipeline, embeddings, search)
- [ ] Create CRM Agent
- [ ] Create SEO Agent
- [ ] Create Calendar Agent
- [ ] Create Observer Agents (Sales, Risk, Compliance)

### Phase 6: Integration & Launch (Week 6-7)

- [ ] Build Rep Rooms UI (`/rr/:accountSlug/:sessionId`)
- [ ] Implement WebSocket for real-time updates
- [ ] Build API layer (REST + GraphQL)
- [ ] Comprehensive testing (unit, integration, load, chaos)
- [ ] Write documentation
- [ ] Deploy to staging
- [ ] Production launch

---

# 8. VALIDATION & QUALITY GATES

## 8.1 Component Validation Checklist

### Database
- [ ] All 7 migrations run successfully
- [ ] CRUD operations work on all tables
- [ ] Row-level security enforces tenant isolation
- [ ] Real-time subscriptions work (tasks, agents)
- [ ] pgvector extension enabled, embedding search works
- [ ] Query performance <100ms (p95)

### DreamCrew Control MCP
- [ ] `create_tenant` works, tenant created in org_units
- [ ] `configure_rep_room` creates Rep Room
- [ ] `create_agent` creates agent config
- [ ] `assign_package_to_tenant` links package and sets credits
- [ ] `set_tenant_credits` updates credit balance
- [ ] Tenant isolation verified (Tenant A cannot access Tenant B data)

### Stripe MCP
- [ ] `create_customer` returns Stripe customer ID
- [ ] `create_checkout_session` returns valid URL
- [ ] Webhook handling updates subscription status
- [ ] Credits replenished on renewal
- [ ] Overage charges calculated correctly

### SwarmCoordinator
- [ ] Interprets natural language goals
- [ ] Creates projects in database
- [ ] Breaks goals into tasks
- [ ] Communicates with Rep Rooms
- [ ] Handles approval requests
- [ ] Unit tests >80% coverage

### TaskDispatcher
- [ ] Enqueues tasks with priority
- [ ] Matches tasks to agents by capabilities
- [ ] Load balancing distributes evenly
- [ ] Task lifecycle transitions correctly
- [ ] Retries failed tasks (max 3)
- [ ] Reassigns when agent fails

### Agents
- [ ] Research Agent uses search MCPs correctly
- [ ] Content Agent retrieves uploaded files
- [ ] CRM Agent accesses tenant's CRM
- [ ] Observer Agents detect triggers
- [ ] All agents report results correctly

### CollaborationHub
- [ ] Agents can publish/subscribe to channels
- [ ] Shared context updates work
- [ ] Multi-agent collaboration tested

### ConsensusEngine
- [ ] Proposals created with options
- [ ] Agents submit votes
- [ ] Majority algorithm works
- [ ] Confidence-weighted algorithm works
- [ ] Escalates to human when no consensus

### Content MCP
- [ ] File upload works (images, PDFs, videos)
- [ ] Image analysis extracts labels
- [ ] PDF text extraction works
- [ ] Embeddings generated
- [ ] Semantic search returns relevant results

### Rep Rooms
- [ ] Multi-agent chat works
- [ ] Voice mode works (WebRTC)
- [ ] Real-time updates display
- [ ] Human approvals work
- [ ] Content displays in conversation

---

## 8.2 Performance Benchmarks

| Metric | Target | Measurement |
|--------|--------|-------------|
| Task assignment latency | <100ms | Task creation → agent assignment |
| Simple task completion | <5s | Web search task end-to-end |
| Complex task completion | <30s | Multi-step research + analysis |
| Consensus resolution | <500ms | 5 agents voting |
| Content search | <200ms | Semantic search, 1000 items |
| Rep Room message latency | <100ms | Swarm update → UI display |
| Database query (p95) | <50ms | Common queries |
| Concurrent tasks | 100+ | System handles 100 tasks simultaneously |
| Agent pool scale | 50+ | Support 50 active agents |
| Task throughput | 200/min | Complete 200 tasks/minute |

---

## 8.3 Security Validation

- [ ] Tenant isolation: Tenant A cannot read Tenant B's data
- [ ] MCP connectors scoped to tenant
- [ ] Content uploads isolated by tenant
- [ ] API endpoints require valid JWT
- [ ] Rep Room access requires authentication
- [ ] Input validation (no SQL injection)
- [ ] File uploads validated (type, size)
- [ ] Secrets encrypted at rest (AES-256)
- [ ] No secrets in logs
- [ ] Rate limiting per tenant
- [ ] Audit logging (all MCP operations)

---

## 8.4 Chaos Engineering Tests

### Test 1: Agent Failure
```
- Assign task to agent
- Simulate agent crash (stop heartbeats)
- Verify: Task reassigned within 65s
- Verify: New agent completes task
```

### Test 2: Database Disconnection
```
- Disconnect database
- Attempt task creation → error
- Reconnect database
- Retry → succeeds
```

### Test 3: MCP Connector Failure
```
- Tenant's CRM connector fails
- Task fails gracefully with clear error
- Human notified in Rep Room
```

### Test 4: Consensus Timeout
```
- 3 agents, only 2 vote (tie), 3rd offline
- Wait 30s for timeout
- System escalates to human
```

### Test 5: High Load (Thundering Herd)
```
- Submit 1000 tasks instantly
- System remains operational
- 95%+ success rate
- No memory leaks
```

---

# 9. RULES & CONSTRAINTS

## 9.1 Development Rules

**MUST:**
- Run in DreamCrew runtime (no Claude Flow dependency in production)
- Follow existing DreamCrew patterns
- Support multi-tenancy (all data scoped to tenant)
- Use Supabase for all database operations
- Implement proper error handling
- Log all important events (structured logging)
- Be secure (tenant isolation, input validation, secrets encryption)
- Be auditable (event sourcing, decision logs)
- Support async + long-running workflows
- Communicate clearly to humans in Rep Rooms
- Request approval for high-impact actions

**MUST NOT:**
- Ship Claude Flow or dev MCPs to production
- Expose tenant data across tenants
- Store secrets in plaintext
- Make breaking changes without migration path
- Use blocking operations
- Hardcode tenant-specific logic
- Reference industry-specific terms in core code

---

## 9.2 Industry-Agnostic Rules

**MUST:**
- Model everything in generic terms (project, task, agent, tenant, package)
- Put domain-specific content in knowledge bases, prompts, MCP connectors

**MUST NOT:**
- Encode industry workflows in orchestrator/dispatcher
- Have schema columns for specific industries (no "student_id", "veteran_id")
- Branch logic based on industry (`if (industry === 'gym')`)

---

## 9.3 Code Quality Standards

**TypeScript:**
- Strict mode enabled
- No `any` types
- All functions have return types
- All parameters typed

**Testing:**
- Unit test coverage >80%
- Integration tests for all workflows
- Load tests for performance
- Chaos tests for failures

**Documentation:**
- All public functions have JSDoc
- All API endpoints documented (OpenAPI)
- All tables documented
- All architectural decisions documented (ADRs)

---

# 10. SUCCESS METRICS

## 10.1 Technical Metrics

- Test coverage: >80%
- TypeScript strict: 100% files
- Zero critical vulnerabilities
- All benchmarks in 8.2 met
- Task success rate: >95%
- Agent uptime: >99.5%
- API uptime: >99.9%

## 10.2 Product Metrics

- 80% of users create project in first week
- 50% of projects complete successfully
- 90% of tasks complete without human intervention
- <5% require human approval
- 70% of users connect at least 1 MCP
- 85% user satisfaction

## 10.3 Business Metrics

- 10x reduction in time vs manual
- 5x increase in tasks per user
- 50% reduction in context switching
- Average cost per task <$0.50
- 20% increase in customer LTV
- 15% reduction in churn
- 30% increase in upsells

---

# 11. OPEN QUESTIONS & DECISIONS

## 11.1 Decisions Made

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Consensus Algorithm | Raft, Paxos, Simple Majority | Simple Majority + Confidence | Simpler, sufficient for MVP |
| Task Queue | Redis, Supabase, RabbitMQ | Supabase + in-memory | Leverage existing DB |
| Agent Communication | HTTP, Message Bus, Supabase Realtime | Supabase Realtime | Persistent, simple, scalable |
| Content Storage | S3, Supabase Storage, GCS | Supabase Storage | Unified with DB |
| Embeddings | OpenAI, Cohere, Local | OpenAI text-embedding-3-small | Best accuracy/cost |

## 11.2 Open Questions (Need Human Input)

**Q1: Agent Persistence**
- Long-lived pool vs ephemeral vs hybrid?
- **Recommendation:** Hybrid (small persistent pool + spawn for spikes)

**Q2: Cost Management**
- How handle expensive MCP calls?
- **Options:** Hard caps, budget-aware prioritization, human approval above threshold

**Q3: Human Approval Thresholds**
- Which actions require approval?
- **Need:** Define comprehensive approval matrix

**Q4: Multi-Tenancy Isolation**
- Full multi-tenancy, DB-per-tenant, or infra-per-tenant?
- **Current:** Full multi-tenancy (shared DB, RLS)

**Q5: Data Retention**
- How long keep events, tasks, Rep Room transcripts?
- **Need:** Legal review for GDPR

**Q6: Observer Accuracy**
- What confidence threshold for alerts?
- **Need:** A/B testing to optimize

---

# 12. DOCUMENTATION REQUIREMENTS

## 12.1 Docs to Create

**Architecture:**
- `docs/swarm-architecture.md` - System design, diagrams
- `docs/data-model.md` - Schema, relationships
- `docs/agent-types.md` - All agent types, capabilities
- `docs/consensus-algorithms.md` - How consensus works

**Integration:**
- `docs/rep-room-multi-agent.md` - Rep Rooms + swarm
- `docs/mcp-integration.md` - How to add MCPs
- `docs/content-mcp.md` - Upload/retrieval system
- `docs/control-mcp.md` - DreamCrew Control MCP
- `docs/billing-and-packages.md` - Credits, packages, Stripe

**API:**
- `docs/api-reference-swarm.md` - All endpoints
- `docs/websocket-events.md` - Real-time events

**Operational:**
- `docs/deployment.md` - How to deploy
- `docs/monitoring.md` - Swarm health monitoring
- `docs/troubleshooting.md` - Common issues
- `docs/scaling.md` - How to scale

**User:**
- `docs/user-guide.md` - Using Rep Rooms
- `docs/mcp-connector-setup.md` - Connect CRM/calendar
- `docs/content-upload.md` - Upload and tag content

---

# 13. HANDOFF & LAUNCH

## 13.1 Deliverables Checklist

**Code:**
- [ ] All files in defined structure
- [ ] All tests passing
- [ ] TypeScript strict, zero errors
- [ ] Linter passing
- [ ] Security scan clean

**Database:**
- [ ] All migrations created and tested
- [ ] Schema docs complete
- [ ] RLS policies tested
- [ ] Sample data scripts

**Documentation:**
- [ ] All docs from 12.1 created
- [ ] API reference complete
- [ ] Architecture diagrams exported
- [ ] Video walkthrough (optional)

**Deployment:**
- [ ] Docker containers built
- [ ] Kubernetes manifests validated
- [ ] `.env.example` provided
- [ ] CI/CD configured

**Monitoring:**
- [ ] Prometheus metrics exported
- [ ] Grafana dashboards imported
- [ ] Alerting rules configured
- [ ] Log aggregation working

---

## 13.2 Staging Deployment

1. Deploy infrastructure: `kubectl apply -f k8s/staging/`
2. Run smoke tests (create project, execute tasks)
3. Load test (1000 tasks)
4. Chaos test (kill agents, disconnect DB)
5. Security audit (cross-tenant access, SQL injection, secrets)

---

## 13.3 Production Launch

**Pre-launch (T-1 week):**
- [ ] Staging validated for 1 week
- [ ] Performance benchmarks met
- [ ] Security audit complete
- [ ] Docs reviewed by 2+ people
- [ ] Runbooks tested
- [ ] On-call rotation defined
- [ ] Rollback plan documented

**Launch Day:**
- [ ] Deploy during low-traffic window
- [ ] Monitor metrics for 2 hours
- [ ] Run smoke tests
- [ ] Notify team
- [ ] Enable alerts

**Post-launch (T+1 week):**
- [ ] Daily metrics review
- [ ] User feedback collected
- [ ] Performance optimization
- [ ] Documentation updates

---

## 13.4 Support Transition

**Week 1-2:** AI coder on standby (P0/P1, 1-hour response)
**Week 3-4:** Available for questions (async Slack), DreamCrew team primary
**Month 2+:** DreamCrew team owns, AI coder for major enhancements only

---

# APPENDIX A: TECHNOLOGY STACK

**Runtime:** Node.js 20+ or Bun
**Language:** TypeScript 5+
**Database:** Supabase (PostgreSQL + real-time + auth), pgvector
**APIs:** Express or Fastify, GraphQL (optional), WebSocket (ws)
**Testing:** Vitest or Jest, Playwright, k6
**Code Quality:** ESLint, Prettier, Husky
**Monitoring:** Prometheus, Grafana, Pino
**Infrastructure:** Docker, Kubernetes, Helm, GitHub Actions

---

# APPENDIX B: FILE STRUCTURE

```
/dreamcrew-swarm-orchestration/
  /backend/
    /swarm/
      /coordinator/ (goal interpretation, project management)
      /dispatcher/ (task queue, capability matching)
      /collaboration/ (pub/sub, shared context)
      /consensus/ (voting, conflict resolution)
      /monitoring/ (heartbeats, metrics, anomalies)
    /content/ (upload, CV, embeddings, search)
    /control/ (DreamCrew Control MCP)
    /api/ (REST, GraphQL, WebSocket)
    /migrations/ (001-007.sql)
    /lib/ (types, utils, logger)
  /replicas/
    /swarm-coordinator/ (config, prompts)
    /workers/ (research, content, crm, seo, calendar)
    /observers/ (sales, risk, compliance)
  /infra/
    /claude-flow/ (DEV ONLY)
    mcp.config.json (DEV ONLY)
    /deployment/ (docker-compose, Dockerfile, kubernetes/)
    /monitoring/ (prometheus, grafana dashboards)
  /docs/ (15+ markdown files)
  /tests/ (unit, integration, load, chaos, e2e)
  /examples/ (gym, sat, vcs, marketing)
  package.json, tsconfig.json, .env.example
```

---

# APPENDIX C: SAMPLE CODE TEMPLATE

## SwarmCoordinator

```typescript
// /backend/swarm/coordinator/index.ts

export class SwarmCoordinator {
  async planGoal(goalText: string, context: Context): Promise<ProjectPlan> {
    // 1. Use LLM to interpret goal
    const plan = await this.interpretGoal(goalText, context)

    // 2. Validate plan
    this.validatePlan(plan)

    return plan
  }

  async createProject(plan: ProjectPlan): Promise<Project> {
    // 1. Create project in DB
    const project = await db.projects.create({
      tenantId: plan.tenantId,
      title: plan.title,
      goal: plan.goal,
      status: 'planning'
    })

    // 2. Create tasks
    const tasks = await Promise.all(
      plan.tasks.map(task => db.tasks.create({
        projectId: project.id,
        ...task
      }))
    )

    // 3. Update status
    await db.projects.update({
      where: { id: project.id },
      data: { status: 'active' }
    })

    // 4. Notify Rep Room
    await this.notifyRepRoom(
      plan.tenantId,
      `Project "${plan.title}" created with ${tasks.length} tasks`
    )

    return project
  }
}
```

---

# END OF SPECIFICATION

**This document is ready to hand to Claude Code with the instruction:**

> "Implement the DreamCrew Swarm Orchestration system following DREAMCREW_SWARM_SPEC_V3_ENTERPRISE.md"

**All development, testing, and deployment should follow this specification exactly.**
