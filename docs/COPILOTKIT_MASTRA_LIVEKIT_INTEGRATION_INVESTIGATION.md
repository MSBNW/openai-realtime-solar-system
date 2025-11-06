# DreamCrew Integration Investigation Report
## CopilotKit, Mastra, and LiveKit Integration Architecture

**Date**: November 6, 2025  
**Project**: DreamCrew Rep Room Voice System  
**Investigated By**: Claude Code (File Search Specialist)  
**Thoroughness Level**: Very Thorough

---

## EXECUTIVE SUMMARY

The DreamCrew codebase integrates three major frameworks into a sophisticated voice-first AI system:

1. **CopilotKit** - Frontend chat UI and runtime orchestration
2. **Mastra** - Agent framework with tools and memory system
3. **LiveKit** - Real-time voice streaming and room management

These frameworks work together in a **Producer-Consumer-Channel** architecture where CopilotKit provides the UI layer, Mastra manages AI agents and their context, and LiveKit handles real-time voice communication.

---

## 1. COPILOTKIT INTEGRATION

### 1.1 CopilotKit Overview
**Role**: Frontend chat interface, runtime client, and message orchestration  
**Version**: 1.10.3  
**Primary Purpose**: Provide AI chat UI and manage conversation state

### 1.2 CopilotKit Components

#### Core Provider Setup
**File**: `/home/user/ng53116-dc2-core-platform-repo-v07/src/components/rep-room/DynamicCopilotKitProvider.tsx`  
**Imports**: `@copilotkit/react-core`, `@copilotkit/react-ui`

Key CopilotKit packages:
```
@copilotkit/react-core     - Provider and hooks (useCopilotChat, useCopilotAction)
@copilotkit/react-ui      - UI components (CopilotChat, CopilotSidebar)
@copilotkit/shared        - Shared types
@copilotkit/runtime       - Server-side runtime for handling AI requests
@copilotkit/runtime-client-gql - GraphQL-based runtime client
```

### 1.3 CopilotKit Hooks Usage

Key hooks found in the codebase:

**`useCopilotChat()`**
- Location: `/src/components/rep-room/VoiceCopilotBridge.tsx` (line 46)
- Purpose: Access chat messages and appendMessage function
- Usage:
  ```typescript
  const { visibleMessages, appendMessage } = useCopilotChat();
  ```

**`CopilotContext`**
- Location: Multiple files in `/src/components/rep-room/`
- Purpose: Access CopilotKit context for provider configuration
- Usage: Wrapped around components that need chat access

### 1.4 CopilotKit API Endpoint

**Frontend Endpoint**:
- Location: `/home/user/ng53116-dc2-core-platform-repo-v07/api/copilotkit/route.ts`
- Function: Production proxy to mastra-agents service
- Configuration:
  ```typescript
  const MASTRA_AGENTS_URL = process.env.MASTRA_AGENTS_URL || 
                            'https://mastra-agents-ten.vercel.app';
  ```

**Mastra-Agents CopilotKit Endpoint**:
- Location: `/home/user/ng53116-dc2-core-platform-repo-v07/mastra-agents/app/api/copilotkit/route.ts`
- Purpose: Dynamic agent resolution and CopilotRuntime creation
- Key Features:
  - Maps `repRoomSlug` to Mastra agents
  - Creates CopilotRuntime with OpenAIAdapter
  - Caches runtime instances (10-minute TTL)
  - Supports runtime context for dynamic agent personalization

### 1.5 Message Flow Through CopilotKit

```
User Input (Chat Box)
    ↓
useCopilotChat() hook → appendMessage()
    ↓
CopilotRuntime sends to /api/copilotkit
    ↓
Mastra Agent processes with tools
    ↓
Response streamed back as TextMessage
    ↓
VoiceCopilotBridge intercepts → TTS
    ↓
Speech + Chat Bubble displayed
```

### 1.6 CopilotKit Agent Registry

**File**: `/mastra-agents/app/api/copilotkit/route.ts` (lines 17-27)
```typescript
const AGENT_REGISTRY = {
  'the-sales-opener': theSalesOpenerAgent,
  'theSalesOpenerAgent': theSalesOpenerAgent,
  'genesis-agent': genesisAgent,
  'genesis': genesisAgent,
  'weather-agent': weatherAgent,
  'weatherAgent': weatherAgent,
  'project-agent': projectAgent,
  'projectAgent': projectAgent,
};
```

### 1.7 Components Using CopilotKit

**Key Components with CopilotKit Imports**:
```
✓ /src/components/rep-room/VoiceCopilotBridge.tsx
✓ /src/components/rep-room/DynamicCopilotKitProvider.tsx
✓ /src/components/rep-room/CopilotKitConversationFlow.tsx
✓ /src/components/rep-room/CopilotKitRepRoomInterface.tsx
✓ /src/components/rep-room/EnhancedRepRoomVoiceInterface.tsx
✓ /src/components/playground/DirectCopilotKitChat.tsx
✓ /src/components/playground/CopilotChatWrapper.tsx
✓ /src/components/agent/CloneCopilotKitChat.tsx
✓ /src/pages/RepRoomSessionPage.tsx
✓ /src/pages/PlaygroundPage.tsx
```

---

## 2. MASTRA INTEGRATION

### 2.1 Mastra Overview
**Role**: AI agent framework with tools, memory, and execution engine  
**Version**: ^0.10.2-alpha.1 (core), ^0.0.8 (@ag-ui/mastra)  
**Primary Purpose**: Define and execute AI agents with tools and memory

### 2.2 Agent Definitions

**Agent Location**: `/home/user/ng53116-dc2-core-platform-repo-v07/mastra-agents/lib/agents/`

#### Available Agents:

1. **Weather Agent** (`weather-agent.ts`)
   - Name: "Rudy - DreamCrew Partner Program (Voice-First Demo Agent)"
   - Model: `groq('openai/gpt-oss-120b')`
   - Memory: General conversation history
   - Tools:
     - `get-weather` - Weather API integration
     - `change-background-color` - UI customization
     - `change-theme-colors` - Theme management
     - `control-theme-picker` - Theme picker widget

2. **Genesis Agent** (`genesis-agent.ts`)
   - Name: Dynamic (supports runtime context)
   - Model: `openai('gpt-4o-mini')`
   - Features: Dynamic runtime context support
   - Use Case: Flexible agent for various scenarios

3. **The Sales Opener** (`the-sales-opener.ts`)
   - Specialized agent for sales conversations
   - Partner program positioning

