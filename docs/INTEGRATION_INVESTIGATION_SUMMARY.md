DREAMCREW INTEGRATION INVESTIGATION SUMMARY
============================================

Project: DreamCrew Rep Room Voice System
Date: November 6, 2025
Investigator: Claude Code (File Search Specialist)
Thoroughness: Very Thorough

INVESTIGATION DELIVERABLES
==========================

1. COMPREHENSIVE INTEGRATION REPORT
   File: /docs/COPILOTKIT_MASTRA_LIVEKIT_INTEGRATION_INVESTIGATION.md
   Lines: 1521
   Sections: 14 major sections with ASCII diagrams

   Covers:
   - Complete CopilotKit integration (hooks, endpoints, components)
   - Mastra agent system (definitions, tools, dynamic resolution)
   - LiveKit voice infrastructure (STT/TTS, data channels, room management)
   - End-to-end data flow diagrams
   - Framework responsibilities and architectural patterns
   - Key files and their roles
   - Data flow examples (text chat, voice chat, dynamic resolution)
   - Security considerations
   - Deployment architecture

KEY FINDINGS
============

COPILOTKIT (Chat UI Layer)
---------------------------
✓ Version: 1.10.3
✓ Main Provider: DynamicCopilotKitProvider.tsx
✓ Core Hook: useCopilotChat()
✓ Key Component: VoiceCopilotBridge.tsx (intercepts responses for TTS)
✓ Endpoint: /api/copilotkit → proxies to mastra-agents
✓ Components Using CopilotKit: 10+ major components

MASTRA (Agent Execution Layer)
-------------------------------
✓ Version: ^0.10.2-alpha.1 (core), ^0.0.8 (@ag-ui/mastra)
✓ Agents: 4 main agents (weather-agent, genesis-agent, the-sales-opener, project-agent)
✓ Tools: weather, background-color, theme-colors, theme-picker
✓ Key Feature: Dynamic agent resolution per repRoomSlug
✓ Memory System: Thread-based, Supabase-backed
✓ Adapter: MastraAgent wrapper for CopilotKit integration
✓ Runtime Context: Supports dynamic personalization (agentName, instructions, language)

LIVEKIT (Voice I/O Layer)
-------------------------
✓ Client Version: 2.13.4
✓ Server SDK: 2.13.1
✓ Core Components: Room management, participant tracking, data channels
✓ STT Provider: Deepgram (via /server/voiceagent/session/stt_manager.py)
✓ TTS Provider: ElevenLabs (via /server/voiceagent/tts/)
✓ Voice Agent: Python orchestrator (server/voiceagent/orchestrator.py)
✓ Multi-User: Per-participant audio tracks, TTS leader election

CRITICAL INTEGRATION POINTS
============================

1. Agent Routing (Frontend → Mastra)
   - File: /mastra-agents/app/api/copilotkit/route.ts
   - Mechanism: repRoomSlug → getAgentConfig() → dynamic agent lookup
   - Benefit: Different rep rooms = different agents without code changes

2. Voice Output (Mastra Response → TTS)
   - File: /src/components/rep-room/VoiceCopilotBridge.tsx
   - Mechanism: TTS leader election (only one user synthesizes in multi-user)
   - Fix: REP-2931 (prevents duplicate audio)

3. Voice Input (STT → CopilotKit)
   - File: /server/voiceagent/communication/data_channel.py
   - Mechanism: STT transcript → data channel → frontend → appendMessage()
   - Benefit: Low-latency voice input without blocking CopilotKit

4. Memory & Continuity (Mastra Memory)
   - File: /mastra-agents/lib/memory/index.ts
   - Mechanism: Thread-based storage in Supabase
   - API: /api/memory/ingress, /api/memory/list

ARCHITECTURE SUMMARY
====================

Three-Layer Architecture:

Frontend Layer (React + Vite)
  ↓ /api/copilotkit (proxy)
Backend Gateway (Next.js)
  ↓ /api/copilotkit (handler)
