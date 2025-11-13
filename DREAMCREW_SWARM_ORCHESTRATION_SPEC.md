# 🚀 INSTRUCTIONS FOR CODER (READ THIS FIRST)

You are creating a **new AI build environment** for our **whitelabel DreamCrew project**.

This environment is **not an npm library / monorepo**.
Instead, it is:

* A **Claude-Flow project**
* Wired into **MCP servers** (internal + external)
* Used so that **AI coders (Claude)** can implement the project's **requirements document** end-to-end **within this environment**.

### Your responsibilities

Using the **requirements document** I provide, you must:

1. **Fill out this template** with project-specific details (all placeholders have been filled).
2. Define a **Claude-Flow project** that:

   * Reads and understands the requirements document
   * Uses the configured MCP servers for code, docs, search, DB, etc.
   * Can iteratively build, refactor, test, and document the project codebase.
3. Configure the following **MCP servers** in the environment:

   * `mastra`
   * `copilotkit`
   * `tavily`
   * `perplexity`
   * `supabase`
4. Ensure everything is **aligned with the DreamCrew stack**:

   * Support for whitelabel digital replicas
   * Integration with our Rep Rooms / API where relevant
   * Conventions for folders, configs, and deployment in DreamCrew.

You may **add more detail**, but you **must not remove** any major section from this template.

The final document should be something we can hand to an AI coder (Claude) and say:

> "Use this environment + MCPs + Claude-Flow to implement the attached requirements document."

---

# ===========================================
# 🌐 DreamCrew Autonomous Swarm Orchestration – AI Build Environment Plan
# ===========================================

## 1. Project & Environment Overview

**Project Name:** `DreamCrew Autonomous Swarm Orchestration`
**Brand / Whitelabel Client:** `DreamCrew Platform`
**Primary Replica(s):** `SwarmCoordinator, WorkerReplicas, TaskDispatcher, CollaborationHub`
**Owner / Org:** `DreamCrew Technologies`
**Environment Type:** DreamCrew whitelabel, Claude-Flow + MCP-powered

### 1.1 Goal of This Environment

This environment exists so that:

* An **AI coder (Claude)** can:

  * Read the **requirements document** for `DreamCrew Autonomous Swarm Orchestration`
  * Design the architecture for multi-agent coordination and task distribution
  * Generate code, configs, and docs for swarm intelligence patterns
  * Use MCP tools (Mastra, CopilotKit, Tavily, Perplexity, Supabase)
  * Iteratively refine the swarm orchestration logic and consensus mechanisms

* Human devs can:

  * Inspect and review AI-generated orchestration artifacts
  * Run tests / validations on swarm behaviors
  * Deploy into the DreamCrew stack (e.g. replicas, Rep Rooms, backend services, integrations)
  * Monitor swarm health, performance metrics, and inter-agent communication

### 1.2 High-Level Architecture (Conceptual)

```text
[ DreamCrew Tenant / Workspace ]
          |
          v
[ Claude-Flow Project: Swarm Orchestration ]
          |
          +--> Reads: Requirements Document + Existing Code
          |
          +--> Uses MCP Servers:
                - Mastra (orchestration patterns, swarm algorithms docs)
                - CopilotKit (remote swarm coordination tools)
                - Tavily (research on distributed AI systems)
                - Perplexity (swarm intelligence theory, consensus algorithms)
                - Supabase (swarm state, task queues, agent registry)
          |
          v
[ Generated Code / Configs / Flows / Swarm Logic ]
          |
          v
[ DreamCrew Runtime: Rep Rooms, APIs, Integrations ]
          |
          v
[ Swarm Components ]
    |
    +-- SwarmCoordinator (master orchestrator)
    +-- TaskDispatcher (workload distribution)
    +-- WorkerReplicas (specialized agent pool)
    +-- CollaborationHub (inter-agent communication)
    +-- ConsensusEngine (multi-agent decision making)
    +-- HealthMonitor (swarm observability)
```

---

## 2. Requirements Document Integration

### 2.1 Source of Truth

* **Primary requirements document location:**
  `docs/requirements/swarm-orchestration-requirements.md` (to be created in repo)

* **Secondary references:**
  - DreamCrew Replica Architecture Guide
  - Multi-Agent Coordination Patterns
  - Task Distribution Algorithms
  - Consensus Mechanisms for AI Swarms

### 2.2 How Claude Uses It

Define how Claude-Flow will pull in the requirements:

* As a **pinned context document** in Claude-Flow at project initialization
* Stored in a known **filesystem / repo path** accessible to the AI: `docs/requirements/`
* Additional context via **Mastra MCP** for architectural patterns and best practices
* Research augmentation via **Perplexity MCP** for latest swarm intelligence techniques

```text
The AI coder must always:
1. Load the requirements doc from docs/requirements/swarm-orchestration-requirements.md
2. Query Mastra for DreamCrew architectural patterns and constraints
3. Research current swarm orchestration best practices via Perplexity
4. Build/update an internal architecture plan in docs/architecture.md
5. Only then start generating or modifying code
6. Validate swarm coordination logic against consensus algorithms
7. Ensure fault tolerance and graceful degradation patterns
```

---

## 3. Claude-Flow Project Definition

This section defines how the Claude-Flow project itself is structured.

### 3.1 Project Metadata