4. **Project Agent** (`project-agent.ts`)
   - Project-specific functionality

### 2.3 Mastra Tool System

**Tool File Locations**:
```
/mastra-agents/lib/tools/
├── weather-tool.ts
├── background-color-tool.ts
├── theme-change-tool.ts
└── theme-picker-control-tool.ts
```

**Tool Integration Example** (Weather Agent):
```typescript
tools: {
  'get-weather': getWeatherTool,
  'change-background-color': changeBackgroundColorTool,
  'change-theme-colors': changeThemeColorsTool,
  'control-theme-picker': themePickerControlTool,
}
```

### 2.4 Mastra Agent Resolution

**Dynamic Agent Resolution Flow**:

**File**: `/mastra-agents/app/api/copilotkit/route.ts`

1. Extract `repRoomSlug` from query parameter
2. Call `getAgentConfig(repRoomSlug)` to fetch agent configuration from database
3. Resolve `mastraAgentId` from agent config
4. Look up agent in `AGENT_REGISTRY`
5. Create `MastraAgent` instance with optional `RuntimeContext`
6. Wrap with `CopilotRuntime` for CopilotKit integration

```typescript
// Extract from request
const repRoomSlug = url.searchParams.get('repRoomSlug');

// Resolve config (database lookup)
const agentConfig = await getAgentConfig(repRoomSlug);
const { mastraAgentId, runtimeContext } = agentConfig;

// Get agent instance
const agentInstance = AGENT_REGISTRY[mastraAgentId];

// Create MastraAgent
const mastraAgent = new MastraAgent({
  agent: selectedAgent,
  runtimeContext: properRuntimeContext // Optional
});
```

### 2.5 Mastra Memory System

**Memory Configuration**:
**File**: `/mastra-agents/lib/memory/index.ts`

**Features**:
- Thread-based conversation storage
- Participant attribution support
- Supabase-backed persistence
- Custom memory brokers

**API Endpoints**:
```
POST /api/memory/ingress        - Store conversation messages
POST /api/memory/ingress-simple - Simplified message ingress
GET  /api/memory/list           - Retrieve conversation history
POST /api/memory/action-log     - Log action history
```

**Memory Initialization**:
```typescript
const memory = createMemoryForAgentType('general');
// Creates conversation history for agents
```

### 2.6 Mastra API Routes

**File**: `/mastra-agents/app/api/agents/`

```
GET  /api/agents                    - List available agents
GET  /api/agents/[agentId]         - Get agent details
POST /api/copilotkit               - CopilotKit integration endpoint
POST /api/copilotkit-simple        - Simplified endpoint
POST /api/rep-room-agent           - Rep room agent configuration
GET  /api/health                   - Service health check
```

### 2.7 Mastra MastraAgent Integration

**Class**: `MastraAgent` (from `@ag-ui/mastra`)

**Purpose**: Adapter that wraps Mastra agents for CopilotKit compatibility

**Usage**:
```typescript
const mastraAgent = new MastraAgent({
  agent: selectedAgent,           // Mastra Agent instance
  runtimeContext: properRuntimeContext  // Optional: RuntimeContext
});

const runtime = new CopilotRuntime({
  agents: {
    [mastraAgentId]: mastraAgent,  // Register with CopilotKit
  },
});
```

### 2.8 Runtime Context System

**Purpose**: Pass dynamic context (agent name, instructions, language) to agents

**Implementation**:
```typescript
const properRuntimeContext = new RuntimeContext<Record<string, unknown>>();
for (const [key, value] of Object.entries(runtimeContext)) {
  properRuntimeContext.set(key, value);
}
```

**Used By**:
- Genesis Agent (dynamic instructions)
- Any agent requiring personalization

---

## 3. LIVEKIT INTEGRATION

### 3.1 LiveKit Overview
**Role**: Real-time voice communication and audio streaming  
**Version**: 2.13.4 (client), 2.13.1 (server SDK)  
**Primary Purpose**: Handle voice calls, audio streaming, and multi-participant rooms

### 3.2 Frontend Voice Integration

#### LiveKit Provider Components

**File**: `/src/contexts/UnifiedVoiceContext.tsx`
- Manages LiveKit room connection
- Tracks voice state and participants
- Coordinates voice UI updates

**Key Dependencies**:
```typescript
import { RoomAudioRenderer, RoomContext } from '@livekit/components-react';
import { DataPacket_Kind, Room } from 'livekit-client';
```

#### Voice Connection Setup

**Token Generation Flow**:
1. User requests voice token from backend edge function
2. LiveKit JWT token created with:
   - Room name (derived from repRoomSlug)
   - Participant identity
   - Grant permissions
3. Token returned to frontend
4. Frontend connects to LiveKit room

### 3.3 Backend Voice Agent System

**Location**: `/home/user/ng53116-dc2-core-platform-repo-v07/server/voiceagent/`

#### Core Components:

1. **Agent Orchestrator** (`orchestrator.py`)
   - Coordinates all voice agent modules
   - Manages agent lifecycle
   - Handles job context from LiveKit

2. **Agent Pool Manager** (`agent_pool/pool_manager.py`)
   - Maintains pool of reusable agents
   - Handles agent allocation/deallocation
   - Supports agent scaling

3. **Session Management** (`session/agent_session.py`)
   - Manages agent session lifecycle
   - Tracks participant state
   - Handles STT/TTS management

4. **Room Management** (`room/state_tracker.py`)
   - Tracks room state
   - Manages participant state
   - Handles room metadata

### 3.4 LiveKit Audio Streaming

#### Data Channel Communication

**File**: `/server/voiceagent/communication/data_channel.py`

**Purpose**: Handle real-time data packet exchange with browser

**Key Classes**:
- `DataChannelHandler` - Main handler for data channel packets
- `MessageHandlers` - Routes different message types

**Data Channel Events**:
- Transcript events (STT output)
- Status updates
- Configuration changes
- Interrupt signals

#### Room I/O System

**File**: `/server/voiceagent/orchestrator.py` (lines 75-76)

**RoomIO Configuration**:
```python
RoomIO(
  room_io_ready: asyncio.Event,    # Signals when room I/O ready
  RoomInputOptions(...),            # Audio input configuration
  RoomOutputOptions(...)            # Audio output configuration
)
```

**Audio Track Handling**:
- Subscribes to participant audio tracks
- STT processes audio to text
- Agent responds to text
- TTS converts response back to audio
- Audio published back to room