Mastra Service (Vercel)
  ├─ Agent Resolution (repRoomSlug → agent)
  ├─ Tool Execution (weather, color, theme)
  └─ Memory Storage (Supabase)
  ↓ (streaming response)
Python Voice Agent (LiveKit Agents)
  ├─ STT (Deepgram): audio → text
  ├─ Agent Call: text → /api/copilotkit
  └─ TTS (ElevenLabs): response → audio
  ↓ (audio track)
Frontend Output
  ├─ Chat bubble (text)
  └─ Speaker output (audio)

Data Flow Pattern:
Text Input → CopilotKit → /api/copilotkit → Mastra → TTS → Voice
Voice Input → STT → Data Channel → CopilotKit → [same as above]

CRITICAL ARCHITECTURAL PATTERNS
================================

1. Dynamic Agent Resolution
   - Per-room agent selection from database
   - No code changes needed for new agents

2. TTS Leader Election
   - Multi-user rooms prevent duplicate TTS
   - Oldest participant synthesizes audio

3. Session Caching
   - 10-minute TTL for CopilotRuntime
   - Reduces initialization overhead

4. Data Channel Communication
   - Real-time transcript delivery
   - Bypasses CopilotKit for STT speed

5. Runtime Context Personalization
   - Dynamic instructions based on agent config
   - Supports dynamic agent names and languages

KEY FILES MAPPED
================

COPILOTKIT Files:
  /src/components/rep-room/DynamicCopilotKitProvider.tsx (setup)
  /src/components/rep-room/VoiceCopilotBridge.tsx (voice bridge)
  /src/contexts/UnifiedVoiceContext.tsx (voice state)
  /src/pages/RepRoomSessionPage.tsx (main page)
  /api/copilotkit/route.ts (production proxy)

MASTRA Files:
  /mastra-agents/app/api/copilotkit/route.ts (agent resolution)
  /mastra-agents/lib/agents/weather-agent.ts (example agent)
  /mastra-agents/lib/agents/genesis-agent.ts (dynamic agent)
  /mastra-agents/lib/tools/weather-tool.ts (example tool)
  /mastra-agents/lib/memory/index.ts (memory system)
  /mastra-agents/app/api/agents/ (discovery endpoints)
  /mastra-agents/app/api/memory/ (memory API)

LIVEKIT Files:
  /server/voiceagent/orchestrator.py (main coordinator)
  /server/voiceagent/agent_pool/pool_manager.py (agent pooling)
  /server/voiceagent/communication/data_channel.py (real-time msgs)
  /server/voiceagent/session/stt_manager.py (STT lifecycle)
  /server/voiceagent/tts/connection_manager.py (TTS management)
  /server/voiceagent/room/state_tracker.py (room state)

PACKAGE VERSIONS
================

Frontend (package.json):
  @copilotkit/react-core: 1.10.3
  @copilotkit/react-ui: 1.10.3
  @mastra/core: ^0.10.2-alpha.1
  @mastra/memory: ^0.14.2
  @ag-ui/mastra: ^0.0.8
  livekit-client: ^2.13.4
  @livekit/components-react: ^2.0.0

Mastra Service (mastra-agents/package.json):
  @copilotkit/runtime: 1.10.3
  @mastra/core: ^0.16.0
  @mastra/memory: ^0.14.4
  @ag-ui/mastra: ^0.0.10

AGENTS AVAILABLE
================

1. Weather Agent (weather-agent.ts)
   Name: "Rudy - DreamCrew Partner Program"
   Model: groq('openai/gpt-oss-120b')
   Tools: get-weather, change-background-color, change-theme-colors, control-theme-picker
   Use: Demo agent showing tool integration

2. Genesis Agent (genesis-agent.ts)
   Name: Dynamic (from runtime context)
   Model: openai('gpt-4o-mini')
   Features: Runtime context support for personalization
   Use: Flexible agent for various scenarios

3. Sales Opener Agent (the-sales-opener.ts)
   Use: Partner program sales conversations