```ts
// pseudo-config for Claude-Flow project
export const projectConfig = {
  name: "DreamCrew Autonomous Swarm Orchestration",
  description: "Multi-agent coordination system for autonomous AI replica collaboration, task distribution, and consensus-based decision making within the DreamCrew platform",
  environment: "DreamCrew / Whitelabel",
  mainRequirementsDoc: "docs/requirements/swarm-orchestration-requirements.md",
  swarmCapabilities: [
    "Dynamic agent pool management",
    "Intelligent task distribution",
    "Inter-agent communication protocols",
    "Consensus-based decision making",
    "Load balancing and auto-scaling",
    "Failure recovery and self-healing",
    "Real-time swarm health monitoring"
  ]
};
```

### 3.2 Core Tasks for AI Coder

Define Claude-Flow tasks that the AI will use to implement the project:

```ts
export const tasks = {
  analyze_requirements: {
    prompt: `
You are the lead system architect for DreamCrew Autonomous Swarm Orchestration.
1. Read the requirements document at docs/requirements/swarm-orchestration-requirements.md
2. Extract core entities: SwarmCoordinator, TaskDispatcher, WorkerReplicas, CollaborationHub
3. Map out swarm communication flows and consensus mechanisms
4. Identify task distribution algorithms and load balancing strategies
5. Propose an architecture aligned with DreamCrew whitelabel replicas and services
6. Define fault tolerance and self-healing mechanisms
7. Establish monitoring and observability requirements
Output: docs/architecture.md
`,
    output: "docs/architecture.md"
  },

  generate_swarm_coordinator: {
    prompt: `
Using docs/architecture.md and the requirements doc,
generate the SwarmCoordinator component - the master orchestrator for the swarm.
Responsibilities:
- Agent lifecycle management (spawn, terminate, health checks)
- Global task queue management
- Swarm-wide state synchronization
- Coordination protocol implementation
- Emergency shutdown and recovery procedures
Use Supabase MCP for persistent swarm state and agent registry.
`,
    output: "backend/swarm/coordinator/"
  },

  generate_task_dispatcher: {
    prompt: `
Generate the TaskDispatcher component for intelligent workload distribution.
Responsibilities:
- Analyze incoming tasks and determine complexity
- Match tasks to appropriate worker replicas based on capabilities
- Implement load balancing algorithms (round-robin, least-loaded, capability-based)
- Handle task priority queues and SLA enforcement
- Retry logic and failure handling
Use Supabase MCP for task queue persistence.
`,
    output: "backend/swarm/dispatcher/"
  },

  generate_worker_replicas: {
    prompt: `
Generate the WorkerReplicas pool management system.
Responsibilities:
- Define worker replica types and specializations
- Capability registration and discovery
- Task execution engine
- Result reporting and status updates
- Resource utilization tracking
Align with DreamCrew replica architecture and Rep Rooms integration.
`,
    output: "replicas/workers/"
  },

  generate_collaboration_hub: {
    prompt: `
Generate the CollaborationHub for inter-agent communication.
Responsibilities:
- Message bus for agent-to-agent communication
- Shared context management
- Collaborative problem-solving protocols
- Knowledge sharing mechanisms
- Event streaming and pub/sub patterns
Use CopilotKit MCP for real-time collaboration tools.
`,
    output: "backend/swarm/collaboration/"
  },

  generate_consensus_engine: {
    prompt: `
Generate the ConsensusEngine for multi-agent decision making.
Responsibilities:
- Voting mechanisms for distributed decisions
- Conflict resolution protocols
- Quorum management
- Byzantine fault tolerance considerations
- Decision history and audit trails
Research optimal consensus algorithms via Perplexity MCP.
`,
    output: "backend/swarm/consensus/"
  },

  generate_health_monitor: {
    prompt: `
Generate the HealthMonitor for swarm observability.
Responsibilities:
- Real-time agent health tracking
- Performance metrics collection (latency, throughput, error rates)
- Anomaly detection and alerting
- Swarm topology visualization
- Historical analytics and reporting
Store metrics in Supabase via MCP.
`,
    output: "backend/swarm/monitoring/"
  },

  generate_api_layer: {
    prompt: `
Generate the API layer for external swarm interaction.
Endpoints:
- POST /swarm/tasks - Submit tasks to the swarm
- GET /swarm/status - Get swarm health and metrics
- GET /swarm/agents - List active agents and capabilities
- POST /swarm/agents/scale - Scale agent pool
- GET /swarm/tasks/:id - Get task status and results
- WebSocket /swarm/events - Real-time swarm events
Integrate with DreamCrew authentication and authorization.
`,
    output: "backend/api/"
  },

  generate_integration_layer: {
    prompt: `
Generate or update the replica behavior, prompts, and backend glue
required for SwarmCoordinator and related replicas under DreamCrew.
Align with the whitelabel voice and brand guidelines.
Integration points:
- Rep Rooms for swarm-to-human communication
- CRM for task intake from human workflow
- Calendar for scheduled swarm operations
- Webhooks for external system notifications
`,
    output: "replicas/swarm-coordinator/"
  },

  generate_tests: {
    prompt: `
Generate comprehensive tests for the swarm orchestration system.
Test suites:
1. Unit tests for each component
2. Integration tests for swarm coordination flows
3. Load tests for task distribution under high volume
4. Chaos engineering tests (agent failures, network partitions)
5. Consensus algorithm correctness tests
6. End-to-end swarm operation scenarios
Ensure coverage for happy paths, edge cases, and failure modes.
`,
    output: "tests/"
  },

  generate_docs: {
    prompt: `