### 3.5 Voice Streaming Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Browser)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  LiveKit Client → Room Connection                            │
│       ↓                                                       │
│  WebRTC Audio Streams                                        │
│       ↓ (User Speech)                                        │
│  DataChannel → /api/voice-token endpoint                    │
│       ↓                                                       │
│  CopilotKit Chat + Voice UI                                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         ↑ WebRTC / Network ↓
┌─────────────────────────────────────────────────────────────┐
│                      LIVEKIT SERVER                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Room Manager - Coordinates participants                    │
│       ↓                                                       │
│  Agent Pool - Reusable agent instances                      │
│       ↓                                                       │
│  Voice Agent Job Context                                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         ↑ gRPC / Message Queue ↓
┌─────────────────────────────────────────────────────────────┐
│              PYTHON VOICE AGENT WORKER                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Agent Orchestrator                                          │
│       ↓                                                       │
│  STT (Speech-to-Text) - Deepgram                            │
│       ↓ (Transcript)                                         │
│  CopilotKit Runtime Handler                                 │
│       ↓ (AI Response)                                        │
│  TTS (Text-to-Speech) - ElevenLabs                          │
│       ↓ (Audio)                                              │
│  Audio Back to Room                                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 3.6 STT/TTS Pipeline

#### Speech-to-Text (STT)

**Provider**: Deepgram
**Files**:
- `/server/voiceagent/session/stt_manager.py`
- `/server/voiceagent/gated_deepgram_stt.py`
- `/server/voiceagent/turn_detection/end_of_thought.py`

**Flow**:
1. Subscribe to audio tracks from participants
2. Stream audio to Deepgram API
3. Receive transcript events
4. Detect end-of-thought (turn completion)
5. Send transcript to data channel

#### Text-to-Speech (TTS)

**Provider**: ElevenLabs
**Files**:
- `/server/voiceagent/tts/connection_manager.py`
- `/server/voiceagent/tts/connection_pool.py`

**Flow**:
1. Receive AI response text from CopilotKit/Mastra
2. Call ElevenLabs API to synthesize audio
3. Stream audio back to LiveKit room
4. All participants hear the response

### 3.7 LiveKit Token Generation

**Purpose**: Authenticate clients connecting to LiveKit rooms

**Configuration**:
- Room name: Derived from `repRoomSlug`
- Identity: Unique participant identifier
- Grants: `canPublish`, `canPublishData`, `canSubscribe`
- TTL: Token validity period

**Usage**:
```javascript
// Frontend requests token
const response = await fetch('/api/voice-token', {
  method: 'POST',
  body: JSON.stringify({ roomName, identity })
});

// Connect to room
await room.connect(url, token);
```

### 3.8 Multi-User Voice Support

**Files**: 
- `/server/voiceagent/room/participant_manager.py`
- `/server/voiceagent/session/participant_tracker.py`

**Features**:
- Per-participant audio track subscription
- Per-participant STT streams
- Multi-user interrupt handling
- Barge-in support (interruption)

**Participant State Tracking**:
```python
participant_audio_tracks: Dict[str, Any]  # participant_id → AudioTrack
participant_fragments: Dict[str, list]    # participant_id → audio fragments
participant_silence_tasks: Dict[str, Optional[asyncio.Task]]
```

---

## 4. INTEGRATION ARCHITECTURE

### 4.1 Complete Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    USER INTERACTION LAYER                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. Speech Input (Voice)                                          │
│     └→ Microphone → WebRTC Stream → LiveKit Room                │
│                                                                    │
│  2. Chat Input (Text)                                             │
│     └→ Chat Box → CopilotKit appendMessage()                    │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
              ↓ Network / HTTP ↓
┌──────────────────────────────────────────────────────────────────┐
│              FRONTEND ORCHESTRATION LAYER                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  VoiceCopilotBridge Component                                    │
│    - Monitors CopilotKit messages                                │
│    - Intercepts AI responses                                     │
│    - TTS Leader Election (multi-user)                            │
│    - Prevents duplicate TTS requests                             │
│                                                                    │
│  UnifiedVoiceContext                                             │
│    - Manages LiveKit room connection                             │
│    - Tracks participants                                         │
│    - Coordinates voice UI updates                                │
│                                                                    │
│  DynamicCopilotKitProvider                                       │
│    - Wraps components with CopilotKit                            │
│    - Configures runtime endpoint                                 │
│    - Passes repRoomSlug to runtime                               │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
              ↓ API Routes ↓
