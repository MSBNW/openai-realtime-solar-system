# DreamCrew Autonomous Swarm Orchestration System - Requirements Specification

**Document Type:** Functional & Technical Requirements
**Version:** 1.0
**Date:** November 11, 2025
**Status:** Final - Ready for Implementation

---

## Document Purpose

This document specifies the functional and technical requirements for DreamCrew's autonomous, self-configuring AI agent swarm orchestration system. It describes **what** the system must do, **not how** to implement it. All implementation decisions are left to the development team.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Core Requirements](#core-requirements)
4. [Data Requirements](#data-requirements)
5. [Functional Requirements](#functional-requirements)
6. [Integration Requirements](#integration-requirements)
7. [Performance Requirements](#performance-requirements)
8. [Security Requirements](#security-requirements)
9. [User Scenarios](#user-scenarios)
10. [Success Criteria](#success-criteria)

---

## Executive Summary

### Vision

The system shall provide a fully autonomous, self-configuring AI agent platform that:

1. Auto-discovers tenant business needs through conversational interaction
2. Self-configures MCP integrations and agent setups based on business type
3. Spawns intelligent agent swarms that autonomously reason through complex tasks
4. Requires zero technical knowledge from end users

### Key Differentiators

**Traditional AI Platforms:**
- Require manual configuration by users
- Follow predefined workflows with rigid execution paths
- Require technical expertise to set up and maintain

**DreamCrew Requirements:**
- Fully autonomous configuration through natural language conversation
- Dynamic, reasoning-based task execution
- Zero technical knowledge required from tenants

### Business Impact

The system must deliver:
- Tenant onboarding time reduction: From 3 weeks to 30 minutes
- Configuration complexity: From high technical expertise to conversational only
- Agent capability: From scripted execution to autonomous reasoning
- Scalability: From linear to exponential tenant growth

---

## System Overview

### High-Level Architecture

The system shall consist of the following conceptual layers:

**Layer 1: User Interface**
- Conversational chat interfaces for tenant interaction
- Real-time dashboards showing swarm execution progress
- Human-in-the-loop approval interfaces
- Administrative configuration panels

**Layer 2: Auto-Configuration Engine**
- Business type detection from conversational input
- Automatic MCP server recommendation and setup
- Knowledge base structure generation
- Agent configuration and deployment

**Layer 3: Swarm Orchestration Engine**
- High-level goal decomposition into executable tasks
- Multi-agent coordination with parallel execution
- Dependency resolution and wave-based task execution
- Result aggregation and summarization

**Layer 4: MCP Integration Layer**
- Hierarchical MCP server registry (House/Tenant/User levels)
- Dynamic tool discovery and invocation
- Connection management and health monitoring

**Layer 5: Agent Reasoning Engine**
- Autonomous decision-making and problem-solving
- Tool selection and invocation
- Iterative refinement until task completion
- Context management across conversation turns

**Layer 6: LLM Provider Abstraction**
- Support for multiple LLM providers (Anthropic, OpenAI, Google, etc.)
- Intelligent provider selection based on task requirements
- Cost optimization through provider matching
- Automatic failover if primary provider unavailable

**Layer 7: Storage & Execution**
- Multi-tenant data isolation
- Vector-based knowledge base search
- Real-time progress updates
- Audit trail of all operations

---

## Core Requirements

### REQ-1: LLM Provider Agnosticism

**Requirement:** The system must support multiple LLM providers without requiring code changes when switching providers.

**Supported Providers (Minimum):**
- Anthropic Claude (all models)
- OpenAI GPT (all models)
- Google Gemini
- AWS Bedrock
- Azure OpenAI
- Local models via Ollama
- Any provider with compatible API

**Provider Selection Criteria:**
The system must automatically select the optimal provider for each task based on:
- Task complexity (simple vs. reasoning-intensive)
- Required capabilities (tool use, vision, extended thinking)
- Cost constraints (budget-conscious vs. performance-focused)
- Availability (fallback if primary provider is down)

**Expected Behavior:**
- All LLM interactions must route through a universal provider interface
- Provider-specific response formats must normalize to a common structure
- Cost tracking must work consistently across all providers
- Tool invocation must function identically regardless of provider

---

### REQ-2: Framework Integration

**Requirement:** The system must integrate with existing proven frameworks rather than reimplementing established patterns.

**Mastra Framework Integration:**
- The system must leverage Mastra (mastra.ai) for agent definitions, workflows, and memory management
- DreamCrew's orchestration layer must sit above Mastra as an enhancement, not a replacement
- Individual agent execution must utilize Mastra's agent runtime
- Workflow patterns must map to Mastra's workflow engine where applicable

**CopilotKit Integration:**
- All conversational user interfaces must use CopilotKit React components
- Rep Room chat interfaces must support streaming responses
- Swarm progress visualizations must use CopilotKit's real-time update patterns
- Human-in-the-loop approval flows must integrate with CopilotKit's action system

**Integration Hierarchy:**
```
User Interface (CopilotKit)
    ↓
DreamCrew Swarm Orchestration (Multi-agent coordination, auto-config)
    ↓
Mastra Framework (Agent definitions, workflows, memory)
    ↓
LLM Provider Abstraction (Any LLM)
    ↓
MCP Integration (Tools and services)
```

---

### REQ-3: Hierarchical MCP Server Architecture

**Requirement:** The system must support a three-tier MCP server hierarchy with proper isolation and access control.

**Tier 1: House-Level MCP Servers**
- Provided by DreamCrew platform
- Available to all tenants automatically
- Cannot be modified or removed by tenants
- Examples: Web search (Tavily), SEO research (DataForSEO), knowledge base search

**Tier 2: Tenant-Level MCP Servers**
- Configured by individual tenant organizations
- Accessible to all users within that tenant
- Managed by tenant administrators
- Examples: CRM integration, payment processor, email service, scheduling system

**Tier 3: User-Level MCP Servers**
- Configured by individual users
- Accessible only to the specific user
- Personal data and preferences
- Examples: Personal knowledge base, contacts, testimonials

**Access Rules:**
- Agents executing tasks must have access to all three tiers simultaneously
- Higher tiers cannot access lower tier servers (House cannot access Tenant/User)
- Tenant isolation must be enforced (Tenant A cannot access Tenant B's servers)
- User isolation must be enforced (User 1 cannot access User 2's servers)

---

### REQ-4: Autonomous Agent Reasoning

**Requirement:** Agents must determine HOW to achieve goals autonomously rather than following pre-scripted instructions.

**Agent Behavior:**
- Given a high-level goal, agents must analyze and determine the approach
- Agents must select appropriate tools based on task requirements
- Agents must adapt strategy if initial approach fails
- Agents must iterate until goal is achieved or maximum attempts reached
- Agents must request human input when genuinely uncertain

**Reasoning Process:**
1. Receive goal and context
2. Analyze available tools and their capabilities
3. Formulate approach to achieve goal
4. Execute approach using tool invocations
5. Evaluate results
6. If goal not achieved, refine approach and retry
7. If maximum iterations reached, report partial progress

**Anti-Pattern (What to Avoid):**
- Pre-defined step-by-step workflows
- Hardcoded decision trees
- Fixed sequences of tool invocations
- Template-based responses

---

### REQ-5: Multi-Agent Swarm Coordination

**Requirement:** The system must coordinate multiple agents working in parallel on different subtasks of a larger goal.

**Swarm Execution Process:**

**Step 1: Goal Decomposition**
- Input: High-level goal (e.g., "Launch Google Ads campaign for bakery")
- Process: Analyze goal and break into 3-8 concrete, actionable tasks
- Output: Structured list of tasks with clear outcomes

**Step 2: Dependency Analysis**
- Identify which tasks depend on completion of other tasks
- Build dependency graph showing relationships
- Validate no circular dependencies exist

**Step 3: Wave Assignment**
- Group tasks into "waves" based on dependencies
- Wave 1: Tasks with no dependencies (can run immediately)
- Wave 2: Tasks depending only on Wave 1
- Wave N: Tasks depending on previous waves
- Tasks within same wave execute in parallel

**Step 4: Agent Spawning**
- Create specialized agent for each task
- Assign task type (research, analysis, execution, communication)
- Provide task-specific context and available tools

**Step 5: Parallel Execution**
- Execute all tasks in current wave simultaneously
- Monitor progress of each agent
- Collect results as agents complete

**Step 6: Wave Progression**
- When all tasks in wave complete, proceed to next wave
- Pass results from completed tasks to dependent tasks
- Repeat until all waves complete

**Step 7: Result Aggregation**
- Collect outputs from all tasks
- Generate human-readable summary
- Present artifacts and recommendations

**Performance Requirements:**
- Minimum 3 agents must be able to execute simultaneously
- Target 10+ concurrent agents without degradation
- Wave transition latency must be under 2 seconds

---

### REQ-6: Zero-Configuration Onboarding

**Requirement:** Tenants must be able to fully set up their account through conversational interaction without technical knowledge.

**Onboarding Flow:**

**Stage 1: Conversational Business Discovery (5-10 minutes)**
- System engages tenant in natural conversation
- System asks about business type, services, goals, pain points
- Tenant responds in natural language (no forms, no technical terms)
- System extracts structured information from conversation

**Expected Conversation Topics:**
- What type of business? (gym, tutoring, agency, restaurant, etc.)
- What services do you provide?
- What are your main business goals?
- What problems are you trying to solve?
- What software/tools do you currently use?
- How many employees/locations do you have?

**Stage 2: Automatic Business Type Detection (< 5 seconds)**
- System analyzes conversation transcript
- Identifies business type from 10+ predefined categories
- Generates confidence score (target: 90%+ accuracy)
- Presents detection result to tenant for confirmation

**Stage 3: Auto-Configuration Execution (< 5 minutes)**
- System loads configuration template for business type
- Customizes MCP server recommendations based on existing software
- Generates knowledge base structure appropriate to industry
- Creates agent configurations tailored to business
- Sets up rep room with personalized greeting and prompts

**Stage 4: Guided Setup Completion (10-20 minutes)**
- System presents recommended MCP server integrations
- Tenant connects services with guided wizard (credentials, API keys)
- System tests connections and verifies health
- System imports initial knowledge base content (from website, files, etc.)
- First agent becomes active and ready for use

**Total Time Target:** 30 minutes from account creation to working agent

**Success Criteria:**
- 85%+ onboarding completion rate
- 90%+ business type detection accuracy
- 95%+ tenants require no manual configuration edits
- Zero technical support needed during onboarding

---

## Data Requirements

### DR-1: Swarm Execution Tracking

**Purpose:** Track all swarm execution sessions with complete audit trail

**Required Data Elements:**

**Execution Record:**
- Unique execution identifier
- Tenant and user identifiers
- Project identifier (if applicable)
- High-level goal description
- Execution status (pending, decomposing, executing, completed, failed, cancelled)
- Initial context data provided by user
- Constraint parameters (max duration, max cost, approval requirements)

**Execution Metrics:**
- Total number of tasks generated
- Number of completed tasks
- Number of failed tasks
- Current wave number and total waves
- Start timestamp
- Completion timestamp
- Total duration in milliseconds
- Total credits consumed

**Execution Results:**
- Summary of accomplishments
- List of generated artifacts
- Record of all human interactions
- Final status and outcome

**Data Retention:**
- All execution records must be retained for minimum 90 days
- Completed executions must be queryable by tenant administrators
- Audit trail must be immutable after completion

---

### DR-2: Task Execution Details

**Purpose:** Track individual task execution within swarm sessions

**Required Data Elements:**

**Task Definition:**
- Unique task identifier within execution
- Task name and description
- Task type (research, analysis, execution, communication)
- Goal statement
- List of dependency task IDs
- Required expertise/capabilities
- Constraint parameters

**Task Assignment:**
- Wave number
- Assigned agent identifier
- Execution status (pending, executing, completed, failed)

**Task Results:**
- Output text
- Reasoning explanation (if available)
- Error message (if failed)
- Approval requirement flag
- Approval status (if applicable)
- Approving user ID and timestamp

**Task Performance:**
- Start timestamp
- Completion timestamp
- Duration in milliseconds
- Credits consumed
- Number of tool invocations

**Data Retention:**
- Task records linked to parent execution
- Must support querying by wave number
- Must support filtering by status

---

### DR-3: MCP Server Registry

**Purpose:** Manage hierarchical MCP server configurations and health

**Required Data Elements:**

**Server Identity:**
- Unique server identifier
- Server level (house, tenant, user)
- Ownership identifiers (tenant ID, user ID as applicable)
- Internal name (system identifier)
- Public display name (user-facing)
- Description
- Icon (emoji or URL)
- Category (research, communication, crm, analytics, etc.)

**Connection Configuration:**
- Connection type (stdio, SSE, API, webhook)
- Connection parameters (command, arguments, URL, etc.)
- Credential requirements flag
- Credential schema (if credentials required)
- Encrypted credential storage

**Health & Status:**
- Current status (active, inactive, error, configuring)
- Last health check timestamp
- Health check result data
- Error message (if in error state)

**Usage Tracking:**
- Total invocation count
- Total credits consumed
- Last invocation timestamp

**Auto-Configuration Metadata:**
- Auto-configured flag
- Configuration source (template, manual, API)

**Data Requirements:**
- Tenant isolation must be enforced at database level
- Credentials must be encrypted at rest
- Health checks must run automatically every 15 minutes
- Failed health checks must trigger status change to "error"

---

### DR-4: Knowledge Base Items

**Purpose:** Store searchable knowledge for tenant and user levels with semantic search

**Required Data Elements:**

**Tenant Knowledge Items:**
- Unique item identifier
- Tenant identifier
- Title
- Content type (text, image, video, FAQ, review, product, procedure, policy)
- Content (text)
- Image URL (if applicable)
- Image analysis (AI-generated description if image)
- Tags (array)
- Category
- Source URL (if imported)
- Vector embedding (1536 dimensions for semantic search)
- Usage count
- Last used timestamp
- Creation and update timestamps

**User Knowledge Items:**
- Unique item identifier
- User identifier
- Tenant identifier
- Title
- Content type (text, image, contact, testimonial, note, document)
- Content (text)
- Tags (array)
- Category
- Vector embedding (1536 dimensions)
- Privacy flag (private to user or shared within tenant)
- Creation and update timestamps

**Search Requirements:**
- Semantic search using vector similarity (cosine similarity)
- Minimum similarity threshold: 0.7
- Default result limit: 5 items
- Support for filtering by content type and category
- Support for tag-based filtering

**Data Isolation:**
- Tenant knowledge accessible only to that tenant's users
- User knowledge accessible only to owning user
- House-level knowledge (if implemented) accessible to all

---

### DR-5: Business Type Configuration Templates

**Purpose:** Store reusable configuration templates for different business types

**Required Data Elements:**

**Business Type Identity:**
- Unique business type identifier (slug format)
- Display name
- Description
- Icon
- Popularity score (for sorting/recommendations)
- Setup complexity level (low, medium, high)

**MCP Server Recommendations:**
- List of recommended MCP servers for this business type
- Each recommendation includes:
  - Server name/identifier
  - Category
  - Priority level (critical, high, medium, optional)
  - Connection configuration template
  - Required credentials list
  - Setup complexity
  - Value proposition description

**Knowledge Base Schema:**
- List of content types appropriate for business
- Required fields for each content type
- Optional fields for each content type
- Suggested categories
- Example content items

**Onboarding Questions:**
- Ordered list of questions to ask during onboarding
- Each question includes:
  - Question ID
  - Question text
  - Answer type (text, select, multiselect, number)
  - Options list (if select/multiselect)
  - Required flag

**Agent Templates:**
- List of recommended agents for business type
- Each template includes:
  - Agent name
  - Agent type/role
  - Capabilities list
  - Default instruction prompt template
  - Suggested tools/integrations

**Typical Workflows:**
- List of common automation workflows for business
- Each workflow includes:
  - Workflow name
  - Trigger conditions
  - Goal description
  - Expected tasks

**Data Requirements:**
- Minimum 10 business types must be pre-configured
- Templates must be versioned for updates
- New business types must be addable without code changes

---

### DR-6: Tool Invocation Audit Trail

**Purpose:** Complete audit trail of all MCP tool invocations for security and debugging

**Required Data Elements:**

**Invocation Context:**
- Unique invocation identifier
- Execution identifier (parent swarm)
- Task identifier (parent task)
- Agent identifier
- Tenant identifier
- User identifier (if applicable)

**Tool Details:**
- MCP server identifier
- Tool name
- Input parameters (full JSON)
- Output result (full JSON)
- Error message (if failed)
- Success flag

**Performance Metrics:**
- Start timestamp
- Completion timestamp
- Duration in milliseconds
- Credits consumed

**Data Requirements:**
- All invocations must be logged
- Logs must be immutable
- Logs must be retained minimum 90 days
- Logs must be queryable by tenant administrators
- Logs must support filtering by server, tool, date range
- Sensitive data in inputs/outputs must be redacted in logs

---

## Functional Requirements

### FR-1: Swarm Execution

**Requirement:** The system must accept high-level goals and execute them using coordinated multi-agent swarms.

**FR-1.1: Goal Submission**

**Input Requirements:**
- Tenant identifier (required)
- User identifier (optional)
- Project identifier (optional)
- Goal description in natural language (required)
- Initial context data (optional, key-value pairs)
- Execution constraints (optional):
  - Maximum duration in milliseconds
  - Maximum cost in credits
  - Require approval flag

**Validation Rules:**
- Goal description minimum 10 characters
- Goal description maximum 1000 characters
- Tenant must have sufficient credit balance
- User must have permission to execute swarms

**Expected Response:**
- Unique execution identifier
- Estimated duration (if calculable)
- Estimated cost (if calculable)
- Confirmation message

**FR-1.2: Task Decomposition**

**Process Requirements:**
- System must analyze goal using LLM reasoning
- System must generate 3-8 concrete tasks
- Each task must have clear success criteria
- Tasks must be categorized by type (research, analysis, execution, communication)
- System must identify dependencies between tasks
- System must validate no circular dependencies exist

**Output Requirements:**
- Structured task list with all required fields
- Dependency graph representation
- Wave assignments for parallel execution

**FR-1.3: Agent Assignment**

**Process Requirements:**
- System must create dedicated agent for each task
- System must select appropriate agent specialization based on task type
- System must provide agent with:
  - Task goal and context
  - Results from dependency tasks (if any)
  - List of available tools
  - Constraint parameters

**FR-1.4: Parallel Wave Execution**

**Process Requirements:**
- System must execute all tasks in wave simultaneously
- System must monitor each agent's progress
- System must wait for all wave tasks to complete before proceeding
- System must handle agent failures gracefully
- System must provide real-time progress updates

**Concurrency Requirements:**
- Minimum 3 simultaneous agents
- Target 10 simultaneous agents
- Maximum configurable per tenant

**FR-1.5: Result Aggregation**

**Process Requirements:**
- System must collect outputs from all completed tasks
- System must generate human-readable summary of accomplishments
- System must identify and list generated artifacts
- System must present recommendations for next steps (if applicable)

**Summary Requirements:**
- 2-3 paragraph executive summary
- List of key findings/accomplishments
- List of failed tasks (if any) with reasons
- Clear statement of overall success/failure

**FR-1.6: Progress Monitoring**

**Real-Time Update Requirements:**
- System must publish status updates every 1-2 seconds during execution
- Updates must include:
  - Current status
  - Current wave number and total waves
  - Completed task count and total tasks
  - Percent complete
  - Estimated time remaining (if calculable)
  - List of active agents and their current tasks

**Query Requirements:**
- Status must be queryable at any time via API
- Historical executions must be queryable
- Filtering by status, date range, project must be supported

---

### FR-2: Auto-Configuration Engine

**Requirement:** The system must automatically configure tenant accounts based on conversational input.

**FR-2.1: Conversational Onboarding**

**Conversation Management:**
- System must initiate conversation with friendly greeting
- System must ask one question at a time
- System must adapt questions based on previous answers
- System must maintain conversation context
- System must recognize when sufficient information is gathered (typically 5-7 exchanges)

**Information Extraction:**
- System must extract structured data from natural language responses
- Required information:
  - Business name
  - Business type/industry
  - Services offered
  - Business goals
  - Pain points
  - Existing software used
  - Team size
  - Number of locations

**Conversation Completion:**
- System must determine when enough information is collected
- System must confirm understanding with tenant
- System must allow tenant to correct misunderstandings

**FR-2.2: Business Type Detection**

**Detection Process:**
- System must analyze conversation transcript
- System must match against known business types
- System must generate confidence score (0-100)
- System must present detection result to tenant
- System must allow tenant to override if incorrect

**Accuracy Requirements:**
- Target 90%+ correct detection on first attempt
- Confidence score must be ≥80 for automatic acceptance
- If confidence <80, present top 3 matches for tenant selection

**Supported Business Types (Minimum):**
- Health clubs / Gyms
- SAT/ACT test prep
- Digital marketing agencies
- Restaurants
- Retail stores
- Professional services
- Healthcare practices
- Real estate agencies
- Home services (HVAC, plumbing, etc.)
- Automotive (dealerships, repair)
- Beauty/wellness (salons, spas)
- E-commerce

**FR-2.3: Configuration Generation**

**MCP Server Recommendations:**
- System must load template recommendations for detected business type
- System must customize recommendations based on existing software mentioned
- System must prioritize recommendations (critical, high, medium, optional)
- System must provide reasoning for each recommendation
- System must estimate setup complexity for each

**Knowledge Base Structure:**
- System must generate appropriate content types for business
- System must suggest categories relevant to industry
- System must provide list of recommended initial content
- System must identify potential import sources (website, existing CRM, etc.)

**Agent Configuration:**
- System must generate agent configurations based on business type
- Each agent must have:
  - Personalized name relevant to business
  - Role-specific instructions
  - Appropriate greeting message
  - Suggested conversation prompts
  - Tool access permissions

**FR-2.4: Configuration Execution**

**Automated Setup Process:**
- System must create MCP server records in database
- System must create agent instances with generated configurations
- System must create rep room with personalized settings
- System must initialize knowledge base with suggested structure
- System must set up any workflow templates

**Completion Criteria:**
- All critical MCP servers configured (may be pending credential input)
- At least one agent fully operational
- Rep room accessible via unique URL
- Knowledge base structure created
- Tenant can begin using system immediately

**Time Target:**
- Complete auto-configuration in under 5 minutes
- Total onboarding (conversation + setup) under 30 minutes

---

### FR-3: MCP Server Management

**Requirement:** The system must manage MCP server connections, health, and tool discovery.

**FR-3.1: Server Registration**

**House-Level Server Registration:**
- Must support registering servers available to all tenants
- Must validate server provides advertised capabilities
- Must test server health before activating
- Must be performable only by platform administrators

**Tenant-Level Server Registration:**
- Must support tenant administrators adding custom servers
- Must guide user through connection setup
- Must support multiple connection types (API, webhook, stdio, SSE)
- Must validate credentials before saving
- Must test connection before activating

**User-Level Server Registration:**
- Must support individual users adding personal servers
- Must isolate from other users in same tenant
- Must support same connection types as tenant-level

**FR-3.2: Tool Discovery**

**Process Requirements:**
- System must query each MCP server for available tools
- System must cache tool lists with 5-minute refresh
- System must handle servers that become unavailable gracefully
- System must merge tools from all applicable levels (House/Tenant/User)

**Tool Information Required:**
- Tool name (unique identifier)
- Tool description (for agent reasoning)
- Input parameter schema (JSON Schema format)
- Server identifier (for invocation routing)
- Server level (for access control)

**FR-3.3: Tool Invocation**

**Invocation Process:**
- Agent requests tool execution with name and parameters
- System validates parameters against schema
- System routes request to appropriate MCP server
- System awaits response with timeout (30 seconds default)
- System returns result to agent
- System logs invocation in audit trail

**Error Handling:**
- Timeout errors must return clear message to agent
- Invalid parameter errors must specify which parameters
- Server unavailable errors must suggest fallback options
- All errors must be logged

**FR-3.4: Health Monitoring**

**Health Check Requirements:**
- System must test each MCP server every 15 minutes
- Health check must verify:
  - Server is reachable
  - Server responds to tool list request
  - Response time is acceptable (<5 seconds)

**Status Management:**
- Servers passing health check: status = "active"
- Servers failing health check: status = "error"
- Servers with credentials missing: status = "configuring"
- Servers disabled by admin: status = "inactive"

**Notification Requirements:**
- Tenant administrators must be notified when their servers enter error state
- Notification channels: email, in-app notification
- Error message must include troubleshooting suggestions

---

### FR-4: Knowledge Base Management

**Requirement:** The system must provide semantic search across tenant and user knowledge bases.

**FR-4.1: Content Import**

**Supported Import Sources:**
- Website scraping (URL-based)
- File upload (PDF, DOCX, TXT, CSV)
- Manual entry (web form)
- API import (structured data)

**Website Import Process:**
- User provides website URL
- System scrapes up to configurable maximum pages (default 50)
- System extracts text content from each page
- System optionally includes images
- System analyzes images with vision AI if included
- System creates knowledge items for each page
- System generates vector embeddings for semantic search

**File Upload Process:**
- User uploads one or more files
- System extracts text content
- System handles various formats appropriately
- System creates knowledge items for content chunks
- System generates vector embeddings

**Bulk Import Requirements:**
- Must support CSV with column mapping
- Must handle up to 1000 items per import
- Must provide progress indicator
- Must report success/failure count
- Must handle errors gracefully without aborting entire import

**FR-4.2: Semantic Search**

**Search Process:**
- Input: Natural language query
- System generates vector embedding for query
- System performs similarity search against knowledge base
- System returns top N most similar items (default 5)
- System filters by minimum similarity threshold (default 0.7)

**Search Filters:**
- Content type (text, image, FAQ, etc.)
- Category
- Tags
- Date range

**Search Results:**
- Each result must include:
  - Title
  - Content excerpt
  - Similarity score (as percentage)
  - Content type
  - Category
  - Source URL (if applicable)

**Performance Requirements:**
- Search must complete in under 500ms for typical query
- Must support concurrent searches from multiple agents
- Must scale to 10,000+ items per tenant

**FR-4.3: Usage Tracking**

**Tracking Requirements:**
- System must increment usage count when item used in agent response
- System must update last-used timestamp
- System must track which agents/tasks used item

**Reporting Requirements:**
- Tenant administrators must be able to view:
  - Most-used knowledge items
  - Unused knowledge items
  - Knowledge items by category
  - Search effectiveness metrics

---

### FR-5: Human-in-the-Loop (HITL)

**Requirement:** The system must support conversational human collaboration during swarm execution.

**FR-5.1: Approval Requests**

**Triggering Conditions:**
- Task marked as requiring approval
- Agent explicitly requests human input
- Execution constraints require approval before proceeding

**Approval Request Format:**
- Clear description of what needs approval
- Context explaining why approval is needed
- Options presented (approve, reject, modify)
- Consequences of each option

**Delivery Channels:**
- In-app notification (real-time)
- Email (if user not active)
- Slack/Teams (if configured)

**FR-5.2: Approval Response Handling**

**Response Options:**
- **Approve:** Continue execution as planned
- **Reject:** Cancel current task or entire execution
- **Modify:** Provide alternative instructions
- **Ask Question:** Request more information before deciding

**Timeout Handling:**
- Default timeout: 24 hours
- After timeout: treat as rejection
- Timeout must be configurable per execution

**FR-5.3: Conversational Feedback**

**Requirements:**
- User must be able to provide feedback in natural language
- System must interpret feedback and adjust execution
- User must be able to change previously-made decisions
- System must maintain conversation history for context

**FR-5.4: Collaboration History**

**Recording Requirements:**
- All HITL interactions must be recorded
- Each interaction must include:
  - Timestamp
  - Question/request from agent
  - User response
  - Response time (how long user took to respond)
  - Outcome (approved, rejected, modified)

**Reporting Requirements:**
- Tenant administrators must be able to view:
  - HITL interaction frequency
  - Average response times
  - Approval vs rejection rates
  - Most common HITL triggers

---

## Integration Requirements

### INT-1: Mastra Framework Integration

**Requirement:** The system must integrate with Mastra framework for agent execution and workflow management.

**Integration Points:**

**Agent Execution:**
- Individual task execution must utilize Mastra's agent runtime
- Agent definitions must map to Mastra's agent configuration format
- Tool invocations must route through Mastra's tool system
- Agent memory must leverage Mastra's memory management

**Workflow Engine:**
- Where applicable, swarm task graphs should map to Mastra workflows
- Sequential task chains should use Mastra's workflow nodes
- Parallel execution should leverage Mastra's concurrent execution

**Observability:**
- Mastra's logging must be integrated with DreamCrew's audit trail
- Mastra's metrics must feed into DreamCrew's performance monitoring
- Mastra's error reporting must trigger DreamCrew's error handling

**Architectural Relationship:**
- DreamCrew orchestration layer sits above Mastra
- DreamCrew handles multi-agent coordination and swarm logic
- Mastra handles individual agent execution
- DreamCrew remains the primary interface for users

---

### INT-2: CopilotKit UI Integration

**Requirement:** The system must use CopilotKit for all conversational user interfaces.

**Integration Points:**

**Rep Room Chat Interface:**
- Must use CopilotKit's chat component
- Must support streaming responses
- Must support tool use visualization
- Must support attachments and rich media

**Swarm Progress Display:**
- Must use CopilotKit's real-time update patterns
- Must show task-by-task progress
- Must indicate current wave and agents active
- Must support interactive elements (pause, cancel)

**HITL Approval Flows:**
- Must use CopilotKit's action system
- Must present approval requests as conversational prompts
- Must support button-based and natural language responses
- Must show approval status in conversation history

**Knowledge Base Search UI:**
- Must integrate search into chat interface
- Must show search results inline
- Must allow users to add to knowledge base conversationally

**Requirements:**
- All CopilotKit components must use tenant's branding
- All conversations must persist across sessions
- All interactions must be responsive and mobile-friendly

---

### INT-3: LLM Provider Abstraction

**Requirement:** The system must support multiple LLM providers through a universal interface.

**Provider Interface Requirements:**

**Core Operations:**
- Generate completion given messages and optional tools
- Stream completion for real-time UI updates
- Report capabilities (tools, vision, thinking mode support)
- Report pricing (cost per 1K tokens, input and output)
- Report provider name and model identifier

**Message Format:**
- Universal message format must normalize across providers
- Support for text, images, tool uses, and tool results
- Conversion to/from provider-specific formats must be transparent

**Tool Integration:**
- Tool definitions must work across all providers
- Tool invocation results must normalize to common format
- Providers without native tool support must handle gracefully

**Provider Selection:**

**Selection Criteria:**
- Task type (reasoning, simple, vision, speed-critical)
- Tool support requirement
- Extended thinking requirement
- Budget level (low, medium, high)

**Selection Rules:**
- For reasoning tasks: Prefer Claude > GPT-4 > Gemini
- For simple tasks: Prefer Gemini > GPT-4 > Claude (cost optimization)
- For vision tasks: Prefer Claude > GPT-4 > Gemini
- For speed-critical: Prefer Groq > Gemini > GPT-4
- For budget-conscious: Prefer Gemini for all tasks where capable

**Fallback Behavior:**
- If primary provider fails, automatically retry with secondary
- If all providers fail, return clear error message
- Log all provider failures for monitoring

**Cost Tracking:**
- All token usage must be tracked per provider
- Credits must be calculated based on provider-specific pricing
- Per-tenant costs must aggregate across all providers
- Cost reports must break down by provider

---

## Performance Requirements

### PERF-1: Response Time

**API Endpoints:**
- Swarm execution submission: <1 second response
- Status query: <500ms response
- Knowledge base search: <500ms response
- MCP tool invocation: <2 seconds response (excluding tool execution time)

**UI Interactions:**
- Chat message send: <200ms to display in UI
- Streaming response: First token within 1 second
- Page load: <2 seconds
- Real-time updates: <1 second latency

**Background Operations:**
- Swarm execution start: <2 seconds from submission to first task
- Task decomposition: <10 seconds for typical goal
- Wave transition: <2 seconds between waves
- Health checks: <5 seconds per server

---

### PERF-2: Concurrency

**Swarm Execution:**
- Minimum 50 concurrent swarm executions across all tenants
- Minimum 10 concurrent swarms per individual tenant
- Minimum 3 agents per swarm executing in parallel
- Target 10 agents per swarm executing in parallel

**Database Operations:**
- Minimum 100 concurrent database connections
- Query response time <100ms for 95th percentile
- Vector search response time <500ms for 95th percentile

**MCP Tool Invocations:**
- Minimum 100 concurrent tool invocations across all tenants
- Must handle tool invocation bursts (10+ simultaneous from single swarm)

---

### PERF-3: Scalability

**Data Volume:**
- Support 10,000+ tenants
- Support 1,000,000+ knowledge base items total
- Support 100,000+ swarm executions per day
- Support 10,000,000+ tool invocations per day

**Storage:**
- Vector embeddings must scale to 1,000,000+ items
- Audit logs must support 1 billion+ records
- File attachments must support 1TB+ total storage

**Growth:**
- System must scale horizontally (add more servers)
- No single-point bottlenecks
- Database must support read replicas
- Caching must reduce database load

---

### PERF-4: Availability

**Uptime:**
- Target 99.9% uptime (43 minutes downtime per month)
- Planned maintenance windows must be announced 48 hours in advance
- Planned maintenance limited to 4 hours per month

**Failover:**
- LLM provider failover must be automatic and transparent
- Database failover must complete within 30 seconds
- No data loss during failover events

**Monitoring:**
- Health checks every 60 seconds
- Alert on any component failure within 2 minutes
- Automated recovery where possible

---

## Security Requirements

### SEC-1: Multi-Tenant Isolation

**Requirement:** Tenant data must be completely isolated at all levels.

**Database Isolation:**
- Row-level security policies must enforce tenant isolation
- Queries must never return data from other tenants
- Tenant ID must be validated on every data access
- Cross-tenant queries must be impossible

**MCP Server Isolation:**
- Tenant-level servers must be accessible only to that tenant
- User-level servers must be accessible only to owning user
- House-level servers accessible to all tenants (by design)

**Execution Isolation:**
- Swarm executions must only access tools available to their tenant
- Knowledge base searches must only return tenant's data
- Audit logs must be tenant-specific

**Testing:**
- Security testing must verify no cross-tenant data leakage
- Penetration testing must attempt to access other tenant data
- All tests must confirm complete isolation

---

### SEC-2: Authentication & Authorization

**Authentication:**
- All API requests must include valid JWT token
- Tokens must expire after configurable period (default 24 hours)
- Refresh tokens must be supported
- Token must include tenant ID and user ID claims

**Authorization:**
- Role-based access control must be enforced
- Roles: Platform Admin, Tenant Admin, User
- Platform Admins: Full access to all tenants
- Tenant Admins: Full access to their tenant only
- Users: Access to their own data and shared tenant data

**Permission Checks:**
- Every swarm execution must verify user has permission
- Every MCP server modification must verify admin role
- Every knowledge base modification must verify ownership
- Every API endpoint must validate authorization

---

### SEC-3: Credential Management

**Storage:**
- All credentials (API keys, passwords, tokens) must be encrypted at rest
- Encryption must use industry-standard algorithms (AES-256 minimum)
- Encryption keys must be managed separately from data
- Credentials must never be logged in plain text

**Transmission:**
- All API communications must use HTTPS/TLS
- TLS 1.2 minimum, TLS 1.3 preferred
- No sensitive data in URL parameters
- Credentials in request headers only

**Access:**
- Credentials only accessible to authorized processes
- UI must never display full credentials (show masked version only)
- Credential rotation must be supported
- Compromised credentials must be revocable immediately

---

### SEC-4: Audit Trail

**Logging Requirements:**
- All MCP tool invocations must be logged
- All swarm executions must be logged
- All admin actions must be logged
- All authentication events must be logged

**Log Contents:**
- Timestamp (with timezone)
- Actor (user or system)
- Action performed
- Resource affected
- Outcome (success or failure)
- IP address (for user actions)
- Request ID for tracing

**Log Retention:**
- Minimum 90 days retention
- Logs must be immutable (no editing or deletion)
- Logs must be queryable by administrators
- Logs must support export for compliance

**Sensitive Data:**
- PII must be redacted in logs
- Credentials must never be logged
- Payment information must not be logged
- User content should be minimized in logs

---

### SEC-5: Rate Limiting

**Purpose:** Prevent abuse and ensure fair resource allocation

**Limits:**

**Per Tenant:**
- Swarm executions: 100 per hour
- API requests: 10,000 per hour
- Knowledge base imports: 10 per hour
- MCP server health checks: 100 per hour

**Per User:**
- Swarm executions: 50 per hour
- Chat messages: 500 per hour
- Knowledge base searches: 1,000 per hour

**Enforcement:**
- Rate limits checked before processing request
- Exceeded limits return HTTP 429 error
- Error response includes retry-after header
- Limits reset every hour on the hour

**Exceptions:**
- Platform administrators exempt from rate limits
- Limits configurable per tenant for enterprise customers
- Temporary limit increases available on request

---

## User Scenarios

### SCENARIO-1: Health Club New Member Conversion

**Context:**
- Business: Peak Performance Training (HIIT gym, 850 members, 4 locations)
- User: Website visitor interested in trying gym
- Goal: Convert visitor to trial member within 10 minutes

**Flow:**

1. **Initial Contact**
   - Visitor lands on gym website
   - Rep Room chat widget appears
   - AI agent "Coach Rio" greets visitor
   - Visitor asks about gym membership

2. **Conversational Intake**
   - Coach Rio asks about fitness goals
   - Visitor mentions weight loss before wedding in 6 months
   - Coach Rio asks about experience level
   - Visitor says beginner with no trainer experience
   - Coach Rio asks about injuries
   - Visitor mentions occasional knee pain
   - Coach Rio asks about schedule preference
   - Visitor prefers evening workouts

3. **Swarm Execution (Background)**
   - Goal: "Convert website visitor to trial member"
   - Task 1 (Research): Check class availability for evening times
   - Task 2 (Analysis): Calculate weight loss timeline feasibility
   - Task 3 (Execution): Find appropriate class for beginners with knee issues
   - Task 4 (Execution): Assign gym buddy for first visit
   - Task 5 (Communication): Book trial class and send confirmation

4. **Recommendation**
   - Coach Rio recommends specific program based on goals
   - Explains 30 lbs in 6 months is realistic
   - Suggests "Foundations HIIT" class (beginner-friendly)
   - Mentions knee-friendly modifications available
   - Offers free trial session

5. **Conversion**
   - Visitor agrees to trial
   - Coach Rio books specific class time
   - Assigns experienced member as welcome buddy
   - Sends confirmation email with details
   - Sets up automated reminder sequence

**Success Criteria:**
- Total interaction time: <10 minutes
- Trial booked within conversation
- No human staff involvement required
- Visitor receives confirmation within 2 minutes
- Automated follow-up ensures visitor attends

**System Requirements Validated:**
- Multi-agent swarm coordination
- Knowledge base search (gym classes, trainer specialties)
- MCP tool invocation (gym management system, email)
- Autonomous reasoning (matching visitor needs to offerings)
- Zero human intervention

---

### SCENARIO-2: SAT Prep Automated Assessment

**Context:**
- Business: Elite Prep Academy (SAT/ACT prep, 400 students, 5 locations)
- User: Parent with daughter needing SAT prep
- Goal: Complete diagnostic assessment and present personalized plan in 90 minutes

**Flow:**

1. **Parent Inquiry**
   - Parent visits website worried about daughter's SAT
   - Dr. Parker (AI agent) greets them
   - Parent explains: daughter scored 1200, needs 1400, has 3 months

2. **Student Assessment**
   - Dr. Parker asks daughter about score breakdown
   - Student: Math 620, Reading 580
   - Dr. Parker identifies Reading as bigger opportunity
   - Dr. Parker asks about time management vs. accuracy
   - Student: always runs out of time
   - Dr. Parker sends link to 20-minute diagnostic test

3. **Swarm Execution (While Student Tests)**
   - Goal: "Analyze diagnostic test and create personalized SAT plan"
   - Task 1 (Research): Student completes adaptive assessment
   - Task 2 (Analysis): Identify specific weak areas from responses
   - Task 3 (Analysis): Compare to successful student profiles
   - Task 4 (Execution): Match optimal tutor based on weaknesses
   - Task 5 (Execution): Design 3-month program structure
   - Task 6 (Communication): Generate personalized recommendation

4. **Results Presentation**
   - Dr. Parker analyzes test in 2 minutes
   - Identifies 3 specific improvement areas:
     - Grammar rules (40% of possible improvement)
     - Time management strategies
     - Algebra review
   - Presents realistic projection: 1410-1450 in 3 months
   - Recommends specific tutor: Sarah Kim (specializes in Reading)
   - Shows program: 2x/week tutoring + practice tests

5. **Enrollment**
   - Parent agrees to program
   - Dr. Parker enrolls student immediately
   - Charges first payment installment
   - Schedules first session with Sarah
   - Sends welcome packet and login credentials
   - Sarah calls parent next day to introduce herself

**Success Criteria:**
- Total process time: 90 minutes (including 20-min test)
- Diagnostic analysis completed in <2 minutes
- Enrollment completed same session
- No human involvement until first tutoring session
- Personalized plan demonstrably tailored to student

**System Requirements Validated:**
- Multi-agent swarm with 6 parallel tasks
- Real-time analysis during student assessment
- Knowledge base search (tutor expertise, program structures)
- Multiple MCP tool invocations (assessment platform, payment, CRM)
- HITL for enrollment confirmation

---

### SCENARIO-3: Marketing Agency Client Onboarding

**Context:**
- Business: Growth Catalyst Agency (12 employees, 25 clients)
- User: New client (Artisan Bakery - organic bakery, 3 locations)
- Goal: Complete strategy creation in 4 hours vs. typical 3 weeks

**Flow:**

1. **Conversational Intake**
   - Agency sends onboarding link to new client
   - Alexis (AI agent) welcomes client
   - Asks about website, business goals, competitors, budget
   - Client provides: www.artisanbakery.com, increase online orders from 10/week to 50/week, $5K/month budget
   - Client mentions competitors: Easy Tiger, Manolis Bakery

2. **Swarm Execution**
   - Goal: "Create comprehensive digital marketing strategy for Artisan Bakery"
   - 9 tasks across 5 waves executing in parallel:

**Wave 1 (Parallel - No Dependencies):**
   - Task 1: Scrape and analyze competitor websites
   - Task 2: Research Austin organic food market trends
   - Task 3: Audit Artisan Bakery's current SEO
   - Task 4: Analyze current social media presence

**Wave 2 (Depends on Wave 1):**
   - Task 5: Research high-value keywords based on competitor data
   - Task 6: Design ad campaign strategy using keyword research

**Wave 3 (Depends on Wave 2):**
   - Task 7: Create content calendar using keyword insights
   - Task 8: Compile findings into 90-day roadmap

**Wave 4 (Depends on Wave 3):**
   - Task 9: Generate client presentation PDF

3. **Strategy Delivery**
   - System delivers 35-page strategy document including:
     - Competitor analysis (detailed breakdown of 2 competitors)
     - Market opportunity analysis with data
     - SEO audit with specific fixes
     - Google Ads and Meta Ads campaign mockups
     - 90-day implementation roadmap
     - Budget allocation breakdown
     - ROI projections: 160% return in 90 days

4. **Human Review**
   - Agency strategist reviews document (30 minutes)
   - Makes minor edits to tone/branding
   - Approves for client delivery
   - System sends to client

**Success Criteria:**
- Strategy creation time: 4 hours (vs. 40-60 hours manually)
- Quality: 95% of strategy requires no edits
- Client receives comprehensive, professional deliverable
- Agency team freed for high-value client interactions

**System Requirements Validated:**
- Complex 9-task swarm with 4 waves
- Wave-based parallel execution (4 tasks in Wave 1 simultaneously)
- Multiple MCP tool invocations (web scraping, SEO tools, competitor analysis)
- HITL for strategy approval before client delivery
- Significant time savings demonstrated

---

## Success Criteria

### SC-1: Onboarding Metrics

| Metric | Current Baseline | Target | Measurement Method |
|--------|-----------------|--------|-------------------|
| Onboarding completion rate | 40% | 85% | % of started onboardings that complete |
| Time to first value | 3 weeks | 30 minutes | Time from signup to first working agent |
| Business type detection accuracy | N/A | 90% | % correct on first attempt |
| Configuration accuracy | Manual (100%) | 90% | % of auto-configs requiring no edits |
| User satisfaction (NPS) | N/A | 50+ | Post-onboarding survey score |

---

### SC-2: Swarm Performance Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Task decomposition accuracy | 85% | % of decompositions executing successfully without errors |
| Swarm success rate | 90% | % of swarms completing without fatal errors |
| Average execution time | <5 min | For typical 5-task swarm |
| Parallel execution efficiency | 60%+ | Actual vs. theoretical speedup from parallelization |
| Average cost per swarm | <50 credits | Across all executions |
| Agent reasoning quality | 80%+ | % of agent decisions rated "good" or "excellent" by humans |

---

### SC-3: System Performance Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| API response time (p95) | <500ms | For status check endpoints |
| Swarm start latency | <2s | Time from submission to first task execution |
| Concurrent swarm capacity | 50+ | Without performance degradation |
| MCP tool invocation latency | <1s | Average across all tools (excluding tool execution) |
| Database query time (p95) | <100ms | For typical queries |
| Vector search time (p95) | <500ms | For knowledge base searches |
| System uptime | 99.9% | Monthly availability percentage |

---

### SC-4: Business Impact Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Tenant operational efficiency | 50%+ improvement | Time saved on automated tasks vs. manual |
| Tenant revenue impact | 25%+ increase | Measured across use cases (gym conversions, agency capacity, etc.) |
| Platform scalability | 10,000 tenants | Without major architectural changes |
| Cost per tenant | <$50/month | Infrastructure and LLM costs |
| Tenant retention (12-month) | 85%+ | % of tenants still active after 12 months |

---

## Conclusion

This requirements specification defines a comprehensive autonomous swarm orchestration system that will differentiate DreamCrew in the AI agent platform market.

**Key Innovations:**
1. **Zero-configuration onboarding** through conversational AI
2. **Autonomous agent reasoning** vs. scripted execution
3. **Multi-agent swarm coordination** with parallel execution
4. **Hierarchical MCP architecture** for flexible tool integration
5. **LLM provider agnosticism** for cost optimization and resilience

**Implementation Approach:**
- All implementation decisions left to development team
- Requirements are technology-agnostic where possible
- Integration with Mastra and CopilotKit specified for proven patterns
- Flexibility maintained for future enhancements

**Next Steps:**
1. Development team reviews requirements for feasibility
2. Technical design phase determines implementation approach
3. Iterative development following requirements priorities
4. Continuous validation against success criteria

---

**Document Status:** FINAL - Ready for Technical Design Phase

**Approval Required From:**
- Product Owner
- Engineering Lead
- Architecture Review Board

**Questions or Clarifications:**
Contact the product team for requirements interpretation or additional detail.