Generate developer and operator documentation for DreamCrew Swarm Orchestration.
Include:
- High-level overview and architecture diagrams
- Setup instructions and prerequisites
- How MCPs are used in swarm operations
- How replicas are configured in DreamCrew
- Swarm scaling and performance tuning guide
- Troubleshooting and debugging guide
- API reference documentation
- Operational runbooks for common scenarios
`,
    output: "docs/"
  },

  generate_migration_scripts: {
    prompt: `
Generate database migration scripts for swarm infrastructure.
Tables needed:
- swarm_agents (agent registry and capabilities)
- swarm_tasks (task queue and history)
- swarm_events (event log for audit and replay)
- swarm_metrics (performance and health metrics)
- swarm_consensus_votes (voting and decision history)
Use Supabase MCP for schema management.
`,
    output: "backend/migrations/"
  }
};
```

---

## 4. MCP Server Configuration

This environment **must** use the following MCP servers.
You are responsible for wiring them into the Claude / Claude-Flow configuration that DreamCrew will use.

### 4.1 Base MCP Config Object

```jsonc
{
  "mcpServers": {
    "mastra": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@mastra/mcp-docs-server@0.10.0",
        "--force"
      ],
      "env": {},
      "description": "Access to DreamCrew architectural patterns, swarm orchestration algorithms, and distributed systems best practices"
    },
    "copilotkit": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://mcp.copilotkit.ai"
      ],
      "env": {},
      "description": "Remote execution for real-time swarm collaboration tools and inter-agent coordination automations"
    },
    "tavily": {
      "type": "sse",
      "url": "https://tavily.api.tadata.com/mcp/tavily/teepee-bowling-tame-iihmhf",
      "description": "Web search for distributed AI systems research, multi-agent coordination papers, and swarm intelligence case studies"
    },
    "perplexity": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "perplexity-mcp"
      ],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}"
      },
      "description": "Deep research on consensus algorithms, Byzantine fault tolerance, task distribution strategies, and swarm optimization techniques"
    },
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}",
        "SUPABASE_PROJECT_REF": "${SUPABASE_PROJECT_REF}"
      },
      "description": "Database access for swarm state, agent registry, task queues, event logs, and performance metrics"
    }
  }
}
```

> **Coder:**
>
> * Replace API keys with environment variables as shown (use `${VAR_NAME}` syntax)
> * Ensure secrets are managed via DreamCrew secret store or `.env` files (never committed)
> * Document how these MCPs are used by the AI coder within Claude-Flow
> * Set up proper access controls for Supabase (read/write permissions per table)

### 4.2 How Each MCP Is Used

**Mastra** – Documentation ingestion & retrieval for:

* DreamCrew architectural patterns and conventions
* Swarm orchestration algorithm documentation
* Multi-agent coordination best practices
* API reference documentation for DreamCrew platform
* Internal playbooks for replica configuration
* Distributed systems design patterns
* Fault tolerance and recovery strategies

**CopilotKit** – Remote execution for:

* Real-time swarm status updates to monitoring dashboards
* Inter-agent collaboration tool invocations
* Dynamic agent pool scaling automations
* Emergency swarm shutdown procedures
* Live configuration updates without restart
* Integration with external DreamCrew services
* Webhook delivery for swarm events

**Tavily** – Research & web search for:

* Latest multi-agent system research papers
* Distributed AI coordination case studies
* Swarm intelligence implementation examples
* Performance benchmarking data for similar systems
* Security best practices for agent-to-agent communication
* Scalability patterns for large agent pools
* Industry trends in autonomous AI orchestration

**Perplexity** – Deep research / summarization for:

* Consensus algorithm selection and tradeoffs (Raft, Paxos, etc.)
* Byzantine fault tolerance implementation strategies
* Task distribution algorithms (load balancing, priority queues)
* CAP theorem implications for swarm state management
* Agent capability matching and optimization techniques
* Failure detection and self-healing mechanisms
* Performance optimization for high-throughput scenarios

**Supabase** – Database access for:

* **swarm_agents** table: Agent registry, capabilities, health status, resource utilization
* **swarm_tasks** table: Task queue, assignments, status, results, SLA tracking
* **swarm_events** table: Event sourcing log for audit, replay, and debugging
* **swarm_metrics** table: Performance metrics, latency histograms, error rates
* **swarm_consensus_votes** table: Voting records, decision history, conflict resolution
* **swarm_config** table: Dynamic configuration, feature flags, scaling parameters
* Real-time subscriptions for live swarm state updates
* Transactional operations for atomic swarm state changes

---

## 5. DreamCrew-Specific Integration Points

### 5.1 Replicas & Rep Rooms

**Primary Replicas:**

1. **SwarmCoordinator** (`swarm-coordinator`)
   - Master orchestrator for the entire swarm
   - Handles human requests via Rep Rooms
   - Translates business objectives into swarm tasks
   - Provides status updates and reports to stakeholders

2. **TaskDispatcher** (`task-dispatcher`)
   - Specialized replica for intelligent task routing
   - Analyzes task requirements and worker capabilities
   - Optimizes task-to-agent assignments

3. **WorkerReplica[Type]** (`worker-customer-service`, `worker-data-analysis`, `worker-content-generation`, etc.)
   - Specialized worker replicas for different task types
   - Register capabilities with SwarmCoordinator
   - Execute assigned tasks and report results