┌──────────────────────────────────────────────────────────────────┐
│               BACKEND API GATEWAY LAYER                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  /api/copilotkit (Production Proxy)                              │
│    └→ Forwards to mastra-agents service                          │
│                                                                    │
│  /api/voice-token (Edge Function)                                │
│    └→ Creates JWT token for LiveKit room access                  │
│                                                                    │
│  /api/agents/* (Mastra Agent Discovery)                          │
│    └→ Lists available agents                                      │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
              ↓ gRPC / WebRTC ↓
┌──────────────────────────────────────────────────────────────────┐
│         MASTRA AGENTS SERVICE (Vercel Deployment)                │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  /api/copilotkit/route.ts (Main Handler)                        │
│    ↓                                                               │
│  1. Extract repRoomSlug from request                             │
│  2. Call getAgentConfig(repRoomSlug)                             │
│  3. Resolve mastraAgentId from config                            │
│  4. Create MastraAgent instance                                  │
│  5. Create CopilotRuntime with agent                             │
│  6. Create OpenAIAdapter                                          │
│  7. Return copilotRuntimeNextJSAppRouterEndpoint handler         │
│                                                                    │
│  Agent Registry (Dynamic Resolution)                             │
│    - the-sales-opener                                             │
│    - genesis-agent                                                │
│    - weather-agent                                                │
│    - project-agent                                                │
│                                                                    │
│  Tools (Per Agent)                                                │
│    - get-weather                                                  │
│    - change-background-color                                      │
│    - change-theme-colors                                          │
│    - control-theme-picker                                         │
│                                                                    │
│  Memory System                                                    │
│    - Thread-based conversation storage                            │
│    - Supabase persistence                                         │
│    - Participant attribution                                      │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
              ↓ Network / gRPC ↓
┌──────────────────────────────────────────────────────────────────┐
│              LIVEKIT CLOUD / AGENTS SERVICE                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Room Management                                                 │
│    - Creates room with repRoomSlug                               │
│    - Manages participant lifecycle                                │
│    - Broadcasts audio                                             │
│                                                                    │
│  Agent Job Context                                               │
│    - Dispatches voice agent for room                             │
│    - Provides JobContext to agent                                │
│                                                                    │
│  Data Channel                                                    │
│    - Real-time message exchange                                  │
│    - Transcript delivery                                          │
│    - Status updates                                               │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
              ↓ Process / Queue ↓
┌──────────────────────────────────────────────────────────────────┐
│         PYTHON VOICE AGENT (LiveKit Agents Service)              │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  VoiceAgentOrchestrator (Main Coordinator)                       │
│    ↓                                                               │
│                                                                    │
│  Input: STT Module                                                │
│    - Deepgram Speech-to-Text                                     │
│    - Per-participant audio streams                               │
│    - Turn detection (end-of-thought)                             │
│    ↓ Transcript                                                   │
│                                                                    │
│  Processing: CopilotKit Runtime Call                             │
│    - Call /api/copilotkit with:                                  │
│      * messages: [{ role, content }]                             │
│      * threadId, runId (for continuity)                          │
│      * headers: x-mastra-agent-id, x-tenant-id                   │
│    ↓ Streaming AI Response                                       │
│                                                                    │
│  Output: TTS Module                                               │
│    - ElevenLabs Text-to-Speech                                   │
│    - Converts response to audio                                  │
│    - Publishes audio track to room                               │
│    ↓ Voice Output                                                 │
│                                                                    │
│  Session Management                                              │
│    - Tracks conversation state                                   │
│    - Manages participant tracking                                │
│    - Handles multi-user interrupts                               │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
              ↓ WebRTC / Network ↓
┌──────────────────────────────────────────────────────────────────┐
│                   FRONTEND AUDIO/TEXT OUTPUT                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. Voice Output (Speaker)                                        │
│     Agent Audio → WebRTC Decode → Speaker Output                 │
│                                                                    │
│  2. Chat Bubble + Transcript                                      │
│     AI Response → CopilotKit Message → Bubble                    │
│                                                                    │
│  3. Visual Feedback                                               │
│     Speaking indicator, wave form, agent avatar                  │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 Framework Responsibilities

```
┌─────────────────────────────────────────────────────┐
│            COPILOTKIT (Chat UI Layer)               │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Owns:                                                │
│   • Chat message display                            │
│   • User input handling                             │
│   • Message streaming                               │
│   • Context providers                               │
│   • UI components (CopilotChat, Sidebar)           │
│                                                      │
│ Delegates To:                                       │
│   • Mastra for agent execution                     │
│   • LiveKit for voice I/O                          │
│   • Memory system for conversation history         │
│                                                      │
│ API Contract:                                       │
│   POST /api/copilotkit                             │
│   Body: { messages, threadId, runId, ... }        │
│   Response: Streaming SSE or JSON                  │
│                                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│        MASTRA (Agent Execution Layer)               │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Owns:                                                │
│   • Agent definitions                               │
│   • Tool system (invoke functions)                  │
│   • LLM model selection                             │
│   • Agent personality/instructions                 │
│   • Runtime context (dynamic personalization)      │
│   • Memory thread management                        │
│                                                      │
│ Consumed By:                                        │
│   • CopilotKit runtime (via @ag-ui/mastra)        │
│   • Voice agent STT processor                      │
│                                                      │
│ API Contract:                                       │
│   Internal to /api/copilotkit endpoint             │
│   Used via @ag-ui/mastra.MastraAgent wrapper      │
│                                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│       LIVEKIT (Voice I/O Layer)                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Owns:                                                │
│   • Room creation and management                    │
│   • Participant lifecycle                           │
│   • Audio track routing                             │
│   • Data channel (real-time messages)              │
│   • WebRTC negotiation                             │
│   • Token generation                               │
│                                                      │
│ Served By:                                          │
│   • Python voice agent (processes audio)          │
│   • STT provider (Deepgram)                        │
│   • TTS provider (ElevenLabs)                      │
│                                                      │
│ API Contract:                                       │
│   connect(serverUrl, token)                        │
│   room.localParticipant.publishTrack()             │
│   room.remoteParticipants.forEach()                │
│   room.onDataReceived()                            │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 4.3 Critical Integration Points

#### Integration Point 1: Agent Routing (Frontend → Mastra)

**Location**: `/mastra-agents/app/api/copilotkit/route.ts`

```typescript
// Extract rep room info
const repRoomSlug = url.searchParams.get('repRoomSlug');
const sessionId = req.headers.get('x-session-id');
const tenantId = req.headers.get('x-tenant-id');

// Resolve agent
const agentConfig = await getAgentConfig(repRoomSlug);
const { mastraAgentId } = agentConfig;

// Create runtime with correct agent
const runtime = new CopilotRuntime({
  agents: {
    [mastraAgentId]: mastraAgent,  // CRITICAL: Correct agent per room
  },
});
```

**Issue Addressed**: Each rep room can have different agents (weather-agent, genesis-agent, etc.)  
**Solution**: Dynamic agent resolution from database

#### Integration Point 2: Voice Output (Mastra Response → TTS)

**Location**: `/src/components/rep-room/VoiceCopilotBridge.tsx`

```typescript
// Monitor CopilotKit messages
const { visibleMessages } = useCopilotChat();

// Intercept assistant responses
const assistantMessage = visibleMessages.find(m => m.role === 'assistant');

// TTS Leader Election
const performLeaderElection = useCallback(() => {
  // Ensure only one participant synthesizes (prevents duplicate audio)
  const isTTSLeader = /* election logic */;
  
  if (isTTSLeader) {
    // Synthesize and play TTS
    await synthesizeAndPlay(assistantMessage.content);
  }
}, [visibleMessages]);
```

**Issue Addressed**: Multi-user rooms would get duplicate TTS (each user would synthesize)  
**Solution**: TTS leader election (only one user synthesizes, all hear audio)

#### Integration Point 3: Voice Input (STT → CopilotKit)

**Location**: `/server/voiceagent/orchestrator.py`

```python
# STT produces transcript
transcript_event = UserInputTranscribedEvent(...)

# Send to data channel
await send_transcript_event(
  session=session,
  transcript=transcript_event.text,
  final=transcript_event.final
)

# Frontend receives and creates message
# VoiceCopilotBridge or frontend handler calls:
// copilotChat.appendMessage({
//   role: 'user',
//   content: transcript
// });

