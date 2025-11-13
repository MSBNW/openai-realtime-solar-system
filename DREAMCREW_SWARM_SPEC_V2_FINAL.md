# 🚀 **DREAMCREW SWARM ORCHESTRATION — UNIFIED SPECIFICATION V2**

### **Instructions for Claude Code (AI Coder)**

---

## 📋 **READ THIS FIRST**

You are the AI coder working inside **Claude Code on the Web**.

Your mission: **Extend the existing DreamCrew platform** by adding a **multi-agent swarm orchestration system** that operates in **Rep Rooms** (voice/chat), enabling conversational goal-driven workflows with autonomous task execution.

### **Critical Context:**

✅ **Claude Flow + MCP servers** → Development tools only (NOT shipped to production)
✅ **Rep Rooms** → Where swarm orchestration happens (the runtime UX)
✅ **Existing repo** → You're modifying/extending, not creating greenfield
✅ **Multi-agent** → Multiple specialized AI agents collaborating in real-time
✅ **Conversational-first** → Humans talk to swarm, swarm executes over time

---

# 🎯 **1. PRODUCT VISION**

## 1.1 What You're Building

A **conversational AI swarm platform** where:

1. **Human says:** *"I need to increase revenue for my business"*
2. **Swarm interprets** it as a goal
3. **SwarmCoordinator creates** a project with tasks
4. **TaskDispatcher assigns** tasks to specialized worker agents
5. **Workers execute** using MCP connectors (CRM, research, content, etc.)
6. **Consensus voting** when agents need to make decisions together
7. **Observer agents** monitor conversations for opportunities/risks
8. **Human receives** progress updates and approves key decisions
9. **Content MCP surfaces** relevant uploaded images, docs, videos
10. **System completes** the goal over hours/days/weeks

### The Core UX Loop:
```
Human Goal → Project Plan → Task Breakdown → Agent Assignment →
Execution → Approvals → Completion → Reporting
```

All happening **conversationally** in **Rep Rooms**.

---

## 1.2 Rep Rooms: Multi-Agent Conversational Runtime

Rep Rooms are located at routes like:
```
/rr/:accountSlug/:sessionId?mode=voice|chat
```

**Rep Rooms support:**

✅ **Multiple agents in the room:**
- Primary conversational agent (SwarmCoordinator)
- Specialized worker agents (research, content, CRM, SEO, etc.)
- Observer agents (silent monitoring, triggering logic)

✅ **Multiple human types:**
- Business users (logged in, account owners)
- External/anonymous users (customers, leads)

✅ **Conversational workflows:**
- Natural language goal setting
- Real-time progress updates
- Approval requests ("Should I send this email?")
- Multi-agent collaboration visible to humans
- Content presentation (images, charts, documents)

---

## 1.3 Key Differentiators

🎯 **Goal-Driven:** Users state intent, system plans & executes
🤝 **Collaborative:** Multiple agents work together, visible to humans
⏰ **Long-Running:** Projects span hours/days, not just single responses
✋ **Human-in-Loop:** Approval gates for important decisions
📊 **Content-Aware:** Surface uploaded images, docs, videos in context
👀 **Observable:** Silent agents watch for sales opportunities, risks, confusion
🔌 **Extensible:** Tenant-specific MCP connectors (their CRM, calendar, CMS)

---

# 🧩 **2. DEVELOPMENT ENVIRONMENT (INTERNAL ONLY)**

## 2.1 Setup Your Dev Tools

Before writing code:

1. **Locate the DreamCrew repo directories:**
   - `/backend/` (API services)
   - `/replicas/` (agent configurations)
   - `/infra/` (infrastructure configs)
   - `/docs/` (documentation)
   - `/tests/` (test suites)

2. **Create dev-only folder** (not shipped to production):
   ```
   /infra/claude-flow/
   ```

3. **Configure MCP servers** for your development workflow:

```jsonc
{
  "mcpServers": {
    "mastra": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@mastra/mcp-docs-server@0.10.0", "--force"],
      "env": {},
      "purpose": "DreamCrew docs, swarm algorithms, architectural patterns"
    },
    "copilotkit": {
      "type": "stdio",
      "command": "npx",
      "args": ["mcp-remote", "https://mcp.copilotkit.ai"],
      "env": {},
      "purpose": "Real-time collaboration tools, remote automations"
    },
    "tavily": {
      "type": "sse",
      "url": "https://tavily.api.tadata.com/mcp/tavily/teepee-bowling-tame-iihmhf",
      "purpose": "Web search for distributed AI research, case studies"
    },
    "perplexity": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "perplexity-mcp"],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}"
      },
      "purpose": "Deep research on consensus algorithms, swarm optimization"
    },
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}",
        "SUPABASE_PROJECT_REF": "${SUPABASE_PROJECT_REF}"
      },
      "purpose": "Database access for swarm state, task queues, metrics"
    }
  }
}
```

**CRITICAL:** These MCPs are **development tools only**. They help you research, design, and implement. The generated code must **run natively in DreamCrew** without Claude Flow dependencies.

---

## 2.2 How MCPs Help You Build

| MCP | How You Use It During Development |
|-----|-----------------------------------|
| **Mastra** | Query DreamCrew architectural patterns, swarm algorithm docs, best practices |
| **CopilotKit** | Test real-time collaboration tools, prototype remote automations |
| **Tavily** | Research distributed AI systems, multi-agent coordination papers |
| **Perplexity** | Deep dive on Raft vs Paxos, Byzantine fault tolerance, task distribution algorithms |
| **Supabase** | Design schema, test queries, set up real-time subscriptions |

---

# 🗂 **3. SYSTEM ARCHITECTURE**

## 3.1 High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     REP ROOMS (Runtime UX)                  │
│  /rr/:accountSlug/:sessionId?mode=voice|chat                │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Human      │  │ SwarmCoord   │  │  Workers     │      │
│  │  Operator    │◄─┤  (Primary    │◄─┤ (Specialized │      │
│  │              │  │   Agent)     │  │   Agents)    │      │
│  └──────────────┘  └──────┬───────┘  └──────────────┘      │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ SwarmCoordinator│
                    │   (Backend)     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ TaskDispatcher│   │CollaborationHub│  │ConsensusEngine│
└───────┬───────┘   └───────────────┘   └───────────────┘
        │
        ▼
┌───────────────────────────────────────────────────────┐
│              Worker Agent Pool                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Research │ │ Content  │ │   CRM    │ │   SEO    │ │
│  │  Agent   │ │  Agent   │ │  Agent   │ │  Agent   │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ │
└───────┼────────────┼────────────┼────────────┼────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────┐
│                    MCP Connectors                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Internal MCPs (Built-in)                         │   │
│  │  • Tavily (web search)                           │   │
│  │  • Perplexity (research)                         │   │
│  │  • DataForSEO (SEO tools)                        │   │
│  │  • Content MCP (uploaded files)                  │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ User-Connected MCPs (Tenant-Specific)            │   │
│  │  • CRM (HubSpot, Salesforce, GoHighLevel, Zoho)  │   │
│  │  • Calendar (Google, Outlook)                    │   │
│  │  • Email (SendGrid, Gmail, SES)                  │   │
│  │  • CMS (WordPress, Webflow, custom)              │   │
│  │  • Custom APIs                                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase (State & Data)                     │
│  • swarm_agents       • swarm_tasks                      │
│  • swarm_events       • swarm_metrics                    │
│  • projects           • content_items                    │
│  • tenant_mcp_connectors                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 3.2 Data Flow: Goal to Completion

```
1. Human in Rep Room: "I need to increase revenue"
   │
   ▼
2. SwarmCoordinator receives goal
   │
   ▼
3. SwarmCoordinator queries Perplexity/Tavily (via dev MCP) for strategies
   │
   ▼
4. Creates Project in database:
   {
     goal: "Increase revenue",
     status: "planning",
     tasks: []
   }
   │
   ▼
5. Breaks goal into tasks:
   - "Analyze current customer segments" → Research Agent
   - "Create SEO content strategy" → SEO Agent
   - "Set up email nurture campaign" → CRM Agent
   - "Generate blog posts" → Content Agent
   │
   ▼
6. TaskDispatcher assigns tasks based on agent capabilities
   │
   ▼
7. Workers execute in parallel:
   - Research Agent → Uses Tavily MCP to analyze competitors
   - SEO Agent → Uses DataForSEO MCP to find keywords
   - CRM Agent → Uses tenant's HubSpot MCP to segment contacts
   - Content Agent → Uses Content MCP to surface brand assets
   │
   ▼
8. ConsensusEngine called when decision needed:
   "Which of 3 SEO strategies should we use?"
   → Agents vote, consensus reached
   │
   ▼
9. Observer Agent detects risk:
   "CRM Agent about to send 10,000 emails - human approval needed"
   → Task paused, human notified in Rep Room
   │
   ▼
10. Human approves in Rep Room: "Yes, send them"
    │
    ▼
11. CRM Agent completes task
    │
    ▼
12. HealthMonitor tracks metrics, all tasks complete
    │
    ▼
13. SwarmCoordinator reports to human in Rep Room:
    "Revenue strategy implemented. Results: [data visualization]"
```

---

# 🔧 **4. COMPONENTS TO IMPLEMENT**

## 4.1 SwarmCoordinator

**Location:** `/backend/swarm/coordinator/`

**Responsibilities:**
- Interpret natural language goals from Rep Room conversations
- Decompose goals into projects with task breakdowns
- Manage global swarm state (which agents are active, task assignments)
- Coordinate specialized worker agents
- Manage project timelines and dependencies
- Handle retries, error recovery
- Communicate plans and progress back to Rep Rooms

**Core Functions:**
```typescript
interface SwarmCoordinator {
  // Goal interpretation
  planGoal(goalText: string, context: ConversationContext): Promise<ProjectPlan>

  // Project management
  createProject(plan: ProjectPlan): Promise<Project>
  updateProjectStatus(projectId: string, status: ProjectStatus): Promise<void>

  // Task orchestration
  dispatchTasks(tasks: Task[]): Promise<TaskAssignment[]>
  collectResults(taskIds: string[]): Promise<TaskResult[]>

  // Communication
  notifyRepRoom(message: string, data?: any): Promise<void>
  requestHumanApproval(decision: Decision): Promise<ApprovalResponse>
}
```

**Key Behaviors:**
- **Always communicate** plans before executing (transparency)
- **Break down complex goals** into manageable tasks
- **Detect dependencies** between tasks (Task A must complete before Task B)
- **Request approval** for high-impact actions (sending emails, financial operations)
- **Provide ETA estimates** for project completion
- **Handle failures gracefully** (retry, reassign, or escalate)

---

## 4.2 TaskDispatcher

**Location:** `/backend/swarm/dispatcher/`

**Responsibilities:**
- Maintain task priority queues (urgent, normal, low)
- Match tasks to agent capabilities (semantic matching)
- Implement load balancing (round-robin, least-loaded, capability-based)
- Update task lifecycle: `planned` → `waiting_approval` → `in_progress` → `completed`/`failed`
- Handle retry logic and failure recovery
- Track task execution metrics (latency, success rate)