4. **CollaborationHub** (`collaboration-hub`)
   - Facilitates inter-agent communication
   - Manages shared context and knowledge
   - Coordinates multi-agent collaborative tasks

**Rep Room Integration:**

* **Main Swarm Control Room**: `#swarm-operations`
  - Human operators can monitor swarm health
  - Submit high-level tasks and objectives
  - Receive alerts and status updates
  - Emergency controls (pause, resume, shutdown)

* **Agent Communication Channels**: `#agent-collaboration`
  - Inter-agent messages and negotiations
  - Collaborative problem-solving discussions
  - Knowledge sharing and learning

* **Task Tracking Room**: `#swarm-tasks`
  - Real-time task status updates
  - Completion notifications
  - Error and retry alerts

### 5.2 Required Integrations

**CRM / Pipeline Integration:**
- Pull tasks from CRM workflow stages
- Update task status back to CRM
- Escalate to human when swarm cannot complete task
- Log swarm activity against customer records

**Calendar Integration:**
- Schedule recurring swarm operations
- Plan maintenance windows for agent updates
- Coordinate with human team availability
- Time-based task prioritization

**Webhooks:**
- Outbound: Notify external systems of task completion
- Inbound: Receive tasks from external platforms
- Status callbacks for async operations
- Integration with monitoring/alerting systems (PagerDuty, Slack, etc.)

**Custom Endpoints:**
- REST API for swarm control and monitoring
- WebSocket for real-time event streaming
- GraphQL for complex swarm state queries
- Admin API for configuration and management

### 5.3 Configuration Artifacts

The AI should produce the following configuration artifacts for DreamCrew integration:

**For SwarmCoordinator replica:**
```yaml
# replicas/swarm-coordinator/config.yaml
replica:
  name: swarm-coordinator
  type: orchestrator
  capabilities:
    - swarm_management
    - task_planning
    - agent_lifecycle
    - human_communication
  rep_rooms:
    - swarm-operations
    - swarm-tasks
  integrations:
    - crm
    - calendar
    - webhooks
```

**Prompt Templates:**
- `prompts/coordinator-greeting.md` - Initial interaction with human operators
- `prompts/task-intake.md` - Gathering requirements for new swarm tasks
- `prompts/status-report.md` - Communicating swarm status and progress
- `prompts/escalation.md` - Handling swarm failures and escalations
- `prompts/collaboration.md` - Coordinating with other replicas

**Behavior Configs:**
```json
{
  "greeting": "natural and professional",
  "objection_handling": {
    "swarm_capacity": "acknowledge limits, suggest scaling or prioritization",
    "task_complexity": "break down into subtasks, estimate effort",
    "agent_unavailable": "provide alternatives, estimated wait time"
  },
  "escalation_triggers": [
    "all workers busy for >30min",
    "task failure rate >20%",
    "consensus cannot be reached",
    "human approval required"
  ],
  "tone": "collaborative, transparent, proactive"
}
```

**Tool Definitions:**
```json
{
  "tools": [
    {
      "name": "spawn_worker",
      "description": "Spawn a new worker replica with specified capabilities",
      "parameters": {
        "worker_type": "string",
        "capabilities": "array",
        "priority": "number"
      }
    },
    {
      "name": "assign_task",
      "description": "Assign a task to a specific worker or pool",
      "parameters": {
        "task_id": "string",
        "worker_id": "string (optional)",
        "priority": "number"
      }
    },
    {
      "name": "get_swarm_status",
      "description": "Get current swarm health and performance metrics",
      "parameters": {}
    },
    {
      "name": "scale_swarm",
      "description": "Scale the worker pool up or down",
      "parameters": {
        "worker_type": "string",
        "count": "number",
        "action": "scale_up | scale_down"
      }
    },
    {
      "name": "initiate_consensus",
      "description": "Start a consensus vote among agents for a decision",
      "parameters": {
        "decision_topic": "string",
        "participants": "array",
        "timeout": "number"
      }
    }
  ]
}
```

**Brand / Tone Settings:**
```json
{
  "brand": "DreamCrew",
  "voice": "professional, collaborative, transparent",
  "communication_style": {
    "with_humans": "clear, concise, proactive with status updates",
    "with_agents": "efficient, structured, protocol-driven"
  },
  "emoji_usage": "minimal, only for status indicators",
  "escalation_style": "calm, solution-oriented, context-rich"
}
```

---

## 6. Repository / File Layout (AI-Generated)

The AI coder should generate the following structure:

```text
/dreamcrew-swarm-orchestration/

  /backend/                          # Core swarm orchestration services
    /swarm/
      /coordinator/                  # SwarmCoordinator implementation
        index.ts
        agent-lifecycle.ts
        state-management.ts
        recovery.ts
      /dispatcher/                   # TaskDispatcher implementation
        index.ts
        task-analyzer.ts
        load-balancer.ts
        priority-queue.ts
      /collaboration/                # CollaborationHub implementation
        index.ts
        message-bus.ts
        context-manager.ts
        protocols.ts
      /consensus/                    # ConsensusEngine implementation
        index.ts
        voting.ts
        conflict-resolution.ts
        quorum.ts
      /monitoring/                   # HealthMonitor implementation
        index.ts
        metrics-collector.ts
        anomaly-detector.ts
        alerting.ts
    /api/                           # REST/WebSocket API layer
      /routes/
        swarm.ts
        agents.ts
        tasks.ts
        events.ts
      /middleware/
        auth.ts
        rate-limit.ts
        logging.ts
      /websocket/
        event-stream.ts
    /migrations/                    # Database schema migrations
      001_initial_swarm_schema.sql
      002_add_consensus_tables.sql
      003_add_metrics_tables.sql
    /lib/                          # Shared utilities
      /protocols/                  # Communication protocols
      /algorithms/                 # Task distribution, consensus algorithms
      /utils/                      # Helper functions

  /replicas/                        # DreamCrew replica configurations
    /swarm-coordinator/
      config.yaml
      prompts.md
      flows.yaml
      tools.json
      brand.json
    /task-dispatcher/
      config.yaml
      prompts.md
      flows.yaml
    /workers/
      /worker-customer-service/
        config.yaml
        prompts.md
        capabilities.json
      /worker-data-analysis/
        config.yaml
        prompts.md
        capabilities.json
      /worker-content-generation/
        config.yaml
        prompts.md
        capabilities.json
    /collaboration-hub/
      config.yaml
      prompts.md
      protocols.json

  /infra/                          # Infrastructure configuration
    mcp.config.json                # MCP server configuration (from section 4.1)
    /claude-flow/
      tasks.ts                     # Claude-Flow task definitions (from section 3.2)
      project.config.ts
    /deployment/
      docker-compose.yml
      kubernetes/
        swarm-deployment.yaml
        service.yaml
        ingress.yaml
    /monitoring/
      prometheus.yml
      grafana-dashboards/

  /docs/                           # Documentation
    requirements/
      swarm-orchestration-requirements.md
    architecture.md                # Generated by AI
    operations.md                  # Operational runbooks
    api-reference.md              # API documentation
    scaling-guide.md              # Performance tuning
    troubleshooting.md            # Common issues and solutions
    /diagrams/
      swarm-architecture.png
      task-flow.png
      consensus-protocol.png

  /tests/                          # Test suites
    /unit/
      coordinator.test.ts
      dispatcher.test.ts
      consensus.test.ts
    /integration/
      swarm-coordination.test.ts
      task-lifecycle.test.ts
    /load/
      high-volume-tasks.test.ts
    /chaos/
      agent-failure.test.ts
      network-partition.test.ts
    /e2e/
      full-swarm-scenarios.test.ts

  /scripts/                        # Utility scripts
    setup-dev-environment.sh
    seed-test-data.ts
    deploy-swarm.sh
    scale-workers.ts

  .env.example                     # Environment variables template
  package.json
  tsconfig.json
  README.md
```

---

## 7. AI Coder Workflow (Inside This Environment)

The intended loop for Claude when working on this project:

### Phase 1: Analysis & Planning

1. **Analyze Requirements**
   * Run `analyze_requirements` task
   * Read `docs/requirements/swarm-orchestration-requirements.md`
   * Query **Perplexity MCP** for latest research on:
     - Multi-agent coordination patterns
     - Consensus algorithms suitable for AI swarms
     - Task distribution strategies
   * Query **Tavily MCP** for real-world implementations and case studies
   * Produce/refresh `docs/architecture.md` with:
     - Component diagram
     - Data flow diagrams
     - Communication protocols
     - Failure modes and recovery strategies

### Phase 2: Core Infrastructure

2. **Generate Database Schema**
   * Run `generate_migration_scripts` task
   * Use **Supabase MCP** to:
     - Create tables for agents, tasks, events, metrics
     - Set up indexes for performance
     - Configure real-time subscriptions
     - Establish access policies

3. **Generate SwarmCoordinator**
   * Run `generate_swarm_coordinator` task
   * Use **Mastra MCP** for DreamCrew architectural patterns
   * Implement:
     - Agent lifecycle management
     - Global state synchronization
     - Recovery procedures
   * Store swarm state in **Supabase**

4. **Generate TaskDispatcher**
   * Run `generate_task_dispatcher` task
   * Research optimal algorithms via **Perplexity MCP**
   * Implement:
     - Task analysis and routing
     - Load balancing
     - Priority queues
   * Use **Supabase** for task persistence

### Phase 3: Coordination & Communication

5. **Generate WorkerReplicas**
   * Run `generate_worker_replicas` task
   * Create worker types aligned with DreamCrew replica architecture
   * Implement capability registration
   * Configure Rep Rooms integration

6. **Generate CollaborationHub**
   * Run `generate_collaboration_hub` task
   * Use **CopilotKit MCP** for real-time collaboration tools
   * Implement:
     - Message bus
     - Shared context management
     - Event streaming

7. **Generate ConsensusEngine**
   * Run `generate_consensus_engine` task
   * Research via **Perplexity MCP**: Raft, Paxos, Byzantine fault tolerance
   * Implement:
     - Voting mechanisms
     - Conflict resolution
     - Audit trails
   * Store votes in **Supabase**

### Phase 4: Observability & API

8. **Generate HealthMonitor**
   * Run `generate_health_monitor` task
   * Implement metrics collection
   * Store in **Supabase**
   * Create alerting logic

9. **Generate API Layer**
   * Run `generate_api_layer` task
   * Create REST endpoints and WebSocket streams
   * Integrate with DreamCrew auth

### Phase 5: Integration & Refinement