4. Project Agent (project-agent.ts)
   Use: Project-specific functionality

MULTI-USER VOICE SUPPORT
=========================

✓ Per-participant audio track subscription
✓ Per-participant STT streams (Deepgram)
✓ TTS leader election (prevents duplicate audio)
✓ Multi-user interrupt handling (barge-in)
✓ Participant state tracking
✓ Agent pool for concurrent users

KNOWN FIXES IMPLEMENTED
=======================

REP-2931: Multi-participant TTS duplication
  → Fixed with TTS leader election in VoiceCopilotBridge
  
REP-4325: Memory integration
  → Custom memory API endpoints with participant attribution
  
REP-4405: STT optimization (sub-2s voice latency)
  → Optimized STT integration module
  
REP-4400: Monolithic agent refactoring
  → Modular orchestrator with extracted components

DEPLOYMENT ARCHITECTURE
=======================

Development:
  Frontend: Vite at http://localhost:5173
  Backend: CopilotKit server at http://localhost:3001
  Voice: Python agent at http://localhost:8081
  Mastra: Dev server at http://localhost:3000

Production:
  Frontend: Vercel (Next.js)
  Gateway: Vercel API routes
  Mastra Service: Vercel (mastra-agents-ten.vercel.app)
  LiveKit: Cloud service
  Voice Agent: Fly.io or self-hosted

SECURITY CONSIDERATIONS
=======================

✓ JWT tokens for LiveKit room access
✓ Token TTL for session expiration
✓ CORS configuration for API access
✓ Custom headers for agent/tenant/user identification
✓ Data channel uses WebRTC encryption
✓ Memory system supports row-level security in Supabase

TESTING STRATEGY
================

Unit Tests:
  - /tests/unit/ directory
  - Agent behavior verification
  - Tool testing

Integration Tests:
  - Voice flow: STT → Chat → TTS
  - Agent resolution: slug → agent
  - Memory: persistence and retrieval

E2E Tests:
  - Text chat flow
  - Voice chat flow
  - Multi-user scenarios

NEXT STEPS FOR DEVELOPERS
==========================

1. Review /docs/COPILOTKIT_MASTRA_LIVEKIT_INTEGRATION_INVESTIGATION.md
   - 1521 lines of detailed documentation
   - Includes ASCII diagrams and data flow examples
   
2. Key components to understand:
   - DynamicCopilotKitProvider (setup)
   - VoiceCopilotBridge (voice/text routing)
   - /mastra-agents/app/api/copilotkit/route.ts (agent resolution)
   - VoiceAgentOrchestrator (voice processing)

3. Integration patterns to learn:
   - Dynamic agent resolution
   - TTS leader election
   - Data channel communication
   - Runtime context personalization

4. For new features:
   - Add new agents to /mastra-agents/lib/agents/
   - Create tools in /mastra-agents/lib/tools/
   - Register agents in AGENT_REGISTRY
   - Add memory API endpoints if needed

COMPLETE INVESTIGATION DELIVERED
=================================

✓ CopilotKit integration documented (imports, hooks, components, endpoints)
✓ Mastra integration documented (agents, tools, resolution, memory)
✓ LiveKit integration documented (STT/TTS, data channels, room management)
✓ Integration architecture mapped (3-layer architecture with data flows)
✓ Critical integration points identified (4 major integration points)
✓ Key files documented (all main files with roles)
✓ Data flow examples provided (text, voice, dynamic resolution)
✓ Configuration documented (package versions, environment variables)
✓ Architectural patterns documented (5 key patterns)
✓ Multi-user support documented
✓ Security considerations documented
✓ Deployment architecture documented
✓ ASCII architecture diagrams provided

Report Location: /docs/COPILOTKIT_MASTRA_LIVEKIT_INTEGRATION_INVESTIGATION.md
Summary Location: /docs/INTEGRATION_INVESTIGATION_SUMMARY.txt

End of Investigation Summary