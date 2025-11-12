# Marketing Agency Business Type Template

**Template ID:** `biz-type-marketing-agency`
**Version:** 1.0
**Category:** Professional Services > Marketing
**Target:** Digital marketing agencies, growth agencies, content agencies

---

## 1. BUSINESS TYPE DETECTION

### Detection Keywords
These trigger this template during conversational onboarding:

**Primary:**
- "marketing agency"
- "digital marketing"
- "growth agency"
- "advertising agency"
- "media agency"

**Secondary:**
- "manage campaigns for clients"
- "help businesses grow"
- "content marketing"
- "social media management"
- "PPC management"
- "SEO services"

**Exclusion keywords** (don't match if present):
- "looking to hire agency" (they're a client, not an agency)
- "need marketing help" (they're a prospect)

### Confidence Scoring
```
High confidence (90%+):
- "I run a digital marketing agency"
- "We're a growth agency that manages Google Ads"

Medium confidence (70-89%):
- "I help businesses with their marketing"
- "We do social media and content for clients"

Low confidence (50-69%):
- "I work in marketing"
- "We create content"
```

---

## 2. ONBOARDING QUESTIONS

### Conversational Flow
```
Agent: "Great! I'd love to learn more about your agency.
        What services do you focus on?"

Expected answers:
- PPC/Paid Ads (Google Ads, Meta Ads, LinkedIn Ads)
- SEO and Content Marketing
- Social Media Management
- Email Marketing
- Full-Service (all of the above)
- Specialized (e.g., "We only do TikTok for e-commerce brands")

Agent: "Perfect! How many clients do you typically work with at once?"

Expected answers:
- Small agency (1-5 clients)
- Growing agency (6-15 clients)
- Established agency (16-30 clients)
- Large agency (30+ clients)

Agent: "What does a typical client engagement look like?"

Expected answers:
- Monthly retainer
- Project-based
- Performance-based (commission)
- Hybrid

Agent: "What's your biggest time sink right now?"

Expected answers:
- Client reporting
- Content creation
- Campaign setup/management
- Client communication
- Prospecting/sales

Agent: "What tools are you currently using?"
(Open-ended - helps with integrations)

Expected tools mentioned:
- Google Ads, Meta Business Suite
- HubSpot, Salesforce
- Slack, email
- Google Analytics, dashboards
- WordPress, Webflow
```

---

## 3. AUTO-CONFIGURED MCP SERVERS

### House-Level (Platform-Provided - Available to All Tenants)
These are already connected, tenant just needs to authorize:

```json
{
  "houseMcpServers": [
    {
      "serverId": "house-web-research",
      "name": "Web Research & SEO Analysis",
      "description": "DataForSEO integration for keyword research, SERP analysis, competitor research",
      "tools": [
        "search_keywords",
        "analyze_serp",
        "competitor_analysis",
        "backlink_checker",
        "rank_tracking"
      ],
      "useCase": "Research for client campaigns, SEO audits, competitor analysis",
      "autoConnect": true
    },
    {
      "serverId": "house-real-time-search",
      "name": "Real-Time Web Search",
      "description": "Tavily integration for current information, news, trends",
      "tools": [
        "search_web",
        "extract_content",
        "summarize_webpage"
      ],
      "useCase": "Stay current with trends, research client industries",
      "autoConnect": true
    },
    {
      "serverId": "house-orchestration",
      "name": "Multi-Agent Orchestration",
      "description": "Swarm coordination for complex multi-step tasks",
      "tools": [
        "swarm_init",
        "agent_spawn",
        "task_orchestrate",
        "agent_status"
      ],
      "useCase": "Coordinate multiple agents for campaign creation, strategy development",
      "autoConnect": true
    }
  ]
}
```

### Tenant-Level (Recommended for Agencies)
These are suggested during setup with 1-click authorization:

```json
{
  "recommendedMcpServers": [
    {
      "serverId": "tenant-google-ads",
      "name": "Google Ads API",
      "description": "Automate campaign creation, optimization, reporting",
      "tools": [
        "create_campaign",
        "update_keywords",
        "get_performance_report",
        "manage_ad_groups",
        "budget_optimization"
      ],
      "priority": "high",
      "setupDifficulty": "medium",
      "autoConnect": "prompt_user",
      "authType": "oauth",
      "reasoning": "You mentioned Google Ads - this will save hours on campaign management"
    },
    {
      "serverId": "tenant-meta-ads",
      "name": "Meta Ads API",
      "description": "Facebook & Instagram campaign automation",
      "tools": [
        "create_ad_set",
        "manage_audiences",
        "creative_testing",
        "performance_insights"
      ],
      "priority": "high",
      "setupDifficulty": "medium",
      "autoConnect": "prompt_user",
      "authType": "oauth"
    },
    {
      "serverId": "tenant-slack",
      "name": "Slack Integration",
      "description": "Send notifications, updates, approvals via Slack",
      "tools": [
        "send_message",
        "post_to_channel",
        "create_thread",
        "schedule_message"
      ],
      "priority": "high",
      "setupDifficulty": "easy",
      "autoConnect": "prompt_user",
      "authType": "oauth",
      "reasoning": "You mentioned Slack - we'll notify you when tasks need approval"
    },
    {
      "serverId": "tenant-gmail",
      "name": "Gmail/Google Workspace",
      "description": "Send client reports, draft emails, schedule follow-ups",
      "tools": [
        "send_email",
        "create_draft",
        "search_emails",
        "send_with_attachment"
      ],
      "priority": "medium",
      "setupDifficulty": "easy",
      "autoConnect": "prompt_user",
      "authType": "oauth"
    },
    {
      "serverId": "tenant-hubspot",
      "name": "HubSpot CRM",
      "description": "Client management, pipeline tracking, automated outreach",
      "tools": [
        "create_contact",
        "update_deal",
        "log_activity",
        "get_pipeline"
      ],
      "priority": "medium",
      "setupDifficulty": "medium",
      "autoConnect": "if_mentioned",
      "authType": "api_key",
      "detectKeywords": ["hubspot", "crm", "pipeline"]
    },
    {
      "serverId": "tenant-wordpress",
      "name": "WordPress",
      "description": "Publish blog content for clients automatically",
      "tools": [
        "create_post",
        "update_post",
        "upload_media",
        "schedule_post"
      ],
      "priority": "low",
      "setupDifficulty": "medium",
      "autoConnect": "if_mentioned",
      "authType": "api_key"
    }
  ]
}
```

---

## 4. KNOWLEDGE BASE SCHEMA

### Auto-Created Categories
The system automatically creates these knowledge base categories for agencies:

```json
{
  "knowledgeBaseSchema": [
    {
      "category": "agency_info",
      "label": "Agency Profile",
      "description": "Core information about your agency",
      "requiredFields": [
        {
          "field": "agency_name",
          "type": "text",
          "prompt": "What's your agency name?"
        },
        {
          "field": "services_offered",
          "type": "tags",
          "prompt": "Which services do you offer?",
          "options": ["Google Ads", "Meta Ads", "SEO", "Content", "Social Media", "Email", "Analytics"]
        },
        {
          "field": "unique_value_prop",
          "type": "text",
          "prompt": "What makes your agency different?",
          "example": "We specialize in D2C e-commerce brands with $1M-$10M revenue"
        },
        {
          "field": "typical_results",
          "type": "text",
          "prompt": "What results do you typically achieve for clients?",
          "example": "Average 3.2x ROAS on Google Ads, 40% reduction in CAC"
        }
      ],
      "icon": "🏢",
      "displayOrder": 1
    },
    {
      "category": "client_profiles",
      "label": "Client Information",
      "description": "Details about your clients (private to tenant)",
      "structure": {
        "client_name": "text",
        "industry": "select",
        "monthly_spend": "number",
        "services": "tags",
        "goals": "text",
        "brand_voice": "text",
        "competitors": "list",
        "target_audience": "text",
        "previous_performance": "text"
      },
      "icon": "👥",
      "displayOrder": 2,
      "note": "Add clients as you onboard them - AI will use this for personalization"
    },
    {
      "category": "case_studies",
      "label": "Case Studies & Results",
      "description": "Success stories to reference in proposals and content",
      "structure": {
        "client_name_or_anonymous": "text",
        "challenge": "text",
        "solution": "text",
        "results": "text",
        "metrics": "structured",
        "testimonial": "text",
        "before_after_data": "file_upload"
      },
      "icon": "📊",
      "displayOrder": 3
    },
    {
      "category": "templates",
      "label": "Campaign Templates",
      "description": "Reusable campaign structures, ad copy, strategies",
      "structure": {
        "template_name": "text",
        "template_type": "select",
        "use_case": "text",
        "content": "text",
        "performance_notes": "text"
      },
      "icon": "📋",
      "displayOrder": 4
    },
    {
      "category": "processes",
      "label": "Agency Processes",
      "description": "Your SOPs, workflows, reporting formats",
      "structure": {
        "process_name": "text",
        "when_to_use": "text",
        "steps": "list",
        "responsible_party": "text",
        "tools_needed": "tags"
      },
      "icon": "⚙️",
      "displayOrder": 5
    }
  ]
}
```

---

## 5. AGENT TEMPLATES

### Pre-Configured Specialized Agents
These agents are available immediately after setup:

```json
{
  "agentTemplates": [
    {
      "agentId": "campaign-strategist",
      "name": "Campaign Strategist",
      "role": "Plan and design advertising campaigns",
      "specialization": "Google Ads, Meta Ads, campaign architecture",
      "defaultInstructions": "You are a campaign strategist for {agency_name}. Analyze client goals, research competitors, and design high-performing campaign structures. Use keyword research tools, analyze SERP data, and reference {agency_name}'s previous successful campaigns from the knowledge base.",
      "recommendedTools": [
        "search_keywords",
        "competitor_analysis",
        "task_orchestrate"
      ],
      "usedFor": [
        "New campaign planning",
        "Campaign audits",
        "Competitor research",
        "Keyword strategy"
      ],
      "icon": "🎯"
    },
    {
      "agentId": "content-creator",
      "name": "Content Creator",
      "role": "Write ad copy, blog posts, social content",
      "specialization": "Copywriting, brand voice matching, SEO content",
      "defaultInstructions": "You are a content creator for {agency_name}. Write compelling copy that matches the client's brand voice (found in knowledge base). Reference successful ad copy templates and case studies. Always optimize for the target platform (Google Ads character limits, Meta best practices, etc.).",
      "recommendedTools": [
        "search_web",
        "memory_search"
      ],
      "usedFor": [
        "Ad copywriting",
        "Blog post creation",
        "Social media content",
        "Email campaigns"
      ],
      "icon": "✍️"
    },
    {
      "agentId": "campaign-executor",
      "name": "Campaign Executor",
      "role": "Build and launch campaigns in ad platforms",
      "specialization": "Google Ads API, Meta Ads API, technical implementation",
      "defaultInstructions": "You are a campaign executor for {agency_name}. Take approved campaign plans and implement them in ad platforms using API tools. Follow {agency_name}'s campaign structure templates. Always request human approval before spending budget.",
      "recommendedTools": [
        "create_campaign",
        "create_ad_set",
        "manage_keywords"
      ],
      "usedFor": [
        "Campaign setup",
        "Ad group creation",
        "Budget allocation",
        "Launch execution"
      ],
      "requiresApproval": true,
      "icon": "🚀"
    },
    {
      "agentId": "performance-analyst",
      "name": "Performance Analyst",
      "role": "Analyze campaign data and generate insights",
      "specialization": "Data analysis, reporting, optimization recommendations",
      "defaultInstructions": "You are a performance analyst for {agency_name}. Pull campaign performance data, identify trends, and provide actionable optimization recommendations. Compare to client goals and industry benchmarks. Generate clear, visual reports.",
      "recommendedTools": [
        "get_performance_report",
        "performance_insights"
      ],
      "usedFor": [
        "Performance reporting",
        "Optimization recommendations",
        "A/B test analysis",
        "Client dashboards"
      ],
      "icon": "📈"
    },
    {
      "agentId": "client-communicator",
      "name": "Client Communicator",
      "role": "Draft client emails, reports, proposals",
      "specialization": "Professional communication, relationship management",
      "defaultInstructions": "You are a client communicator for {agency_name}. Draft professional, friendly emails to clients. Reference specific campaign data, results, and next steps. Match {agency_name}'s communication style. Always ask for approval before sending.",
      "recommendedTools": [
        "send_email",
        "create_draft",
        "send_message"
      ],
      "usedFor": [
        "Client updates",
        "Performance reports",
        "Proposal drafting",
        "Meeting follow-ups"
      ],
      "requiresApproval": true,
      "icon": "💬"
    },
    {
      "agentId": "researcher",
      "name": "Market Researcher",
      "role": "Industry research, trend analysis, competitive intelligence",
      "specialization": "Web research, data gathering, market analysis",
      "defaultInstructions": "You are a market researcher for {agency_name}. Research client industries, competitors, trends, and opportunities. Use real-time web search and SEO analysis tools. Provide cited, actionable insights.",
      "recommendedTools": [
        "search_web",
        "competitor_analysis",
        "extract_content"
      ],
      "usedFor": [
        "Competitor research",
        "Industry trend analysis",
        "Client onboarding research",
        "Opportunity identification"
      ],
      "icon": "🔍"
    }
  ]
}
```

---

## 6. TYPICAL WORKFLOWS

### Auto-Generated Workflow Templates
The system creates these common workflows that agencies can execute with one prompt:

```json
{
  "workflows": [
    {
      "workflowId": "new-client-onboarding",
      "name": "New Client Onboarding",
      "description": "Complete onboarding workflow for new clients",
      "estimatedTime": "45 minutes",
      "userInput": {
        "client_name": "text",
        "website": "url",
        "industry": "select",
        "budget": "number",
        "goals": "text"
      },
      "swarmTasks": [
        {
          "task": "Research client's industry, competitors, and market position",
          "agent": "researcher",
          "tools": ["search_web", "competitor_analysis"],
          "output": "industry_research_report"
        },
        {
          "task": "Analyze client's current digital presence and identify opportunities",
          "agent": "campaign-strategist",
          "tools": ["search_keywords", "analyze_serp"],
          "output": "opportunity_analysis"
        },
        {
          "task": "Create client profile in knowledge base",
          "agent": "coordinator",
          "tools": ["memory_store"],
          "output": "client_profile_created"
        },
        {
          "task": "Draft onboarding email with next steps",
          "agent": "client-communicator",
          "tools": ["create_draft"],
          "output": "onboarding_email_draft",
          "requiresApproval": true
        }
      ],
      "finalDeliverable": "Client is onboarded with research, profile created, and welcome email ready to send",
      "icon": "🎉"
    },
    {
      "workflowId": "google-ads-campaign-creation",
      "name": "Complete Google Ads Campaign",
      "description": "End-to-end campaign creation from strategy to launch",
      "estimatedTime": "90 minutes",
      "userInput": {
        "client_name": "select_from_kb",
        "campaign_goal": "text",
        "monthly_budget": "number",
        "target_audience": "text"
      },
      "swarmTasks": [
        {
          "task": "Research keywords and analyze competition",
          "agent": "campaign-strategist",
          "tools": ["search_keywords", "competitor_analysis"],
          "wave": 1
        },
        {
          "task": "Design campaign structure (campaigns, ad groups, targeting)",
          "agent": "campaign-strategist",
          "tools": ["memory_search"],
          "wave": 1
        },
        {
          "task": "Write ad copy (5+ variations per ad group)",
          "agent": "content-creator",
          "tools": ["memory_search"],
          "wave": 2,
          "dependsOn": ["task-1", "task-2"]
        },
        {
          "task": "Review and approve campaign plan",
          "agent": "human",
          "wave": 3,
          "requiresApproval": true,
          "approvalType": "detailed_review"
        },
        {
          "task": "Build campaign in Google Ads",
          "agent": "campaign-executor",
          "tools": ["create_campaign", "manage_keywords"],
          "wave": 4,
          "dependsOn": ["task-4-approved"]
        },
        {
          "task": "Send confirmation email to client",
          "agent": "client-communicator",
          "tools": ["send_email"],
          "wave": 5,
          "requiresApproval": true
        }
      ],
      "finalDeliverable": "Live Google Ads campaign with confirmed budget, targeting, and ad copy",
      "icon": "🚀"
    },
    {
      "workflowId": "monthly-client-report",
      "name": "Monthly Performance Report",
      "description": "Comprehensive performance analysis and client report",
      "estimatedTime": "30 minutes",
      "userInput": {
        "client_name": "select_from_kb",
        "reporting_period": "date_range"
      },
      "swarmTasks": [
        {
          "task": "Pull performance data from all platforms",
          "agent": "performance-analyst",
          "tools": ["get_performance_report", "performance_insights"],
          "wave": 1
        },
        {
          "task": "Analyze data, identify trends and opportunities",
          "agent": "performance-analyst",
          "tools": ["memory_search"],
          "wave": 2
        },
        {
          "task": "Create optimization recommendations",
          "agent": "campaign-strategist",
          "tools": ["competitor_analysis"],
          "wave": 2
        },
        {
          "task": "Generate client-friendly report with insights",
          "agent": "client-communicator",
          "tools": [],
          "wave": 3
        },
        {
          "task": "Draft email to client with report",
          "agent": "client-communicator",
          "tools": ["create_draft"],
          "wave": 3,
          "requiresApproval": true
        }
      ],
      "finalDeliverable": "Comprehensive performance report with data, insights, and next steps",
      "icon": "📊"
    },
    {
      "workflowId": "content-calendar-creation",
      "name": "30-Day Content Calendar",
      "description": "Research-based content calendar for blog or social media",
      "estimatedTime": "60 minutes",
      "userInput": {
        "client_name": "select_from_kb",
        "content_type": "select",
        "platform": "select",
        "posts_per_week": "number"
      },
      "swarmTasks": [
        {
          "task": "Research trending topics in client's industry",
          "agent": "researcher",
          "tools": ["search_web"],
          "wave": 1
        },
        {
          "task": "Identify keyword opportunities",
          "agent": "campaign-strategist",
          "tools": ["search_keywords"],
          "wave": 1
        },
        {
          "task": "Create 30-day content calendar with topics and angles",
          "agent": "content-creator",
          "tools": ["memory_search"],
          "wave": 2
        },
        {
          "task": "Write content for first week (4 posts)",
          "agent": "content-creator",
          "tools": [],
          "wave": 3
        }
      ],
      "finalDeliverable": "30-day content calendar + 4 ready-to-publish posts",
      "icon": "📅"
    },
    {
      "workflowId": "campaign-optimization",
      "name": "Campaign Optimization Sprint",
      "description": "Analyze underperforming campaigns and implement improvements",
      "estimatedTime": "45 minutes",
      "userInput": {
        "client_name": "select_from_kb",
        "campaign_to_optimize": "text"
      },
      "swarmTasks": [
        {
          "task": "Pull current performance data",
          "agent": "performance-analyst",
          "tools": ["get_performance_report"],
          "wave": 1
        },
        {
          "task": "Identify underperforming keywords, ads, audiences",
          "agent": "performance-analyst",
          "tools": [],
          "wave": 2
        },
        {
          "task": "Research new keyword opportunities",
          "agent": "campaign-strategist",
          "tools": ["search_keywords", "competitor_analysis"],
          "wave": 2
        },
        {
          "task": "Write new ad variations",
          "agent": "content-creator",
          "tools": [],
          "wave": 3
        },
        {
          "task": "Review optimization plan",
          "agent": "human",
          "wave": 4,
          "requiresApproval": true
        },
        {
          "task": "Implement optimizations in platform",
          "agent": "campaign-executor",
          "tools": ["update_keywords", "create_ad_set"],
          "wave": 5
        }
      ],
      "finalDeliverable": "Optimized campaign with improved targeting, new ads, updated keywords",
      "icon": "🔧"
    }
  ]
}
```

---

## 7. EXAMPLE USER EXPERIENCE

### Day 1: Onboarding

**User:** "I run a digital marketing agency focused on Google Ads and Meta Ads for e-commerce brands."

**System:**
1. ✅ Detects: `marketing-agency` template (95% confidence)
2. 🔄 Loads agency template configuration
3. 💬 Asks 5 conversational questions (5-7 minutes)
4. 🏗️ Auto-creates:
   - Knowledge base categories (agency_info, client_profiles, case_studies, templates, processes)
   - 6 specialized agents (Campaign Strategist, Content Creator, Performance Analyst, etc.)
   - 5 common workflows (New Client Onboarding, Google Ads Campaign, Monthly Report, etc.)
5. 🔌 Suggests MCP integrations:
   - ✅ Auto-connected: Web Research, SEO Analysis, Orchestration
   - 🔗 Prompts to connect: Google Ads API, Meta Ads API, Slack, Gmail
6. 📝 Prompts to add first knowledge:
   - "Tell me about a successful campaign you've run"
   - "Upload your agency's service offerings or case study"

**Time to value:** 20 minutes from signup to first working agent

---

### Day 2: First Real Task

**User:** "Create a complete Google Ads campaign for my client FitLife Supplements. Budget is $3,000/month. Goal is to drive supplement sales."

**System:**
1. 🎯 Recognizes: `google-ads-campaign-creation` workflow
2. 🤖 Spawns swarm:
   - **Wave 1 (parallel):**
     - Campaign Strategist → keyword research (finds 67 keywords)
     - Campaign Strategist → competitor analysis (analyzes 5 competitors)
     - Researcher → industry trends (supplement market, regulations)
   - **Wave 2:**
     - Content Creator → writes 15 ad variations
   - **Wave 3:**
     - Human approval requested → shows full campaign plan
   - **Wave 4 (after approval):**
     - Campaign Executor → builds campaign in Google Ads
   - **Wave 5:**
     - Client Communicator → drafts email to FitLife

**Time:** 90 minutes (vs. 4-6 hours manually)

**Result:**
- Live Google Ads campaign
- 67 keywords organized in 8 ad groups
- 15 ad variations
- Draft email to client ready to send

---

### Week 2: Monthly Reporting

**User:** "Create monthly reports for all clients"

**System:**
1. 📋 Finds 5 clients in knowledge base
2. 🔄 Spawns 5 parallel swarms (one per client)
3. Each swarm:
   - Pulls performance data from Google Ads & Meta Ads
   - Analyzes trends, calculates ROI
   - Compares to previous month
   - Generates optimization recommendations
   - Creates client-friendly report
   - Drafts email

**Time:** 45 minutes for 5 clients (vs. 2-3 hours each = 10-15 hours manually)

---

## 8. CONFIGURATION FILE FORMAT

Here's how this template would be stored in the database:

```json
{
  "templateId": "biz-type-marketing-agency",
  "version": "1.0",
  "metadata": {
    "name": "Marketing Agency",
    "category": "professional_services",
    "subcategory": "marketing",
    "icon": "📣",
    "description": "Digital marketing agencies, growth agencies, advertising agencies",
    "popularity": 8,
    "estimatedSetupTime": 20,
    "activeInstalls": 1247
  },
  "detection": {
    "keywords": {
      "primary": ["marketing agency", "digital marketing", "growth agency", "advertising agency"],
      "secondary": ["manage campaigns", "help businesses grow", "content marketing"],
      "exclusion": ["looking to hire agency", "need marketing help"]
    },
    "confidenceThresholds": {
      "high": 0.90,
      "medium": 0.70,
      "low": 0.50
    }
  },
  "onboarding": {
    "conversationalQuestions": [
      {
        "id": "services",
        "question": "What services do you focus on?",
        "type": "multi_select",
        "options": ["Google Ads", "Meta Ads", "SEO", "Content", "Social Media", "Email"],
        "required": true,
        "usedFor": "determining_mcp_recommendations"
      },
      {
        "id": "client_count",
        "question": "How many clients do you typically work with at once?",
        "type": "select",
        "options": ["1-5 clients", "6-15 clients", "16-30 clients", "30+ clients"],
        "required": false,
        "usedFor": "complexity_estimation"
      },
      {
        "id": "engagement_model",
        "question": "What does a typical client engagement look like?",
        "type": "select",
        "options": ["Monthly retainer", "Project-based", "Performance-based", "Hybrid"],
        "required": false
      },
      {
        "id": "pain_point",
        "question": "What's your biggest time sink right now?",
        "type": "select",
        "options": ["Client reporting", "Content creation", "Campaign setup", "Client communication", "Prospecting"],
        "required": true,
        "usedFor": "workflow_prioritization"
      },
      {
        "id": "current_tools",
        "question": "What tools are you currently using?",
        "type": "free_text",
        "required": false,
        "usedFor": "integration_detection"
      }
    ]
  },
  "mcpServers": {
    "house": [
      "house-web-research",
      "house-real-time-search",
      "house-orchestration"
    ],
    "tenantRecommendations": [
      {
        "serverId": "tenant-google-ads",
        "priority": "high",
        "autoConnect": "prompt_user",
        "conditionalOn": ["services.includes('Google Ads')"]
      },
      {
        "serverId": "tenant-meta-ads",
        "priority": "high",
        "autoConnect": "prompt_user",
        "conditionalOn": ["services.includes('Meta Ads')"]
      },
      {
        "serverId": "tenant-slack",
        "priority": "high",
        "autoConnect": "prompt_user"
      }
    ]
  },
  "knowledgeBase": {
    "categories": [
      "agency_info",
      "client_profiles",
      "case_studies",
      "templates",
      "processes"
    ],
    "initialPrompts": [
      "Tell me about a successful campaign you've run",
      "What makes your agency unique?",
      "Upload your service offerings or case study"
    ]
  },
  "agents": [
    "campaign-strategist",
    "content-creator",
    "campaign-executor",
    "performance-analyst",
    "client-communicator",
    "researcher"
  ],
  "workflows": [
    "new-client-onboarding",
    "google-ads-campaign-creation",
    "monthly-client-report",
    "content-calendar-creation",
    "campaign-optimization"
  ],
  "successMetrics": {
    "timeToFirstValue": "< 20 minutes",
    "typicalTimeSavings": "70% reduction in campaign creation time",
    "adoptionRate": 0.92,
    "nps": 73
  }
}
```

---

## 9. OTHER BUSINESS TYPE TEMPLATES

For comparison, here are 5 other templates:

### 1. Health Club / Gym
- **Detection:** "gym", "fitness center", "health club", "personal training"
- **Agents:** Member Engagement, Trial Converter, Class Scheduler, Retention Specialist
- **Workflows:** New Member Onboarding, Trial Follow-up, Re-engagement Campaign, Class Promotion
- **MCP Servers:** SMS (for reminders), Scheduling API, Payment Processing, Email
- **Knowledge:** Class schedules, trainer bios, membership tiers, testimonials

### 2. SAT/Test Prep School
- **Detection:** "test prep", "SAT tutoring", "ACT prep", "college admissions"
- **Agents:** Assessment Analyzer, Study Plan Creator, Progress Tracker, Parent Communicator
- **Workflows:** Student Assessment, Personalized Study Plan, Progress Report, College Application Support
- **MCP Servers:** Student Portal API, Parent Communication, Scheduling, Payment
- **Knowledge:** Curriculum, practice tests, tutor expertise, college admission stats

### 3. Restaurant
- **Detection:** "restaurant", "café", "bistro", "eatery"
- **Agents:** Reservation Manager, Social Media Poster, Menu Copywriter, Review Responder
- **Workflows:** Daily Specials Promotion, Reservation Management, Review Response, Event Planning
- **MCP Servers:** Reservation system, Instagram, Google My Business, Yelp API
- **Knowledge:** Menu items, chef bio, location, photos, reviews

### 4. Real Estate Agent
- **Detection:** "real estate agent", "realtor", "property sales"
- **Agents:** Listing Writer, Lead Qualifier, Market Analyst, Client Communicator
- **Workflows:** New Listing Creation, Lead Nurture, Market Report, Open House Promotion
- **MCP Servers:** MLS integration, CRM, Email, SMS, Social Media
- **Knowledge:** Listings, market data, neighborhoods, testimonials

### 5. E-commerce Store
- **Detection:** "online store", "e-commerce", "shopify store", "sell products online"
- **Agents:** Product Describer, Customer Support, Inventory Analyst, Marketing Campaigner
- **Workflows:** Product Launch, Abandoned Cart Recovery, Customer Support Ticket, Seasonal Campaign
- **MCP Servers:** Shopify API, Email Marketing, Customer Support, Analytics
- **Knowledge:** Product catalog, brand voice, FAQs, return policy

---

## 10. TEMPLATE CUSTOMIZATION

### After Auto-Configuration, User Can:

1. **Edit Agent Instructions**
   - "Make the Content Creator more casual"
   - "Campaign Strategist should focus on ROAS, not clicks"

2. **Add Custom Agents**
   - "Create a 'TikTok Specialist' agent that only handles TikTok campaigns"

3. **Modify Workflows**
   - "Add a step to the Google Ads workflow that runs A/B tests automatically"
   - "Remove client approval from monthly reports"

4. **Add Custom Knowledge Categories**
   - "Create a category for 'Pricing Tiers' with our agency packages"

5. **Create Custom Workflows**
   - "Create a workflow called 'Quarterly Business Review' that..."

---

## SUMMARY

A **Marketing Agency template** provides:
- ✅ **Instant setup** (20 minutes vs. days of configuration)
- ✅ **6 specialized agents** ready to work
- ✅ **5 common workflows** (campaign creation, reporting, optimization)
- ✅ **Intelligent MCP recommendations** (Google Ads, Slack, Gmail based on user's answers)
- ✅ **Structured knowledge base** (clients, case studies, templates)
- ✅ **Real-world time savings** (70% faster campaign creation, 90% faster reporting)

The template is **fully customizable** after setup, but provides immediate value out-of-the-box.

Would you like me to:
1. Create templates for other business types (gym, test prep, restaurant)?
2. Show how the conversational onboarding dialogue actually works?
3. Detail how the system *detects* which template to use from natural language?
