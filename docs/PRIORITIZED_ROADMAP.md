# DreamCrew Platform - Prioritized Roadmap for Meta Play Vision

**Last Updated:** November 6, 2025
**Vision:** Enable AI sales reps to auto-provision fully-configured tenant accounts during sales conversations

---

## 🎯 THE META PLAY VISION

**Scenario:** AgencyHub's AI sales rep (built on DreamCrew) talks to KitchenPro owner

```
Sales Rep: "I see you offer Italian cuisine delivery. Let me set up your AI assistant."

[Sales Rep uses tavily to scrape kitchenpro.com and extract company info]

Prospect: "Yes, let's try it!"

[Sales Rep calls DreamCrew MCP tools to auto-provision entire account]

✅ Tenant account created with credits
✅ AI assistant activated and customized
✅ Company knowledge base populated from website
✅ Implementation tasks created
✅ Widget embed code generated
✅ Onboarding email sent with login link

Prospect receives email in < 30 seconds with fully working AI assistant
```

---

## 📊 CURRENT STATE vs DESIRED STATE

### Current State ✅
- 153 provisioning APIs fully functional
- All manual provisioning capabilities exist
- Complete organizational hierarchy
- Full billing and credit system
- 3-level agent customization
- Rep rooms and widgets

### Desired State 🎯
- DreamCrew exposed as MCP server
- External AI agents can call DreamCrew APIs
- 6 meta play tools available:
  1. `create_tenant_account`
  2. `create_agent_clone_for_tenant`
  3. `populate_knowledge_base`
  4. `create_implementation_tasks`
  5. `generate_widget_code`
  6. `send_onboarding_email`

---

## 🚀 PRIORITY 1: ENABLE META PLAY (8-10 weeks)

### Epic 1.1: MCP Server Infrastructure (2-3 weeks)

**Goal:** Expose DreamCrew as MCP server so external AI agents can call it

**Why P1:** This is the foundation - nothing else matters until external agents can call DreamCrew

**Tasks:**
1. ✅ Audit existing Edge Functions (DONE - 153 functions documented)
2. Create MCP server wrapper around Edge Functions
3. Implement stdio transport for MCP
4. Add npm package entry point (`npx dreamcrew-mcp`)
5. Register tools with MCP protocol
6. Test with Claude Desktop
7. Document MCP tools

**Deliverables:**
- DreamCrew MCP server package
- 6 meta play tools exposed
- Test suite with Claude integration
- Developer documentation

**Success Criteria:**
- External AI agents can discover DreamCrew tools
- Claude can call `create_tenant_account` and receive valid response
- All 6 tools pass integration tests

**Estimated Effort:** 120-160 hours
**Risk Level:** Medium (new integration pattern)

---

### Epic 1.2: Unified Provisioning APIs (1-2 weeks)

**Goal:** Create high-level composite APIs that combine multiple Edge Functions

**Why P1:** Simplifies meta play by reducing 10+ API calls to 3-4

**Tasks:**

#### Tool 1: `create_tenant_account` ✅ (Wrapper Only)
- **Status:** All APIs exist, just needs MCP wrapper
- Wraps: organizations-create, invitations-create, credits-allocate, billing-settings-update
- **Input:**
  ```typescript
  {
    parentOrganizationId: string;
    companyName: string;
    ownerEmail: string;
    ownerName: string;
    plan: 'starter' | 'pro' | 'enterprise';
    credits: number;
    agentLimit: number;
    customization: { brandColor: string; logo?: string; };
  }
  ```
- **Output:**
  ```typescript
  {
    tenantId: string;
    inviteLink: string;
    organizationDetails: {...};
  }
  ```

#### Tool 2: `create_agent_clone_for_tenant` ⚠️ (Needs Consolidation)
- **Status:** Partial - needs unified endpoint
- Current: 3 separate calls (tenant-agent-activations-create, user-agent-clones-create, rep-rooms-create)
- **New:** Single composite endpoint
- **Input:**
  ```typescript
  {
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
  ```
- **Output:**
  ```typescript
  {
    agentCloneId: string;
    repRoomId: string;
    repRoomUrl: string;
  }
  ```
- **Tasks:**
  - Create unified Edge Function
  - Validate agent exposure before activation
  - Auto-generate slug if collision
  - Rollback on failure (atomic operation)

