# DreamCrew Multi-Agent MCP Platform - UI/UX Design Mockups

**Document Version:** 1.0
**Date:** November 6, 2025
**Purpose:** Complete UI/UX specifications for conversational HITL and multi-agent orchestration

---

## TABLE OF CONTENTS

1. [Design Philosophy](#design-philosophy)
2. [Rep Room with Swarm Progress](#rep-room-with-swarm-progress)
3. [Conversational HITL Flow](#conversational-hitl-flow)
4. [Swarm Execution Dashboard](#swarm-execution-dashboard)
5. [MCP Server Management](#mcp-server-management)
6. [Knowledge Base Management](#knowledge-base-management)
7. [Collaboration History](#collaboration-history)
8. [Mobile Experience](#mobile-experience)
9. [Component Library](#component-library)

---

## DESIGN PHILOSOPHY

### Core Principles

1. **Conversation-First**: No forms unless absolutely necessary
2. **Real-Time Transparency**: Show what agents are doing
3. **Minimal Interruption**: Only ask for input when truly needed
4. **Trust Through Visibility**: Users see the reasoning
5. **Contextual Actions**: Actions appear based on state

### Visual Language

- **Colors**:
  - Primary: `#2563eb` (Blue - Agent actions)
  - Success: `#10b981` (Green - Completed)
  - Warning: `#f59e0b` (Amber - Needs attention)
  - Error: `#ef4444` (Red - Failed)
  - Neutral: `#6b7280` (Gray - Inactive)

- **Typography**:
  - Headers: `Inter Bold, 18-24px`
  - Body: `Inter Regular, 14-16px`
  - Code/Technical: `Fira Code, 13px`

- **Spacing**:
  - Base unit: `4px`
  - Standard gap: `16px`
  - Section spacing: `32px`

---

## REP ROOM WITH SWARM PROGRESS

### Overview
Rep room shows real-time progress of parallel agents working on user's goal.

### Desktop Layout (1920x1080)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ☰  Kitchen Pro AI Assistant              [👤 John]  [⚙️]  [🔔 2]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────┐  ┌─────────────────────────────────┐  │
│  │                        │  │  🤖 Working on your request...  │  │
│  │                        │  │                                  │  │
│  │                        │  │  Goal: Launch Google Ads        │  │
│  │    [Agent Avatar]      │  │        campaign                 │  │
│  │                        │  │                                  │  │
│  │     Sarah              │  │  Progress: 3 of 5 tasks done    │  │
│  │  Kitchen Pro Assistant │  │  Estimated: 1 min remaining     │  │
│  │                        │  │                                  │  │
│  └────────────────────────┘  │  ┌────────────────────────────┐ │  │
│                              │  │ ✅ Research keywords       │ │  │
│                              │  │    Found 47 relevant       │ │  │
│  ┌──────────────────────┐   │  │    keywords • 12s          │ │  │
│  │  🎤  💬  📋          │   │  ├────────────────────────────┤ │  │
│  └──────────────────────┘   │  │ ✅ Analyze competitors     │ │  │
│                              │  │    Analyzed 8 competitors  │ │  │
│  Chat       Voice    Tasks   │  │    • 18s                   │ │  │
│                              │  ├────────────────────────────┤ │  │
│                              │  │ ✅ Get company info        │ │  │
│                              │  │    Retrieved from KB • 3s  │ │  │
│                              │  ├────────────────────────────┤ │  │
│                              │  │ 🔵 Drafting ad copy...     │ │  │
│                              │  │    Using results above     │ │  │
│                              │  ├────────────────────────────┤ │  │
│                              │  │ ⏸️  Create campaign        │ │  │
│                              │  │    Waiting for approval    │ │  │
│                              │  └────────────────────────────┘ │  │
│                              │                                  │  │
│                              │  [View Detailed Plan →]          │  │
│                              └─────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 💬 CONVERSATION                                             │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │                                                             │  │
│  │  You: Help me launch a Google Ads campaign                 │  │
│  │  10:23 AM                                                   │  │
│  │                                                             │  │
│  │  🤖 Sarah: I'll help you with that! Let me gather some     │  │
│  │  information first.                                         │  │
│  │  10:23 AM                                                   │  │
│  │                                                             │  │
│  │  [3 agents started working in parallel]                    │  │
│  │                                                             │  │
│  │  🤖 Sarah: I've researched keywords and analyzed your      │  │
│  │  competitors. I found 47 relevant keywords and analyzed    │  │
│  │  8 competitors' campaigns.                                 │  │
│  │  10:23 AM                                                   │  │
│  │                                                             │  │
│  │  🤖 Sarah: I've drafted 3 ad variations for you:          │  │
│  │  10:24 AM                                                   │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ 📋 Ad Variation 1: Professional Tone                │  │  │
│  │  │                                                       │  │  │
│  │  │ "Kitchen Remodeling Experts | Free Consultation"     │  │  │
│  │  │ Transform your kitchen with our 20+ years experience │  │  │
│  │  │ Professional design & installation. Licensed & ins... │  │  │
│  │  │                                                       │  │  │
│  │  │ [Select This]                                         │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ 📋 Ad Variation 2: Casual & Friendly                │  │  │
│  │  │                                                       │  │  │
│  │  │ "Dream Kitchen? We Got You! 🏠"                      │  │  │
│  │  │ Custom kitchens that fit your style AND budget.      │  │  │
│  │  │ Free design consultation - let's make it happen!     │  │  │
│  │  │                                                       │  │  │
│  │  │ [Select This]                                         │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ 📋 Ad Variation 3: Value-Focused                    │  │  │
│  │  │                                                       │  │  │
│  │  │ "Quality Kitchens, Affordable Prices"                │  │  │
│  │  │ Save 20% this month on complete kitchen remodels.    │  │  │
│  │  │ Financing available. Get your free quote today!      │  │  │
│  │  │                                                       │  │  │
│  │  │ [Select This]                                         │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                             │  │
│  │  [💡 I have a different idea]  [❌ None of these work]    │  │
│  │                                                             │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Type your message...                          [Send] [🎤]  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Swarm Progress Panel** (Top Right)
   - Shows real-time agent progress
   - Color-coded status (✅ done, 🔵 working, ⏸️ waiting)
   - Time taken per task
   - Expandable for detailed view

2. **Conversational HITL** (Bottom)
   - Natural language interaction
   - Options presented as cards
   - Quick action buttons
   - Fallback: "I have a different idea" → text input

3. **Context Awareness**
   - Progress panel only shows when agents are working
   - Automatically scrolls conversation
   - Real-time updates via WebSocket

---

## CONVERSATIONAL HITL FLOW

### Scenario: Agent Needs Approval

#### State 1: Agent Asks Question

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 CONVERSATION                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🤖 Sarah: I'm ready to create your Google Ads campaign    │
│  with the following details:                                │
│  10:25 AM                                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ 📊 Campaign Summary                                  │  │
│  │                                                       │  │
│  │ • Name: Kitchen Remodeling - November                │  │
│  │ • Budget: $50/day ($1,500/month)                     │  │
│  │ • Keywords: 47 keywords (avg. CPC: $3.20)           │  │
│  │ • Target: Los Angeles, 25-mile radius                │  │
│  │ • Ad Copy: Variation #2 (Casual & Friendly)          │  │
│  │ • Estimated Impressions: 15,000-20,000/month         │  │
│  │                                                       │  │
│  │ [View Full Details ↓]                                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  🤖 Should I go ahead and create this campaign?            │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ ✅ Yes, do it│  │ 🔧 Modify    │  │ ❌ Cancel      │ │
│  └──────────────┘  └──────────────┘  └─────────────────┘ │
│                                                             │
│  💡 Quick tip: You can pause or stop the campaign anytime  │
│     from your Google Ads dashboard.                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### State 2: User Clicks "Modify"

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 CONVERSATION                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  You: [Clicked "Modify"]                                    │
│  10:25 AM                                                   │
│                                                             │
│  🤖 Sarah: Sure! What would you like to change?            │
│  10:25 AM                                                   │
│                                                             │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐ │
│  │ 💰 Budget      │  │ 📍 Targeting   │  │ 📝 Ad Copy   │ │
│  └────────────────┘  └────────────────┘  └──────────────┘ │
│                                                             │
│  ┌────────────────┐  ┌────────────────┐                   │
│  │ 🔑 Keywords    │  │ 💬 Something   │                   │
│  │                │  │    else...     │                   │
│  └────────────────┘  └────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### State 3: User Selects "Budget"

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 CONVERSATION                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  You: [Selected "Budget"]                                   │
│  10:25 AM                                                   │
│                                                             │
│  🤖 Sarah: Got it. The current budget is $50/day. What     │
│  would you like to change it to?                            │
│  10:25 AM                                                   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 💰 Quick Options                                    │   │
│  │                                                      │   │
│  │  [$25/day]  [$35/day]  [$75/day]  [$100/day]       │   │
│  │                                                      │   │
│  │  Or type a custom amount:                           │   │
│  │  ┌──────────────────────────┐                       │   │
│  │  │ $ ____ / day             │                       │   │
│  │  └──────────────────────────┘                       │   │
│  │                              [Update Budget]        │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### State 4: User Types Custom Value

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 CONVERSATION                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  You: Actually, let's start with $30/day and see how it    │
│  performs. I can always increase it later.                  │
│  10:26 AM                                                   │
│                                                             │
│  🤖 Sarah: Smart approach! I've updated the budget to      │
│  $30/day ($900/month).                                      │
│  10:26 AM                                                   │
│                                                             │
│  With this budget, here's what to expect:                   │
│  • Estimated impressions: 9,000-12,000/month                │
│  • Estimated clicks: 180-240/month                          │
│  • Avg cost per click: $3.20                                │
│                                                             │
│  Anything else you'd like to adjust?                        │
│                                                             │
│  ┌────────────────┐  ┌────────────────────────────────┐   │
│  │ ✅ Looks good  │  │ 🔧 Make another change         │   │
│  └────────────────┘  └────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Design Patterns for HITL

1. **Progressive Disclosure**
   - Start with high-level question
   - Drill down based on user choice
   - Never overwhelm with all options at once

2. **Conversational Shortcuts**
   - Quick buttons for common responses
   - Always allow free-form text input
   - Agent interprets natural language

3. **Context Preservation**
   - Show what was decided
   - Easy to go back and change
   - Clear confirmation before final action

---

## SWARM EXECUTION DASHBOARD

### Full-Page View for Complex Swarms

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Rep Room        SWARM EXECUTION: Google Ads Campaign                │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  🎯 Goal: Launch Google Ads campaign for kitchen remodeling business         │
│  📊 Status: Executing Wave 2 of 3                                            │
│  ⏱️  Started: 2 minutes ago  •  Est. completion: 1 minute                    │
│  💳 Credits: 12.5 consumed of 15.0 estimated                                 │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  WAVE 1: Information Gathering (Completed)                   ⏱️ 35 seconds   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                               │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                  │
│  │ ✅ AGENT A: Researcher  │  │ ✅ AGENT B: Analyst     │                  │
│  │                         │  │                         │                  │
│  │ Task: Research keywords │  │ Task: Analyze competitors│                  │
│  │ Tool: SEO Analysis      │  │ Tool: Web Research      │                  │
│  │                         │  │                         │                  │
│  │ Result:                 │  │ Result:                 │                  │
│  │ • 47 keywords found     │  │ • 8 competitors analyzed│                  │
│  │ • Avg CPC: $3.20        │  │ • Top strategy: Long-tail│                 │
│  │ • Top keyword:          │  │   keywords + local focus│                  │
│  │   "kitchen remodel LA"  │  │                         │                  │
│  │                         │  │ [View Full Report]      │                  │
│  │ ⏱️ 12 seconds            │  │ ⏱️ 18 seconds            │                  │
│  │ 💳 2.1 credits          │  │ 💳 3.8 credits          │                  │
│  └─────────────────────────┘  └─────────────────────────┘                  │
│                                                                               │
│  ┌─────────────────────────┐                                                 │
│  │ ✅ AGENT C: Retriever   │                                                 │
│  │                         │                                                 │
│  │ Task: Get company info  │                                                 │
│  │ Tool: Knowledge Base    │                                                 │
│  │                         │                                                 │
│  │ Result:                 │                                                 │
│  │ • Company: Kitchen Pro  │                                                 │
│  │ • Specialty: Italian    │                                                 │
│  │ • Service area: LA      │                                                 │
│  │ • USP: 20+ yrs exp      │                                                 │
│  │                         │                                                 │
│  │ ⏱️ 3 seconds             │                                                 │
│  │ 💳 0.5 credits          │                                                 │
│  └─────────────────────────┘                                                 │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  WAVE 2: Content Creation (In Progress)                      ⏱️ 22 seconds   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 78% ━━━━━━━━━━━━━━  │
│                                                                               │
│  ┌─────────────────────────┐                                                 │
│  │ 🔵 AGENT D: Copywriter  │  [Live Output Stream]                          │
│  │                         │                                                 │
│  │ Task: Draft ad copy     │  Analyzing competitor strategies...            │
│  │ Tool: LLM + Context     │  Incorporating company USPs...                 │
│  │                         │  Generating variations...                      │
│  │ Status: Generating      │                                                 │
│  │ variation 3 of 3...     │  ✓ Variation 1: Professional tone              │
│  │                         │  ✓ Variation 2: Casual & friendly             │
│  │ Progress: ████████░░ 78%│  ⏳ Variation 3: Value-focused (generating...) │
│  │                         │                                                 │
│  │ ⏱️ 22s elapsed           │                                                 │
│  │ 💳 6.1 credits (est.)   │                                                 │
│  └─────────────────────────┘                                                 │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  WAVE 3: Campaign Creation (Waiting)                                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                               │
│  ┌─────────────────────────┐                                                 │
│  │ ⏸️ AGENT E: Campaign Mgr │                                                 │
│  │                         │                                                 │
│  │ Task: Create campaign   │  Waiting for:                                   │
│  │ Tool: Google Ads        │  • Ad copy completion (Wave 2)                 │
│  │                         │  • Human approval                               │
│  │ Status: Queued          │                                                 │
│  │                         │  This step requires your approval before        │
│  │ ⚠️ Needs Approval       │  proceeding. You'll be notified when ready.    │
│  │                         │                                                 │
│  │ ⏱️ Not started           │                                                 │
│  │ 💳 ~2.5 credits (est.)  │                                                 │
│  └─────────────────────────┘                                                 │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [⏸️ Pause Execution]  [❌ Cancel]  [💬 Ask Question]  [📥 Export Plan]      │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Wave-Based Layout**
   - Groups agents by execution wave
   - Shows parallel execution visually
   - Progress bar per wave

2. **Real-Time Updates**
   - Live output streaming from agents
   - Credit consumption tracking
   - Time elapsed per agent

3. **Transparency**
   - Shows which tools each agent used
   - Links to full reports
   - Reasoning visible on hover

4. **Control Panel**
   - Pause/cancel at any time
   - Ask questions to agents
   - Export execution plan

---

## MCP SERVER MANAGEMENT

### Tenant Admin View

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Kitchen Pro Settings > MCP Servers & Tools                                    │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  MCP servers give your AI assistant access to external tools and services.   │
│  [Learn more about MCP servers →]                                            │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  🏠 SYSTEM-PROVIDED SERVERS                                                   │
│  These are included with your plan and managed by DreamCrew                  │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 📊 SEO Analysis                                    ✅ Active            │ │
│  │ Keyword research, competitor analysis, ranking tracking                 │ │
│  │                                                                         │ │
│  │ Tools: search_keywords (12), analyze_serp (8), track_rankings (3)      │ │
│  │ Usage: 47 calls this month • 2.3 credits consumed                      │ │
│  │                                                                         │ │
│  │ [View Documentation]  [Usage Stats]                                     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 🔍 Web Research                                    ✅ Active            │ │
│  │ Real-time web search, content extraction, competitor monitoring         │ │
│  │                                                                         │ │
│  │ Tools: search_web (5), extract_content (3), monitor_urls (2)           │ │
│  │ Usage: 23 calls this month • 1.8 credits consumed                      │ │
│  │                                                                         │ │
│  │ [View Documentation]  [Usage Stats]                                     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 🧠 Deep Research                                   ✅ Active            │ │
│  │ Advanced AI-powered research with source citations                      │ │
│  │                                                                         │ │
│  │ Tools: research_topic (4), summarize_sources (2), fact_check (1)       │ │
│  │ Usage: 8 calls this month • 3.2 credits consumed                       │ │
│  │                                                                         │ │
│  │ [View Documentation]  [Usage Stats]                                     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  🔌 YOUR CONNECTED SERVERS                                                    │
│  Custom integrations you've added for your team                              │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 🎨 WordPress                                       ✅ Active            │ │
│  │ kitchenpro.com                                                          │ │
│  │                                                                         │ │
│  │ Tools: create_post (1), update_post (1), upload_media (1), list (2)    │ │
│  │ Usage: 12 calls this month • 0.8 credits consumed                      │ │
│  │ Last health check: 2 minutes ago ✅ Healthy                             │ │
│  │                                                                         │ │
│  │ [⚙️ Configure]  [🧪 Test Connection]  [📊 Usage]  [🗑️ Remove]          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 📧 Google Workspace                                ⚠️ Credentials      │ │
│  │ gmail.com, calendar, drive                              Expired        │ │
│  │                                                                         │ │
│  │ Tools: send_email, create_event, upload_file, search_drive             │ │
│  │ Usage: 0 calls (credentials expired)                                   │ │
│  │ Last error: "Invalid credentials" (3 days ago)                          │ │
│  │                                                                         │ │
│  │ [🔑 Re-authorize]  [⚙️ Configure]  [🗑️ Remove]                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 💬 Slack                                           ✅ Active            │ │
│  │ kitchenpro.slack.com                                                    │ │
│  │                                                                         │ │
│  │ Tools: send_message (4), list_channels (2), get_history (1)            │ │
│  │ Usage: 31 calls this month • 0.4 credits consumed                      │ │
│  │ Last health check: 5 minutes ago ✅ Healthy                             │ │
│  │                                                                         │ │
│  │ [⚙️ Configure]  [🧪 Test Connection]  [📊 Usage]  [🗑️ Remove]          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────┐         │
│  │ ➕ Add New MCP Server                                         │         │
│  │                                                                │         │
│  │ Connect external tools and services to your AI assistant      │         │
│  │                                                                │         │
│  │ [Browse MCP Server Marketplace →]                             │         │
│  └───────────────────────────────────────────────────────────────┘         │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Add New Server Flow

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Add MCP Server                                                         [✕]   │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Step 1 of 3: Choose Server Type                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 🔍 Search marketplace...                                    [Search] │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  Popular Integrations                                                        │
│                                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ 📧 Gmail    │  │ 📅 Google   │  │ 💬 Slack    │  │ 🎨 WordPress│       │
│  │             │  │    Calendar │  │             │  │             │       │
│  │ Send emails │  │ Manage      │  │ Team comms  │  │ Content mgmt│       │
│  │ and read    │  │ events      │  │             │  │             │       │
│  │ inbox       │  │             │  │             │  │             │       │
│  │             │  │             │  │             │  │             │       │
│  │ [Connect]   │  │ [Connect]   │  │ [Connect]   │  │ [Connect]   │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ 📊 HubSpot  │  │ 📈 Google   │  │ 🛒 Shopify  │  │ 💳 Stripe   │       │
│  │             │  │    Ads      │  │             │  │             │       │
│  │ CRM & sales │  │ Advertising │  │ E-commerce  │  │ Payments    │       │
│  │ automation  │  │ campaigns   │  │ management  │  │             │       │
│  │             │  │             │  │             │  │             │       │
│  │             │  │             │  │             │  │             │       │
│  │ [Connect]   │  │ [Connect]   │  │ [Connect]   │  │ [Connect]   │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                               │
│  All Categories                                                               │
│  [Communication] [CRM] [Marketing] [E-commerce] [Analytics] [More...]        │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 🔧 Custom MCP Server                                                 │   │
│  │                                                                       │   │
│  │ Have your own MCP server? Connect it here.                           │   │
│  │                                                                       │   │
│  │ [Add Custom Server →]                                                 │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  [Cancel]                                                                     │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### User-Level MCP Server

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ John's Personal Settings > My MCP Servers                                     │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  👤 PERSONAL MCP SERVERS                                                      │
│  These servers are only accessible to you, not your team                     │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 📝 My Personal Notes                               ✅ Active            │ │
│  │ Private notes and reminders stored in your knowledge base              │ │
│  │                                                                         │ │
│  │ Tools: search_notes, create_note, update_note                           │ │
│  │ Usage: 156 calls this month • 0.2 credits consumed                     │ │
│  │ Items: 47 notes                                                         │ │
│  │                                                                         │ │
│  │ [View Notes]  [Add Note]  [Usage Stats]                                 │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 👥 My Contacts                                     ✅ Active            │ │
│  │ Personal contact database accessible only by you                        │ │
│  │                                                                         │ │
│  │ Tools: search_contacts, add_contact, get_contact_details                │ │
│  │ Usage: 23 calls this month • 0.1 credits consumed                      │ │
│  │ Items: 127 contacts                                                     │ │
│  │                                                                         │ │
│  │ [View Contacts]  [Add Contact]  [Import CSV]                            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ ⭐ My Testimonials                                 ✅ Active            │ │
│  │ Customer testimonials and reviews you've collected                      │ │
│  │                                                                         │ │
│  │ Tools: search_testimonials, add_testimonial, get_by_project             │ │
│  │ Usage: 8 calls this month • 0.1 credits consumed                       │ │
│  │ Items: 34 testimonials                                                  │ │
│  │                                                                         │ │
│  │ [View All]  [Add Testimonial]                                           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  💡 Tip: Your personal MCP servers complement the company-wide knowledge     │
│     base. Agents will search your personal data first, then company data.    │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## KNOWLEDGE BASE MANAGEMENT

### Tenant Knowledge Base View

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Kitchen Pro Settings > Company Knowledge Base                                 │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Your knowledge base helps your AI assistant provide accurate, personalized  │
│  responses. The more you add, the better it performs.                        │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 📊 Knowledge Base Stats                                              │   │
│  │                                                                       │   │
│  │  Total Items: 247         Last Updated: 2 hours ago                  │   │
│  │  Storage Used: 12.3 MB    Embeddings: 247/247 generated             │   │
│  │  Search Quality: ⭐⭐⭐⭐⭐ Excellent (avg similarity: 0.87)          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  [📥 Import] [➕ Add Item] [🔍 Search] [🏷️ Manage Tags] [⚙️ Settings]       │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Filter: [All Types ▼] [All Tags ▼]            🔍 Search knowledge...  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 📄 TEXT                                                                  │ │
│  │ About Kitchen Pro                                        Updated: 1d ago│ │
│  │                                                                         │ │
│  │ Kitchen Pro has been serving the Los Angeles area for over 20 years,  │ │
│  │ specializing in Italian-inspired kitchen designs. We offer complete... │ │
│  │                                                                         │ │
│  │ Tags: #company-info #services                                          │ │
│  │ Citations: Used 23 times this month                                    │ │
│  │                                                                         │ │
│  │ [✏️ Edit] [🗑️ Delete] [👁️ View Full]                                    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 📋 FAQ                                                                   │ │
│  │ What are your business hours?                            Updated: 3d ago│ │
│  │                                                                         │ │
│  │ Q: What are your business hours?                                       │ │
│  │ A: We're open Tuesday-Sunday, 9 AM - 6 PM. Closed Mondays. Emergency  │ │
│  │ consultations available by appointment on weekends.                    │ │
│  │                                                                         │ │
│  │ Tags: #hours #availability                                             │ │
│  │ Citations: Used 47 times this month ⭐ Top cited                       │ │
│  │                                                                         │ │
│  │ [✏️ Edit] [🗑️ Delete] [👁️ View Full]                                    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 🖼️ IMAGE                                                                  │ │
│  │ Modern Italian Kitchen Renovation                        Updated: 5d ago│ │
│  │                                                                         │ │
│  │ [────────────────────]  GPT-4 Vision Analysis:                         │ │
│  │ [   Kitchen Photo   ]  • Style: Modern Italian                         │ │
│  │ [   640x480 JPG     ]  • Colors: White, Gray, Stainless Steel         │ │
│  │ [────────────────────]  • Features: Island, Marble countertops         │ │
│  │                         • Text detected: None                          │ │
│  │                                                                         │ │
│  │ Tags: #portfolio #modern #italian                                      │ │
│  │ Citations: Used 12 times this month                                    │ │
│  │                                                                         │ │
│  │ [✏️ Edit] [🗑️ Delete] [👁️ View Full] [🔍 Re-analyze Image]              │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ ⭐ REVIEW                                                                 │ │
│  │ "Incredible transformation of our kitchen!"              Updated: 1w ago│ │
│  │                                                                         │ │
│  │ Rating: ⭐⭐⭐⭐⭐ (5/5)                                                    │ │
│  │ Customer: Sarah M., Los Angeles                                        │ │
│  │                                                                         │ │
│  │ "Kitchen Pro transformed our outdated kitchen into a stunning Italian-│ │
│  │ inspired space. The marble countertops and custom cabinets are..."     │ │
│  │                                                                         │ │
│  │ Tags: #testimonial #5-star #los-angeles                                │ │
│  │ Citations: Used 8 times this month                                     │ │
│  │                                                                         │ │
│  │ [✏️ Edit] [🗑️ Delete] [👁️ View Full]                                    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  Showing 4 of 247 items  [← Previous]  [Page 1 of 62]  [Next →]             │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Bulk Import Interface

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Import to Knowledge Base                                              [✕]    │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Step 1 of 3: Choose Import Method                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                               │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────┐ │
│  │ 🌐 Import from Website             │  │ 📁 Upload Files                │ │
│  │                                    │  │                                │ │
│  │ Automatically extract content from │  │ Upload documents, PDFs, or     │ │
│  │ your website and add to knowledge  │  │ images to knowledge base       │ │
│  │ base.                              │  │                                │ │
│  │                                    │  │ Supported formats:             │ │
│  │ We'll:                             │  │ • PDF, DOCX, TXT               │ │
│  │ • Scrape all pages                 │  │ • Images (JPG, PNG)            │ │
│  │ • Extract text & images            │  │ • CSV for bulk items           │ │
│  │ • Analyze with GPT-4 Vision        │  │                                │ │
│  │ • Generate embeddings              │  │                                │ │
│  │                                    │  │                                │ │
│  │ [Select This Method →]             │  │ [Select This Method →]         │ │
│  └────────────────────────────────────┘  └────────────────────────────────┘ │
│                                                                               │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────┐ │
│  │ 📊 Import from CSV/Spreadsheet    │  │ ✍️ Manual Entry                │ │
│  │                                    │  │                                │ │
│  │ Upload a CSV or Excel file with    │  │ Add items one at a time with   │ │
│  │ structured data (FAQs, products,   │  │ full control over fields       │ │
│  │ reviews, etc.)                     │  │                                │ │
│  │                                    │  │ Best for:                      │ │
│  │ Required columns:                  │  │ • Single items                 │ │
│  │ • type, title, content             │  │ • Quick additions              │ │
│  │                                    │  │ • Custom formatting            │ │
│  │ [Download Template]                │  │                                │ │
│  │                                    │  │                                │ │
│  │ [Select This Method →]             │  │ [Select This Method →]         │ │
│  └────────────────────────────────────┘  └────────────────────────────────┘ │
│                                                                               │
│  [Cancel]                                                                     │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Import Progress

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Importing from kitchenpro.com                                         [✕]    │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Step 3 of 3: Processing Content                                             │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                               │
│  Overall Progress: ████████████████████░░░░░ 78% (39 of 50 items)           │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 🌐 Scanning Website                                     ✅ Complete     │ │
│  │ Found 50 pages                                          3 seconds       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 📄 Extracting Content                                   🔵 In Progress  │ │
│  │ Processing page 39 of 50...                             45 seconds      │ │
│  │                                                                         │ │
│  │ Current: /gallery/modern-kitchens/italian-villa.html                   │ │
│  │ • Extracted text: 847 words                                            │ │
│  │ • Found images: 12 images                                              │ │
│  │ • Analyzing with GPT-4 Vision...                                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 🧠 Generating Embeddings                                ⏸️ Queued       │ │
│  │ Waiting for content extraction to complete                             │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 💾 Saving to Knowledge Base                             ⏸️ Queued       │ │
│  │ Waiting for embeddings to complete                                     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  📊 Estimated Credits: 8.3 of 12.5                                           │
│  ⏱️ Estimated Time Remaining: 2 minutes                                      │
│                                                                               │
│  💡 You can close this window - import will continue in background           │
│                                                                               │
│  [⏸️ Pause]  [❌ Cancel Import]                                               │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## COLLABORATION HISTORY

### View All Human-Agent Interactions

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Collaboration History                                                         │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  All times your AI assistant asked for your input                            │
│                                                                               │
│  Filter: [All Time ▼] [All Channels ▼] [All Agents ▼]                       │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 💬 Rep Room • 2 hours ago                              ✅ Completed    │ │
│  │                                                                         │ │
│  │ Project: Launch Google Ads Campaign                                     │ │
│  │ Agent: Sarah (Kitchen Pro Assistant)                                   │ │
│  │                                                                         │ │
│  │ Question Asked:                                                         │ │
│  │ "I've drafted 3 ad variations. Which one do you prefer?"               │ │
│  │                                                                         │ │
│  │ Your Response:                                                          │ │
│  │ "I like #2 but make it more casual"                                    │ │
│  │                                                                         │ │
│  │ Response Time: 3 minutes                                                │ │
│  │ Outcome: Agent modified ad copy and proceeded                           │ │
│  │                                                                         │ │
│  │ [View Full Conversation →]                                              │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 💬 Slack DM • 1 day ago                                ✅ Completed    │ │
│  │                                                                         │ │
│  │ Project: Update Website Content                                         │ │
│  │ Agent: Sarah (Kitchen Pro Assistant)                                   │ │
│  │                                                                         │ │
│  │ Question Asked:                                                         │ │
│  │ "I'm about to publish 3 new blog posts to your website. Should I      │ │
│  │  publish immediately or schedule for next week?"                       │ │
│  │                                                                         │ │
│  │ Your Response:                                                          │ │
│  │ "Schedule for next Monday at 9 AM"                                     │ │
│  │                                                                         │ │
│  │ Response Time: 12 minutes                                               │ │
│  │ Outcome: Posts scheduled successfully                                   │ │
│  │                                                                         │ │
│  │ [View in Slack ↗]                                                       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ 📧 Email • 3 days ago                                  ⏰ Timed Out    │ │
│  │                                                                         │ │
│  │ Project: Social Media Campaign                                          │ │
│  │ Agent: Sarah (Kitchen Pro Assistant)                                   │ │
│  │                                                                         │ │
│  │ Question Asked:                                                         │ │
│  │ "I've created 10 Instagram posts for next week. Do you want to        │ │
│  │  review before I schedule them?"                                       │ │
│  │                                                                         │ │
│  │ Your Response:                                                          │ │
│  │ [No response received within 30 minutes]                               │ │
│  │                                                                         │ │
│  │ Outcome: Agent paused execution, awaiting input                         │ │
│  │ Status: ⚠️ Still waiting for your response                              │ │
│  │                                                                         │ │
│  │ [Respond Now →]                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  Showing 3 of 47 interactions  [← Previous]  [Page 1 of 16]  [Next →]       │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## MOBILE EXPERIENCE

### Rep Room Mobile (iOS - 390x844)

```
┌──────────────────────────────────┐
│  9:41 AM          [🔋 85%] [📶]  │
├──────────────────────────────────┤
│  ← Kitchen Pro AI                │
│                                  │
│  ┌────────────────────────────┐ │
│  │                            │ │
│  │     [Agent Avatar]         │ │
│  │                            │ │
│  │        Sarah               │ │
│  │   Kitchen Pro Assistant    │ │
│  │                            │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ 🤖 Working on your request │ │
│  │                            │ │
│  │ Goal: Launch Google Ads    │ │
│  │       campaign             │ │
│  │                            │ │
│  │ ✅ Research keywords       │ │
│  │ ✅ Analyze competitors     │ │
│  │ 🔵 Drafting ad copy...     │ │
│  │                            │ │
│  │ [View Details ↓]           │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ 💬 CONVERSATION            │ │
│  ├────────────────────────────┤ │
│  │                            │ │
│  │ You:                       │ │
│  │ Help me launch a Google    │ │
│  │ Ads campaign               │ │
│  │ 10:23 AM                   │ │
│  │                            │ │
│  │ 🤖 Sarah:                  │ │
│  │ I'll help you with that!   │ │
│  │ Let me gather some info... │ │
│  │ 10:23 AM                   │ │
│  │                            │ │
│  │ [3 agents working]         │ │
│  │                            │ │
│  │ 🤖 Sarah:                  │ │
│  │ I've drafted 3 ad          │ │
│  │ variations:                │ │
│  │ 10:24 AM                   │ │
│  │                            │ │
│  │ ┌────────────────────────┐ │ │
│  │ │ 📋 Variation 1         │ │ │
│  │ │                        │ │ │
│  │ │ "Kitchen Remodeling    │ │ │
│  │ │  Experts | Free..."    │ │ │
│  │ │                        │ │ │
│  │ │ [Tap to Select]        │ │ │
│  │ └────────────────────────┘ │ │
│  │                            │ │
│  │ ┌────────────────────────┐ │ │
│  │ │ 📋 Variation 2         │ │ │
│  │ │                        │ │ │
│  │ │ "Dream Kitchen? We     │ │ │
│  │ │  Got You! 🏠"          │ │ │
│  │ │                        │ │ │
│  │ │ [Tap to Select]        │ │ │
│  │ └────────────────────────┘ │ │
│  │                            │ │
│  │ [Scroll for more...]      │ │
│  │                            │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ Type message...    [🎤][⬆️]│ │
│  └────────────────────────────┘ │
│                                  │
│  [💬]  [🎤]  [📋]  [⚙️]          │
│  Chat Voice Tasks Settings       │
│                                  │
└──────────────────────────────────┘
```

### Mobile HITL Approval (Bottom Sheet)

```
┌──────────────────────────────────┐
│  [Swipe down to dismiss ▼]       │
├──────────────────────────────────┤
│                                  │
│  🤖 Sarah needs your approval    │
│                                  │
│  ┌────────────────────────────┐ │
│  │ I'm ready to create your   │ │
│  │ Google Ads campaign:       │ │
│  │                            │ │
│  │ • Budget: $50/day          │ │
│  │ • Keywords: 47 keywords    │ │
│  │ • Target: Los Angeles      │ │
│  │ • Ad: Variation #2         │ │
│  │                            │ │
│  │ [View Full Details ↓]      │ │
│  └────────────────────────────┘ │
│                                  │
│  Should I create this campaign?  │
│                                  │
│  ┌────────────────────────────┐ │
│  │ ✅ Yes, do it              │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ 🔧 Modify first            │ │
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ ❌ Cancel                  │ │
│  └────────────────────────────┘ │
│                                  │
└──────────────────────────────────┘
```

---

## COMPONENT LIBRARY

### Reusable Components

#### 1. **Agent Status Chip**

```
States:
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ ✅ Completed    │  │ 🔵 Working      │  │ ⏸️ Waiting      │
└─────────────────┘  └─────────────────┘  └─────────────────┘

┌─────────────────┐  ┌─────────────────┐
│ ❌ Failed       │  │ ⏹️ Cancelled     │
└─────────────────┘  └─────────────────┘

Colors:
- Completed: bg-green-100, text-green-800
- Working: bg-blue-100, text-blue-800, animated pulse
- Waiting: bg-gray-100, text-gray-600
- Failed: bg-red-100, text-red-800
- Cancelled: bg-gray-100, text-gray-500, strikethrough
```

#### 2. **Progress Wave Timeline**

```
Wave 1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ 100%
Wave 2 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 78% ━━━━━━━  🔵
Wave 3 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ⏸️  0%

CSS:
.wave-progress {
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.wave-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  transition: width 0.3s ease;
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { background-position: -100% 0; }
  100% { background-position: 100% 0; }
}
```

#### 3. **Conversational Button Group**

```
┌──────────────┐  ┌──────────────┐  ┌─────────────────┐
│ ✅ Yes       │  │ 🔧 Modify    │  │ ❌ Cancel      │
└──────────────┘  └──────────────┘  └─────────────────┘

Variants:
- Primary (Yes): bg-blue-600, text-white, hover:bg-blue-700
- Secondary (Modify): bg-gray-100, text-gray-900, hover:bg-gray-200
- Danger (Cancel): bg-red-50, text-red-600, hover:bg-red-100

Behavior:
- Large touch targets (min 44px height on mobile)
- Haptic feedback on mobile
- Loading state shows spinner
- Disabled state: opacity-50, cursor-not-allowed
```

#### 4. **Knowledge Item Card**

```
┌─────────────────────────────────────────────────────────────────┐
│ 📄 TEXT                                        Updated: 1d ago  │
│ About Kitchen Pro                                              │
│                                                                │
│ Kitchen Pro has been serving the Los Angeles area for over    │
│ 20 years, specializing in Italian-inspired kitchen designs... │
│                                                                │
│ Tags: #company-info #services                                  │
│ Citations: Used 23 times this month                            │
│                                                                │
│ [✏️ Edit] [🗑️ Delete] [👁️ View Full]                           │
└─────────────────────────────────────────────────────────────────┘

CSS:
.knowledge-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: box-shadow 0.2s;
}

.knowledge-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.knowledge-card-icon {
  font-size: 24px;
  margin-right: 8px;
}

.knowledge-card-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.knowledge-tag {
  background: #f3f4f6;
  color: #6b7280;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}
```

#### 5. **Real-Time Agent Output Stream**

```
┌───────────────────────────────────────────┐
│ [Live Output Stream]                      │
│                                           │
│ Analyzing competitor strategies...        │
│ Incorporating company USPs...             │
│ Generating variations...                  │
│                                           │
│ ✓ Variation 1: Professional tone          │
│ ✓ Variation 2: Casual & friendly         │
│ ⏳ Variation 3: Value-focused (generating)│
└───────────────────────────────────────────┘

Implementation:
- WebSocket connection to agent worker
- Auto-scroll to bottom
- Typewriter effect for new lines
- Green checkmark when line complete
- Spinning loader for current line
```

---

## INTERACTION PATTERNS

### Pattern 1: Progressive Disclosure

**Don't show everything at once. Reveal options based on context.**

Bad:
```
Agent: What would you like to do?
[50 buttons with every possible option]
```

Good:
```
Agent: I can help you with marketing. What's your goal?
[Generate leads] [Increase awareness] [Drive sales] [Something else...]
```

### Pattern 2: Conversational Shortcuts

**Provide quick buttons but always allow natural language.**

```
Agent: How would you like me to proceed?

[✅ Approve]  [🔧 Make changes]  [❌ Cancel]

Or type your own response:
┌────────────────────────────────────────┐
│ Actually, let me think about it...     │
└────────────────────────────────────────┘
```

### Pattern 3: Context Preservation

**Show what was decided. Make it easy to change.**

```
Agent: Got it! I've updated:
• Budget: $30/day (was $50/day) [Change]
• Target: Los Angeles [Change]
• Keywords: 47 keywords [View]

Anything else?
```

### Pattern 4: Real-Time Transparency

**Show agents working. Build trust.**

```
🔵 Agent A: Researching keywords...
   Found 23 so far, analyzing relevance...

🔵 Agent B: Analyzing competitors...
   Reviewing competitor #3 of 8...

✅ Agent C: Retrieved company info (3s)
```

---

## ACCESSIBILITY

### WCAG 2.1 AA Compliance

**Color Contrast:**
- All text meets 4.5:1 contrast ratio
- Interactive elements meet 3:1 contrast ratio
- Status indicators use icons + color (not color alone)

**Keyboard Navigation:**
- All interactive elements focusable
- Tab order follows visual order
- Focus indicators clearly visible
- Escape key closes modals/bottom sheets

**Screen Readers:**
- All images have alt text
- ARIA labels on all interactive elements
- Live regions for agent status updates
- Descriptive link text (not "click here")

**Mobile Accessibility:**
- Touch targets minimum 44x44px
- Pinch to zoom enabled
- Landscape mode supported
- VoiceOver/TalkBack tested

---

## DESIGN TOKENS

```json
{
  "colors": {
    "primary": {
      "50": "#eff6ff",
      "600": "#2563eb",
      "700": "#1d4ed8"
    },
    "success": {
      "100": "#d1fae5",
      "800": "#065f46"
    },
    "warning": {
      "100": "#fef3c7",
      "800": "#92400e"
    },
    "error": {
      "100": "#fee2e2",
      "800": "#991b1b"
    }
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px"
  },
  "typography": {
    "fontFamily": {
      "sans": "Inter, system-ui, sans-serif",
      "mono": "Fira Code, monospace"
    },
    "fontSize": {
      "xs": "12px",
      "sm": "14px",
      "base": "16px",
      "lg": "18px",
      "xl": "20px",
      "2xl": "24px"
    }
  },
  "borderRadius": {
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "full": "9999px"
  }
}
```

---

## CONCLUSION

These UI mockups provide a complete design system for the conversational HITL and multi-agent orchestration platform.

**Key Design Principles Applied:**

1. ✅ **Conversation-First** - No forms, natural language
2. ✅ **Real-Time Transparency** - Show agents working
3. ✅ **Progressive Disclosure** - Don't overwhelm users
4. ✅ **Context Awareness** - UI adapts to state
5. ✅ **Mobile-First** - Works beautifully on all devices

**Ready for Implementation:**
- All components specified with CSS
- Interaction patterns documented
- Accessibility requirements defined
- Design tokens provided

**Next Steps:**
1. Build component library in React/Vue
2. Implement WebSocket connections for real-time updates
3. Test with real users
4. Iterate based on feedback

---

**Document Status:** ✅ Complete
**Version:** 1.0
**Last Updated:** November 6, 2025