# CopilotKit sends to /api/copilotkit
# Mastra processes with agent
```

**Issue Addressed**: Voice input needs to flow to chat, not duplicate in chat  
**Solution**: Data channel transcript delivery + frontend handling

#### Integration Point 4: Memory & Continuity (Mastra Memory)

**Location**: `/mastra-agents/lib/memory/index.ts`

```typescript
// Create thread-based memory
const memory = createMemoryForAgentType('general');

// Agent uses memory in tools
export const getWeatherTool = tool({
  description: 'Get weather data',
  parameters: z.object({
    location: z.string(),
  }),
  execute: async ({ location }) => {
    // Memory automatically tracks conversation
    // Next call to agent has conversation history
  }
});
```

**Issue Addressed**: Each agent call starts fresh without context  
**Solution**: Thread-based memory persisted to Supabase

---

## 5. KEY FILES AND THEIR ROLES

### Frontend Components

| File | Purpose | Role |
|------|---------|------|
| `/src/components/rep-room/VoiceCopilotBridge.tsx` | Voice/text bridge | Routes AI response to TTS; leader election |
| `/src/components/rep-room/DynamicCopilotKitProvider.tsx` | CopilotKit setup | Initializes CopilotKit with runtime endpoint |
| `/src/contexts/UnifiedVoiceContext.tsx` | Voice state management | Manages LiveKit room, participants |
| `/src/pages/RepRoomSessionPage.tsx` | Main rep room page | Orchestrates all voice/chat components |

### Backend API Routes

| File | Purpose | Role |
|------|---------|------|
| `/mastra-agents/app/api/copilotkit/route.ts` | Agent resolution | Dynamic agent lookup, runtime creation |
| `/api/copilotkit/route.ts` | Production proxy | Routes to mastra-agents service |
| `/mastra-agents/app/api/agents/route.ts` | Agent discovery | Lists available agents |
| `/mastra-agents/app/api/memory/ingress/route.ts` | Memory storage | Saves conversation messages |

### Mastra Agents

| File | Purpose | Role |
|------|---------|------|
| `/mastra-agents/lib/agents/weather-agent.ts` | Demo agent | Shows agent structure, tools |
| `/mastra-agents/lib/agents/genesis-agent.ts` | Dynamic agent | Demonstrates runtime context |
| `/mastra-agents/lib/tools/weather-tool.ts` | Tool example | Shows tool implementation |

### Python Voice Agent

| File | Purpose | Role |
|------|---------|------|
| `/server/voiceagent/orchestrator.py` | Main coordinator | Orchestrates all voice modules |
| `/server/voiceagent/agent_pool/pool_manager.py` | Agent pooling | Manages reusable agents |
| `/server/voiceagent/communication/data_channel.py` | Data channel | Real-time browser communication |
| `/server/voiceagent/session/stt_manager.py` | Speech-to-text | Manages STT lifecycle |
| `/server/voiceagent/tts/connection_manager.py` | Text-to-speech | Manages TTS connections |

---

## 6. DATA FLOW EXAMPLES

### Example 1: Text Chat Flow

```
User Types: "What's the weather in NYC?"
    ↓
useCopilotChat().appendMessage({
  role: 'user',
  content: 'What's the weather in NYC?'
})
    ↓
CopilotKit sends POST /api/copilotkit
  Headers: x-rep-room-slug=demo-room
  Body: { messages: [...], threadId: "th_123" }
    ↓
/mastra-agents/app/api/copilotkit/route.ts
  1. Extract repRoomSlug='demo-room'
  2. getAgentConfig('demo-room') → { mastraAgentId: 'weather-agent' }
  3. Create MastraAgent wrapping weatherAgent
  4. CopilotRuntime invokes agent with message
    ↓
weatherAgent receives request
  1. Message: "What's the weather in NYC?"
  2. Model (groq) decides to use 'get-weather' tool
  3. Tool called with location="NYC"
  4. Returns weather data
  5. Model generates response: "It's sunny in NYC, 72°F"
    ↓
Response sent back as SSE
    ↓
VoiceCopilotBridge intercepts response
  1. Detects new assistant message
  2. TTS leader election (only one user synthesizes)
  3. Calls ElevenLabs TTS
  4. Audio played to user
    ↓
Chat bubble shows: "It's sunny in NYC, 72°F"
Audio plays simultaneously
```

### Example 2: Voice Chat Flow

```
User Speaks: "What's the weather?"
    ↓
Microphone → WebRTC → LiveKit Room
    ↓
Python Voice Agent Job Started
  JobContext provided by LiveKit
    ↓
STT Manager subscribes to user audio
  Deepgram STT processes audio stream
    ↓
Transcript received: "What's the weather?"
  Turn detection triggers (end-of-thought detected)
    ↓
send_transcript_event() to data channel
  DataPacket sent to browser with transcript
    ↓
Frontend receives data channel packet
  DataChannelHandler processes it
    ↓
Frontend handler calls CopilotKit:
  appendMessage({
    role: 'user',
    content: 'What's the weather?'
  })
    ↓
[Same as text flow above]
    ↓
Agent generates response: "The weather is..."
    ↓
Response sent to data channel
  Frontend receives via SSE
  VoiceCopilotBridge.appendMessage() adds to chat
    ↓
TTS synthesizes: "The weather is..."
    ↓
Audio published to LiveKit room
  All participants hear the response
    ↓
Chat bubble appears with text
```

### Example 3: Dynamic Agent Resolution

```
RepRoom Configuration in Database:
  {
    slug: 'sales-training-room',
    mastraAgentId: 'the-sales-opener',
    runtimeContext: {
      agentName: 'Alex',
      instruction: 'You are a sales expert...',
      defaultLanguage: 'English'
    }
  }

Frontend calls VoiceCopilotBridge.connect() with:
  repRoomSlug='sales-training-room'

VoiceCopilotBridge passes to CopilotKit:
  runtimeEndpoint: '/api/copilotkit?repRoomSlug=sales-training-room'

CopilotKit sends request to endpoint:
  GET /api/copilotkit?repRoomSlug=sales-training-room