#### Tool 4: `create_implementation_tasks` ✅ (Wrapper Only)
- **Status:** API exists (task-create)
- Just needs MCP wrapper for bulk task creation
- **Input:**
  ```typescript
  {
    tenantId: string;
    projectName: string;
    tasks: Array<{
      title: string;
      description: string;
      priority: number;
      dueDate?: string;
      assignee?: string;
    }>;
  }
  ```
- **Output:**
  ```typescript
  {
    projectId: string;
    taskIds: string[];
  }
  ```

#### Tool 5: `generate_widget_code` ✅ (Fully Exists)
- **Status:** 100% complete
- Uses: widget-create, widget-embed
- **Input:**
  ```typescript
  {
    repRoomId: string;
    widgetConfig: {
      position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
      size: 'small' | 'medium' | 'large';
      trigger: 'immediate' | 'delayed' | 'scroll';
      displayMode: 'floating' | 'center-screen';
      skipPhases: boolean;
    };
  }
  ```
- **Output:**
  ```typescript
  {
    widgetId: string;
    embedCode: string; // Ready-to-paste HTML/JS
  }
  ```

#### Tool 6: `send_onboarding_email` ⚠️ (Needs Email Templates)
- **Status:** Infrastructure exists, templates need completion
- Uses: invitations-create (has email sending)
- **Needs:**
  - Onboarding email template (HTML)
  - Dynamic template rendering
  - Variables: companyName, agentName, repRoomUrl, loginUrl, widgetCode, planDetails
- **Input:**
  ```typescript
  {
    tenantId: string;
    recipientEmail: string;
    templateData: {
      companyName: string;
      agentName: string;
      repRoomUrl: string;
      loginUrl: string;
      widgetCode: string;
      planDetails: { credits: number; agentLimit: number; plan: string; };
    };
  }
  ```
- **Output:**
  ```typescript
  {
    emailSent: boolean;
    messageId: string;
  }
  ```

**Deliverables:**
- 6 unified MCP tools
- Atomic transaction handling (rollback on failure)
- Comprehensive error messages
- API documentation

**Success Criteria:**
- All 6 tools callable from Claude
- < 30 second end-to-end provisioning time
- Rollback works correctly on failures

**Estimated Effort:** 60-80 hours
**Risk Level:** Low (mostly wrappers)

---

### Epic 1.3: Knowledge Base Infrastructure (3-4 weeks)

**Goal:** Build RAG pipeline for bulk customer data ingestion

**Why P1:** Critical for personalized AI assistants - without this, agents give generic responses

**Tasks:**

#### 1. Design Knowledge Base Schema
```sql
CREATE TABLE company_knowledge_items (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  content_type TEXT, -- 'text', 'image', 'review', 'faq', 'product', 'case_study'
  title TEXT,
  content TEXT,
  content_hash TEXT, -- Deduplication
  embedding vector(1536), -- OpenAI embeddings
  metadata JSONB DEFAULT '{}',
  source_url TEXT,
  image_url TEXT,
  image_analysis JSONB, -- GPT-4 Vision results
  tags TEXT[],
  status TEXT DEFAULT 'active', -- 'active', 'archived', 'pending_review'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_embedding ON company_knowledge_items
  USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX idx_knowledge_tenant ON company_knowledge_items(tenant_id);
CREATE INDEX idx_knowledge_content_type ON company_knowledge_items(content_type);
```

#### 2. Build Chunking Pipeline
- **Strategy:** Recursive character splitter
- **Chunk size:** 1500 tokens
- **Overlap:** 200 tokens
- **Preserve:** Sentence boundaries
- **Metadata:** source, page_number, section_title

#### 3. Implement Embedding Generation
- **Provider:** OpenAI (ada-002) or Cohere
- **Batch size:** 100 items per request
- **Rate limiting:** 3000 RPM
- **Retry logic:** Exponential backoff
- **Cost tracking:** Store token count in metadata

#### 4. Image Analysis with GPT-4 Vision
- **For images:** Extract descriptions, objects, text (OCR)
- **Store in:** `image_analysis` JSONB field
- **Fields:**
  ```json
  {
    "description": "Kitchen with modern appliances",
    "objects": ["stove", "refrigerator", "countertop"],
    "text_detected": "Before: Kitchen Remodel",
    "colors": ["white", "gray", "stainless steel"],
    "style": "modern",
    "confidence": 0.95
  }
  ```