**Core Functions:**
```typescript
interface TaskDispatcher {
  // Queue management
  enqueueTask(task: Task, priority: Priority): Promise<string>
  dequeueNextTask(agentCapabilities: string[]): Promise<Task | null>

  // Assignment
  assignToAgent(taskId: string, agentId: string): Promise<void>
  reassignTask(taskId: string, reason: string): Promise<void>

  // Lifecycle
  updateStatus(taskId: string, status: TaskStatus, result?: any): Promise<void>

  // Load balancing
  getOptimalAgent(task: Task): Promise<Agent>
  getAgentLoad(agentId: string): Promise<LoadMetrics>
}
```

**Algorithms to Implement:**

1. **Capability Matching:**
   ```typescript
   // Semantic similarity between task requirements and agent capabilities
   function matchScore(task: Task, agent: Agent): number {
     const requiredCaps = task.requiredCapabilities
     const agentCaps = agent.capabilities
     return calculateCosineSimilarity(requiredCaps, agentCaps)
   }
   ```

2. **Load Balancing:**
   - **Round-robin:** Distribute evenly across agents
   - **Least-loaded:** Assign to agent with fewest active tasks
   - **Capability-weighted:** Balance between capability match and load

3. **Priority Queue:**
   - Urgent tasks (user-blocking) → immediate
   - Normal tasks → standard queue
   - Low priority (background analytics) → run during idle time

---

## 4.3 Worker Replicas (Agent Pool)

**Location:** `/replicas/workers/`

**Replica Types to Implement:**

### 4.3.1 Research Agent
**Capabilities:** `["web_search", "competitive_analysis", "market_research", "data_gathering"]`

**Tools:**
- Tavily MCP (web search)
- Perplexity MCP (deep research)
- Content MCP (search internal docs)

**Example Tasks:**
- "Find top 10 competitors in [industry]"
- "Analyze pricing strategies for [product category]"
- "Research latest trends in [topic]"

### 4.3.2 Content Agent
**Capabilities:** `["content_generation", "copywriting", "image_selection", "brand_compliance"]`

**Tools:**
- Content MCP (retrieve brand assets, uploaded images)
- OpenAI/Claude API (text generation)
- Image generation APIs (optional)

**Example Tasks:**
- "Write blog post about [topic] using brand voice"
- "Generate 5 social media captions for [product launch]"
- "Select best testimonial images for landing page"

### 4.3.3 CRM Agent
**Capabilities:** `["contact_management", "email_campaigns", "pipeline_updates", "data_enrichment"]`

**Tools:**
- User-connected CRM MCP (HubSpot, Salesforce, etc.)
- Email MCP (SendGrid, Gmail)

**Example Tasks:**
- "Segment contacts by engagement level"
- "Create nurture sequence for [segment]"
- "Update deal stage for [opportunity]"
- "Enrich contact data with company info"

### 4.3.4 SEO Agent
**Capabilities:** `["keyword_research", "seo_analysis", "content_optimization", "backlink_analysis"]`

**Tools:**
- DataForSEO MCP
- Tavily MCP

**Example Tasks:**
- "Find keywords for [topic] with 1k-10k volume"
- "Analyze on-page SEO for [URL]"
- "Suggest content optimizations for [page]"

### 4.3.5 Calendar/Ops Agent
**Capabilities:** `["scheduling", "calendar_management", "meeting_coordination"]`

**Tools:**
- User-connected Calendar MCP (Google, Outlook)

**Example Tasks:**
- "Schedule meeting with [contact] next week"
- "Find 30-min slot when entire team is available"
- "Send calendar invite for [event]"

### 4.3.6 Observer Agents

**Location:** `/replicas/observers/`

**Purpose:** Silent monitoring of conversations for triggers

**Types:**

**a) Sales Observer**
- Detects buying signals ("How much does this cost?")
- Identifies upsell opportunities
- Triggers CRM logging
- Alerts sales team via Slack

**b) Risk Observer**
- Detects customer frustration, confusion
- Identifies potential churn signals
- Escalates to human support
- Creates support tickets

**c) Compliance Observer**
- Monitors for PII exposure
- Detects policy violations
- Ensures brand guideline adherence
- Flags for legal review if needed

---

## 4.4 CollaborationHub

**Location:** `/backend/swarm/collaboration/`

**Responsibilities:**
- Enable agent-to-agent communication
- Manage shared context for multi-agent tasks
- Pub/sub event streaming
- Cross-agent memory

**Core Functions:**
```typescript
interface CollaborationHub {
  // Messaging
  publish(channel: string, message: AgentMessage): Promise<void>
  subscribe(agentId: string, channel: string, handler: MessageHandler): Promise<void>

  // Shared context
  appendContext(taskId: string, update: ContextUpdate): Promise<void>
  getContext(taskId: string): Promise<SharedContext>

  // Agent coordination
  requestAssistance(fromAgent: string, toAgent: string, request: string): Promise<void>
  shareKnowledge(topic: string, knowledge: Knowledge): Promise<void>
}
```

**Example Collaboration Flow:**

```typescript
// Content Agent requests help from Research Agent
await collaborationHub.requestAssistance(
  "content-agent-1",
  "research-agent-2",
  "I need competitor pricing data for blog post"
)

// Research Agent publishes findings to shared context
await collaborationHub.appendContext(
  "task-123",
  {
    agent: "research-agent-2",
    type: "research_results",
    data: { competitors: [...], pricing: [...] }
  }
)

// Content Agent retrieves shared context
const context = await collaborationHub.getContext("task-123")
// Uses competitor data to write blog post
```

---

## 4.5 ConsensusEngine

**Location:** `/backend/swarm/consensus/`

**Responsibilities:**
- Multi-agent voting for decisions
- Conflict resolution when agents disagree
- Quorum management
- Decision audit trails

**Core Functions:**
```typescript
interface ConsensusEngine {
  // Proposal management
  createProposal(topic: string, options: string[], participants: string[]): Promise<Proposal>

  // Voting
  submitVote(proposalId: string, agentId: string, vote: Vote): Promise<void>

  // Resolution
  tallyVotes(proposalId: string): Promise<VoteResults>
  resolveConflict(proposalId: string): Promise<Decision>

  // Audit
  getDecisionHistory(projectId: string): Promise<Decision[]>
}

interface Vote {
  option: string
  confidence: number  // 0-1
  reasoning: string
}
```

**Consensus Algorithms:**

**1. Simple Majority (Default):**
```typescript
// Decision = option with >50% votes
function simpleMajority(votes: Vote[]): Decision {
  const counts = countVotes(votes)
  const winner = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])[0]

  return {
    decision: winner[0],
    confidence: winner[1] / votes.length,
    dissent: votes.length - winner[1]
  }
}
```

**2. Weighted by Confidence:**
```typescript
// Agents can express confidence (0-1) in their votes
function confidenceWeighted(votes: Vote[]): Decision {
  const scores = {}
  votes.forEach(vote => {
    scores[vote.option] = (scores[vote.option] || 0) + vote.confidence
  })

  const winner = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0]

  return {
    decision: winner[0],
    totalConfidence: winner[1],
    reasoning: aggregateReasoning(votes, winner[0])
  }
}
```

**3. Human Tiebreaker:**
```typescript
// If no clear consensus, escalate to human in Rep Room
function consensusOrEscalate(votes: Vote[], threshold: number = 0.6): Decision {
  const result = confidenceWeighted(votes)

  if (result.totalConfidence / votes.length < threshold) {
    return {
      decision: "ESCALATE_TO_HUMAN",
      reason: "No clear consensus reached",
      options: summarizeOptions(votes)
    }
  }

  return result
}
```

**Example Usage:**

```typescript
// SEO Agent and Content Agent disagree on keyword strategy
const proposal = await consensusEngine.createProposal(
  "Which keyword strategy for blog post?",
  [
    "Focus on high-volume competitive keywords",
    "Target long-tail low-competition keywords",
    "Mix of both"
  ],
  ["seo-agent-1", "content-agent-1", "research-agent-1"]
)

// Agents vote
await consensusEngine.submitVote(proposal.id, "seo-agent-1", {
  option: "Target long-tail low-competition keywords",
  confidence: 0.8,
  reasoning: "Better ROI for new sites with low authority"
})

await consensusEngine.submitVote(proposal.id, "content-agent-1", {
  option: "Mix of both",
  confidence: 0.6,
  reasoning: "Diversification reduces risk"
})

await consensusEngine.submitVote(proposal.id, "research-agent-1", {
  option: "Target long-tail low-competition keywords",
  confidence: 0.9,
  reasoning: "Competitor analysis shows this is working for similar sites"
})

// Tally and resolve
const decision = await consensusEngine.resolveConflict(proposal.id)
// Result: "Target long-tail low-competition keywords" (confidence: 0.85)
```

---

## 4.6 HealthMonitor

**Location:** `/backend/swarm/monitoring/`

**Responsibilities:**
- Track agent uptime and availability
- Collect performance metrics (latency, throughput, error rates)
- Detect anomalies (sudden spike in failures, slow response times)
- Alert on swarm health issues
- Visualize swarm topology and status

**Core Functions:**
```typescript
interface HealthMonitor {
  // Agent health
  reportHeartbeat(agentId: string): Promise<void>
  checkAgentHealth(agentId: string): Promise<HealthStatus>
  getActiveAgents(): Promise<Agent[]>

  // Metrics
  recordMetric(metric: Metric): Promise<void>
  getMetrics(agentId: string, timeRange: TimeRange): Promise<Metric[]>

  // Anomaly detection
  detectAnomalies(): Promise<Anomaly[]>

  // Alerting
  createAlert(alert: Alert): Promise<void>
}

interface Metric {
  agentId: string
  type: 'latency' | 'throughput' | 'error_rate' | 'task_duration'
  value: number
  timestamp: Date
}
```

**Metrics to Track:**

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| **Agent Uptime** | % time agent is responsive | <95% |
| **Task Completion Rate** | % tasks completed successfully | <90% |
| **Average Latency** | Time from task assignment to completion | >5 min (for simple tasks) |
| **Error Rate** | % tasks that failed | >10% |
| **Queue Depth** | Number of tasks waiting | >100 tasks |
| **Agent Utilization** | % time agent is busy | >90% (consider scaling) |

**Anomaly Detection:**

```typescript
// Simple threshold-based anomaly detection
function detectLatencyAnomaly(metrics: Metric[]): Anomaly | null {
  const latencies = metrics.filter(m => m.type === 'latency')
  const mean = average(latencies.map(m => m.value))
  const stdDev = standardDeviation(latencies.map(m => m.value))

  const recent = latencies.slice(-10)
  const outliers = recent.filter(m =>
    Math.abs(m.value - mean) > 2 * stdDev
  )

  if (outliers.length > 5) {
    return {
      type: 'LATENCY_SPIKE',
      severity: 'HIGH',
      description: `Recent latency ${outliers[0].value}ms vs avg ${mean}ms`,
      affectedAgents: unique(outliers.map(m => m.agentId))
    }
  }

  return null
}
```