/mastra-agents/app/api/copilotkit/route.ts:
  1. Extract: repRoomSlug='sales-training-room'
  2. getAgentConfig('sales-training-room')
     → mastraAgentId='the-sales-opener'
     → runtimeContext={agentName, instruction, ...}
  3. AGENT_REGISTRY['the-sales-opener'] → theSalesOpenerAgent instance
  4. Create RuntimeContext and populate:
     properRuntimeContext.set('agentName', 'Alex')
     properRuntimeContext.set('instruction', 'You are a sales expert...')
  5. new MastraAgent({
       agent: theSalesOpenerAgent,
       runtimeContext: properRuntimeContext
     })
  6. new CopilotRuntime({
       agents: {
         'the-sales-opener': mastraAgent
       }
     })

User sends first message:
  → Routed to theSalesOpenerAgent
  → Agent instructions include 'agentName: Alex'
  → Agent personalizes response as if from Alex
  → Response streamed back and displayed
```

---

## 7. CONFIGURATION AND ENVIRONMENT

### Package Versions

**Frontend** (`/package.json`):
```
@copilotkit/react-core: 1.10.3
@copilotkit/react-ui: 1.10.3
@copilotkit/runtime-client-gql: 1.10.3
@copilotkit/shared: 1.10.3
@mastra/core: ^0.10.2-alpha.1
@mastra/memory: ^0.14.2
@ag-ui/mastra: ^0.0.8
livekit-client: ^2.13.4
@livekit/components-react: ^2.0.0
```

**Mastra Service** (`/mastra-agents/package.json`):
```
@copilotkit/runtime: 1.10.3
@mastra/core: ^0.16.0
@mastra/memory: ^0.14.4
@ag-ui/mastra: ^0.0.10
```

### Environment Variables

**Frontend**:
- `VITE_MASTRA_AGENTS_URL` - URL to mastra-agents service
- `VITE_LIVEKIT_URL` - LiveKit server URL
- `VITE_LIVEKIT_API_KEY` - LiveKit API key

**Mastra Service**:
- `MASTRA_AGENTS_URL` - Self URL (for caching, discovery)
- Database connection strings (for agent config lookup)
- LLM API keys (Groq, OpenAI)

**Voice Agent**:
- `LIVEKIT_URL` - LiveKit server URL
- `LIVEKIT_API_KEY` - LiveKit API key
- `DEEPGRAM_API_KEY` - STT provider
- `ELEVENLABS_API_KEY` - TTS provider

---

## 8. KEY ARCHITECTURAL PATTERNS

### Pattern 1: Provider Wrapping

**Location**: `/src/components/rep-room/DynamicCopilotKitProvider.tsx`

**Pattern**:
```typescript
<CopilotKit runtimeUrl="/api/copilotkit?repRoomSlug={repRoomSlug}">
  <VoiceCopilotBridge voiceConfig={config}>
    <RepRoomInterface />
  </VoiceCopilotBridge>
</CopilotKit>
```

**Benefit**: Centralizes CopilotKit configuration, passes context down

### Pattern 2: Dynamic Agent Resolution

**Location**: `/mastra-agents/app/api/copilotkit/route.ts`

**Pattern**:
```typescript
const agentConfig = await getAgentConfig(repRoomSlug);
const agent = AGENT_REGISTRY[agentConfig.mastraAgentId];
const runtime = new CopilotRuntime({
  agents: { [agentConfig.mastraAgentId]: agent }
});
```

**Benefit**: Different rep rooms can use different agents without code changes

### Pattern 3: TTS Leader Election

**Location**: `/src/components/rep-room/VoiceCopilotBridge.tsx`

**Pattern**:
```typescript
const performLeaderElection = () => {
  // Only oldest participant synthesizes
  const oldestParticipant = participants.sort(
    (a, b) => a.joinedAt - b.joinedAt
  )[0];
  
  setIsTTSLeader(currentParticipant.id === oldestParticipant.id);
};
```

**Benefit**: Prevents duplicate TTS audio in multi-user rooms

### Pattern 4: Session Caching

**Location**: `/mastra-agents/app/api/copilotkit/route.ts`

**Pattern**:
```typescript
const cachedRuntime = runtimeCache.get(cacheKey);
if (cachedRuntime && !hasExpired(cacheKey)) {
  return cachedRuntime;  // Reuse existing runtime
}

// Create new runtime only if cache miss or timeout
const runtime = new CopilotRuntime({...});
runtimeCache.set(cacheKey, runtime);
```

**Benefit**: Reduces runtime creation overhead, improves response time

### Pattern 5: Data Channel for Real-Time Messages

**Location**: `/server/voiceagent/communication/data_channel.py`

**Pattern**:
```python
# Server to browser: Send transcript
await send_transcript_event(
  session=session,
  transcript=transcript_event.text
)