#### 5. Vector Search Implementation
```sql
-- Semantic search function
CREATE OR REPLACE FUNCTION search_knowledge_base(
  p_tenant_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 10,
  p_content_types TEXT[] DEFAULT NULL,
  p_similarity_threshold FLOAT DEFAULT 0.7
) RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cki.id,
    cki.content,
    1 - (cki.embedding <=> p_query_embedding) AS similarity,
    cki.metadata
  FROM company_knowledge_items cki
  WHERE cki.tenant_id = p_tenant_id
    AND cki.status = 'active'
    AND (p_content_types IS NULL OR cki.content_type = ANY(p_content_types))
    AND (1 - (cki.embedding <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY cki.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

#### 6. Tool 3: `populate_knowledge_base`
- **Edge Function:** `knowledge-base-import`
- **Input:**
  ```typescript
  {
    tenantId: string;
    content: Array<{
      type: 'text' | 'image' | 'review' | 'faq' | 'product';
      title: string;
      content: string;
      imageUrl?: string;
      sourceUrl?: string;
      metadata?: Record<string, any>;
    }>;
  }
  ```
- **Processing:**
  1. Deduplicate via content hash
  2. Chunk text content
  3. Generate embeddings (batch)
  4. Analyze images with GPT-4V
  5. Store in database
  6. Update agent context
- **Output:**
  ```typescript
  {
    itemsCreated: number;
    itemsSkipped: number; // duplicates
    embeddingsGenerated: number;
    processingErrors: Array<{ index: number; error: string }>;
    totalTokens: number;
    estimatedCost: number;
  }
  ```

#### 7. Agent Integration
- Add knowledge base context to agent system prompt
- Semantic search on user query
- Inject top 5 relevant items into context
- Cite sources in responses

**Deliverables:**
- Knowledge base schema and migrations
- RAG ingestion pipeline
- Vector search function
- GPT-4 Vision image analysis
- `populate_knowledge_base` MCP tool
- Agent integration for context retrieval

**Success Criteria:**
- Can ingest 100+ items in < 10 seconds
- Vector search returns relevant results (>0.8 similarity)
- Agents cite knowledge base in responses
- Image analysis extracts accurate descriptions

**Estimated Effort:** 140-180 hours
**Risk Level:** Medium-High (complex pipeline)

---

## 🎨 PRIORITY 2: POLISH & ENHANCE (3-4 weeks)

### Epic 2.1: Agent Generation API (2-3 weeks)

**Goal:** Allow dynamic agent creation (not just activation of pre-created agents)

**Why P2:** Currently can only activate House-created agents; limits flexibility for custom use cases

**Tasks:**

#### 1. Design Agent Generation Schema
```typescript
interface GenerateAgentRequest {
  organizationId: string; // House only
  agentType: 'voice' | 'chat' | 'voice_and_chat';
  name: string;
  description: string;
  systemPrompt: string;
  personality?: {
    tone: string;
    formality: 'formal' | 'casual' | 'mixed';
    verbosity: 'concise' | 'moderate' | 'detailed';
  };
  voiceConfig?: {
    voiceId: string;
    provider: 'elevenlabs' | 'openai';
    stability: number;
    similarityBoost: number;
  };
  tools: string[]; // MCP server IDs to attach
  knowledgeBaseIds?: string[]; // Optional knowledge bases
  pricing: {
    creditsPerCompletionToken: number;
    creditsPerPromptToken: number;
  };
  customizableParameters: string[]; // What can tenants override?
}
```

#### 2. Create Mastra Agent Template Generator
- Generate Mastra agent configuration
- Register in agent registry
- Validate tool availability
- Test agent with sample prompts

#### 3. Build Edge Function: `agents-generate`
- Validate House admin permission
- Create entry in `agents` table
- Generate Mastra config
- Set status to 'draft'
- Return agent ID and config preview

#### 4. Auto-Publishing Workflow
- Review interface for House admins
- Test agent in sandbox
- Set `is_public = true` when ready
- Expose to Super Agencies

**Deliverables:**
- Agent generation API
- Mastra template generator
- Admin review UI
- Documentation

**Success Criteria:**
- House admins can create custom agents
- Generated agents work in rep rooms
- Pricing model enforced correctly

**Estimated Effort:** 80-120 hours
**Risk Level:** Medium (Mastra integration complexity)

---

### Epic 2.2: MCP Servers Management API (1 week)

**Goal:** Allow programmatic management of MCP server configurations

**Why P2:** Enables dynamic tool attachment; currently table exists but no CRUD APIs

**Tasks:**

#### 1. Complete CRUD Endpoints
- `mcp-servers-create` - Create MCP server config
- `mcp-servers-list` - List tenant's MCP servers
- `mcp-servers-get` - Get server details
- `mcp-servers-update` - Update config/secrets
- `mcp-servers-delete` - Delete server
- `mcp-servers-test` - Test connection

#### 2. Add RLS Policies
```sql
-- Tenants can manage their own MCP servers
CREATE POLICY "mcp_servers_tenant_manage"
  ON mcp_servers FOR ALL
  USING (tenant_id = get_my_org_id())
  WITH CHECK (tenant_id = get_my_org_id());