---

## 4.7 Content MCP (User Upload System)

**Location:** `/backend/content/`

**Purpose:** Allow tenants to upload content (PDFs, images, videos) that agents can retrieve and use in conversations.

**Responsibilities:**
- Accept file uploads (PDFs, DOCX, images, videos)
- Run computer vision pipelines:
  - Extract text from PDFs/docs (OCR if needed)
  - Label images (object detection, scene classification)
  - Extract keyframes from videos
  - Generate embeddings for semantic search
- Store in database with metadata
- Provide retrieval API for agents

**Core Functions:**
```typescript
interface ContentMCP {
  // Upload
  uploadFile(file: File, metadata: FileMetadata): Promise<ContentItem>

  // Processing
  processImage(imageId: string): Promise<ImageAnalysis>
  processDocument(docId: string): Promise<DocumentAnalysis>
  processVideo(videoId: string): Promise<VideoAnalysis>

  // Retrieval
  searchContent(query: string, filters?: ContentFilters): Promise<ContentItem[]>
  getContentById(id: string): Promise<ContentItem>
  getRelevantContent(context: ConversationContext): Promise<ContentItem[]>
}

interface ImageAnalysis {
  labels: string[]           // ["product", "outdoor", "people"]
  text: string[]             // OCR extracted text
  dominantColors: string[]   // ["#FF5733", "#33FF57"]
  faces: number
  embedding: number[]        // Vector for similarity search
}

interface DocumentAnalysis {
  fullText: string
  summary: string
  topics: string[]
  entities: Entity[]         // People, places, organizations
  embedding: number[]
}

interface VideoAnalysis {
  duration: number
  keyframes: Image[]
  transcript: string         // If audio present
  scenes: Scene[]
  embedding: number[]
}
```

**Processing Pipeline:**

```typescript
async function processUpload(file: File): Promise<ContentItem> {
  // 1. Store raw file
  const fileUrl = await storage.upload(file)

  // 2. Create database record
  const item = await db.contentItems.create({
    filename: file.name,
    mimeType: file.type,
    url: fileUrl,
    status: 'processing'
  })

  // 3. Run analysis based on file type
  let analysis
  if (isImage(file)) {
    analysis = await visionAPI.analyze(fileUrl)
  } else if (isDocument(file)) {
    const text = await extractText(fileUrl)
    analysis = await nlpAPI.analyze(text)
  } else if (isVideo(file)) {
    analysis = await videoAPI.analyze(fileUrl)
  }

  // 4. Generate embedding
  const embedding = await embeddingAPI.embed(
    analysis.text || analysis.summary || analysis.labels.join(' ')
  )

  // 5. Update database
  await db.contentItems.update(item.id, {
    status: 'ready',
    analysis,
    embedding
  })

  return item
}
```

**Retrieval for Conversations:**

```typescript
// Agent in Rep Room asks: "Show me our best customer testimonials"
async function getRelevantContent(
  query: string,
  context: ConversationContext
): Promise<ContentItem[]> {
  // 1. Generate query embedding
  const queryEmbedding = await embeddingAPI.embed(query)

  // 2. Vector similarity search
  const results = await db.contentItems.search({
    embedding: queryEmbedding,
    filters: {
      tenantId: context.tenantId,
      type: 'image',  // inferred from "show me"
      tags: ['testimonial']  // extracted from query
    },
    limit: 5
  })

  // 3. Return with relevance scores
  return results.map(r => ({
    ...r,
    relevanceScore: cosineSimilarity(queryEmbedding, r.embedding)
  }))
}
```

**Example Agent Usage:**

```typescript
// Content Agent creating a landing page
const heroImages = await contentMCP.searchContent(
  "professional office team collaboration",
  { type: 'image', tags: ['hero', 'team'] }
)

const testimonials = await contentMCP.searchContent(
  "customer success stories",
  { type: 'image', tags: ['testimonial'] }
)

const caseStudies = await contentMCP.searchContent(
  "case study ROI results",
  { type: 'document', tags: ['case-study'] }
)

// Generate page using retrieved content
const page = await generateLandingPage({
  heroImage: heroImages[0],
  testimonialImages: testimonials.slice(0, 3),
  caseStudyData: caseStudies[0].analysis.summary
})
```

---

## 4.8 MCP Integration Runtime

**Location:** `/backend/mcp/`

**Two-Class MCP Strategy:**

### 4.8.1 Internal MCPs (Built-in for All Tenants)

**Available to all agents by default:**

| MCP | Purpose | Example Usage |
|-----|---------|---------------|
| **Tavily** | Web search | Research Agent searching competitor info |
| **Perplexity** | Deep research | Strategy Agent analyzing market trends |
| **DataForSEO** | SEO tools | SEO Agent finding keywords |
| **Content MCP** | Uploaded files | Content Agent retrieving brand assets |

**Configuration:** `/backend/mcp/internal-registry.ts`

```typescript
export const INTERNAL_MCPS = {
  tavily: {
    type: 'sse',
    url: process.env.TAVILY_MCP_URL,
    capabilities: ['web_search', 'news_search', 'research']
  },
  perplexity: {
    type: 'stdio',
    command: 'npx',
    args: ['-y', 'perplexity-mcp'],
    env: { PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY },
    capabilities: ['deep_research', 'qa', 'summarization']
  },
  dataforseo: {
    type: 'http',
    baseUrl: 'https://api.dataforseo.com',
    auth: { /* credentials */ },
    capabilities: ['keyword_research', 'serp_analysis', 'backlink_checker']
  },
  content: {
    type: 'internal',
    service: 'content-mcp',
    capabilities: ['content_search', 'image_retrieval', 'document_retrieval']
  }
}
```

### 4.8.2 User-Connected MCPs (Tenant-Specific)

**Tenants connect their own tools:**

**Database Table:** `tenant_mcp_connectors`

```sql
CREATE TABLE tenant_mcp_connectors (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  mcp_type VARCHAR(50) NOT NULL,  -- 'crm', 'calendar', 'email', 'cms', 'custom'
  provider VARCHAR(50),            -- 'hubspot', 'salesforce', 'google', etc.
  config JSONB NOT NULL,           -- Connection details, credentials
  capabilities TEXT[],             -- What this MCP can do
  status VARCHAR(20),              -- 'active', 'error', 'disabled'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Example Tenant Config:**

```typescript
// Tenant "acme-corp" connects their HubSpot
await db.tenantMcpConnectors.create({
  tenantId: 'acme-corp',
  mcpType: 'crm',
  provider: 'hubspot',
  config: {
    apiKey: encrypted('hbs_xxxxx'),
    portalId: '12345'
  },
  capabilities: [
    'contact_search',
    'contact_create',
    'deal_update',
    'email_send',
    'list_management'
  ],
  status: 'active'
})

// Tenant "acme-corp" connects their Google Calendar
await db.tenantMcpConnectors.create({
  tenantId: 'acme-corp',
  mcpType: 'calendar',
  provider: 'google',
  config: {
    clientId: 'xxxxx',
    clientSecret: encrypted('xxxxx'),
    refreshToken: encrypted('xxxxx')
  },
  capabilities: [
    'event_create',
    'event_search',
    'availability_check'
  ],
  status: 'active'
})
```

**MCP Routing Logic:**

```typescript
// TaskDispatcher resolves which MCP to use for a task
async function resolveTaskMCP(task: Task): Promise<MCPConnection> {
  const tenantId = task.tenantId
  const requiredCapability = task.mcpCapability  // e.g., 'contact_search'

  // 1. Check if tenant has a custom connector with this capability
  const tenantConnector = await db.tenantMcpConnectors.findFirst({
    where: {
      tenantId,
      capabilities: { contains: requiredCapability },
      status: 'active'
    }
  })

  if (tenantConnector) {
    return createMCPConnection(tenantConnector)
  }

  // 2. Fall back to internal MCP if available
  const internalMCP = Object.values(INTERNAL_MCPS).find(mcp =>
    mcp.capabilities.includes(requiredCapability)
  )

  if (internalMCP) {
    return createMCPConnection(internalMCP)
  }

  // 3. No MCP available - task cannot be completed
  throw new Error(`No MCP available for capability: ${requiredCapability}`)
}
```

**Security & Isolation:**

```typescript
// Ensure tenant A cannot access tenant B's MCP connectors
class MCPConnectionManager {
  async execute(
    tenantId: string,
    mcpId: string,
    action: string,
    params: any
  ): Promise<any> {
    // 1. Verify MCP belongs to tenant
    const connector = await db.tenantMcpConnectors.findFirst({
      where: { id: mcpId, tenantId }
    })

    if (!connector) {
      throw new Error('MCP not found or access denied')
    }

    // 2. Rate limiting per tenant
    await rateLimiter.check(tenantId, mcpId)

    // 3. Execute with tenant isolation
    const result = await mcpClient.execute(connector, action, params)

    // 4. Audit log
    await db.mcpAuditLog.create({
      tenantId,
      mcpId,
      action,
      timestamp: new Date()
    })

    return result
  }
}
```

---

# 📊 **5. DATABASE SCHEMA**

## 5.1 Core Tables

**Location:** `/backend/migrations/`

### Projects Table

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,  -- 'planning', 'active', 'paused', 'completed', 'failed'
  created_by UUID,               -- User who created the project
  assigned_coordinator UUID,     -- SwarmCoordinator agent ID
  metadata JSONB,                -- Flexible data (priority, tags, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_status ON projects(status);
```

### Tasks Table

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL,  -- 'planned', 'waiting_approval', 'in_progress', 'completed', 'failed'
  priority INT DEFAULT 0,        -- Higher = more urgent
  assigned_agent UUID,           -- Agent currently working on this
  required_capabilities TEXT[],  -- e.g., ['web_search', 'content_generation']
  mcp_capability VARCHAR(50),    -- Specific MCP capability needed
  dependencies UUID[],           -- Task IDs that must complete first
  result JSONB,                  -- Task output
  error TEXT,                    -- If failed, error message
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_agent ON tasks(assigned_agent);
```

### Swarm Agents Table

```sql
CREATE TABLE swarm_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type VARCHAR(50) NOT NULL,  -- 'coordinator', 'research', 'content', 'crm', 'seo', 'observer'
  capabilities TEXT[] NOT NULL,
  status VARCHAR(20) NOT NULL,      -- 'active', 'idle', 'busy', 'error', 'offline'
  current_task_id UUID REFERENCES tasks(id),
  config JSONB,                     -- Agent-specific configuration
  metadata JSONB,                   -- Stats: tasks_completed, avg_duration, etc.
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agents_type ON swarm_agents(agent_type);
CREATE INDEX idx_agents_status ON swarm_agents(status);
```

### Swarm Events Table (Event Sourcing)

```sql
CREATE TABLE swarm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,  -- 'task_created', 'task_assigned', 'agent_spawned', etc.
  entity_type VARCHAR(20) NOT NULL, -- 'project', 'task', 'agent'
  entity_id UUID NOT NULL,
  payload JSONB NOT NULL,           -- Event-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_entity ON swarm_events(entity_type, entity_id);