# Frontend receives and processes
room.onDataReceived((packet) => {
  if (packet.type === 'transcript') {
    appendMessage({ role: 'user', content: packet.text });
  }
});
```

**Benefit**: Low-latency real-time communication, bypasses CopilotKit for STT

---

## 9. CRITICAL FIXES AND KNOWN ISSUES

### Fixed Issues

1. **REP-2931**: Multi-participant TTS duplication
   - **Fix**: TTS leader election in VoiceCopilotBridge
   - **Location**: `/src/components/rep-room/VoiceCopilotBridge.tsx:69-80`

2. **REP-4325**: Memory integration
   - **Fix**: Custom memory API endpoints with participant attribution
   - **Location**: `/mastra-agents/app/api/memory/`

3. **REP-4405**: STT optimization for sub-2s voice latency
   - **Fix**: Optimized STT integration module
   - **Location**: `/server/voiceagent/agent_pool/pool_manager.py`

4. **REP-4400**: Monolithic agent refactoring
   - **Fix**: Modular orchestrator with extracted components
   - **Location**: `/server/voiceagent/orchestrator.py`

### Current Architecture Considerations

1. **Separate Mastra Service Deployment**
   - Mastra agents run on separate Vercel deployment
   - CopilotKit routes through proxy in production
   - Allows independent scaling

2. **Runtime Caching**
   - 10-minute TTL to balance freshness vs. performance
   - Cache invalidation on agent config changes needed

3. **Memory System**
   - Thread-based storage in Supabase
   - Custom API endpoints for participant attribution
   - Not all tools track memory automatically

---

## 10. ARCHITECTURE DIAGRAM (ASCII)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         DREAMCREW REP ROOM ARCHITECTURE                     │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────┐           │
│  │                  FRONTEND (React + Vite)                     │           │
│  ├──────────────────────────────────────────────────────────────┤           │
│  │                                                                │           │
│  │  ┌───────────────────────────────────────┐                   │           │
│  │  │  DynamicCopilotKitProvider            │                   │           │
│  │  │  (CopilotKit Context)                 │                   │           │
│  │  └────────────────┬────────────────────┘                     │           │
│  │                   │                                            │           │
│  │  ┌────────────────▼────────────────────────────────┐          │           │
│  │  │  VoiceCopilotBridge                            │          │           │
│  │  │  ├─ useCopilotChat()                           │          │           │
│  │  │  ├─ Intercepts AI responses                    │          │           │
│  │  │  ├─ TTS Leader Election                        │          │           │
│  │  │  └─ Calls ElevenLabs TTS                       │          │           │
│  │  └────────────────┬────────────────────────────────┘          │           │
│  │                   │                                            │           │
│  │  ┌────────────────▼────────────────────────────────┐          │           │
│  │  │  UnifiedVoiceContext                           │          │           │
│  │  │  ├─ LiveKit Room Connection                    │          │           │
│  │  │  ├─ Participant Tracking                       │          │           │
│  │  │  ├─ Voice UI Updates                           │          │           │
│  │  │  └─ Data Channel Handling                      │          │           │
│  │  └────────────────┬────────────────────────────────┘          │           │
│  │                   │                                            │           │
│  │  ┌────────────────▼────────────────────────────────┐          │           │
│  │  │  Chat UI Components                            │          │           │
│  │  │  ├─ CopilotChat (Message Display)              │          │           │
│  │  │  ├─ Text Input Field                           │          │           │
│  │  │  ├─ Voice Waveform                             │          │           │
│  │  │  └─ Participant List                           │          │           │
│  │  └────────────────────────────────────────────────┘          │           │
│  │                                                                │           │
│  └──────────────────────────┬───────────────────────────────────┘           │
│                             │                                                │
│                    HTTP/WebRTC                                              │
│                             │                                                │
│  ┌──────────────────────────▼───────────────────────────────────┐           │
│  │              BACKEND API LAYER (Next.js)                     │           │
│  ├──────────────────────────────────────────────────────────────┤           │
│  │                                                                │           │
│  │  /api/copilotkit (Proxy)                                     │           │
│  │    ├─ Forwards to mastra-agents service                     │           │
│  │    └─ Handles streaming responses                           │           │
│  │                                                                │           │
│  │  /api/voice-token (Edge Function)                            │           │
│  │    ├─ JWT token generation                                   │           │
│  │    └─ Room credentials                                       │           │
│  │                                                                │           │
│  │  /api/agents/* (Discovery)                                   │           │
│  │    └─ Agent listing and configuration                        │           │
│  │                                                                │           │
│  └──────────────────────────┬───────────────────────────────────┘           │
│                             │                                                │
│              Network Boundary (Production: HTTP/gRPC)                       │
│                             │                                                │
│  ┌──────────────────────────▼───────────────────────────────────┐           │
│  │       MASTRA AGENTS SERVICE (Vercel Deployment)              │           │
│  ├──────────────────────────────────────────────────────────────┤           │
│  │                                                                │           │
│  │  /api/copilotkit/route.ts (Main Handler)                    │           │
│  │    ├─ Dynamic Agent Resolution                              │           │
│  │    │  ├─ Extract repRoomSlug                                │           │
│  │    │  ├─ getAgentConfig() → Database                        │           │
│  │    │  └─ Resolve agent from registry                        │           │
│  │    │                                                          │           │
│  │    └─ Runtime Creation                                      │           │
│  │       ├─ Create MastraAgent wrapper                         │           │
│  │       ├─ Create CopilotRuntime                              │           │
│  │       └─ Return streaming handler                           │           │
│  │                                                                │           │
│  │  ┌──────────────────────────────────────────────┐            │           │
│  │  │  Agent Registry (In-Memory)                  │            │           │
│  │  │  ├─ the-sales-opener                        │            │           │
│  │  │  ├─ genesis-agent                           │            │           │
│  │  │  ├─ weather-agent                           │            │           │
│  │  │  └─ project-agent                           │            │           │
│  │  └──────────────────────────────────────────────┘            │           │
│  │                                                                │           │
│  │  ┌──────────────────────────────────────────────┐            │           │
│  │  │  Mastra Agents                               │            │           │
│  │  │  ├─ Tools (weather, color, theme)           │            │           │
│  │  │  ├─ LLM Models (Groq, OpenAI)               │            │           │
│  │  │  ├─ Memory System                            │            │           │
│  │  │  └─ Runtime Context (Dynamic Personalization)           │           │
│  │  └──────────────────────────────────────────────┘            │           │
│  │                                                                │           │
│  │  /api/memory/* (Memory Endpoints)                            │           │
│  │    ├─ /ingress → Store messages                             │           │
│  │    ├─ /list → Retrieve history                              │           │
│  │    └─ /action-log → Log actions                             │           │
│  │                                                                │           │
│  └──────────────────────────┬───────────────────────────────────┘           │
│                             │                                                │
│                    gRPC / WebRTC                                            │
│                             │                                                │
│  ┌──────────────────────────▼───────────────────────────────────┐           │
│  │        LIVEKIT CLOUD & AGENTS SERVICE                        │           │
│  ├──────────────────────────────────────────────────────────────┤           │
│  │                                                                │           │
│  │  ┌────────────────────────────────┐                         │           │
│  │  │  LiveKit Room Manager          │                         │           │
│  │  │  ├─ Room creation              │                         │           │
│  │  │  ├─ Participant management     │                         │           │
│  │  │  ├─ Audio track routing        │                         │           │
│  │  │  └─ Room metadata              │                         │           │
│  │  └────────────────────────────────┘                         │           │
│  │                                                                │           │
│  │  ┌────────────────────────────────────────────────┐          │           │
│  │  │  JobContext (Agent Dispatch)                   │          │           │
│  │  │  └─ Python voice agent worker spawned here    │          │           │
│  │  └────────────────────────────────────────────────┘          │           │
│  │                                                                │           │
│  │  ┌────────────────────────────────────────────────┐          │           │
│  │  │  Data Channel                                  │          │           │
│  │  │  ├─ Transcript events (STT output)            │          │           │
│  │  │  ├─ Status updates                             │          │           │
│  │  │  └─ Real-time message exchange                │          │           │
│  │  └────────────────────────────────────────────────┘          │           │
│  │                                                                │           │
│  └──────────────────────────┬───────────────────────────────────┘           │
│                             │                                                │
│                         JobQueue                                            │
│                             │                                                │
│  ┌──────────────────────────▼───────────────────────────────────┐           │
│  │      PYTHON VOICE AGENT (Voice Agent Worker)                 │           │
│  ├──────────────────────────────────────────────────────────────┤           │
│  │                                                                │           │
│  │  VoiceAgentOrchestrator (Main Coordinator)                  │           │
│  │    │                                                          │           │
│  │    ├─ STT Pipeline (Deepgram)                                │           │
│  │    │  ├─ Subscribe to participant audio tracks             │           │
│  │    │  ├─ Stream audio to Deepgram                           │           │
│  │    │  ├─ Receive transcripts                                │           │
│  │    │  └─ Detect end-of-thought (turn detection)            │           │
│  │    │     └─ Send to data channel → Frontend                │           │
│  │    │                                                          │           │
│  │    ├─ Agent Execution                                       │           │
│  │    │  ├─ POST to /api/copilotkit                            │           │
│  │    │  │  └─ Body: { messages, threadId, ... }              │           │
│  │    │  └─ Receive streaming response                         │           │
│  │    │                                                          │           │
│  │    └─ TTS Pipeline (ElevenLabs)                             │           │
│  │       ├─ Synthesize response to audio                       │           │
│  │       └─ Publish audio track to room                        │           │
│  │          └─ All participants hear response                  │           │
│  │                                                                │           │
│  │  Supporting Modules:                                        │           │
│  │    ├─ Agent Pool Manager (Reusable agents)                 │           │
│  │    ├─ Session Manager (Lifecycle)                          │           │
│  │    ├─ Room Manager (Participant tracking)                  │           │
│  │    ├─ Interrupt Handler (Barge-in, multi-user)             │           │
│  │    └─ Transcript Manager (Buffer & finalizer)              │           │
│  │                                                                │           │
│  └──────────────────────────────────────────────────────────────┘           │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘

Key Data Flows:
  → Text Chat: User Text → CopilotKit → /api/copilotkit → Mastra → TTS → Output
  ← Voice Chat: User Voice → STT → Data Channel → Chat → CopilotKit → [same]
  ↔ Memory: Conversation history stored in Supabase via /api/memory/*
  ↔ Dynamic: Rep room config drives agent selection and personalization
```