-- House can see all
CREATE POLICY "mcp_servers_house_view_all"
  ON mcp_servers FOR SELECT
  USING (get_my_role() = 'house_admin');
```

#### 3. Secrets Management
- Encrypt secrets at rest (Supabase Vault)
- Never return secrets in GET requests
- Validate secrets on server test
- Rotate secrets on schedule

#### 4. Connection Testing
- Spawn MCP server process
- Test stdio/SSE transport
- List available tools
- Return connection status

**Deliverables:**
- Full CRUD API for MCP servers
- Secrets encryption
- Connection testing
- UI for MCP server management

**Success Criteria:**
- Tenants can add custom MCP servers
- Secrets stored securely
- Connection test validates server works

**Estimated Effort:** 40-50 hours
**Risk Level:** Low

---

## 🔧 PRIORITY 3: OPTIMIZATION & SCALE (2-3 weeks)

### Epic 3.1: Parallel Agent Orchestration (2 weeks)

**Goal:** Enable swarm-based multi-agent execution (as discussed in original swarm spec)

**Why P3:** Improves performance for complex tasks requiring multiple agents

**See:** `DREAMCREW_SWARM_ORCHESTRATION_SPEC.md` for full details

**Key Features:**
- AgentPoolManager for spawning parallel workers
- TaskAnalyzer for AI-powered task decomposition
- SwarmOrchestrator for coordination
- Real-time progress updates via Supabase Realtime

**Estimated Effort:** 80-100 hours
**Risk Level:** Medium

---

### Epic 3.2: Anonymized MCP Server Layer (1 week)

**Goal:** Hide system MCP server names from users (dataforseo → "SEO Analysis")

**Why P3:** Better user experience; white-label partners shouldn't see vendor names

**See:** `COMPANY_KNOWLEDGE_BASE_SPEC.md` (Section: MCP Anonymization)

**Example:**
```typescript
const MCP_CAPABILITY_MAP = {
  'dataforseo': {
    publicName: 'SEO Analysis',
    icon: '📊',
    userFacingMessages: {
      connecting: 'Preparing SEO analysis tools...',
      analyzing: 'Analyzing your website performance...',
    }
  },
  'tavily': {
    publicName: 'Web Research',
    icon: '🔍'
  }
};
```

**Estimated Effort:** 30-40 hours
**Risk Level:** Low

---

## 📈 PRIORITY 4: ADVANCED FEATURES (4-6 weeks)

### Epic 4.1: Revenue Share System (2 weeks)

**Goal:** Implement parent-child revenue split on credit consumption

**Why P4:** Enables sustainable channel partner business model

**Features:**
- Configure revenue share percentage per child org
- Automatic credit redistribution on consumption
- Revenue tracking and reporting
- Monthly settlement process

**Estimated Effort:** 80-100 hours
**Risk Level:** Medium

---

### Epic 4.2: Usage Analytics Dashboard (1-2 weeks)

**Goal:** Comprehensive analytics for credit usage, agent performance, customer interactions

**Features:**
- Credit burn rate by organization
- Agent usage metrics (calls, duration, tokens)
- Customer satisfaction tracking
- Conversion funnel analytics

**Estimated Effort:** 60-80 hours
**Risk Level:** Low

---

### Epic 4.3: Template Library (1-2 weeks)

**Goal:** Pre-built agent templates, task workflows, knowledge base templates

**Features:**
- Industry-specific agent templates (restaurant, real estate, legal, etc.)
- Common task workflow templates (SEO audit, content creation, lead nurturing)
- Knowledge base seed data for common industries

**Estimated Effort:** 40-60 hours
**Risk Level:** Low

---

## 📅 IMPLEMENTATION TIMELINE

### Phase 1: Core Meta Play (Weeks 1-6)
- **Weeks 1-3:** Epic 1.1 - MCP Server Infrastructure
- **Weeks 3-4:** Epic 1.2 - Unified Provisioning APIs
- **Weeks 4-6:** Epic 1.3 - Knowledge Base Infrastructure (start)

### Phase 2: Knowledge Base Completion (Weeks 7-10)
- **Weeks 7-10:** Epic 1.3 - Complete knowledge base RAG pipeline
- **Testing & Polish**

### Phase 3: Enhancement (Weeks 11-14)
- **Weeks 11-13:** Epic 2.1 - Agent Generation API
- **Week 14:** Epic 2.2 - MCP Servers Management

### Phase 4: Optimization (Weeks 15-17)
- **Weeks 15-16:** Epic 3.1 - Parallel Agent Orchestration
- **Week 17:** Epic 3.2 - Anonymized MCP Layer

### Phase 5: Advanced (Weeks 18-24)
- **Weeks 18-19:** Epic 4.1 - Revenue Share
- **Weeks 20-21:** Epic 4.2 - Analytics Dashboard
- **Weeks 22-24:** Epic 4.3 - Template Library

**Total Timeline:** 24 weeks (6 months) for complete vision

**Minimum Viable Meta Play:** 10 weeks (Phase 1 + Phase 2)

---

## 🎯 SUCCESS METRICS

### Phase 1 Success (MVP Meta Play)
- [ ] Claude can call all 6 DreamCrew MCP tools
- [ ] End-to-end provisioning completes in < 60 seconds
- [ ] Knowledge base contains ≥ 50 items per tenant
- [ ] Vector search returns relevant results (> 0.8 similarity)
- [ ] Zero manual intervention required for provisioning

### Phase 2 Success (Enhanced)
- [ ] House admins can generate custom agents dynamically
- [ ] Tenants can configure custom MCP servers
- [ ] Agent generation produces working agents in < 5 minutes

### Phase 3 Success (Optimized)
- [ ] Swarm orchestration executes 5+ agents in parallel
- [ ] System MCP servers appear anonymized to users
- [ ] Task completion time reduced by 60% via parallelization

### Phase 4 Success (Advanced)
- [ ] Revenue share calculations accurate to 0.01%
- [ ] Analytics dashboard shows real-time usage metrics
- [ ] Template library has ≥ 10 industry templates

---

## 💰 ESTIMATED COSTS

### Development Time
- **Phase 1 (MVP):** 320-420 hours → $48,000-$63,000 @ $150/hr
- **Phase 2 (Enhanced):** 120-170 hours → $18,000-$25,500
- **Phase 3 (Optimized):** 110-140 hours → $16,500-$21,000
- **Phase 4 (Advanced):** 180-240 hours → $27,000-$36,000

**Total:** 730-970 hours → $109,500-$145,500 @ $150/hr

### Infrastructure Costs (Monthly)
- **Supabase Pro:** $25/month (existing)
- **OpenAI API:** ~$500-$1000/month (embeddings + GPT-4V)
- **ElevenLabs:** ~$200-$500/month (voice cloning)
- **Vercel Pro:** $20/month (existing)
- **Total:** ~$745-$1,545/month

---

## 🚨 RISKS & MITIGATIONS

### Risk 1: MCP Protocol Changes
- **Impact:** High
- **Likelihood:** Low
- **Mitigation:** Abstract MCP layer, easy to update

### Risk 2: Knowledge Base Performance at Scale
- **Impact:** High
- **Likelihood:** Medium
- **Mitigation:** Use pgvector with proper indexing, benchmark early

### Risk 3: Agent Generation Quality
- **Impact:** Medium
- **Likelihood:** Medium
- **Mitigation:** Require House admin review before publishing

### Risk 4: Timeline Slippage
- **Impact:** Medium
- **Likelihood:** High
- **Mitigation:** Ship MVP first, iterate on enhancements

---

## 🎉 QUICK WINS (Can Ship Immediately)

These features use existing APIs and just need MCP wrappers:

1. ✅ **Tool 1:** `create_tenant_account` (1-2 days)
2. ✅ **Tool 4:** `create_implementation_tasks` (1-2 days)
3. ✅ **Tool 5:** `generate_widget_code` (Already complete!)

**Ship these first for immediate demo-able meta play** (even without knowledge base)

---

**End of Prioritized Roadmap**