CREATE INDEX idx_events_type ON swarm_events(event_type);
CREATE INDEX idx_events_created ON swarm_events(created_at);
```

### Swarm Metrics Table

```sql
CREATE TABLE swarm_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES swarm_agents(id),
  metric_type VARCHAR(50) NOT NULL,  -- 'latency', 'throughput', 'error_rate'
  value NUMERIC NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_metrics_agent ON swarm_metrics(agent_id);
CREATE INDEX idx_metrics_type_time ON swarm_metrics(metric_type, timestamp);
```

### Consensus Decisions Table

```sql
CREATE TABLE swarm_consensus_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL,
  agent_id UUID REFERENCES swarm_agents(id),
  option VARCHAR(255) NOT NULL,
  confidence NUMERIC(3,2),          -- 0.00 to 1.00
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
  decision VARCHAR(255),            -- Winning option
  confidence NUMERIC(3,2),
  vote_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

### Content Tables

```sql
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  filename TEXT NOT NULL,
  mime_type VARCHAR(100),
  file_size_bytes BIGINT,
  storage_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,      -- 'processing', 'ready', 'failed'
  analysis JSONB,                   -- CV/NLP analysis results
  tags TEXT[],
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id UUID REFERENCES content_items(id) ON DELETE CASCADE,
  embedding vector(1536),           -- Requires pgvector extension
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_tenant ON content_items(tenant_id);
CREATE INDEX idx_content_embeddings_vector ON content_embeddings USING ivfflat (embedding vector_cosine_ops);
```

### Tenant MCP Connectors Table

```sql
CREATE TABLE tenant_mcp_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  mcp_type VARCHAR(50) NOT NULL,    -- 'crm', 'calendar', 'email', 'cms', 'custom'
  provider VARCHAR(50),              -- 'hubspot', 'salesforce', 'google', etc.
  config JSONB NOT NULL,             -- Encrypted credentials, API keys
  capabilities TEXT[] NOT NULL,
  status VARCHAR(20) NOT NULL,       -- 'active', 'error', 'disabled'
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mcp_connectors_tenant ON tenant_mcp_connectors(tenant_id);
CREATE INDEX idx_mcp_connectors_type ON tenant_mcp_connectors(mcp_type);
```

---

## 5.2 Database Migrations

**Create migration files in order:**

1. `001_initial_schema.sql` - Projects, tasks, agents
2. `002_events_and_metrics.sql` - Events, metrics tables
3. `003_consensus_tables.sql` - Consensus voting tables
4. `004_content_tables.sql` - Content items, embeddings (requires pgvector)
5. `005_mcp_connectors.sql` - Tenant MCP registry
6. `006_indexes_and_rls.sql` - Performance indexes, row-level security

**Example Migration:**

```sql
-- 001_initial_schema.sql
BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Projects table
CREATE TABLE projects (
  -- ... (see above)
);

-- Tasks table
CREATE TABLE tasks (
  -- ... (see above)
);

-- Swarm agents table
CREATE TABLE swarm_agents (
  -- ... (see above)
);

-- Add RLS policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_projects ON projects
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

COMMIT;
```

---

# 🔁 **6. IMPLEMENTATION WORKFLOW**

## 6.1 Execution Order (Do This Sequentially)

### Phase 1: Foundation (Week 1)

**1. Database Setup**
- [ ] Set up Supabase project
- [ ] Create migration files (001-006)
- [ ] Run migrations, verify schema
- [ ] Set up row-level security policies
- [ ] Test CRUD operations on all tables
- [ ] Enable pgvector extension for embeddings

**2. MCP Configuration**
- [ ] Configure 5 development MCPs (Mastra, CopilotKit, Tavily, Perplexity, Supabase)
- [ ] Test connectivity to each MCP
- [ ] Create internal MCP registry (`/backend/mcp/internal-registry.ts`)
- [ ] Implement MCP connection manager with tenant isolation

**3. Project Structure**
- [ ] Create directory structure (`/backend/swarm/`, `/replicas/`, `/infra/`, `/docs/`, `/tests/`)
- [ ] Set up TypeScript configuration
- [ ] Install dependencies (Supabase client, MCP clients, etc.)
- [ ] Create shared types (`/backend/types/`)

---

### Phase 2: Core Swarm (Week 2-3)

**4. SwarmCoordinator**
- [ ] Implement goal interpretation logic
- [ ] Build project creation flow
- [ ] Implement task breakdown algorithm
- [ ] Add Rep Room communication methods
- [ ] Create approval request system
- [ ] Write unit tests

**5. TaskDispatcher**
- [ ] Implement task queue (priority-based)
- [ ] Build capability matching algorithm
- [ ] Add load balancing (round-robin, least-loaded)
- [ ] Implement task lifecycle management
- [ ] Add retry logic
- [ ] Write unit tests

**6. Basic Worker Replicas**
- [ ] Create Research Agent (Tavily + Perplexity)
- [ ] Create Content Agent (Content MCP)
- [ ] Implement capability registration
- [ ] Build task execution loop
- [ ] Add result reporting
- [ ] Write integration tests

---

### Phase 3: Coordination (Week 3-4)

**7. CollaborationHub**
- [ ] Implement pub/sub message bus
- [ ] Build shared context storage
- [ ] Add agent-to-agent messaging
- [ ] Create knowledge sharing APIs
- [ ] Test multi-agent coordination flow

**8. ConsensusEngine**
- [ ] Implement proposal creation
- [ ] Build voting mechanisms (simple majority, confidence-weighted)
- [ ] Add conflict resolution logic
- [ ] Create decision audit trails
- [ ] Test consensus scenarios

**9. HealthMonitor**
- [ ] Implement heartbeat tracking
- [ ] Build metrics collection (latency, throughput, errors)
- [ ] Add anomaly detection (threshold-based)
- [ ] Create alerting system
- [ ] Build swarm status dashboard

---

### Phase 4: Advanced Features (Week 4-5)

**10. Content MCP**
- [ ] Build file upload API
- [ ] Integrate computer vision pipeline (image labeling)
- [ ] Add document text extraction
- [ ] Implement embedding generation
- [ ] Build semantic search
- [ ] Create content retrieval API

**11. Additional Worker Replicas**
- [ ] Create CRM Agent (user-connected MCP)
- [ ] Create SEO Agent (DataForSEO)
- [ ] Create Calendar Agent (user-connected MCP)
- [ ] Test each agent independently

**12. Observer Agents**
- [ ] Build Sales Observer (detect buying signals)
- [ ] Build Risk Observer (detect frustration/churn)
- [ ] Implement trigger logic
- [ ] Add Slack/email alerting
- [ ] Test observer accuracy

---

### Phase 5: Integration (Week 5-6)

**13. Rep Rooms Integration**
- [ ] Create `/rr/:accountSlug/:sessionId` routes
- [ ] Build multi-agent chat UI
- [ ] Implement voice/text mode switching
- [ ] Add real-time updates (WebSocket)
- [ ] Test human-swarm conversations

**14. API Layer**
- [ ] Build REST endpoints (`/api/swarm/`)
- [ ] Add GraphQL schema (optional)
- [ ] Implement WebSocket event streaming
- [ ] Add authentication/authorization
- [ ] Write API documentation

**15. User MCP Connector UI**
- [ ] Build MCP connector management page
- [ ] Add OAuth flows for CRM/Calendar
- [ ] Implement credential encryption
- [ ] Test connector CRUD operations

---

### Phase 6: Quality & Launch (Week 6-7)

**16. Comprehensive Testing**
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests (full workflows)
- [ ] Load tests (100+ concurrent tasks)
- [ ] Chaos tests (agent failures, network issues)
- [ ] End-to-end scenarios

**17. Documentation**
- [ ] Write architecture diagrams
- [ ] Create API reference
- [ ] Build operational runbooks
- [ ] Write troubleshooting guide
- [ ] Record demo videos

**18. Deployment**
- [ ] Create Docker containers
- [ ] Write Kubernetes manifests
- [ ] Set up CI/CD pipelines
- [ ] Configure monitoring (Prometheus, Grafana)
- [ ] Deploy to staging, validate

---

## 6.2 Daily Development Workflow

When you start each coding session:

1. **Pull latest** from repo
2. **Check current phase** in implementation plan
3. **Review open questions** (Section 10)
4. **Verify MCP connectivity** (run health check)
5. **Pick next task** from checklist above
6. **Research if needed** (use Perplexity/Tavily MCP)
7. **Implement with tests**
8. **Update documentation**
9. **Commit with clear message**
10. **Update open questions** if new decisions made

---

## 6.3 When You Get Blocked

If you encounter issues:

1. **Research** via Perplexity MCP (algorithms, patterns)
2. **Search** via Tavily MCP (similar implementations)
3. **Query** Mastra MCP (DreamCrew conventions)
4. **Document** the blocker in Section 10 (Open Questions)
5. **Propose** 2-3 alternatives with tradeoffs
6. **Ask for human input** on critical decisions
7. **Never proceed** with uncertain assumptions on:
   - Security (auth, data isolation)
   - Billing/cost implications
   - Legal/compliance (GDPR, data retention)
   - Breaking changes to existing APIs

---

# ✅ **7. VALIDATION & QUALITY GATES**

## 7.1 Component Validation Checklist

### Database (Phase 1)
- [ ] All 6 migrations run successfully
- [ ] Can CRUD all tables via Supabase client
- [ ] Row-level security policies tested (tenant isolation)
- [ ] Real-time subscriptions working (tasks, agents)
- [ ] pgvector extension enabled, embedding search tested
- [ ] Indexes created, query performance <100ms

### MCP Configuration (Phase 1)
- [ ] Mastra MCP reachable, can query docs
- [ ] CopilotKit MCP reachable, can invoke actions
- [ ] Tavily MCP reachable, can search web
- [ ] Perplexity MCP reachable, can answer questions
- [ ] Supabase MCP reachable, can read/write data
- [ ] Internal MCP registry created, all MCPs registered
- [ ] MCP connection manager enforces tenant isolation

### SwarmCoordinator (Phase 2)
- [ ] Can interpret natural language goals
- [ ] Creates projects in database
- [ ] Breaks goals into tasks correctly
- [ ] Communicates plans to Rep Rooms
- [ ] Handles approval requests
- [ ] Recovers from failures gracefully
- [ ] Unit tests >80% coverage

### TaskDispatcher (Phase 2)
- [ ] Enqueues tasks with priority
- [ ] Matches tasks to agents by capabilities
- [ ] Load balancing works (tested with 10+ agents)
- [ ] Task lifecycle transitions correctly
- [ ] Retries failed tasks (max 3 attempts)
- [ ] Reassigns tasks when agent fails
- [ ] Unit tests >80% coverage

### Worker Replicas (Phase 2-4)
- [ ] Research Agent can use Tavily + Perplexity
- [ ] Content Agent can retrieve uploaded files
- [ ] CRM Agent can access tenant's HubSpot/Salesforce
- [ ] SEO Agent can use DataForSEO
- [ ] Calendar Agent can access Google/Outlook
- [ ] All agents report results correctly
- [ ] Capability matching works for all agent types