10. **Generate Integration Layer**
    * Run `generate_integration_layer` task
    * Configure SwarmCoordinator replica for DreamCrew
    * Set up Rep Rooms, CRM, calendar integrations
    * Create prompt templates and behavior configs

11. **Generate Tests**
    * Run `generate_tests` task
    * Create comprehensive test suites
    * Include chaos engineering tests

12. **Generate Documentation**
    * Run `generate_docs` task
    * Create operational runbooks
    * Document API endpoints
    * Write troubleshooting guides

### Phase 6: Iterative Refinement

13. **Iterative Updates**
    * When requirements change, the AI should:
      - Re-read `docs/requirements/swarm-orchestration-requirements.md`
      - Query **Perplexity/Tavily** for new research if needed
      - Update `docs/architecture.md`
      - Diff & update code/tests/docs accordingly
      - Ensure backward compatibility or provide migration path
      - Run tests to validate changes
      - Update deployment configs if needed

### Continuous Validation

Throughout all phases, the AI should:
* Validate against DreamCrew conventions via **Mastra MCP**
* Research best practices via **Perplexity/Tavily MCPs**
* Test database operations via **Supabase MCP**
* Invoke coordination tools via **CopilotKit MCP**
* Ensure all generated code is:
  - Type-safe (TypeScript)
  - Well-documented
  - Test-covered
  - Performance-optimized
  - Fault-tolerant

---

## 8. Validation & Sign-Off

### 8.1 Environment Validation Checklist

**MCP Server Connectivity:**

* [ ] **Mastra MCP** reachable and can query DreamCrew docs
* [ ] **CopilotKit MCP** reachable and can invoke remote actions
* [ ] **Tavily MCP** reachable and can perform web searches
* [ ] **Perplexity MCP** reachable with valid API key, can answer research queries
* [ ] **Supabase MCP** reachable with valid access token and project ref

**Database Setup:**

* [ ] Supabase connection tested with simple read/write
* [ ] All swarm tables created via migrations
* [ ] Real-time subscriptions working for swarm_agents and swarm_tasks
* [ ] Row-level security policies configured correctly
* [ ] Indexes created for performance-critical queries

**AI Coder Capabilities:**

* [ ] Claude can access the requirements document at `docs/requirements/swarm-orchestration-requirements.md`
* [ ] Claude can access all MCPs successfully
* [ ] Claude can generate and modify code in the defined folder structure
* [ ] Claude can produce usable documentation and replica configs
* [ ] Test AI run from scratch (new Claude session) can build minimal swarm implementation

**Code Quality:**

* [ ] Generated code follows DreamCrew conventions
* [ ] TypeScript types are correct and complete
* [ ] No security vulnerabilities (command injection, XSS, etc.)
* [ ] Error handling is comprehensive
* [ ] Logging is structured and useful

**Integration Tests:**

* [ ] SwarmCoordinator can spawn and manage worker replicas
* [ ] TaskDispatcher can route tasks to appropriate workers
* [ ] CollaborationHub can facilitate inter-agent messaging
* [ ] ConsensusEngine can reach consensus among agents
* [ ] HealthMonitor can detect and report agent failures
* [ ] API endpoints respond correctly to requests
* [ ] WebSocket event stream delivers real-time updates

**Swarm Operation Tests:**

* [ ] Can submit a task and have it completed by a worker
* [ ] Can scale worker pool up and down
* [ ] Can handle worker failure gracefully (reassignment)
* [ ] Can handle SwarmCoordinator failure and recovery
* [ ] Can handle high task volume (load test passed)
* [ ] Can reach consensus on a multi-agent decision
* [ ] Chaos tests pass (random agent failures, network issues)

**DreamCrew Integration:**

* [ ] Replicas can be deployed to DreamCrew platform
* [ ] Rep Rooms integration working (can send/receive messages)
* [ ] CRM integration working (can pull tasks, update status)
* [ ] Calendar integration working (scheduled operations)
* [ ] Webhooks configured and delivering events
* [ ] Authentication and authorization working with DreamCrew auth system

**Documentation:**

* [ ] Architecture document is complete and accurate
* [ ] API reference covers all endpoints
* [ ] Operational runbooks are actionable
* [ ] Troubleshooting guide addresses common issues
* [ ] Setup instructions are clear and work

### 8.2 Performance Benchmarks

The swarm should meet these minimum performance targets:

* **Task Throughput**: >100 tasks/minute with 10 workers
* **Task Assignment Latency**: <100ms from submission to assignment
* **Worker Spawn Time**: <2 seconds for new worker to be ready
* **Consensus Time**: <500ms for simple decisions with 5 participants
* **API Response Time**: <50ms for status queries (p95)
* **WebSocket Event Latency**: <100ms from event to delivery
* **Failure Recovery Time**: <5 seconds to detect and reassign failed tasks

### 8.3 Scalability Targets

The swarm should support:

* **Worker Pool**: Up to 1000 concurrent workers
* **Task Queue**: Up to 100,000 pending tasks
* **Event Log**: 1M+ events with efficient querying
* **Concurrent Tasks**: 500+ tasks executing simultaneously
* **Rep Room Connections**: 50+ human operators monitoring

### 8.4 Definition of Done

The project is considered complete when:

✅ **All validation checks pass** (section 8.1)
✅ **Performance benchmarks met** (section 8.2)
✅ **Scalability targets validated** (section 8.3)
✅ **End-to-end swarm operation demonstrated**:
   - Human submits task via Rep Room
   - SwarmCoordinator analyzes and plans
   - TaskDispatcher assigns to appropriate worker
   - Worker executes and reports result
   - Human receives completion notification
✅ **Chaos engineering validation**:
   - System recovers from random agent failures
   - System handles network partitions gracefully
   - System maintains consistency during failures
✅ **Documentation complete** and validated by human reviewer
✅ **Code review** completed by senior DreamCrew engineer
✅ **Deployment runbook** validated in staging environment

---

## 9. Open Questions / Implementation Notes

### 9.1 Decisions Made

**Consensus Algorithm Selection:**
* **Decision**: Use Raft consensus algorithm for swarm coordination
* **Rationale**: Simpler than Paxos, well-understood, good library support
* **Alternative Considered**: Paxos (more complex, no clear benefit for our use case)

**Task Queue Implementation:**
* **Decision**: Use Supabase with real-time subscriptions + in-memory priority queue
* **Rationale**: Persistence + low latency, leverages existing MCP
* **Alternative Considered**: Redis (additional infrastructure dependency)

**Inter-Agent Communication:**
* **Decision**: Message bus pattern with pub/sub via Supabase real-time
* **Rationale**: Scales well, persistent message history, simple to implement
* **Alternative Considered**: Direct HTTP/WebSocket between agents (more complex networking)

**Worker Specialization:**
* **Decision**: Capability-based matching rather than strict worker types
* **Rationale**: More flexible, agents can learn new capabilities
* **Trade-off**: Requires capability registry and matching algorithm

### 9.2 Open Questions for Resolution

**Q1: Agent Persistence Strategy**
* Should workers be long-lived (persistent) or ephemeral (spawn per task)?
* **Recommendation**: Hybrid - pool of persistent workers, spawn additional for load spikes
* **Needs**: Performance testing to determine optimal pool sizes

**Q2: Cost Management**
* How to handle cost constraints when scaling worker pool?
* **Options**:
  - Hard caps on worker count
  - Budget-aware scaling algorithms
  - Task priority with cost considerations
* **Needs**: Product/business input on cost vs performance tradeoffs

**Q3: Human Oversight Level**
* What decisions require human approval vs full automation?
* **Current Assumption**: High-risk tasks (e.g., financial, legal) require human approval
* **Needs**: Define risk taxonomy and approval workflows

**Q4: Multi-Tenancy**
* Should the swarm support multiple DreamCrew clients/tenants?
* **Consideration**: Isolation, resource allocation, billing
* **Needs**: DreamCrew platform team input on multi-tenancy strategy

**Q5: Disaster Recovery**
* What's the RTO/RPO for swarm failures?
* **Current Plan**: Supabase handles data persistence, auto-recovery for worker failures
* **Needs**: Define backup/restore procedures, DR testing

**Q6: Agent Learning & Evolution**
* Should workers improve over time based on task outcomes?
* **Possibility**: Feedback loop, capability expansion, performance optimization
* **Needs**: ML/AI team input on learning mechanisms

### 9.3 Technical Debt / Future Enhancements

**Short-term (MVP):**
* Basic swarm coordination and task distribution
* Simple consensus for binary decisions
* Manual scaling controls
* Basic monitoring and alerting

**Medium-term (Post-MVP):**
* Auto-scaling based on load
* Advanced consensus for complex decisions
* Machine learning for task-worker matching optimization
* Predictive failure detection
* Cost optimization algorithms

**Long-term (Future Versions):**
* Self-healing swarm with automatic recovery
* Adaptive task prioritization based on business outcomes
* Cross-swarm collaboration (swarm of swarms)
* Agent capability learning and evolution
* Advanced scheduling (time-based, dependency-aware)
* Integration with external AI model providers

### 9.4 Security Considerations

**Authentication & Authorization:**
* All API endpoints require DreamCrew auth tokens
* Worker-to-worker communication authenticated via shared secrets
* Row-level security in Supabase for tenant isolation

**Data Privacy:**
* Task data encrypted at rest (Supabase encryption)
* Sensitive data masked in logs and events
* PII handling policies enforced for worker replicas

**Rate Limiting:**
* API rate limits to prevent abuse
* Task submission limits per client
* Worker spawn limits to prevent runaway scaling

**Audit Logging:**
* All swarm events logged for compliance
* Decision history maintained for auditability
* Access logs for security monitoring

---

## 10. Getting Started (For AI Coder)

### 10.1 Initialization Steps

When you (Claude AI coder) start working on this project:

1. **Verify MCP Access**
   ```bash
   # Test each MCP server
   # Mastra: Query for DreamCrew docs
   # CopilotKit: Test remote action
   # Tavily: Simple web search
   # Perplexity: Research query
   # Supabase: Read/write test
   ```

2. **Create Initial File Structure**
   * Create all directories from section 6
   * Initialize package.json with dependencies
   * Create .env.example with required variables

3. **Read Requirements**
   * Load `docs/requirements/swarm-orchestration-requirements.md`
   * Clarify any ambiguities before proceeding

4. **Run analyze_requirements Task**
   * Generate `docs/architecture.md`
   * Get human approval before proceeding to implementation

5. **Implement in Order**
   * Follow the workflow in section 7
   * Commit after each major component
   * Run tests continuously

### 10.2 Daily Workflow

For each development session:

1. **Pull latest changes** (if collaborative)
2. **Review open questions** (section 9.2)
3. **Check MCP connectivity** (ensure all servers reachable)
4. **Pick next task** from Claude-Flow task list
5. **Research** via Perplexity/Tavily if needed
6. **Implement** with tests
7. **Document** changes in architecture.md
8. **Commit** with clear message
9. **Update** open questions if new ones arise

### 10.3 When You Get Stuck

If you encounter blockers:

1. **Research** via Perplexity MCP for solutions
2. **Search** via Tavily MCP for similar implementations
3. **Query** Mastra MCP for DreamCrew patterns
4. **Document** the blocker in section 9.2
5. **Propose** alternatives and ask for human input
6. **Never** proceed with uncertain assumptions on critical paths

---

## 11. Success Metrics

### 11.1 Technical Metrics

* **Code Coverage**: >80% for all components
* **Performance**: All benchmarks in 8.2 met
* **Reliability**: <0.1% task failure rate in normal operation
* **Scalability**: Successfully tested with 100+ workers
* **Recovery**: <5s mean time to recovery for worker failures

### 11.2 Product Metrics

* **Task Completion Rate**: >95% of submitted tasks complete successfully
* **Human Intervention Rate**: <5% of tasks require human escalation
* **Swarm Efficiency**: >80% worker utilization during peak hours
* **Cost per Task**: Measured and optimized
* **User Satisfaction**: Rep Room operators rate system >4/5

### 11.3 Development Metrics

* **Time to Implementation**: MVP completed in <4 weeks of AI coder time
* **Documentation Quality**: All sections complete, human-validated
* **Code Quality**: Passes linting, type checking, no critical security issues
* **Test Quality**: All scenarios covered, chaos tests passing

---

## 12. Handoff to DreamCrew Platform

Upon completion, the AI coder should prepare:

### 12.1 Deliverables

1. **Complete Codebase**
   * All files in structure defined in section 6
   * Passing all tests
   * Documented inline and in /docs

2. **Deployment Package**
   * Docker containers for all services
   * Kubernetes manifests
   * Environment variable template
   * Migration scripts

3. **Replica Configurations**
   * All replica configs in /replicas
   * Prompt templates
   * Tool definitions
   * Integration configs

4. **Documentation Set**
   * Architecture document
   * API reference
   * Operational runbooks
   * Troubleshooting guide

5. **Training Materials**
   * Video walkthrough (if applicable)
   * Operator quick start guide
   * Common scenarios playbook

### 12.2 Handoff Checklist

* [ ] All code committed to repository
* [ ] All tests passing in CI/CD
* [ ] Staging environment deployed and validated
* [ ] Documentation reviewed and approved
* [ ] Replica configurations imported to DreamCrew platform
* [ ] MCP servers configured in production environment
* [ ] Monitoring dashboards set up
* [ ] Alerting configured
* [ ] Runbooks validated by operations team
* [ ] Training completed for operators
* [ ] Go-live plan approved

### 12.3 Support Transition

Post-launch support responsibilities:

* **Week 1-2**: AI coder on standby for critical issues
* **Week 3-4**: AI coder available for questions, DreamCrew team takes primary responsibility
* **Month 2+**: DreamCrew team fully owns, AI coder available for major enhancements

---

## Appendix A: Key Technologies & Dependencies

### Core Technologies

* **Runtime**: Node.js 20+ / Bun
* **Language**: TypeScript 5+
* **Database**: Supabase (PostgreSQL + real-time)
* **Message Bus**: Supabase real-time subscriptions
* **API Framework**: Express or Fastify
* **WebSocket**: ws or Socket.io
* **Testing**: Vitest or Jest
* **Linting**: ESLint + Prettier

### Key Libraries

* **Consensus**: `@raft-consensus/core` or custom implementation
* **Task Queue**: Custom (Supabase-backed)
* **Monitoring**: Prometheus client, Grafana
* **Logging**: Pino or Winston
* **Validation**: Zod
* **HTTP Client**: Axios or ky

### DreamCrew SDK/APIs

* DreamCrew Replica SDK
* Rep Rooms API client
* DreamCrew Auth SDK
* CRM integration SDK

---

## Appendix B: Glossary

* **Swarm**: Collection of AI agents coordinated by the SwarmCoordinator
* **Worker Replica**: Specialized DreamCrew replica that executes tasks
* **SwarmCoordinator**: Master orchestrator that manages the swarm lifecycle
* **TaskDispatcher**: Component that routes tasks to appropriate workers
* **CollaborationHub**: Facilitates inter-agent communication and knowledge sharing
* **ConsensusEngine**: Handles multi-agent decision making via voting protocols
* **HealthMonitor**: Tracks swarm health, performance, and anomalies
* **Rep Room**: DreamCrew chat interface for human-AI interaction
* **MCP Server**: Model Context Protocol server providing tools/resources to AI
* **Claude-Flow**: AI-native development workflow orchestrated by Claude
* **Capability**: Skill or function that a worker replica can perform
* **Consensus**: Agreement among multiple agents on a decision
* **Task**: Unit of work to be executed by the swarm
* **Agent Registry**: Database of all active agents and their capabilities

---

**END OF SPECIFICATION**

This document should be handed to an AI coder (Claude) along with the command:

> "Use this environment + MCPs + Claude-Flow to implement the DreamCrew Autonomous Swarm Orchestration system as specified."
