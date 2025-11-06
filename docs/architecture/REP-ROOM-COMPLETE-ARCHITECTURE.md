# Complete Rep Room Architecture Documentation

**Date**: November 2025  
**Version**: 3.0  
**Status**: Production  
**Last Updated**: REP-4900 (Multi-participant support)

---

## Table of Contents

1. [Rep Room Structure & Database Schema](#rep-room-structure--database-schema)
2. [Rep Room Components & UI Architecture](#rep-room-components--ui-architecture)
3. [Multi-Participant Coordination](#multi-participant-coordination)
4. [Session Management](#session-management)
5. [Voice vs Text Implementation](#voice-vs-text-implementation)
6. [Real-time Updates & Data Flow](#real-time-updates--data-flow)
7. [API Routes & Endpoints](#api-routes--endpoints)
8. [TypeScript Types & Interfaces](#typescript-types--interfaces)

---

## Rep Room Structure & Database Schema

### Core Database Tables

#### 1. `rep_rooms` Table
Stores the definition of each rep room and its configuration.

```sql
-- Main rep room definition
CREATE TABLE rep_rooms (
  id UUID PRIMARY KEY,
  user_agent_clone_id UUID NOT NULL,
  is_enabled BOOLEAN,
  public_slug TEXT NOT NULL UNIQUE,
  title TEXT,
  intro_text TEXT,
  settings JSONB,  -- Contains appearance, behavior, deployment, header, voice configs
  
  -- Mastra integration
  mastra_api_base_url TEXT,
  mastra_agent_id TEXT,
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Key Fields**:
- `public_slug`: Unique identifier for accessing the rep room publicly (e.g., "acme-support")
- `user_agent_clone_id`: Link to the agent that powers this room
- `settings`: JSON structure containing all UI, behavior, and voice configuration

**Settings Structure**:
```json
{
  "appearance": {
    "theme_color": "#3B82F6",
    "background_type": "solid",
    "background_color": "#F8FAFC",
    "avatar_url": "...",
    "secondary_color": "...",
    "accent_color": "..."
  },
  "behavior": {
    "greeting_message": "Hello! How can I help?",
    "suggested_prompts_enabled": true,
    "suggested_prompts": ["..."],
    "voice_input_enabled": true,
    "file_upload_enabled": false,
    "memory_persistence_enabled": true
  },
  "deployment": {
    "visibility": "public|private",
    "password_protection_enabled": false,
    "password": "...",
    "domain_restrictions": [],
    "embed_enabled": true
  },
  "voice": {
    "tts": { "provider": "elevenlabs", "voice_id": "..." },
    "stt": { "provider": "deepgram", "model": "nova-2" },
    "interaction": { ... }
  }
}
```

#### 2. `rep_room_sessions` Table
Tracks active sessions within rep rooms for multi-participant support.

```sql
CREATE TABLE rep_room_sessions (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL,
  session_id TEXT NOT NULL UNIQUE,
  room_name TEXT NOT NULL,
  status TEXT ('active'|'ended'|'paused'|'error'),
  participant_count INTEGER,
  agent_joined BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Key Fields**:
- `session_id`: Unique identifier for this session
- `room_name`: LiveKit room name for voice sessions
- `participant_count`: Real-time count of active participants
- `agent_joined`: Whether the AI agent has joined this session

#### 3. `rep_room_participants` Table
Tracks individual participants in sessions.

```sql
CREATE TABLE rep_room_participants (
  id UUID PRIMARY KEY,
  session_id TEXT NOT NULL (FK rep_room_sessions),
  participant_id TEXT NOT NULL,
  name TEXT,
  joined_at TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  is_active BOOLEAN,
  metadata JSONB
);
```

**Supports**:
- Multiple users in one session
- Agent participants
- Metadata for device info, location, etc.

#### 4. `rep_room_voice_sessions` Table
Stores voice interaction sessions with LiveKit integration.

```sql
CREATE TABLE rep_room_voice_sessions (
  id UUID PRIMARY KEY,
  rep_room_id UUID NOT NULL,
  user_agent_clone_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  
  -- LiveKit Details
  livekit_room_name TEXT NOT NULL,
  livekit_session_id TEXT,
  livekit_participant_id TEXT,
  
  -- Session Status
  status voice_session_status ('initializing'|'connecting'|'active'|'ended'|'failed'|'timeout'),
  participant_name TEXT,
  participant_metadata JSONB,
  voice_config JSONB,
  
  -- Timing
  started_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Quality Metrics
  audio_quality_score NUMERIC(3,2),
  connection_quality_score NUMERIC(3,2),
  cost_credits NUMERIC(18,6),
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### 5. `agent_conversation_participants` Table (REP-4900)
Multi-participant conversation tracking - NEW.

```sql
CREATE TABLE agent_conversation_participants (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL (FK agent_memory_conversations),
  
  -- Participant identification
  participant_type TEXT ('agent'|'human'|'system'),
  participant_id UUID,  -- user_id for humans, agent clone id for agents
  participant_name TEXT,
  
  -- Tenant isolation
  tenant_id UUID NOT NULL,
  
  -- Participation tracking
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,
  is_active BOOLEAN GENERATED (left_at IS NULL),
  participant_role TEXT ('owner'|'admin'|'viewer'|'guest'),
  
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Key Features**:
- **Multi-user support**: Tracks when each user joins/leaves
- **Agent participation**: Agents are tracked as participants
- **Role-based access**: Different roles (owner, admin, viewer, guest)
- **Tenant isolation**: Critical for multi-tenant security

#### 6. `agent_conversation_status` Table (REP-4900)
Real-time status tracking for conversations - NEW.

```sql
CREATE TABLE agent_conversation_status (
  conversation_id UUID PRIMARY KEY (FK agent_memory_conversations),
  
  -- Conversation state
  is_active BOOLEAN,
  conversation_type TEXT ('text'|'voice'|'video'|'mixed'),
  
  -- Voice/Video (LiveKit)
  livekit_room_id TEXT,
  livekit_room_name TEXT,
  livekit_session_id TEXT,
  
  -- Participant tracking
  participant_count INTEGER,
  active_participants JSONB[],  -- Array of active participant IDs
  
  -- Activity tracking
  last_message_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Message statistics
  total_messages INTEGER,
  messages_last_minute INTEGER,
  
  -- Agent performance
  average_response_time_ms INTEGER,
  last_agent_response_at TIMESTAMPTZ,
  
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### 7. `agent_conversation_recordings` Table (REP-4900 - Roadmap)
Recording metadata for voice/video conversations.

```sql
CREATE TABLE agent_conversation_recordings (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL (FK agent_memory_conversations),
  tenant_id UUID NOT NULL,
  
  recording_type TEXT ('audio'|'video'|'screen'|'mixed'),
  storage_bucket TEXT,
  storage_path TEXT,
  recording_url TEXT,
  
  file_size_bytes BIGINT,
  duration_seconds INTEGER,
  format TEXT ('mp3'|'wav'|'webm'|'mp4'),
  
  -- Transcription
  has_transcription BOOLEAN,
  transcription_text TEXT,
  transcription_metadata JSONB,
  
  -- Participant tracking
  participant_count INTEGER,
  speaker_segments JSONB,
  
  -- Retention policy
  retention_policy TEXT ('standard'|'extended'|'permanent'|'gdpr_compliant'),
  delete_after TIMESTAMPTZ,
  is_redacted BOOLEAN,
  
  processing_status TEXT ('pending'|'processing'|'completed'|'failed'),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Database Relationships

```
rep_rooms
  ├── user_agent_clones (FK: user_agent_clone_id)
  ├── rep_room_sessions (1:N via slug)
  ├── rep_room_voice_sessions (1:N)
  └── agent_conversation_participants (via conversations)

rep_room_sessions
  └── rep_room_participants (1:N via session_id)

agent_memory_conversations
  ├── agent_conversation_participants (1:N)
  ├── agent_conversation_status (1:1)
  ├── agent_conversation_recordings (1:N)
  ├── agent_memory_messages (1:N)
  └── rep_room_voice_sessions (1:N via rep_room_id)
```

---

## Rep Room Components & UI Architecture

### Component Hierarchy

```
Pages
├── RepRoomPage.tsx (Demo/basic interface)
├── VoiceRepRoomPage.tsx (Main voice interface)
├── RepRoomPageV3.tsx (Latest production)
└── EmbeddedWidgetRepRoomPage.tsx (Embedded widget mode)

Components
├── rep-room/
│   ├── RepRoomInterface.tsx (Core multi-participant UI)
│   ├── RepRoomManager.tsx (Session management wrapper)
│   ├── RepRoomUI.tsx (Alternative implementation)
│   ├── RepRoomUIWithTurnDetection.tsx (Turn-based interactions)
│   ├── ParticipantsPanel.tsx (Display active users)
│   ├── ConversationFlow.tsx (Message display)
│   ├── PresentationArea.tsx (Content display)
│   └── VoiceEnabledRepRoom.tsx (Voice mode handler)
│
├── rep-room-t1/ (Tier 1 - Enhanced voice)
│   ├── RepRoomT1Interface.tsx (Main T1 component)
│   ├── RepRoomT1Interface-fixed.tsx (Fixed version)
│   └── RepRoomT1InterfaceFixed.tsx (Alternate fix)
│
├── rep-room-master/ (Master/orchestrator)
│   └── RepRoomMasterT1Interface.tsx (Master coordinator)
│
├── rep-room-enhanced/ (Enhanced features)
│   └── RepRoomEnhancedVoiceInterface.tsx (Advanced voice)
│
└── rep-room-voice/ (Voice-specific)
    ├── RepRoomVoiceInterface.tsx (Voice chat)
    └── RepeatCommandHandler.tsx (Voice commands)
```

### Canonical Rep Room Component

**Primary**: `/src/components/rep-room-master/RepRoomMasterT1Interface.tsx`

```typescript
export const RepRoomMasterT1Interface: React.FC = () => {
  // Core state
  const [voiceState, setVoiceState] = useState<'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'processing'>();
  const [messages, setMessages] = useState<Message[]>();
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // LiveKit room reference
  const roomRef = useRef<Room | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  
  // Key functions
  - getVoiceToken(): Fetches LiveKit token from API
  - connectToRoom(): Establishes LiveKit room connection
  - startListening(): Begins STT (speech-to-text)
  - stopListening(): Ends STT
  - handleAgentResponse(): Processes TTS output
  - handleAudioLevelMonitoring(): Tracks voice activity
}
```

**Key Features**:
- Voice state management (disconnected, connecting, connected, listening, speaking, processing)
- Audio level monitoring via Web Audio API
- LiveKit room connection management
- Message history with timestamps
- Voice mode toggle
- Mute/unmute functionality
- Transcript display

### Voice Modes & Switching

```typescript
interface RepRoomSettings {
  behavior: {
    voice_input_enabled: boolean;  // Enable/disable voice
    file_upload_enabled: boolean;
    memory_persistence_enabled: boolean;
  },
  voice: VoiceSettings  // Voice configuration
}

// Mode switching logic:
// 1. Check behavior.voice_input_enabled
// 2. Load VoiceSettings from settings.voice
// 3. Initialize TTS/STT providers
// 4. Connect to LiveKit room
```

### Password Protection Implementation

```typescript
// In settings.deployment:
{
  password_protection_enabled: boolean,
  password: string  // Encrypted in transit
}

// Page-level check:
useEffect(() => {
  if (settings.deployment.password_protection_enabled) {
    showPasswordPrompt();
    // Verify against password before allowing access
  }
})
```

---

## Multi-Participant Coordination

### User Tracking Architecture

**Problem**: How do we track multiple users in one rep room?

**Solution**: `agent_conversation_participants` + `agent_conversation_status`

```typescript
// When a user joins:
1. Create row in agent_conversation_participants
   - participant_type: 'human'
   - participant_id: user.id
   - is_active: true
   - joined_at: NOW()

2. Update agent_conversation_status
   - participant_count++
   - active_participants: [user1_id, user2_id, ...]

3. Broadcast to other participants via real-time subscription

// When a user leaves:
1. Update agent_conversation_participants
   - is_active: false
   - left_at: NOW()

2. Update agent_conversation_status
   - participant_count--
   - active_participants: remove user_id

3. Broadcast to remaining participants
```

### Message Ordering & Timestamping

```typescript
interface RepRoomMessage {
  id: string;
  sender: string;  // Participant name
  content: string;
  timestamp: Date;  // UTC timestamp
  type: 'user' | 'agent' | 'system';
  participantId?: string;  // Which participant sent this
  participantKind?: 'human' | 'agent';
  metadata?: {
    isTyping?: boolean;
    isEdited?: boolean;
    audioUrl?: string;  // For voice messages
  }
}

// Ordering:
// Messages stored in agent_memory_messages table
// ORDER BY created_at ASC (chronological order)
// Frontend: Load messages, sort by timestamp, display in order
```

### Turn-Taking Logic (Optional)

Not currently implemented, but architecture supports:

```typescript
interface ConversationState {
  currentSpeaker: string | null;  // Participant ID of who can speak
  queue: string[];  // Waiting to speak
  turnDuration: number;  // ms per turn
}

// Turn-taking would use:
// 1. Realtime subscriptions to participant updates
// 2. Web Audio API to detect speech
// 3. Data channels to communicate turn state
```

### @ Mentions (Addressing Agents)

**Not currently implemented**, but design:

```typescript
// In message content:
const mentions = content.match(/@(\w+)/g);
// ["@agent-name", "@user-name"]

// When parsing message:
mentions.forEach(mention => {
  const targetParticipant = participants.find(p => p.name === mention);
  // Create mention notification
  // Route message specifically to that agent
});

// Real-time: Alert mentioned participant
supabase
  .channel(`mentions:${participant_id}`)
  .on('broadcast', { event: 'mention' }, payload => {
    showMentionNotification(payload);
  })
```

### Agent-to-Agent Visibility

**Architecture**:

```typescript
// Agent 1 can see Agent 2 if:
1. Both in same conversation
2. Both are in active_participants list
3. Both have is_active = true in agent_conversation_participants

// Agents communicate via:
1. Data channels (LiveKit)
2. agent_memory_messages with role='assistant'
3. Real-time subscriptions to agent_memory_conversations

// Agent visibility controlled by:
- RLS policies on agent_conversation_participants
- Tenant isolation via tenant_id
```

---

## Session Management

### Session Creation & Joining

**Flow**:

```
1. User accesses /rr/{slug}/{sessionId} (or creates new)
2. Frontend calls /api/create-rep-room-session
3. Backend:
   - Looks up rep room by slug
   - Validates password (if enabled)
   - Creates session in rep_room_sessions
   - Creates entry in rep_room_participants for user
   - Generates LiveKit token
   - Returns: { sessionId, token, roomName, url }
4. Frontend:
   - Connects to LiveKit room
   - Sets up voice pipeline (if enabled)
   - Loads conversation history
   - Subscribes to real-time updates
```

**Code**:
```javascript
// api/create-rep-room-session.js
export default async function handler(req, res) {
  const { rep_room_slug, participant_name, metadata } = req.body;
  
  // Generate session ID
  const sessionId = nanoid(12);
  
  // TODO: Supabase integration to:
  // 1. Verify rep room exists and is enabled
  // 2. Check password if required
  // 3. Create session in rep_room_sessions
  // 4. Add participant to rep_room_participants
  
  // Return mock for now
  return res.status(201).json({
    session_id: sessionId,
    redirect_url: `/rr/${rep_room_slug}/${sessionId}`
  });
}
```

### Session Persistence

**Duration**: Sessions persist while...

```typescript
// Session is ACTIVE if:
1. status = 'active' in rep_room_sessions
2. At least one participant is_active = true
3. Created < 24 hours ago (configurable)

// Session ENDS when:
1. All participants leave (last_seen > 30 min timeout)
2. Explicitly closed by admin
3. Duration limit exceeded

// Session RESUMPTION:
1. User can return to same session within window
2. Conversation history is preserved
3. Previous messages loaded from agent_memory_messages
4. New participant count incremented
```

### Active vs Archived Rep Rooms

```typescript
// Active:
- is_enabled = true
- Visible in public listings
- Can create new sessions
- Real-time subscriptions active

// Archived:
- is_enabled = false
- Not shown in public
- Existing sessions continue
- No new sessions allowed
```

### Session Resumption

```typescript
useEffect(() => {
  // Check if session exists
  const existingSession = await checkSessionStatus(sessionId);
  
  if (existingSession && existingSession.isActive) {
    // Rejoin existing session
    loadConversationHistory(sessionId);
    subscribeToUpdates(sessionId);
  } else if (existingSession && !existingSession.isActive) {
    // Session expired, create new one
    createNewSession(repRoomSlug);
  } else {
    // First time, create new session
    createNewSession(repRoomSlug);
  }
}, [sessionId, repRoomSlug]);

// Cleanup:
return () => {
  // Mark participant as inactive when leaving
  updateParticipant(sessionId, participantId, { is_active: false });
};
```

### Cleanup Logic

```typescript
// Server-side cron job (scheduled):
// 1. Find sessions with no active participants
// 2. If last activity > 30 minutes, set status = 'ended'
// 3. Archive conversation
// 4. Clean up related records (optional retention)

// Frontend-side:
// 1. On page unload, mark participant inactive
// 2. On tab visibility change, sync status
// 3. Heartbeat every 5 minutes to update last_seen
```

---

## Voice vs Text Implementation

### Voice-Only Rooms

```typescript
// Configuration:
settings.behavior.voice_input_enabled = true
settings.behavior.file_upload_enabled = false

// Components:
- RepRoomVoiceInterface.tsx (primary)
- RepRoomMasterT1Interface.tsx (enhanced)

// Features:
- Live transcription display
- Speech-to-text (Deepgram)
- Text-to-speech (ElevenLabs)
- Audio level monitoring
- Voice activity detection
```

### Text-Only Rooms

```typescript
// Configuration:
settings.behavior.voice_input_enabled = false
settings.voice: { ... }  // Still configured but disabled

// Components:
- RepRoomInterface.tsx (basic)
- RepRoomChatInterface.tsx (chat-focused)

// Features:
- Text input box
- Message history
- No audio pipeline
```

### Hybrid Mode (Voice + Text)

```typescript
// Configuration:
settings.behavior.voice_input_enabled = true
// AND text input available

// Architecture:
// Both channels share:
// 1. Same conversation history
// 2. Same participants
// 3. Same agent responses
// 4. Same real-time subscriptions

// Messages tracked as:
interface Message {
  channel: 'voice' | 'text' | 'system';
  transcript?: string;  // STT output
  audioUrl?: string;    // TTS output
}

// User can:
1. Send text while listening to voice
2. Interrupt agent speech via text
3. Switch modes mid-conversation
```

### Mode Switching Implementation

```typescript
// In component:
const [isVoiceActive, setIsVoiceActive] = useState(false);

const handleToggleVoice = async () => {
  if (!isVoiceActive) {
    // Enable voice mode
    try {
      const token = await getVoiceToken();
      await connectToLiveKit(token);
      setIsVoiceActive(true);
    } catch (err) {
      toast.error('Failed to enable voice mode');
    }
  } else {
    // Disable voice mode
    await disconnectFromLiveKit();
    setIsVoiceActive(false);
  }
};

// Render conditional UI:
{isVoiceActive ? (
  <VoiceControls />
) : (
  <TextInput />
)}
```

### LiveKit Integration in Rep Room

**LiveKit Architecture**:

```
┌─────────────────────────────────────────┐
│         Rep Room Frontend                │
│  (Browser: user & agent audio/video)    │
└────────────┬────────────────────────────┘
             │
             │ WebRTC
             │
┌────────────▼────────────────────────────┐
│        LiveKit Server                    │
│  - Media routing                         │
│  - Recording (optional)                  │
│  - Data channels                         │
│  - Room/Participant management           │
└────────────┬────────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
      ▼             ▼
   Agent      (future: agents from cloud)
   Process
```

**Token Generation**:

```javascript
// api/rep-room-voice-token.js
async function generateLiveKitToken(roomName, participantName, identity) {
  const at = new AccessToken(apiKey, apiSecret, {
    identity: identity,
    name: participantName
  });
  
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });
  
  return at.toJwt();
}

// Room name format:
const roomName = `rrs-${rep_room_slug}-${sessionId}`;
// Example: rrs-acme-support-session-123456
```

---

## Real-time Updates & Data Flow

### Real-time Subscription Architecture

**Using Supabase Realtime**:

```typescript
// Subscribe to conversation status changes:
const channel = supabase
  .channel(`agent_conversation_status:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'agent_conversation_status',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      console.log('Status update:', payload);
      setParticipantCount(payload.new.participant_count);
      setLastActivityAt(payload.new.last_activity_at);
    }
  )
  .subscribe();

// Subscribe to new messages:
const messagesChannel = supabase
  .channel(`agent_memory_messages:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'agent_memory_messages',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      console.log('New message:', payload);
      setMessages(prev => [...prev, payload.new]);
    }
  )
  .subscribe();

// Subscribe to participant changes:
const participantsChannel = supabase
  .channel(`agent_conversation_participants:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: '*',  // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'agent_conversation_participants',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        console.log('Participant joined:', payload.new);
        // Add to active participants
      } else if (payload.eventType === 'UPDATE') {
        if (payload.new.is_active === false) {
          console.log('Participant left:', payload.old.participant_name);
          // Remove from active participants
        }
      }
    }
  )
  .subscribe();

// Cleanup:
return () => {
  channel.unsubscribe();
  messagesChannel.unsubscribe();
  participantsChannel.unsubscribe();
};
```

### Message Flow Diagram

```
User Types Message
       ↓
Message sent to API
       ↓
Agent processes (via CopilotKit/Mastra)
       ↓
Agent response generated
       ↓
Message stored in agent_memory_messages
       ↓
Supabase real-time triggers
       ↓
All subscribed clients notified
       ↓
Messages displayed in UI (chronological)
       ↓
TTS generates audio (if voice enabled)
       ↓
Audio played to user
```

### WebSocket/SSE Implementation

**Current**: Supabase Realtime (WebSocket-based)
**Alternative polling**: `/api/rep-room-sync.js`

```javascript
// api/rep-room-sync.js (HTTP polling)
// GET /api/rep-room-sync?sessionId=...&lastMessageId=...
// Returns: { messages: [...], participantCount, status }

// POST /api/rep-room-sync
// Body: { sessionId, type, message, timestamp }
// Handles: 'participant_joined', 'participant_left', 'message', etc.

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Return new messages since lastMessageId
    const messages = getSessionMessages(sessionId, lastMessageId);
    return res.status(200).json({
      messages,
      participantCount: sessionParticipants.get(sessionId),
      status: 'success'
    });
  }
  
  if (req.method === 'POST') {
    // Store message, update participant count
    addMessageToSession(sessionId, message);
    return res.status(200).json({
      status: 'success'
    });
  }
}
```

### Optimistic Updates

```typescript
// When user sends message:
const optimisticMessage: Message = {
  id: `temp-${Date.now()}`,
  sender: 'You',
  content: userInput,
  timestamp: new Date(),
  type: 'user',
  // Mark as pending
  status: 'pending'
};

// Add to UI immediately
setMessages(prev => [...prev, optimisticMessage]);

// Send to server
try {
  await sendMessage(optimisticMessage);
  // Once confirmed, update status
  setMessages(prev => prev.map(m => 
    m.id === optimisticMessage.id 
      ? { ...m, status: 'sent' }
      : m
  ));
} catch (err) {
  // On error, remove optimistic message
  setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
  toast.error('Failed to send message');
}
```

---

## API Routes & Endpoints

### Rep Room Configuration

**Endpoint**: `/api/public-rep-room-config`  
**Method**: GET  
**Query**: `?slug=acme-support`  
**Auth**: Public (no auth required)

```javascript
// Response:
{
  "repRoom": {
    "id": "uuid",
    "slug": "acme-support",
    "title": "ACME Support",
    "settings": {
      "appearance": { ... },
      "behavior": { ... },
      "voice": { ... },
      "deployment": { ... }
    }
  },
  "agent": {
    "id": "uuid",
    "name": "Support Bot",
    "mastraApiBaseUrl": "...",
    "mastraAgentId": "...",
    "cloneId": "uuid",
    "cloneName": "Support Bot Clone"
  }
}
```

**Location**: `/home/user/ng53116-dc2-core-platform-repo-v07/api/public-rep-room-config.js`

### Session Creation

**Endpoint**: `/api/create-rep-room-session`  
**Method**: POST  
**Auth**: Public  

```javascript
// Request:
{
  "rep_room_slug": "acme-support",
  "participant_name": "John Doe",
  "metadata": { "device": "mobile", ... }
}

// Response:
{
  "success": true,
  "data": {
    "session_id": "session-123456",
    "redirect_url": "/rr/acme-support/session-123456",
    "participant_name": "John Doe",
    "rep_room_slug": "acme-support"
  }
}
```

**Location**: `/home/user/ng53116-dc2-core-platform-repo-v07/api/create-rep-room-session.js`

### Voice Token

**Endpoint**: `/api/rep-room-voice-token`  
**Method**: POST  
**Auth**: Public (or auth required)

```javascript
// Request:
{
  "rep_room_slug": "acme-support",
  "organization_id": "uuid",
  "user_id": "uuid",
  "rep_room_id": "uuid",
  "agent_id": "uuid"
}

// Response:
{
  "session_id": "session-123456",
  "room_name": "rrs-acme-support-session-123456",
  "token": "JWT_TOKEN_HERE",
  "url": "wss://ng53116-dc2-9mp3kcwz.livekit.cloud",
  "status": "created",
  "created_at": "2025-11-06T00:00:00Z",
  "participant_name": "user-uuid",
  "participant_identity": "uuid-123456"
}
```

**Location**: `/home/user/ng53116-dc2-core-platform-repo-v07/api/rep-room-voice-token.js`

**Key Logic**:
1. If missing org/user/rep-room IDs, looks them up from slug
2. Queries: rep_rooms → user_agent_clones → tenant_agent_activations
3. Generates LiveKit AccessToken with JWT

### Session Status

**Endpoint**: `/api/rep-room-session-status`  
**Method**: GET  
**Query**: `?sessionId=session-123456`

```javascript
// Response:
{
  "isActive": true,
  "reason": "Session active",
  "sessionId": "session-123456",
  "createdAt": "2025-11-06T00:00:00Z",
  "hoursAge": 0.5
}
```

**Location**: `/home/user/ng53116-dc2-core-platform-repo-v07/api/rep-room-session-status.js`

### Real-time Sync

**Endpoint**: `/api/rep-room-sync`  
**Method**: GET, POST  
**Auth**: Public

```javascript
// GET - Poll for messages
// Query: ?sessionId=session-123&lastMessageId=1234567890
// Response: { messages: [...], participantCount, status }

// POST - Send message
// Body: { sessionId, type, message, timestamp }
// Handles: participant_joined, participant_left, message, etc.
```

**Location**: `/home/user/ng53116-dc2-core-platform-repo-v07/api/rep-room-sync.js`

---

## TypeScript Types & Interfaces

### Rep Room Types

**File**: `/home/user/ng53116-dc2-core-platform-repo-v07/src/types/rep-rooms.ts`

```typescript
interface RepRoom {
  id: string;
  user_agent_clone_id: string;
  is_enabled: boolean;
  public_slug: string;
  title: string;
  intro_text: string;
  settings: RepRoomSettings;
  created_at: string;
  updated_at: string;
  
  // Mastra configuration
  mastra_api_base_url?: string;
  mastra_agent_id?: string;
  
  // Joined data
  user_agent_clone?: {
    id: string;
    name: string;
    avatar_url?: string;
    user_id: string;
    user?: {
      id: string;
      organization_id: string;
    };
  };
}

interface RepRoomSettings {
  appearance: {
    theme_color: string;
    background_type: 'solid' | 'gradient' | 'image';
    background_color?: string;
    avatar_url?: string;
    secondary_color?: string;
    accent_color?: string;
    accessibility?: {
      contrast_ratio: number;
      wcag_compliant: boolean;
    };
  };
  behavior: {
    greeting_message: string;
    suggested_prompts_enabled: boolean;
    suggested_prompts: string[];
    voice_input_enabled: boolean;
    file_upload_enabled: boolean;
    memory_persistence_enabled: boolean;
  };
  deployment: {
    visibility: 'public' | 'private';
    password_protection_enabled: boolean;
    password?: string;
    domain_restrictions: string[];
    embed_enabled: boolean;
  };
  voice?: VoiceSettings;
}

interface RepRoomMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface RepRoomConversation {
  id: string;
  rep_room_id: string;
  visitor_session_id: string;
  messages: RepRoomMessage[];
  started_at: string;
  last_message_at: string;
  status: 'active' | 'ended';
}
```

### Voice Configuration Types

**File**: `/home/user/ng53116-dc2-core-platform-repo-v07/src/types/voice-config.ts`

```typescript
interface VoiceSettings {
  tts: ElevenLabsTTSConfig;
  stt: DeepgramSTTConfig;
  interaction: {
    auto_start_listening: boolean;
    voice_activation_threshold: number;
    silence_timeout_ms: number;
    interrupt_agent_enabled: boolean;
    echo_cancellation: boolean;
    noise_suppression: boolean;
    auto_gain_control: boolean;
  };
  agent_adaptation: {
    response_style: 'conversational' | 'formal' | 'casual';
    max_response_length: number;
    use_filler_words: boolean;
    pause_for_emphasis: boolean;
    emotional_tone: 'friendly' | 'professional' | 'enthusiastic';
    speaking_pace: 'slow' | 'normal' | 'fast';
  };
  usage_controls: {
    max_session_duration_minutes: number;
    max_monthly_minutes: number;
    cost_alert_threshold: number;
    auto_disconnect_on_limit: boolean;
  };
}

interface VoiceSession {
  id: string;
  rep_room_id: string;
  user_agent_clone_id: string;
  tenant_id: string;
  livekit_room_name: string;
  livekit_session_id?: string;
  livekit_participant_id?: string;
  status: 'initializing' | 'connecting' | 'active' | 'ended' | 'failed' | 'timeout';
  participant_name?: string;
  participant_metadata: Record<string, unknown>;
  voice_config: VoiceSettings;
  started_at: string;
  connected_at?: string;
  ended_at?: string;
  duration_seconds?: number;
  audio_quality_score?: number;
  connection_quality_score?: number;
  cost_credits: number;
  created_at: string;
  updated_at: string;
}
```

### Rep Room UI Types

**File**: `/home/user/ng53116-dc2-core-platform-repo-v07/src/types/rep-room.ts`

```typescript
type AgentStatus = "speaking" | "thinking" | "ready" | "working" | "idle" | "delegating";
type HumanStatus = "talking" | "listening" | "hand-up";
type MessageType = "human" | "agent";

interface Agent extends BaseParticipant {
  type: 'main' | 'specialist';
  status: AgentStatus;
  specialization?: string;
}

interface Human extends BaseParticipant {
  status: HumanStatus;
  role?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  type: MessageType;
  avatar?: string;
  error?: string;
  retryCount?: number;
}

interface RepRoomState {
  activeAgent: string | null;
  presentationContent: PresentationContent;
  messages: ChatMessage[];
  isVoiceActive: boolean;
  participants: {
    mainAgent: Agent;
    humans: Human[];
    specialists: Agent[];
  };
  sessionInfo: {
    title: string;
    sessionId: string;
    slug: string;
  };
}
```

---

## Architecture Summary

### Data Flow

```
User Access /rr/{slug}/{sessionId}
    ↓
Fetch RepRoom Config (/api/public-rep-room-config)
    ↓
Check Auth/Password
    ↓
Create Session (/api/create-rep-room-session)
    ↓
Connect to LiveKit (/api/rep-room-voice-token)
    ↓
Load Conversation History
    ↓
Subscribe to Real-time Updates (Supabase)
    ↓
Display UI + Start Voice/Text
    ↓
    ├─→ User sends message
    │   ↓
    │   Message stored in agent_memory_messages
    │   ↓
    │   Real-time notification triggers
    │   ↓
    │   Agent processes (CopilotKit/Mastra)
    │   ↓
    │   Response stored
    │   ↓
    │   TTS audio generated
    │   ↓
    │   Displayed/played to user
    │
    ├─→ Voice mode
    │   ↓
    │   STT transcribes audio (Deepgram)
    │   ↓
    │   Transcript sent to agent
    │   ↓
    │   Response generated
    │   ↓
    │   TTS synthesizes (ElevenLabs)
    │   ↓
    │   Audio streamed to user
    │
    └─→ Multiple users
        ↓
        Participants tracked in agent_conversation_participants
        ↓
        Status updated in agent_conversation_status
        ↓
        All participants notified of updates
```

### Key Files

| File | Purpose |
|------|---------|
| `/src/types/rep-rooms.ts` | Rep room type definitions |
| `/src/types/rep-room.ts` | UI state types |
| `/src/types/rep-room-t1.ts` | T1 implementation types |
| `/src/types/voice-config.ts` | Voice configuration types |
| `/src/components/rep-room-master/RepRoomMasterT1Interface.tsx` | Main rep room component |
| `/src/contexts/rroom/UnifiedVoiceContext.tsx` | Voice context provider |
| `/api/public-rep-room-config.js` | Fetch rep room config |
| `/api/create-rep-room-session.js` | Create session |
| `/api/rep-room-voice-token.js` | Get LiveKit token |
| `/api/rep-room-sync.js` | HTTP polling sync |
| `/supabase/migrations/20251022000000_*` | Multi-participant schema |

### Database Indexes (Performance)

Critical indexes for multi-participant rep rooms:

```sql
-- Conversation participant lookup
idx_conversation_participants_conversation_id
idx_conversation_participants_participant
idx_conversation_participants_active
idx_conversation_participants_tenant

-- Conversation status lookup
idx_conversation_status_is_active
idx_conversation_status_type
idx_conversation_status_livekit_room
idx_conversation_status_last_activity

-- Session lookup
idx_rep_room_sessions_slug
idx_rep_room_sessions_session_id
idx_rep_room_sessions_status

-- Voice session lookup
idx_rep_room_voice_sessions_rep_room_id
idx_rep_room_voice_sessions_status
```

---

## Future Enhancements (Roadmap)

1. **Recording** (REP-4900 Phase 4)
   - Store voice/video recordings in Supabase Storage
   - Auto-transcription with OpenAI Whisper
   - Speaker diarization
   - Compliance & retention policies

2. **Advanced Turn-Taking**
   - Formal turn-based conversation mode
   - Queue management for multiple speakers
   - Hand-raise (hand-up) feature

3. **Agent-to-Agent Communication**
   - Multi-agent coordination within single rep room
   - Handoff between specialized agents
   - Consensus-based decision making

4. **Distributed Recording**
   - Per-participant recording
   - Speaker-separated output
   - Encrypted storage

5. **Advanced Analytics**
   - Sentiment analysis
   - Topic detection
   - Engagement metrics
   - Cost per interaction