---

## 11. DEPENDENCIES ANALYSIS

### CopilotKit Dependency Tree
```
@copilotkit/react-core
  ├─ @copilotkit/shared
  ├─ @copilotkit/runtime-client-gql
  │  └─ graphql
  ├─ React 18+
  └─ TypeScript

@copilotkit/react-ui
  ├─ @copilotkit/react-core
  └─ Radix UI components
```

### Mastra Dependency Tree
```
@mastra/core
  ├─ @mastra/memory (optional)
  │  └─ Database adapters (Supabase, PostgreSQL)
  ├─ @ai-sdk/* (model packages)
  │  ├─ @ai-sdk/groq
  │  └─ @ai-sdk/openai
  ├─ Zod (schema validation)
  └─ TypeScript

@ag-ui/mastra
  ├─ @mastra/core
  └─ Provides CopilotKit adapter
```

### LiveKit Dependency Tree
```
livekit-client
  ├─ WebRTC APIs
  ├─ Protocol buffers (room events)
  └─ EventEmitter

@livekit/components-react
  ├─ livekit-client
  ├─ React 18+
  └─ Tailwind CSS

livekit-server-sdk
  └─ JWT signing, token generation

livekit.agents (Python)
  ├─ aiohttp (async HTTP)
  ├─ websockets (real-time)
  ├─ protobuf (serialization)
  └─ Plugins:
      ├─ livekit.plugins.deepgram (STT)
      └─ livekit.plugins.elevenlabs (TTS)
```

---

## 12. SECURITY CONSIDERATIONS

### Token Management
- **JWT Tokens**: LiveKit tokens generated server-side
- **Token TTL**: Configurable per deployment
- **Signing**: Signed with LIVEKIT_API_KEY

### API Security
- **CORS**: Enabled for Mastra service (allows cross-origin)
- **Headers**: Custom headers for agent ID, tenant ID, user ID
- **Data Channel**: Encrypted WebRTC data channel

### Memory/Conversation Privacy
- **Database**: Supabase with row-level security possible
- **Threads**: Thread IDs isolate conversations
- **Participants**: Attribution stored but not publicly visible

---

## 13. DEPLOYMENT ARCHITECTURE

### Development Environment
```
Local Machine:
  ├─ Frontend (Vite): http://localhost:5173
  ├─ CopilotKit Server: http://localhost:3001
  ├─ Python Voice Agent: http://localhost:8081
  └─ Mastra Dev Server: http://localhost:3000
```

### Production Environment
```
Vercel (Frontend):
  └─ Next.js app with CopilotKit proxy

Vercel (Mastra Service):
  └─ Next.js app: mastra-agents-ten.vercel.app
     ├─ /api/copilotkit → Agent resolution
     ├─ /api/agents/* → Discovery
     └─ /api/memory/* → Conversation storage

LiveKit Cloud:
  ├─ Room management
  └─ Agent job dispatching

Fly.io or Self-Hosted:
  └─ Python voice agent workers
```

---

## 14. TESTING STRATEGY

### Unit Tests
- **Location**: `/tests/unit/`
- **Agent tests**: Verify agent behavior
- **Tool tests**: Test individual tools

### Integration Tests
- **Voice flow**: STT → Chat → TTS
- **Agent resolution**: Rep room slug → correct agent
- **Memory**: Conversation persistence

### E2E Tests
- **Chat flow**: User message → AI response → display
- **Voice flow**: User speech → agent response → audio playback
- **Multi-user**: Multiple participants, TTS leader election

---

## CONCLUSION

The DreamCrew codebase implements a sophisticated integration of three frameworks:

1. **CopilotKit** handles the chat UI layer and runtime orchestration
2. **Mastra** provides the AI agent execution with tools and memory
3. **LiveKit** enables real-time voice communication

These three work together through a well-defined architecture where:
- **Frontend** passes `repRoomSlug` to backend
- **Backend** resolves the correct agent dynamically
- **Mastra** executes the agent with configured tools and context
- **LiveKit** handles voice I/O and real-time messaging
- **Python Voice Agent** bridges Mastra and LiveKit for voice interactions

The architecture supports multi-user rooms, dynamic agent personalization, conversation memory, and low-latency voice interaction, making it suitable for the DreamCrew partner program demos and sales conversations.