### CollaborationHub (Phase 3)
- [ ] Agents can publish messages to channels
- [ ] Agents can subscribe to channels
- [ ] Shared context updates work
- [ ] Agent-to-agent communication tested
- [ ] Integration test: 3 agents collaborating on task

### ConsensusEngine (Phase 3)
- [ ] Can create proposals with options
- [ ] Agents can submit votes
- [ ] Simple majority algorithm works
- [ ] Confidence-weighted algorithm works
- [ ] Escalates to human when no consensus
- [ ] Decision history stored and queryable

### HealthMonitor (Phase 3)
- [ ] Agents send heartbeats every 30s
- [ ] Detects agent offline (no heartbeat >60s)
- [ ] Metrics collection works (latency, errors)
- [ ] Anomaly detection triggers alerts
- [ ] Dashboard shows real-time swarm status

### Content MCP (Phase 4)
- [ ] File upload works (images, PDFs, videos)
- [ ] Image analysis extracts labels correctly
- [ ] PDF text extraction works
- [ ] Embedding generation works
- [ ] Semantic search returns relevant results
- [ ] Agents can retrieve content in conversations

### Observer Agents (Phase 4)
- [ ] Sales Observer detects buying signals
- [ ] Risk Observer detects frustration
- [ ] Alerts sent to Slack/email
- [ ] CRM logging triggered correctly
- [ ] Tested with 10+ conversation scenarios

### Rep Rooms (Phase 5)
- [ ] Multi-agent chat works (coordinator + workers)
- [ ] Voice mode works (WebRTC)
- [ ] Text mode works (WebSocket)
- [ ] Real-time updates display correctly
- [ ] Human can approve/reject decisions
- [ ] Content displays in conversation (images, charts)

### API Layer (Phase 5)
- [ ] All REST endpoints respond correctly
- [ ] GraphQL queries work (if implemented)
- [ ] WebSocket events stream in real-time
- [ ] Authentication required for all endpoints
- [ ] Rate limiting works (per tenant)
- [ ] API documentation complete

---

## 7.2 Integration Tests (End-to-End)

**Test Scenario 1: Simple Goal Execution**

```typescript
test('Human goal → Project → Task → Completion', async () => {
  // 1. Human sets goal in Rep Room
  const goal = "Find top 5 competitors in AI chatbot space"

  // 2. SwarmCoordinator creates project
  const project = await swarmCoordinator.planGoal(goal, context)
  expect(project.tasks).toHaveLength(1)
  expect(project.tasks[0].requiredCapabilities).toContain('web_search')

  // 3. TaskDispatcher assigns to Research Agent
  const assignment = await taskDispatcher.assignToAgent(project.tasks[0].id)
  expect(assignment.agentType).toBe('research')

  // 4. Research Agent executes using Tavily MCP
  const result = await researchAgent.executeTask(project.tasks[0])
  expect(result.competitors).toHaveLength(5)

  // 5. SwarmCoordinator reports back to Rep Room
  const message = await swarmCoordinator.formatResults(result)
  expect(message).toContain('OpenAI')
  expect(message).toContain('Anthropic')
})
```

**Test Scenario 2: Multi-Agent Collaboration**

```typescript
test('Content creation with research + SEO + content agents', async () => {
  const goal = "Write SEO-optimized blog post about AI trends"

  // SwarmCoordinator creates 3 tasks
  const project = await swarmCoordinator.planGoal(goal, context)
  expect(project.tasks).toHaveLength(3)

  // Task 1: Research Agent finds trends
  const researchTask = project.tasks.find(t => t.title.includes('research'))
  const trends = await researchAgent.executeTask(researchTask)

  // Task 2: SEO Agent finds keywords
  const seoTask = project.tasks.find(t => t.title.includes('SEO'))
  const keywords = await seoAgent.executeTask(seoTask)

  // Task 3: Content Agent writes post using research + keywords
  const contentTask = project.tasks.find(t => t.title.includes('write'))

  // Content Agent accesses shared context
  const context = await collaborationHub.getContext(project.id)
  expect(context).toHaveProperty('trends')
  expect(context).toHaveProperty('keywords')

  const blogPost = await contentAgent.executeTask(contentTask)
  expect(blogPost.content).toContain(keywords[0])
})
```

**Test Scenario 3: Consensus Decision**

```typescript
test('Agents vote on decision, reach consensus', async () => {
  const proposal = await consensusEngine.createProposal(
    'Which pricing tier to recommend?',
    ['Starter $29/mo', 'Professional $99/mo', 'Enterprise $299/mo'],
    ['sales-agent-1', 'analytics-agent-1', 'customer-success-agent-1']
  )

  // Agents vote
  await consensusEngine.submitVote(proposal.id, 'sales-agent-1', {
    option: 'Professional $99/mo',
    confidence: 0.7,
    reasoning: 'Best fit for their team size and features needed'
  })

  await consensusEngine.submitVote(proposal.id, 'analytics-agent-1', {
    option: 'Professional $99/mo',
    confidence: 0.9,
    reasoning: 'Usage patterns indicate they will need advanced features'
  })

  await consensusEngine.submitVote(proposal.id, 'customer-success-agent-1', {
    option: 'Starter $29/mo',
    confidence: 0.5,
    reasoning: 'They mentioned budget constraints'
  })

  // Resolve
  const decision = await consensusEngine.resolveConflict(proposal.id)
  expect(decision.decision).toBe('Professional $99/mo')
  expect(decision.confidence).toBeGreaterThan(0.6)
})
```

**Test Scenario 4: Observer Triggers**

```typescript
test('Sales Observer detects buying signal, creates task', async () => {
  // Simulate Rep Room conversation
  const conversation = [
    { speaker: 'human', text: 'This looks interesting' },
    { speaker: 'agent', text: 'Would you like to know more about pricing?' },
    { speaker: 'human', text: 'Yes, how much does the Pro plan cost?' }  // <-- Buying signal
  ]

  // Observer analyzes
  const signals = await salesObserver.analyze(conversation)
  expect(signals).toContainEqual({
    type: 'PRICING_INQUIRY',
    confidence: 0.85,
    action: 'CREATE_SALES_TASK'
  })

  // Verify task created
  const tasks = await db.tasks.findMany({
    where: { type: 'sales_follow_up' }
  })
  expect(tasks.length).toBeGreaterThan(0)

  // Verify CRM logged
  const crmActivities = await mockCRM.getRecentActivities()
  expect(crmActivities[0].note).toContain('showed interest in pricing')
})
```

**Test Scenario 5: Content Retrieval in Conversation**

```typescript
test('Content Agent surfaces uploaded testimonials', async () => {
  // Upload testimonial images
  await contentMCP.uploadFile(testimonial1Image, { tags: ['testimonial'] })
  await contentMCP.uploadFile(testimonial2Image, { tags: ['testimonial'] })

  // Wait for processing
  await sleep(5000)

  // Agent query
  const results = await contentMCP.searchContent(
    'customer success stories',
    { type: 'image', tags: ['testimonial'] }
  )

  expect(results).toHaveLength(2)
  expect(results[0].analysis.labels).toContain('person')
  expect(results[0].relevanceScore).toBeGreaterThan(0.7)

  // Verify can be displayed in Rep Room
  const repRoomMessage = await contentAgent.formatForDisplay(results)
  expect(repRoomMessage.type).toBe('image_gallery')
  expect(repRoomMessage.images).toHaveLength(2)
})
```

---

## 7.3 Performance Benchmarks

**Must meet these targets before launch:**

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Task Assignment Latency** | <100ms | Time from task creation to agent assignment |
| **Simple Task Completion** | <5s | Web search task (Tavily) end-to-end |
| **Complex Task Completion** | <30s | Multi-step research + analysis task |
| **Consensus Resolution** | <500ms | 5 agents voting on simple decision |
| **Content Search** | <200ms | Semantic search across 1000 items |
| **Rep Room Message Latency** | <100ms | Swarm update appears in UI |
| **Database Query** | <50ms | p95 for common queries (tasks, agents) |
| **Concurrent Tasks** | 100+ | System handles 100 tasks executing simultaneously |
| **Agent Pool Scale** | 50+ | Support 50 active agents without degradation |
| **Task Throughput** | 200/min | Complete 200 simple tasks per minute |

**Load Testing Script:**

```typescript
// tests/load/task-throughput.test.ts
test('Handle 100 concurrent tasks', async () => {
  const tasks = Array.from({ length: 100 }, (_, i) => ({
    title: `Task ${i}`,
    description: 'Simple web search',
    requiredCapabilities: ['web_search']
  }))

  const start = Date.now()

  // Submit all tasks
  const promises = tasks.map(task =>
    taskDispatcher.enqueueTask(task, 'normal')
  )
  await Promise.all(promises)

  const enqueueTime = Date.now() - start
  expect(enqueueTime).toBeLessThan(1000)  // All enqueued in <1s

  // Wait for completion
  await waitForAllTasksComplete(tasks.map(t => t.id))

  const totalTime = Date.now() - start
  const throughput = (tasks.length / totalTime) * 1000 * 60  // tasks/min

  expect(throughput).toBeGreaterThan(100)
})
```

---

## 7.4 Security Validation

**Security Checklist:**

- [ ] **Tenant Isolation**
  - [ ] Row-level security policies prevent cross-tenant data access
  - [ ] MCP connectors scoped to tenant (cannot access other tenants' CRMs)
  - [ ] Content uploads isolated by tenant
  - [ ] Test: Tenant A cannot read Tenant B's projects/tasks/content

- [ ] **Authentication & Authorization**
  - [ ] All API endpoints require valid JWT token
  - [ ] Rep Room access requires session authentication
  - [ ] MCP operations check user permissions
  - [ ] Admin operations require elevated privileges

- [ ] **Input Validation**
  - [ ] All user inputs sanitized (no SQL injection)
  - [ ] File uploads validated (type, size, malware scan)
  - [ ] Task descriptions sanitized (no code injection)
  - [ ] MCP params validated before execution

- [ ] **Secrets Management**
  - [ ] API keys encrypted at rest
  - [ ] Tenant MCP credentials encrypted (AES-256)
  - [ ] No secrets in logs or error messages
  - [ ] Environment variables used for all credentials

- [ ] **Rate Limiting**
  - [ ] API endpoints: 1000 req/min per tenant
  - [ ] MCP operations: 100 calls/min per tenant per connector
  - [ ] File uploads: 100 MB/day per tenant
  - [ ] Task creation: 1000 tasks/day per tenant

- [ ] **Audit Logging**
  - [ ] All MCP operations logged (tenant, action, timestamp)
  - [ ] All admin operations logged
  - [ ] Failed authentication attempts logged
  - [ ] Sensitive data masked in logs (no API keys, passwords)

- [ ] **Data Privacy**
  - [ ] PII detection in task descriptions
  - [ ] Content uploads scanned for sensitive data
  - [ ] Rep Room transcripts encrypted at rest
  - [ ] GDPR compliance: data export, deletion

---

## 7.5 Chaos Engineering Tests

**Failure Scenarios to Test:**

**Test 1: Agent Failure During Task**

```typescript
test('Task reassigned when agent crashes mid-execution', async () => {
  // Assign task to agent
  const task = await createTask({ title: 'Research competitors' })
  const agent = await taskDispatcher.getOptimalAgent(task)
  await taskDispatcher.assignToAgent(task.id, agent.id)

  // Simulate agent crash (stop sending heartbeats)
  await simulateAgentCrash(agent.id)

  // Wait for health monitor to detect
  await sleep(65000)  // 60s timeout + 5s buffer

  // Verify task reassigned
  const updatedTask = await db.tasks.findUnique({ where: { id: task.id } })
  expect(updatedTask.status).toBe('planned')  // Back to queue
  expect(updatedTask.assigned_agent).toBeNull()

  // Verify new agent picks it up
  await sleep(5000)
  const reassignedTask = await db.tasks.findUnique({ where: { id: task.id } })
  expect(reassignedTask.assigned_agent).not.toBe(agent.id)
})
```

**Test 2: Database Connection Loss**

```typescript
test('Gracefully handle database disconnection', async () => {
  // Disconnect database
  await supabase.disconnect()

  // Attempt task creation
  const result = await taskDispatcher.enqueueTask({ title: 'Test' })
  expect(result.error).toBe('DATABASE_UNAVAILABLE')

  // Reconnect
  await supabase.reconnect()

  // Retry should succeed
  const retryResult = await taskDispatcher.enqueueTask({ title: 'Test' })
  expect(retryResult.success).toBe(true)
})
```

**Test 3: MCP Connector Failure**

```typescript
test('Fallback when tenant MCP connector fails', async () => {
  // Create task requiring CRM capability
  const task = await createTask({ mcpCapability: 'contact_search' })

  // Tenant's HubSpot connector is down
  await mockMCP.setStatus('hubspot', 'error')

  // Task should fail gracefully with clear error
  const result = await crmAgent.executeTask(task)
  expect(result.status).toBe('failed')
  expect(result.error).toContain('CRM connector unavailable')

  // Human notified in Rep Room
  const notifications = await getRepRoomMessages()
  expect(notifications).toContainEqual(
    expect.objectContaining({
      type: 'error',
      message: expect.stringContaining('HubSpot connection failed')
    })
  )
})
```

**Test 4: Consensus Timeout**

```typescript
test('Escalate to human when agents cannot reach consensus', async () => {
  const proposal = await consensusEngine.createProposal(
    'Pricing recommendation',
    ['Option A', 'Option B'],
    ['agent-1', 'agent-2', 'agent-3']
  )

  // Only 2 agents vote (tie), 3rd agent offline
  await consensusEngine.submitVote(proposal.id, 'agent-1', { option: 'Option A', confidence: 0.8 })
  await consensusEngine.submitVote(proposal.id, 'agent-2', { option: 'Option B', confidence: 0.8 })

  // Wait for timeout (30s)
  await sleep(30000)

  // Should escalate to human
  const decision = await consensusEngine.resolveConflict(proposal.id)
  expect(decision.decision).toBe('ESCALATE_TO_HUMAN')

  // Human receives approval request
  const approvals = await getRepRoomApprovals()
  expect(approvals.length).toBeGreaterThan(0)
})
```

**Test 5: High Load (Thundering Herd)**

```typescript
test('System remains stable under sudden load spike', async () => {
  // Spawn 1000 tasks instantly
  const tasks = Array.from({ length: 1000 }, (_, i) => ({
    title: `Task ${i}`,
    priority: Math.floor(Math.random() * 3)
  }))

  const start = Date.now()
  await Promise.all(tasks.map(t => taskDispatcher.enqueueTask(t)))

  // System should not crash
  const health = await healthMonitor.getSwarmStatus()
  expect(health.status).toBe('operational')

  // Queue should process orderly
  await waitForQueueDepth(0, 120000)  // All tasks complete in 2 min

  const completed = await db.tasks.count({ where: { status: 'completed' } })
  expect(completed).toBeGreaterThan(950)  // >95% success rate
})
```

---

# 📏 **8. RULES & CONSTRAINTS**

## 8.1 Development Rules

**✅ MUST:**
- Run in DreamCrew runtime (no Claude Flow dependency in production)
- Follow existing DreamCrew architectural patterns
- Support multi-tenancy (all data scoped to tenant)
- Use Supabase client for all database operations
- Implement proper error handling (never crash silently)
- Log all important events (structured logging)
- Be secure (tenant isolation, input validation, secrets encryption)
- Be auditable (event sourcing, decision logs)
- Support asynchronous + long-running workflows
- Communicate clearly to humans in Rep Rooms
- Request approval for high-impact actions

**❌ MUST NOT:**
- Ship Claude Flow or MCP dev tools to production
- Expose tenant data across tenants
- Store secrets in plaintext
- Make breaking changes to existing APIs without migration path
- Proceed with uncertain assumptions on security/billing/compliance
- Use blocking operations (all async/await)
- Hardcode tenant-specific logic

---

## 8.2 Code Quality Standards

**TypeScript:**
- Strict mode enabled
- No `any` types (use proper types or `unknown`)
- All functions have return types
- All parameters have types

**Testing:**
- Unit test coverage >80%
- Integration tests for all workflows
- Load tests for performance validation
- Chaos tests for failure scenarios

**Documentation:**
- All public functions have JSDoc comments
- All API endpoints documented (OpenAPI/Swagger)
- All database tables documented (schema docs)
- All architectural decisions documented (ADRs)

**Error Handling:**
```typescript
// ✅ Good
async function executeTask(task: Task): Promise<TaskResult> {
  try {
    const result = await agent.run(task)
    return { status: 'completed', data: result }
  } catch (error) {
    logger.error('Task execution failed', { taskId: task.id, error })
    await notifyRepRoom(`Task failed: ${error.message}`)
    return { status: 'failed', error: error.message }
  }
}

// ❌ Bad
async function executeTask(task: Task) {
  const result = await agent.run(task)  // Unhandled promise rejection
  return result
}
```

**Logging:**
```typescript
// ✅ Good (structured logging)
logger.info('Task assigned', {
  taskId: task.id,
  agentId: agent.id,
  agentType: agent.type,
  capability: task.mcpCapability,
  timestamp: new Date()
})

// ❌ Bad (string logging)
console.log(`Task ${task.id} assigned to ${agent.id}`)
```

---

## 8.3 Security Standards

**Input Validation:**
```typescript
// ✅ Good
import { z } from 'zod'

const TaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: z.number().int().min(0).max(10)
})

async function createTask(input: unknown): Promise<Task> {
  const validated = TaskSchema.parse(input)  // Throws if invalid
  return await db.tasks.create(validated)
}

// ❌ Bad (no validation)
async function createTask(input: any): Promise<Task> {
  return await db.tasks.create(input)  // SQL injection risk
}
```

**Tenant Isolation:**
```typescript
// ✅ Good
async function getTasks(tenantId: string, userId: string): Promise<Task[]> {
  return await db.tasks.findMany({
    where: {
      project: { tenantId },  // Always scope to tenant
      assignedAgent: { tenantId }
    }
  })
}

// ❌ Bad (missing tenant scope)
async function getTasks(userId: string): Promise<Task[]> {
  return await db.tasks.findMany()  // Returns all tenants' tasks!
}
```

---

# 🎯 **9. SUCCESS METRICS**

## 9.1 Technical Metrics

**Code Quality:**
- Test coverage: >80%
- TypeScript strict mode: 100% files
- Zero critical security vulnerabilities (Snyk scan)
- Zero high-severity linter errors

**Performance:**
- All benchmarks in 7.3 met
- p95 API response time: <200ms
- p99 API response time: <500ms
- Database query time (p95): <50ms

**Reliability:**
- Task success rate: >95%
- Agent uptime: >99.5%
- API uptime: >99.9%
- Zero data loss incidents

**Scalability:**
- Supports 50+ concurrent agents
- Supports 1000+ tasks in queue
- Supports 100+ Rep Room sessions
- Handles 10k+ tasks/day per tenant

---

## 9.2 Product Metrics

**User Adoption:**
- 80% of users create at least 1 project in first week
- 50% of projects result in completed tasks
- Average 10 tasks per project
- 70% of users connect at least 1 MCP (CRM/calendar)

**Swarm Effectiveness:**
- 90% of tasks complete without human intervention
- <5% of tasks require human approval
- Average project completion time: <24 hours
- 85% user satisfaction (post-project survey)

**Content System:**
- 60% of tenants upload content in first month
- Average 50 content items per tenant
- Content used in 30% of Rep Room conversations

**Observer Impact:**
- Sales Observer detects 20+ opportunities/month
- Risk Observer prevents 10+ churn incidents/month
- 80% accuracy in signal detection

---

## 9.3 Business Metrics

**Efficiency Gains:**
- 10x reduction in time-to-completion vs manual
- 5x increase in tasks completed per user
- 50% reduction in context switching (humans)

**Cost Metrics:**
- Average cost per task: <$0.50
- MCP call costs: <$1000/month per tenant
- Infrastructure costs: <$500/month per 100 active tenants

**Revenue Impact:**
- 20% increase in customer lifetime value
- 15% reduction in churn (due to observers)
- 30% increase in upsells (detected by Sales Observer)

---

# 🚀 **10. OPEN QUESTIONS & DECISIONS**

## 10.1 Decisions Made

Track all architectural decisions as you implement:

| Decision | Options Considered | Choice Made | Rationale | Date |
|----------|-------------------|-------------|-----------|------|
| Consensus Algorithm | Raft, Paxos, Simple Majority | Simple Majority + Confidence Weighting | Simpler to implement, sufficient for MVP, can upgrade later | TBD |
| Task Queue | Redis, Supabase, RabbitMQ | Supabase + in-memory priority queue | Leverage existing DB, avoid new infrastructure | TBD |
| Agent Communication | Direct HTTP, Message Bus, Supabase Realtime | Supabase Realtime pub/sub | Persistent messages, simple, scales well | TBD |
| Content Storage | S3, Supabase Storage, GCS | Supabase Storage | Unified with DB, easier auth | TBD |
| Embeddings | OpenAI, Cohere, Local model | OpenAI text-embedding-3-small | Best accuracy/cost tradeoff, 1536 dimensions | TBD |

**Template for New Decisions:**
```markdown
**Decision:** [What needs to be decided]
**Options:**
1. Option A - [pros/cons]
2. Option B - [pros/cons]
3. Option C - [pros/cons]

**Chosen:** Option B
**Reasoning:** [Why this is best for our use case]
**Tradeoffs:** [What we're giving up]
**Reversibility:** [Easy/medium/hard to change later]
```

---

## 10.2 Open Questions (Need Human Input)

**Q1: Agent Persistence Strategy**
- Should worker agents be **long-lived** (persistent pool) or **ephemeral** (spawn per task)?
- **Options:**
  - A) Persistent pool (5-10 agents per type always running)
  - B) Ephemeral (spawn on-demand, terminate after task)
  - C) Hybrid (small persistent pool + spawn extras for load spikes)
- **Recommendation:** C (hybrid) - best of both worlds
- **Need:** Performance testing to determine optimal pool sizes

**Q2: Cost Management for MCP Calls**
- How should we handle cost constraints when MCP calls get expensive?
- **Options:**
  - A) Hard caps per tenant (e.g., 1000 MCP calls/month)
  - B) Budget-aware task prioritization (skip low-priority tasks if over budget)
  - C) Human approval required above threshold (e.g., >$50/task)
- **Need:** Product/business input on pricing model

**Q3: Human Approval Thresholds**
- Which actions require human approval vs full automation?
- **Current Assumptions:**
  - ✅ Auto-approve: Research, content generation, SEO analysis
  - ❓ Needs approval: Sending >100 emails, financial transactions, legal documents
- **Need:** Define comprehensive approval matrix with legal/compliance team

**Q4: Multi-Tenancy Isolation Level**
- Should we support multiple DreamCrew clients (tenants) in shared infrastructure?
- **Options:**
  - A) Full multi-tenancy (shared DB, RLS policies)
  - B) Database-per-tenant (isolated schemas)
  - C) Infrastructure-per-tenant (separate deployments)
- **Current Approach:** A (full multi-tenancy)
- **Need:** Confirm this meets security/compliance requirements

**Q5: Data Retention & GDPR**
- How long should we retain swarm events, task history, Rep Room transcripts?
- **Options:**
  - A) 30 days (minimal)
  - B) 1 year (analytics)
  - C) Forever (full audit trail)
- **Need:** Legal review for GDPR, data residency requirements

**Q6: Observer Agent Accuracy Threshold**
- At what confidence level should observers trigger alerts?
- **Example:** Sales Observer detects buying signal with 60% confidence - trigger alert?
- **Options:**
  - A) Low threshold (>50%) - more alerts, some false positives
  - B) Medium threshold (>70%) - balanced
  - C) High threshold (>90%) - fewer alerts, may miss signals
- **Need:** A/B testing to optimize

**Q7: Agent Learning & Evolution**
- Should agents improve over time based on task outcomes?
- **Possibilities:**
  - Feedback loop (human rates task quality → agent adjusts)
  - Capability expansion (agent learns new skills)
  - Performance optimization (agent gets faster)
- **Need:** ML/AI team input on implementation feasibility

**Q8: Disaster Recovery**
- What's the RTO/RPO for swarm failures?
- **Current Plan:**
  - Supabase handles data persistence (RPO <1 min)
  - Auto-recovery for worker failures (<5s)
  - Manual recovery for coordinator failures
- **Need:** Define backup/restore procedures, DR testing schedule

---

## 10.3 Technical Debt (Future Enhancements)

**Short-term (Post-MVP):**
- Auto-scaling based on load (spawn agents dynamically)
- Advanced consensus (Raft implementation for stronger guarantees)
- Task dependencies visualization (Gantt chart for projects)
- Predictive failure detection (ML model for agent health)

**Medium-term:**
- Cost optimization algorithms (choose cheapest MCP for task)
- Agent capability learning (expand skills based on outcomes)
- Multi-modal content (support audio, 3D models)
- Cross-project insights (learn from historical projects)

**Long-term:**
- Self-healing swarm (automatic recovery without human intervention)
- Adaptive task prioritization (based on business outcomes, not just priority)
- Cross-swarm collaboration (swarms helping other swarms)
- Agent specialization evolution (agents develop niches over time)
- Advanced scheduling (time-based, dependency-aware, resource-constrained)

---

# 📚 **11. DOCUMENTATION REQUIREMENTS**

## 11.1 Docs You Must Create

**Architecture Documentation:**
- `/docs/swarm-architecture.md` - High-level system design, component diagrams
- `/docs/data-model.md` - Database schema, relationships, indexes
- `/docs/agent-types.md` - All agent types, capabilities, example tasks
- `/docs/consensus-algorithms.md` - How consensus works, when to use

**Integration Guides:**
- `/docs/rep-room-multi-agent.md` - How Rep Rooms support swarm
- `/docs/mcp-integration.md` - How to add new MCP connectors
- `/docs/content-mcp.md` - How content upload/retrieval works
- `/docs/observer-agents.md` - How observers detect and trigger

**API Reference:**
- `/docs/api-reference-swarm.md` - All REST/GraphQL endpoints
- `/docs/websocket-events.md` - Real-time event types
- `/docs/database-api.md` - Supabase tables, queries

**Operational Guides:**
- `/docs/deployment.md` - How to deploy to staging/production
- `/docs/monitoring.md` - How to monitor swarm health
- `/docs/troubleshooting.md` - Common issues and solutions
- `/docs/scaling.md` - How to scale agents, database, infrastructure

**User Guides:**
- `/docs/user-guide.md` - How to use Rep Rooms for goal-driven workflows
- `/docs/mcp-connector-setup.md` - How tenants connect their CRM/calendar
- `/docs/content-upload.md` - How to upload and tag content

---

## 11.2 Code Documentation Standards

**Every file should have:**
```typescript
/**
 * SwarmCoordinator - Master orchestrator for multi-agent swarm
 *
 * Responsibilities:
 * - Interpret natural language goals from Rep Rooms
 * - Create projects and break down into tasks
 * - Coordinate specialized worker agents
 * - Communicate progress back to humans
 *
 * @see /docs/swarm-architecture.md for design details
 */
export class SwarmCoordinator {
  /**
   * Plan a project from a natural language goal
   *
   * @param goalText - Human's goal statement (e.g., "Increase revenue")
   * @param context - Conversation context (tenant, user, history)
   * @returns Project plan with tasks
   *
   * @example
   * const plan = await coordinator.planGoal(
   *   "Find top 5 competitors",
   *   { tenantId: 'acme', userId: 'user123' }
   * )
   */
  async planGoal(
    goalText: string,
    context: ConversationContext
  ): Promise<ProjectPlan> {
    // Implementation
  }
}
```

**Database schema documentation:**
```sql
-- Projects table
-- Stores high-level goals that are broken down into tasks
-- Each project belongs to a tenant and has one SwarmCoordinator
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,  -- Which customer this belongs to
  title TEXT NOT NULL,      -- Human-readable project name
  goal TEXT NOT NULL,       -- Original goal statement
  status VARCHAR(20),       -- planning | active | paused | completed | failed
  -- ... (rest of schema)
);
```

---

# 🎁 **12. HANDOFF & LAUNCH**

## 12.1 Deliverables Checklist

When implementation is complete, you must provide:

**Code:**
- [ ] All files in structure defined in Section 3
- [ ] All tests passing (unit, integration, load, chaos)
- [ ] TypeScript strict mode, zero errors
- [ ] Linter passing, zero warnings
- [ ] Security scan clean (Snyk/npm audit)

**Database:**
- [ ] All 6 migrations created and tested
- [ ] Schema documentation complete
- [ ] RLS policies tested and documented
- [ ] Sample data scripts for testing

**Documentation:**
- [ ] All docs from 11.1 created and reviewed
- [ ] API reference complete (OpenAPI spec)
- [ ] Architecture diagrams exported (PNG/SVG)
- [ ] Video walkthrough recorded (optional but helpful)

**Deployment:**
- [ ] Docker containers built and tested
- [ ] Kubernetes manifests validated
- [ ] Environment variable template (`.env.example`)
- [ ] CI/CD pipeline configured

**Configurations:**
- [ ] All replica configs in `/replicas/`
- [ ] Prompt templates finalized
- [ ] Tool definitions tested
- [ ] MCP connector registry complete

**Monitoring:**
- [ ] Prometheus metrics exported
- [ ] Grafana dashboards imported
- [ ] Alerting rules configured
- [ ] Log aggregation working

---

## 12.2 Validation Before Handoff

**Run this checklist before declaring done:**

```bash
# 1. All tests pass
npm run test:unit        # >80% coverage
npm run test:integration # All scenarios pass
npm run test:load        # Performance targets met
npm run test:chaos       # Failure scenarios handled

# 2. Code quality
npm run lint             # Zero errors
npm run typecheck        # Zero type errors
npm run audit            # Zero critical vulnerabilities

# 3. Build succeeds
npm run build            # Production build works
docker build .           # Container builds

# 4. Database
npm run migrate          # All migrations run
npm run seed             # Sample data loads

# 5. Documentation
npm run docs:build       # Docs site builds
npm run docs:validate    # No broken links
```

**Manual Validation:**
- [ ] Create project from goal in Rep Room (end-to-end test)
- [ ] Verify multi-agent collaboration visible to human
- [ ] Test approval flow (human approves/rejects decision)
- [ ] Upload content, verify retrieval in conversation
- [ ] Connect user MCP (e.g., HubSpot), verify agent can use it
- [ ] Trigger observer alert, verify Slack/email received
- [ ] Review all database tables, verify data correctness
- [ ] Check logs, verify no sensitive data exposed

---

## 12.3 Staging Deployment

**Before production, deploy to staging:**

1. **Deploy infrastructure:**
   ```bash
   kubectl apply -f k8s/staging/
   ```

2. **Run smoke tests:**
   - Create test project
   - Execute test tasks
   - Verify Rep Room integration
   - Check monitoring dashboards

3. **Load test:**
   - Run 1000 tasks through the system
   - Monitor performance metrics
   - Check for memory leaks
   - Verify auto-scaling works

4. **Chaos test:**
   - Kill random agents
   - Disconnect database temporarily
   - Simulate MCP failures
   - Verify recovery in all cases

5. **Security audit:**
   - Attempt cross-tenant data access (should fail)
   - Test SQL injection vectors
   - Verify secrets encrypted
   - Check audit logs complete

---

## 12.4 Production Launch Checklist

**Pre-launch (T-1 week):**
- [ ] Staging validated for 1 week, no critical issues
- [ ] Performance benchmarks met in staging
- [ ] Security audit complete, all issues resolved
- [ ] Documentation reviewed by 2+ team members
- [ ] Runbooks tested (e.g., "how to scale agents")
- [ ] On-call rotation defined
- [ ] Rollback plan documented

**Launch Day:**
- [ ] Deploy to production during low-traffic window
- [ ] Monitor all metrics for 2 hours
- [ ] Run smoke tests in production
- [ ] Notify team of successful launch
- [ ] Enable monitoring alerts

**Post-launch (T+1 week):**
- [ ] Daily metrics review
- [ ] User feedback collected
- [ ] Performance optimization based on real usage
- [ ] Documentation updates based on questions
- [ ] Plan next iteration

---

## 12.5 Support Transition

**Handoff support responsibilities:**

**Week 1-2:**
- AI coder on standby for critical issues (P0/P1)
- Responds within 1 hour during business hours
- Fixes bugs, updates docs as needed

**Week 3-4:**
- AI coder available for questions (async Slack)
- DreamCrew team takes primary responsibility
- AI coder reviews complex issues

**Month 2+:**
- DreamCrew team fully owns system
- AI coder available for major enhancements only
- Quarterly review of system health

---

# 🛠 **APPENDIX A: TECHNOLOGY STACK**

## Core Technologies

**Runtime:**
- Node.js 20+ or Bun (for performance)
- TypeScript 5+

**Database:**
- Supabase (PostgreSQL + real-time + auth)
- pgvector extension (for embeddings)

**APIs:**
- Express or Fastify (REST)
- GraphQL (Apollo Server) - optional
- WebSocket (ws or Socket.io)

**Testing:**
- Vitest or Jest (unit/integration)
- Playwright (E2E)
- k6 or Artillery (load testing)

**Code Quality:**
- ESLint + Prettier
- TypeScript strict mode
- Husky (pre-commit hooks)

## Key Libraries

**Consensus & Coordination:**
- Custom implementation (start simple, can adopt Raft library later)

**Task Queue:**
- Custom (Supabase-backed priority queue)

**Monitoring:**
- Prometheus client (metrics)
- Pino or Winston (logging)

**File Processing:**
- Sharp (image processing)
- pdf-parse (PDF text extraction)
- ffmpeg (video keyframe extraction)

**Embeddings:**
- OpenAI API (text-embedding-3-small)

**HTTP Client:**
- Axios or ky

**Validation:**
- Zod (runtime type validation)

## Infrastructure

**Containers:**
- Docker
- Docker Compose (local dev)

**Orchestration:**
- Kubernetes (production)
- Helm (package management)

**CI/CD:**
- GitHub Actions or GitLab CI

**Monitoring:**
- Prometheus (metrics)
- Grafana (dashboards)
- Loki (logs)
- Alertmanager (alerts)

---

# 🗂 **APPENDIX B: FILE STRUCTURE TEMPLATE**

```
/dreamcrew-swarm-orchestration/

  /backend/
    /swarm/
      /coordinator/
        index.ts
        goal-interpreter.ts
        project-manager.ts
        task-breakdown.ts
        rep-room-communicator.ts
      /dispatcher/
        index.ts
        task-queue.ts
        capability-matcher.ts
        load-balancer.ts
      /collaboration/
        index.ts
        message-bus.ts
        context-manager.ts
      /consensus/
        index.ts
        voting.ts
        conflict-resolver.ts
      /monitoring/
        index.ts
        metrics-collector.ts
        anomaly-detector.ts
        alerting.ts
    /content/
      index.ts
      upload-handler.ts
      image-processor.ts
      document-processor.ts
      video-processor.ts
      embedding-generator.ts
      search.ts
    /mcp/
      index.ts
      internal-registry.ts
      connection-manager.ts
      router.ts
    /api/
      /routes/
        swarm.ts
        projects.ts
        tasks.ts
        agents.ts
        content.ts
        events.ts
      /middleware/
        auth.ts
        rate-limit.ts
        logging.ts
        error-handler.ts
      /websocket/
        event-stream.ts
    /migrations/
      001_initial_schema.sql
      002_events_and_metrics.sql
      003_consensus_tables.sql
      004_content_tables.sql
      005_mcp_connectors.sql
      006_indexes_and_rls.sql
    /lib/
      /types/
        index.ts
        swarm.ts
        tasks.ts
        agents.ts
      /utils/
        logger.ts
        errors.ts
        validation.ts

  /replicas/
    /swarm-coordinator/
      config.yaml
      prompts.md
      flows.yaml
      tools.json
      brand.json
    /workers/
      /research/
        config.yaml
        prompts.md
        capabilities.json
      /content/
        config.yaml
        prompts.md
        capabilities.json
      /crm/
        config.yaml
        prompts.md
        capabilities.json
      /seo/
        config.yaml
        prompts.md
        capabilities.json
      /calendar/
        config.yaml
        prompts.md
        capabilities.json
    /observers/
      /sales-observer/
        config.yaml
        triggers.json
      /risk-observer/
        config.yaml
        triggers.json

  /infra/
    /claude-flow/               # DEV ONLY - not shipped
      tasks.ts
      project.config.ts
    mcp.config.json             # DEV ONLY - not shipped
    /deployment/
      docker-compose.yml
      Dockerfile
      /kubernetes/
        deployment.yaml
        service.yaml
        ingress.yaml
        configmap.yaml
    /monitoring/
      prometheus.yml
      /grafana-dashboards/
        swarm-overview.json
        agent-performance.json

  /docs/
    /requirements/
      swarm-orchestration-requirements.md
    swarm-architecture.md
    data-model.md
    agent-types.md
    consensus-algorithms.md
    rep-room-multi-agent.md
    mcp-integration.md
    content-mcp.md
    observer-agents.md
    api-reference-swarm.md
    websocket-events.md
    database-api.md
    deployment.md
    monitoring.md
    troubleshooting.md
    scaling.md
    user-guide.md
    mcp-connector-setup.md
    content-upload.md
    /diagrams/
      architecture.png
      task-lifecycle.png
      consensus-flow.png

  /tests/
    /unit/
      coordinator.test.ts
      dispatcher.test.ts
      consensus.test.ts
      content.test.ts
    /integration/
      goal-to-completion.test.ts
      multi-agent-collaboration.test.ts
      observer-triggers.test.ts
    /load/
      task-throughput.test.ts
      concurrent-agents.test.ts
    /chaos/
      agent-failure.test.ts
      database-disconnection.test.ts
      mcp-failure.test.ts
    /e2e/
      rep-room-workflows.test.ts

  /scripts/
    setup-dev.sh
    seed-data.ts
    deploy.sh
    scale-agents.ts

  .env.example
  .gitignore
  package.json
  tsconfig.json
  eslint.config.js
  prettier.config.js
  README.md
  CHANGELOG.md
```

---

# 📝 **APPENDIX C: SAMPLE CODE TEMPLATES**

## SwarmCoordinator Template

```typescript
// /backend/swarm/coordinator/index.ts

import { db } from '@/lib/database'
import { logger } from '@/lib/logger'
import type { ConversationContext, ProjectPlan, Project } from '@/lib/types'

export class SwarmCoordinator {
  /**
   * Plan a project from natural language goal
   */
  async planGoal(
    goalText: string,
    context: ConversationContext
  ): Promise<ProjectPlan> {
    logger.info('Planning goal', { goalText, tenantId: context.tenantId })

    // 1. Use LLM to interpret goal and create plan
    const plan = await this.interpretGoal(goalText, context)

    // 2. Validate plan makes sense
    this.validatePlan(plan)

    // 3. Return for human approval
    return plan
  }

  /**
   * Create project and dispatch tasks
   */
  async createProject(plan: ProjectPlan): Promise<Project> {
    const project = await db.projects.create({
      data: {
        tenantId: plan.tenantId,
        title: plan.title,
        goal: plan.goal,
        status: 'planning'
      }
    })

    // Create tasks
    const tasks = await Promise.all(
      plan.tasks.map(task =>
        db.tasks.create({
          data: {
            projectId: project.id,
            ...task
          }
        })
      )
    )

    // Update status
    await db.projects.update({
      where: { id: project.id },
      data: { status: 'active' }
    })

    // Notify Rep Room
    await this.notifyRepRoom(
      plan.tenantId,
      `Project "${plan.title}" created with ${tasks.length} tasks`
    )

    return project
  }

  private async interpretGoal(
    goalText: string,
    context: ConversationContext
  ): Promise<ProjectPlan> {
    // TODO: Use LLM to break down goal into tasks
    // For now, simple example
    return {
      tenantId: context.tenantId,
      title: `Goal: ${goalText}`,
      goal: goalText,
      tasks: [
        {
          title: 'Research phase',
          description: `Research to achieve: ${goalText}`,
          requiredCapabilities: ['web_search', 'research']
        }
      ]
    }
  }

  private validatePlan(plan: ProjectPlan): void {
    if (!plan.tasks.length) {
      throw new Error('Plan must have at least one task')
    }
  }

  private async notifyRepRoom(tenantId: string, message: string): Promise<void> {
    // TODO: Send to Rep Room WebSocket
    logger.info('Rep Room notification', { tenantId, message })
  }
}
```

---

## TaskDispatcher Template

```typescript
// /backend/swarm/dispatcher/index.ts

import { db } from '@/lib/database'
import type { Task, Agent, TaskAssignment } from '@/lib/types'

export class TaskDispatcher {
  /**
   * Enqueue task with priority
   */
  async enqueueTask(task: Partial<Task>, priority: number = 0): Promise<Task> {
    return await db.tasks.create({
      data: {
        ...task,
        priority,
        status: 'planned'
      }
    })
  }

  /**
   * Assign task to optimal agent
   */
  async assignToAgent(taskId: string): Promise<TaskAssignment> {
    const task = await db.tasks.findUnique({ where: { id: taskId } })
    if (!task) throw new Error('Task not found')

    // Find best agent
    const agent = await this.getOptimalAgent(task)

    // Assign
    await db.tasks.update({
      where: { id: taskId },
      data: {
        assignedAgent: agent.id,
        status: 'in_progress',
        startedAt: new Date()
      }
    })

    // Log event
    await db.swarmEvents.create({
      data: {
        eventType: 'task_assigned',
        entityType: 'task',
        entityId: taskId,
        payload: { agentId: agent.id, agentType: agent.agentType }
      }
    })

    return { task, agent }
  }

  /**
   * Find best agent for task based on capabilities and load
   */
  async getOptimalAgent(task: Task): Promise<Agent> {
    // Get agents with matching capabilities
    const agents = await db.swarmAgents.findMany({
      where: {
        status: 'idle',
        capabilities: {
          hasEvery: task.requiredCapabilities
        }
      }
    })

    if (!agents.length) {
      throw new Error('No available agents with required capabilities')
    }

    // Simple: pick first available (can enhance with load balancing)
    return agents[0]
  }
}
```

---

# 🏁 **FINAL INSTRUCTIONS**

## You Are Ready to Build

You now have:
- ✅ Clear product vision (Rep Rooms, conversational, goal-driven)
- ✅ Complete architecture (9 components defined)
- ✅ Database schema (10+ tables)
- ✅ MCP integration strategy (internal + user-connected)
- ✅ Implementation plan (6 phases, 18 steps)
- ✅ Validation criteria (checklists, benchmarks, tests)
- ✅ Security standards (tenant isolation, encryption, auditing)
- ✅ Quality gates (>80% coverage, performance targets)
- ✅ Documentation requirements (15+ docs to create)
- ✅ Success metrics (technical, product, business)

## Start Here

1. **Set up dev environment** (Phase 1, Step 1-3)
2. **Create database** (Phase 1, Step 1)
3. **Build SwarmCoordinator** (Phase 2, Step 4)
4. **Test end-to-end** (create goal → complete task)
5. **Iterate** through remaining phases

## When You Have Questions

- **Research** via Perplexity/Tavily MCP
- **Check DreamCrew conventions** via Mastra MCP
- **Document decision** in Section 10.1
- **Flag for human** in Section 10.2 if critical

## Communication

- Update progress in commits
- Document decisions as you go
- Ask for clarification on ambiguities
- Never proceed with uncertain security/billing assumptions

---

**Good luck! Build something amazing.** 🚀
