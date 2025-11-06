# DreamCrew Platform - Complete Database Schema Mapping

**Generated:** November 6, 2025  
**Database:** PostgreSQL (Supabase)  
**Total Tables:** 55+  
**Total Migrations:** 100+  
**Latest Schema Version:** Based on migrations up to 2025-10-29

---

## CRITICAL TABLE SUMMARY

### Core Organizational Structure
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **organizations** | Hierarchical org structure (house, super_agency, agency, tenant) | Self-referential parent_org_id, one-to-many with users/agents |
| **users** | User accounts with RBAC | Many-to-one organizations, one-to-many invitations/api_keys |
| **invitations** | User invitation system | Many-to-one organizations, users |

### Agent Management
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **agents** | AI agent templates in House registry | Many-to-one organizations (created_by_org_id) |
| **tenant_agent_activations** | Tenant-level agent activations with custom configs | Many-to-one agents, organizations (tenant) |
| **user_agent_clones** | User-personalized agent instances | Many-to-one users, organizations, tenant_agent_activations |
| **agent_evaluations** | Agent performance metrics | Many-to-one agents, organizations, users |

### Conversation & Messaging
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **conversations** | AI conversation threads with memory integration | Many-to-one organizations (tenant), agents, users |
| **messages** | Individual messages within conversations | Many-to-one conversations |
| **agent_memory_conversations** | Shared memory conversations (Mastra compatibility) | One-to-many agent_memory_messages |
| **agent_memory_messages** | Individual messages in memory conversations | Many-to-one agent_memory_conversations |
| **agent_conversation_participants** | Multi-participant tracking (REP-4900) | Many-to-one agent_memory_conversations |
| **agent_conversation_status** | Real-time conversation status (REP-4900) | One-to-one agent_memory_conversations |
| **agent_conversation_recordings** | Voice/video recording metadata (REP-4900) | Many-to-one agent_memory_conversations |

### Rep Room System
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **rep_rooms** | Public-facing agent interaction rooms | One-to-one user_agent_clones |
| **rep_room_sessions** | Visitor sessions in Rep Rooms | One-to-many rep_room_participants, rep_room_chat_messages, agent_memory_conversations |
| **rep_room_participants** | Individual participants in Rep Room sessions | Many-to-one rep_room_sessions |
| **rep_room_chat_messages** | Chat messages in Rep Room sessions | Many-to-one rep_room_sessions |
| **rep_room_voice_sessions** | Voice interaction sessions using LiveKit | Many-to-one rep_rooms, user_agent_clones, organizations |

### Voice & Communication
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **voice_sessions** | General voice session tracking | Many-to-one rep_rooms, auth.users |
| **voice_session_metrics** | Detailed voice quality metrics | Many-to-one rep_room_voice_sessions |
| **voice_usage_logs** | Voice usage tracking for billing | Many-to-one rep_room_voice_sessions, organizations |
| **call_sessions** | Phone call session tracking (inbound/outbound) | Many-to-one organizations, phone_numbers, conversations |
| **phone_numbers** | Configured phone numbers for voice | Many-to-one organizations, phone_providers |
| **phone_providers** | Phone provider integrations (Twilio, Vonage) | Many-to-one organizations |

### Voice Cloning
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **user_voice_clones** | User-personalized voice clones | Many-to-one users, organizations |
| **elevenlabs_voice_cache** | ElevenLabs voice provider cache with tenant isolation | Many-to-one organizations |
| **voice_clone_audit_logs** | Audit trail for voice clone operations | Many-to-one organizations |
| **voice_consent_records** | GDPR voice consent management | Many-to-one users, organizations |

### Billing & Credits
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **organization_billing_settings** | Credit balance and agent limits | One-to-one organizations |
| **credit_ledger_entries** | Double-entry ledger for credit transactions | Many-to-one organizations |

### Webhook System
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **webhook_subscriptions** | Event notification subscriptions | Many-to-one organizations, users |
| **webhook_deliveries** | Webhook delivery attempts with retry logic | Many-to-one webhook_subscriptions |
| **webhook_delivery_logs** | Detailed webhook delivery attempt logs | Many-to-one webhook_deliveries |
| **webhook_events** | Registry of available webhook events | Standalone - event type definitions |

### Integration & MCP
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **mcp_servers** | Model Context Protocol server configurations | Many-to-one organizations (tenant) |

### Projects & Tasks
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **agentic_projects** | AI agent-driven project management | Many-to-one organizations |
| **agentic_project_tasks** | Individual tasks within projects | Many-to-one agentic_projects, self-referential parent_task_id |

### Chat Widgets
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **chat_widgets** | Embeddable 4-state chat widgets for websites | Many-to-one rep_rooms, organizations |
| **widget_sessions** | Widget visitor sessions | Many-to-one chat_widgets |
| **widget_analytics_simple** | Analytics for widget events | Many-to-one widget_sessions |
| **chat_widget_trigger_analytics** | Widget trigger analytics (REP-4970) | Many-to-one chat_widgets |

### Supporting Tables
| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| **api_keys** | API keys for programmatic access | Many-to-one organizations, users |
| **audit_logs** | System-wide audit trail | Many-to-one organizations, users |
| **notification_settings** | Organization notification preferences | One-to-one organizations |
| **organization_branding** | Organization branding and custom domain | One-to-one organizations |
| **organization_agent_exposures** | Agent exposure permissions between orgs | Many-to-many agents and organizations |

---

## DETAILED TABLE SCHEMAS

### 1. organizations

**Purpose:** Hierarchical organizational structure supporting multi-tenant architecture.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  org_type organization_type NOT NULL, -- Enum: house, super_agency, agency, tenant
  parent_org_id UUID REFERENCES organizations(id),
  status TEXT DEFAULT 'active', -- active, suspended, inactive
  disable_parent_invites BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `parent_org_id`
- INDEX on `status`

**Key Features:**
- Self-referential hierarchy via `parent_org_id`
- Organization types: house (top level), super_agency, agency, tenant (end customer)
- Soft delete support via `deleted_at`

---

### 2. users

**Purpose:** User accounts with role-based access control.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role user_role NOT NULL, -- Hierarchical roles: house_admin, tenant_user, etc.
  preferred_locale TEXT,
  status TEXT DEFAULT 'active',
  invited_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `email`
- INDEX on `organization_id`
- INDEX on `role`
- INDEX on `status`

**Key Features:**
- Links to auth.users table via `id`
- Role-based access control with 12 role types
- Last login tracking and login count

---

### 3. agents

**Purpose:** AI agent templates in the House registry.

```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  name_i18n JSONB,
  description_i18n JSONB,
  created_by_org_id UUID NOT NULL REFERENCES organizations(id),
  category TEXT,
  is_public BOOLEAN DEFAULT false,
  status agent_status DEFAULT 'draft', -- draft, pending, published, deprecated, archived
  version TEXT DEFAULT '1.0',
  configuration JSONB,
  applicable_metrics JSONB,
  customizable_parameters JSONB,
  chat_ui_settings JSONB,
  phone_settings JSONB,
  voice_config JSONB,
  pricing JSONB NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `created_by_org_id`
- INDEX on `status`
- INDEX on `is_public`
- INDEX on `category`

---

### 4. tenant_agent_activations

**Purpose:** Tenant-level agent activations with custom configurations.

```sql
CREATE TABLE tenant_agent_activations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  activated_by_user_id UUID REFERENCES users(id),
  status tenant_activation_status DEFAULT 'active', -- active, inactive, disabled_by_*
  custom_parameters JSONB,
  chat_ui_settings JSONB,
  phone_settings JSONB,
  voice_settings JSONB,
  mcp_server_ids UUID[],
  activated_at TIMESTAMPTZ DEFAULT now(),
  deactivated_at TIMESTAMPTZ
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `(tenant_id, agent_id)` WHERE status='active'
- INDEX on `tenant_id`
- INDEX on `agent_id`
- INDEX on `status`

**Key Features:**
- One activation per tenant per agent (uniqueness constraint)
- Custom parameter overrides per tenant
- Multi-status tracking for cascade disabling

---

### 5. user_agent_clones

**Purpose:** User-personalized instances of activated agents.

```sql
CREATE TABLE user_agent_clones (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  tenant_activation_id UUID NOT NULL REFERENCES tenant_agent_activations(id),
  name TEXT,
  status user_clone_status DEFAULT 'active', -- active, inactive, disabled_by_*
  custom_parameters JSONB,
  chat_ui_settings JSONB,
  phone_number_id UUID REFERENCES phone_numbers(id),
  phone_settings JSONB,
  voice_settings JSONB,
  mcp_server_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `user_id`
- INDEX on `tenant_id`
- INDEX on `tenant_activation_id`
- INDEX on `status`

**Key Features:**
- User-specific customizations of tenant-activated agents
- Links to phone numbers for voice integration
- Supports downstream status cascade dependencies

---

### 6. conversations

**Purpose:** AI conversation threads with memory integration.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  tenant_activation_id UUID REFERENCES tenant_agent_activations(id),
  user_agent_clone_id UUID REFERENCES user_agent_clones(id),
  user_id UUID REFERENCES users(id),
  ai_memory_resource_id TEXT NOT NULL,
  ai_memory_thread_id TEXT NOT NULL,
  title TEXT,
  status conversation_status DEFAULT 'active', -- active, archived, closed
  locale TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `tenant_id`
- INDEX on `agent_id`
- INDEX on `user_id`
- INDEX on `status`
- INDEX on `last_message_at DESC`

**Key Features:**
- Links to Mastra AI memory system via resource/thread IDs
- Multi-level references for audit trail
- Last message tracking for activity monitoring

---

### 7. messages

**Purpose:** Individual messages within conversations.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  sender_type message_sender NOT NULL, -- user, agent, system
  sender_id UUID,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `conversation_id`
- INDEX on `sender_type`
- INDEX on `created_at DESC`

---

### 8. agent_memory_conversations (Shared Memory)

**Purpose:** Shared memory conversations for Rep Room sessions (Mastra compatibility).

```sql
CREATE TABLE agent_memory_conversations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  resource_id TEXT NOT NULL, -- Format: tenant_{id}_reproom_{slug}_session_{id}
  thread_id TEXT NOT NULL,
  rep_room_slug TEXT NOT NULL,
  session_id TEXT NOT NULL REFERENCES rep_room_sessions(session_id),
  participant_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, resource_id, thread_id)
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `(tenant_id, resource_id, thread_id)` - composite
- INDEX on `(tenant_id, rep_room_slug, session_id)` - composite
- INDEX on `(tenant_id, created_at DESC)` - composite

---

### 9. agent_memory_messages

**Purpose:** Individual messages within agent memory conversations.

```sql
CREATE TABLE agent_memory_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES agent_memory_conversations(id),
  message_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  participant_id TEXT,
  embedding vector(1536), -- pgvector: for future semantic search
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `message_id`
- INDEX on `conversation_id`
- INDEX on `created_at DESC`
- INDEX on `role`

---

### 10. agent_conversation_participants (REP-4900)

**Purpose:** Track multi-participant conversations for agent interactions.

```sql
CREATE TABLE agent_conversation_participants (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES agent_memory_conversations(id) ON DELETE CASCADE,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('agent', 'human', 'system')),
  participant_id UUID, -- user_id for humans, user_agent_clone.id for agents
  participant_name TEXT,
  tenant_id UUID NOT NULL, -- CRITICAL: must match conversation's tenant_id
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN GENERATED ALWAYS AS (left_at IS NULL) STORED,
  participant_role TEXT, -- owner, admin, viewer, guest
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (conversation_id, participant_type, participant_id) DEFERRABLE INITIALLY DEFERRED
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `conversation_id`
- INDEX on `(participant_id, participant_type)` WHERE participant_id IS NOT NULL
- INDEX on `(conversation_id, is_active)` WHERE is_active = true
- INDEX on `(tenant_id, conversation_id)` - composite
- INDEX on `joined_at DESC`

**Key Features:**
- Multi-agent, multi-user conversation support
- Computed `is_active` column
- Strict tenant isolation via `tenant_id`

---

### 11. agent_conversation_status (REP-4900)

**Purpose:** Real-time conversation status tracking for active monitoring.

```sql
CREATE TABLE agent_conversation_status (
  conversation_id UUID PRIMARY KEY REFERENCES agent_memory_conversations(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  conversation_type TEXT DEFAULT 'text' CHECK (conversation_type IN ('text', 'voice', 'video', 'mixed')),
  livekit_room_id TEXT, -- LiveKit room identifier
  livekit_room_name TEXT,
  livekit_session_id TEXT,
  participant_count INTEGER DEFAULT 0,
  active_participants JSONB DEFAULT '[]',
  last_message_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  total_messages INTEGER DEFAULT 0,
  messages_last_minute INTEGER DEFAULT 0,
  average_response_time_ms INTEGER,
  last_agent_response_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `conversation_id`
- INDEX on `is_active` WHERE is_active = true
- INDEX on `(conversation_type, is_active)` - composite
- INDEX on `livekit_room_id` WHERE livekit_room_id IS NOT NULL
- INDEX on `last_activity_at DESC` WHERE is_active = true
- INDEX on `participant_count DESC` WHERE is_active = true

**Key Features:**
- Optimized for real-time updates and subscriptions
- LiveKit integration for voice/video
- Activity metrics for dashboard display

---

### 12. agent_conversation_recordings (REP-4900)

**Purpose:** Store voice/video conversation recording metadata.

```sql
CREATE TABLE agent_conversation_recordings (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES agent_memory_conversations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL, -- CRITICAL: tenant isolation
  recording_type TEXT DEFAULT 'audio' CHECK (recording_type IN ('audio', 'video', 'screen', 'mixed')),
  storage_bucket TEXT DEFAULT 'conversation-recordings',
  storage_path TEXT NOT NULL, -- Format: {tenant_id}/{conversation_id}/{recording_id}.{ext}
  recording_url TEXT,
  file_size_bytes BIGINT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  format TEXT NOT NULL, -- mp3, wav, webm, mp4
  codec TEXT,
  bitrate_kbps INTEGER,
  sample_rate_hz INTEGER,
  segment_number INTEGER DEFAULT 1,
  total_segments INTEGER DEFAULT 1,
  is_complete BOOLEAN DEFAULT false,
  recording_started_at TIMESTAMPTZ NOT NULL,
  recording_ended_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  has_transcription BOOLEAN DEFAULT false,
  transcription_text TEXT,
  transcription_metadata JSONB,
  participant_count INTEGER,
  speaker_segments JSONB,
  is_public BOOLEAN DEFAULT false,
  access_policy TEXT DEFAULT 'tenant_only' CHECK (access_policy IN ('tenant_only', 'participants_only', 'admin_only', 'public')),
  retention_policy TEXT DEFAULT 'standard' CHECK (retention_policy IN ('standard', 'extended', 'permanent', 'gdpr_compliant')),
  delete_after TIMESTAMPTZ,
  is_redacted BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (storage_bucket, storage_path)
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `conversation_id`
- INDEX on `(tenant_id, conversation_id)` - composite
- INDEX on `(is_complete, processing_status)` WHERE is_complete = true AND processing_status = 'completed'
- INDEX on `uploaded_at DESC`
- INDEX on `(recording_type, format)` - composite
- INDEX on `delete_after` WHERE delete_after IS NOT NULL
- INDEX on `has_transcription` WHERE has_transcription = true

**Key Features:**
- GDPR compliance support via retention policies
- Transcription and speaker segment tracking
- Access control policies per recording

---

### 13. rep_rooms

**Purpose:** Public-facing agent rooms for customer interactions.

```sql
CREATE TABLE rep_rooms (
  id UUID PRIMARY KEY,
  user_agent_clone_id UUID UNIQUE NOT NULL REFERENCES user_agent_clones(id),
  public_slug TEXT UNIQUE NOT NULL,
  title TEXT,
  intro_text TEXT,
  is_enabled BOOLEAN DEFAULT true,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `user_agent_clone_id`
- UNIQUE INDEX on `public_slug`
- INDEX on `is_enabled`

---

### 14. rep_room_sessions

**Purpose:** Visitor sessions in Rep Rooms (chat/voice).

```sql
CREATE TABLE rep_room_sessions (
  id UUID PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  room_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  agent_joined BOOLEAN DEFAULT false,
  participant_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `session_id`
- INDEX on `room_name`
- INDEX on `slug`
- INDEX on `status`

---

### 15. rep_room_participants

**Purpose:** Individual participants in Rep Room sessions.

```sql
CREATE TABLE rep_room_participants (
  id UUID PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES rep_room_sessions(session_id),
  identity TEXT NOT NULL,
  name TEXT,
  is_agent BOOLEAN DEFAULT false,
  participant_sid TEXT, -- LiveKit participant SID
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `session_id`
- INDEX on `identity`
- INDEX on `is_agent`

---

### 16. rep_room_chat_messages

**Purpose:** Chat messages within Rep Room sessions.

```sql
CREATE TABLE rep_room_chat_messages (
  id UUID PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES rep_room_sessions(session_id),
  message_id TEXT NOT NULL,
  sender_identity TEXT NOT NULL,
  sender_name TEXT,
  message_type TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `session_id`
- INDEX on `message_type`
- INDEX on `timestamp DESC`

---

### 17. rep_room_voice_sessions

**Purpose:** Voice interaction sessions using LiveKit for Rep Rooms.

```sql
CREATE TABLE rep_room_voice_sessions (
  id UUID PRIMARY KEY,
  rep_room_id UUID NOT NULL REFERENCES rep_rooms(id),
  user_agent_clone_id UUID NOT NULL REFERENCES user_agent_clones(id),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  livekit_room_name TEXT NOT NULL,
  livekit_session_id TEXT,
  livekit_participant_id TEXT,
  status voice_session_status DEFAULT 'initializing', -- initializing, connecting, active, ended, failed, timeout
  participant_name TEXT,
  participant_metadata JSONB DEFAULT '{}',
  voice_config JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT now(),
  connected_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  audio_quality_score NUMERIC(3,2), -- 0.0-5.0
  connection_quality_score NUMERIC(3,2), -- 0.0-5.0
  cost_credits NUMERIC(18,6) DEFAULT 0.0,
  session_metadata JSONB DEFAULT '{}',
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (rep_room_id) WHERE status IN ('initializing', 'connecting', 'active')
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `rep_room_id`
- INDEX on `user_agent_clone_id`
- INDEX on `tenant_id`
- INDEX on `status`
- INDEX on `started_at DESC`
- INDEX on `livekit_room_name`
- INDEX on `livekit_session_id` WHERE livekit_session_id IS NOT NULL
- UNIQUE partial on active sessions

---

### 18. call_sessions

**Purpose:** Phone call session tracking for inbound/outbound calls.

```sql
CREATE TABLE call_sessions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  tenant_activation_id UUID REFERENCES tenant_agent_activations(id),
  user_agent_clone_id UUID REFERENCES user_agent_clones(id),
  user_id UUID REFERENCES users(id),
  conversation_id UUID REFERENCES conversations(id),
  phone_number_id UUID REFERENCES phone_numbers(id),
  provider_call_id TEXT NOT NULL,
  direction call_direction NOT NULL, -- inbound, outbound
  status call_status DEFAULT 'initiated', -- initiated, ringing, active, ended, failed, etc.
  from_number TEXT,
  to_number TEXT,
  start_time TIMESTAMPTZ DEFAULT now(),
  answer_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  cost NUMERIC,
  recording_url TEXT,
  transcript_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `tenant_id`
- INDEX on `conversation_id`
- INDEX on `phone_number_id`
- INDEX on `status`
- INDEX on `start_time DESC`
- INDEX on `provider_call_id`

---

### 19. phone_numbers

**Purpose:** Phone numbers configured for voice interactions.

```sql
CREATE TABLE phone_numbers (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  phone_provider_id UUID NOT NULL REFERENCES phone_providers(id),
  phone_number TEXT NOT NULL UNIQUE,
  capabilities JSONB DEFAULT '{}',
  status integration_config_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `phone_number`
- INDEX on `tenant_id`
- INDEX on `phone_provider_id`
- INDEX on `status`

---

### 20. phone_providers

**Purpose:** Phone provider integrations (Twilio, Vonage, etc).

```sql
CREATE TABLE phone_providers (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL, -- twilio, vonage
  config JSONB NOT NULL,
  secrets BYTEA NOT NULL, -- Encrypted secrets
  status integration_config_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `tenant_id`
- INDEX on `provider_type`
- INDEX on `status`

---

### 21. voice_sessions (General)

**Purpose:** General voice session tracking for security and analytics.

```sql
CREATE TABLE voice_sessions (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rep_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  livekit_token TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  metadata JSONB
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `session_id`
- INDEX on `room_id`
- INDEX on `user_id`

---

### 22. voice_session_metrics

**Purpose:** Detailed voice session quality and performance metrics.

```sql
CREATE TABLE voice_session_metrics (
  id UUID PRIMARY KEY,
  voice_session_id UUID NOT NULL REFERENCES rep_room_voice_sessions(id),
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `voice_session_id`
- INDEX on `metric_type`
- INDEX on `recorded_at DESC`

---

### 23. voice_usage_logs

**Purpose:** Usage tracking for voice sessions for billing and analytics.

```sql
CREATE TABLE voice_usage_logs (
  id UUID PRIMARY KEY,
  voice_session_id UUID NOT NULL REFERENCES rep_room_voice_sessions(id),
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  usage_type TEXT NOT NULL, -- TTS, STT, etc.
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  cost_credits NUMERIC(18,6) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `voice_session_id`
- INDEX on `tenant_id`
- INDEX on `usage_type`
- INDEX on `recorded_at DESC`

---

### 24. user_voice_clones (Voice Cloning)

**Purpose:** User-personalized voice clones from ElevenLabs.

```sql
CREATE TABLE user_voice_clones (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  elevenlabs_voice_id TEXT UNIQUE, -- From ElevenLabs API
  voice_name TEXT NOT NULL,
  description TEXT,
  sample_count INTEGER DEFAULT 0,
  total_sample_duration_seconds INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- active, inactive, processing, failed
  consent_given BOOLEAN DEFAULT false,
  consent_version TEXT,
  access_policy TEXT DEFAULT 'private', -- private, organization, public
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```

---

### 25. elevenlabs_voice_cache

**Purpose:** Cache of ElevenLabs voices with tenant isolation.

```sql
CREATE TABLE elevenlabs_voice_cache (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  elevenlabs_voice_id TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  preview_url TEXT,
  language TEXT,
  accent TEXT,
  age_group TEXT,
  gender TEXT,
  use_case TEXT,
  use_case_tags TEXT[],
  labels JSONB,
  description_short TEXT,
  voice_attributes JSONB,
  available BOOLEAN DEFAULT true,
  synth_id TEXT,
  high_quality_base_model_ids TEXT[],
  is_public BOOLEAN DEFAULT true,
  owner_id TEXT,
  safety_control TEXT,
  featured BOOLEAN DEFAULT false,
  settings JSONB,
  voice_icon_url TEXT,
  thumbnail_url TEXT,
  preview_html TEXT,
  metadata JSONB,
  cached_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `(tenant_id, elevenlabs_voice_id)` - composite
- INDEX on `available`
- INDEX on `category`
- INDEX on `language`

---

### 26. voice_clone_audit_logs

**Purpose:** Audit trail for voice clone operations (GDPR compliance).

```sql
CREATE TABLE voice_clone_audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),
  voice_clone_id UUID REFERENCES user_voice_clones(id),
  action TEXT NOT NULL, -- created, updated, deleted, consented, revoked, trained
  reason TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 27. voice_consent_records

**Purpose:** GDPR voice consent management.

```sql
CREATE TABLE voice_consent_records (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  consent_given BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  consent_ip_address INET,
  consent_user_agent TEXT,
  consent_version TEXT NOT NULL,
  voice_sample_count INTEGER DEFAULT 0,
  total_sample_duration_seconds INTEGER DEFAULT 0,
  consent_purposes TEXT[] DEFAULT ARRAY['voice_cloning', 'tts_generation'],
  consent_restrictions JSONB,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_ip_address INET,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 28. organization_billing_settings

**Purpose:** Organization-level billing configuration and credit balance.

```sql
CREATE TABLE organization_billing_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),
  credit_balance NUMERIC DEFAULT 0,
  activated_agent_limit INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `organization_id`
- INDEX on `credit_balance`
- INDEX on `activated_agent_limit`

---

### 29. credit_ledger_entries

**Purpose:** Double-entry ledger for credit transactions.

```sql
CREATE TABLE credit_ledger_entries (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  transaction_group TEXT NOT NULL,
  entry_type credit_ledger_entry_type NOT NULL, -- allocation_sent, consumption, refund, etc.
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  external_ref TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `organization_id`
- INDEX on `transaction_group`
- INDEX on `entry_type`
- INDEX on `created_at DESC`

---

### 30. chat_widgets

**Purpose:** Embeddable 4-state chat widgets for websites.

```sql
CREATE TABLE chat_widgets (
  id UUID PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  rep_room_id UUID NOT NULL REFERENCES rep_rooms(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  is_enabled BOOLEAN DEFAULT true,
  widget_settings JSONB DEFAULT {...},
  embed_code TEXT,
  display_mode VARCHAR(50) DEFAULT 'floating', -- floating, center-screen
  skip_phases BOOLEAN DEFAULT false,
  embed_config JSONB DEFAULT '{}',
  auto_expand_enabled BOOLEAN DEFAULT false,
  auto_expand_trigger VARCHAR(50) DEFAULT 'manual', -- manual, time-based, scroll-based, idle-based, intent-based
  auto_expand_delay INTEGER DEFAULT 5, -- 1-60 seconds
  auto_expand_scroll_threshold INTEGER DEFAULT 50, -- 0-100%
  widget_personality VARCHAR(50) DEFAULT 'support', -- sales, support
  phase_progression_mode VARCHAR(50) DEFAULT 'sequential', -- sequential, skip_to_phase_4
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `organization_id`
- INDEX on `rep_room_id`
- INDEX on `is_enabled`
- INDEX on `auto_expand_enabled` WHERE auto_expand_enabled = true
- INDEX on `widget_personality`

**Widget Settings Structure:**
```json
{
  "appearance": {
    "position": "bottom-right",
    "theme_color": "#3B82F6",
    "avatar_image": null
  },
  "state_1": {
    "tooltip_message": "How can I help? 🤖"
  },
  "state_2": {
    "agent_name": "AI Assistant",
    "lead_question": "Want help turning your website traffic into qualified leads?",
    "auto_expand_delay": 3000,
    "show_yes_no_buttons": true
  },
  "state_3": {
    "max_messages": 3,
    "transition_trigger": "auto"
  }
}
```

---

### 31. widget_sessions

**Purpose:** Widget visitor sessions for MVP handoff.

```sql
CREATE TABLE widget_sessions (
  id UUID PRIMARY KEY,
  widget_id UUID NOT NULL REFERENCES chat_widgets(id),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  visitor_id VARCHAR(255),
  lead_response JSONB DEFAULT '{}',
  message_history JSONB DEFAULT '[]',
  error_count INTEGER DEFAULT 0,
  last_error_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `session_id`
- INDEX on `widget_id`
- INDEX on `error_count` WHERE error_count > 0

---

### 32. chat_widget_trigger_analytics (REP-4970)

**Purpose:** Widget trigger analytics for understanding user engagement.

```sql
CREATE TABLE chat_widget_trigger_analytics (
  id UUID PRIMARY KEY,
  chat_widget_id UUID NOT NULL REFERENCES chat_widgets(id) ON DELETE CASCADE,
  rep_room_slug VARCHAR(255),
  trigger_source VARCHAR(255) NOT NULL, -- avatar-click, auto-expand, deep-link, etc.
  page_url TEXT,
  user_agent TEXT,
  session_id UUID,
  conversation_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `(chat_widget_id, created_at DESC)` - composite
- INDEX on `trigger_source`
- INDEX on `session_id` WHERE session_id IS NOT NULL
- INDEX on `page_url` WHERE page_url IS NOT NULL

---

### 33. webhook_subscriptions

**Purpose:** Webhook endpoint subscriptions for event notifications.

```sql
CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_by_user_id UUID REFERENCES users(id),
  name TEXT,
  description TEXT,
  endpoint_url TEXT NOT NULL,
  event_type webhook_event_type NOT NULL, -- DEPRECATED: use events array
  events TEXT[] DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active', -- active, inactive, suspended
  secret TEXT,
  secret_token TEXT,
  retry_config JSONB DEFAULT {...},
  rate_limit_config JSONB DEFAULT {...},
  is_active BOOLEAN DEFAULT true, -- DEPRECATED
  failure_reason TEXT,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `organization_id`
- INDEX on `status`
- GIN INDEX on `events`
- INDEX on `event_type`

---

### 34. webhook_deliveries

**Purpose:** Webhook delivery attempts with retry logic.

```sql
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY,
  webhook_subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  delivery_status TEXT DEFAULT 'pending', -- pending, delivered, failed, abandoned
  http_status_code INTEGER,
  response_body TEXT,
  delivery_attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `webhook_subscription_id`
- INDEX on `delivery_status`
- INDEX on `event_type`
- INDEX on `next_retry_at` WHERE next_retry_at IS NOT NULL
- INDEX on `created_at DESC`

---

### 35. webhook_delivery_logs

**Purpose:** Detailed logs of webhook delivery attempts.

```sql
CREATE TABLE webhook_delivery_logs (
  id UUID PRIMARY KEY,
  webhook_delivery_id UUID NOT NULL REFERENCES webhook_deliveries(id),
  attempt_number INTEGER NOT NULL,
  request_headers JSONB DEFAULT '{}',
  request_body TEXT,
  response_headers JSONB DEFAULT '{}',
  response_body TEXT,
  error_details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `webhook_delivery_id`
- INDEX on `attempt_number`

---

### 36. webhook_events

**Purpose:** Registry of available webhook events with schemas.

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY,
  event_type TEXT UNIQUE NOT NULL,
  event_category TEXT NOT NULL,
  description TEXT,
  schema_version TEXT DEFAULT '1.0',
  payload_schema JSONB,
  is_active BOOLEAN DEFAULT true,
  is_deprecated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `event_type`
- INDEX on `event_category`
- INDEX on `is_active`

---

### 37. agentic_projects

**Purpose:** AI agent-driven project management.

```sql
CREATE TABLE agentic_projects (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed, failed
  priority TEXT DEFAULT 'medium', -- high, medium, low
  configuration JSONB DEFAULT '{}',
  orchestration_config JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_completion TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `organization_id`
- INDEX on `status`
- INDEX on `project_type`

---

### 38. agentic_project_tasks

**Purpose:** Individual tasks within agentic projects.

```sql
CREATE TABLE agentic_project_tasks (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES agentic_projects(id),
  parent_task_id UUID REFERENCES agentic_project_tasks(id),
  assigned_agent_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority INTEGER DEFAULT 5, -- 1-10
  complexity_score NUMERIC,
  task_config JSONB DEFAULT '{}',
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  estimated_duration_seconds INTEGER,
  actual_duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `project_id`
- INDEX on `parent_task_id`
- INDEX on `status`
- INDEX on `assigned_agent_type`

---

### 39. mcp_servers

**Purpose:** Model Context Protocol server configurations.

```sql
CREATE TABLE mcp_servers (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  server_type mcp_server_type NOT NULL, -- stdio, sse
  config JSONB NOT NULL,
  secrets BYTEA, -- Encrypted secrets
  status integration_config_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `tenant_id`
- INDEX on `server_type`
- INDEX on `status`

---

### 40. api_keys

**Purpose:** API keys for programmatic access.

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  created_by_user_id UUID REFERENCES users(id),
  prefix TEXT NOT NULL, -- Visible part
  key_hash TEXT NOT NULL, -- Hashed value
  description TEXT,
  scopes TEXT[],
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `organization_id`
- INDEX on `prefix`
- INDEX on `key_hash`

---

### 41. audit_logs

**Purpose:** System-wide audit trail.

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  actor_user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  resource_org_id UUID REFERENCES organizations(id),
  status TEXT DEFAULT 'success',
  failure_reason TEXT,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `organization_id`
- INDEX on `actor_user_id`
- INDEX on `action`
- INDEX on `resource_type`
- INDEX on `created_at DESC`

---

### 42. organization_branding

**Purpose:** Organization branding and custom domain configuration.

```sql
CREATE TABLE organization_branding (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),
  settings JSONB DEFAULT '{}',
  custom_domain TEXT,
  domain_status domain_verification_status,
  domain_last_checked_at TIMESTAMPTZ,
  logo_url TEXT,
  favicon_url TEXT,
  social_image_url TEXT,
  brand_color_primary TEXT,
  brand_color_secondary TEXT,
  brand_color_accent TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `organization_id`
- INDEX on `custom_domain`
- INDEX on `domain_status`

---

### 43. notification_settings

**Purpose:** Organization notification preferences.

```sql
CREATE TABLE notification_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),
  settings JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 44. invitations

**Purpose:** User invitation system for organizations.

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  invited_by_user_id UUID REFERENCES users(id),
  email TEXT NOT NULL,
  role user_role NOT NULL,
  token_hash TEXT NOT NULL,
  status invitation_status DEFAULT 'pending',
  locale TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes:**
- PRIMARY KEY on `id`
- INDEX on `organization_id`
- INDEX on `email`
- INDEX on `status`
- INDEX on `expires_at`

---

### 45. organization_agent_exposures

**Purpose:** Agent exposure permissions between organizations.

```sql
CREATE TABLE organization_agent_exposures (
  id UUID PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id),
  exposed_by_org_id UUID NOT NULL REFERENCES organizations(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agent_id, organization_id)
);
```

**Indexes:**
- PRIMARY KEY on `id`
- UNIQUE INDEX on `(agent_id, organization_id)`
- INDEX on `agent_id`
- INDEX on `exposed_by_org_id`
- INDEX on `organization_id`

---

## ENUM TYPES

```sql
-- Agent status lifecycle
agent_status: 'draft', 'pending', 'published', 'deprecated', 'archived'

-- Call properties
call_direction: 'inbound', 'outbound'
call_status: 'initiated', 'ringing', 'active', 'on_hold', 'transferring', 'ended', 'failed', 'canceled'

-- Conversation status
conversation_status: 'active', 'archived', 'closed'

-- Credit ledger entry types
credit_ledger_entry_type: 'allocation_sent', 'allocation_received', 'consumption', 'refund', 'initial_balance', 'adjustment_increase', 'adjustment_decrease'

-- Domain verification
domain_verification_status: 'pending', 'verified', 'failed'

-- Integration status
integration_config_status: 'active', 'inactive', 'disabled_by_parent_status'

-- Invitation status
invitation_status: 'pending', 'accepted', 'expired', 'revoked'

-- MCP server types
mcp_server_type: 'stdio', 'sse'

-- Message sender
message_sender: 'user', 'agent', 'system'

-- Organization type (hierarchy)
organization_type: 'house', 'super_agency', 'agency', 'tenant'

-- Tenant activation status
tenant_activation_status: 'active', 'inactive', 'disabled_by_limit', 'disabled_by_exposure', 'disabled_by_credits', 'disabled_by_parent_status'

-- User clone status
user_clone_status: 'active', 'inactive', 'disabled_by_tenant_activation', 'disabled_by_parent_status'

-- User roles (12 role types)
user_role: 'house_admin', 'house_manager', 'house_support', 'super_agency_admin', 'super_agency_manager', 'super_agency_support', 'agency_admin', 'agency_manager', 'agency_support', 'tenant_admin', 'tenant_manager', 'tenant_user'

-- Webhook event types (30+ types)
webhook_event_type: 'organization_created', 'organization_updated', 'organization_deleted', 'user_invited', 'user_accepted_invite', 'user_deactivated', 'credit_allocated', 'credit_consumption', 'low_credit_warning', 'activated_agent_limit_updated', 'agent_registered', 'agent_published', 'agent_exposed', 'agent_activated', 'agent_deactivated', 'user_agent_clone_created', 'user_agent_clone_deleted', 'rep_room_created', 'rep_room_status_updated', 'call_started', 'call_ended', 'call_failed', 'mcp_server_created', 'mcp_server_status_updated', 'mcp_server_connection_tested', 'phone_provider_created', 'phone_provider_status_updated', 'phone_number_created', 'phone_number_status_updated', 'agent_evaluation_completed', 'agent_evaluation_threshold_breached', 'webhook_delivery_failed', 'export_completed', 'status_cascade_applied'

-- Voice session status
voice_session_status: 'initializing', 'connecting', 'active', 'ended', 'failed', 'timeout'
```

---

## KEY RELATIONSHIPS (ERD)

```
organizations
├── Self-referential (parent_org_id)
├── users (organization_id)
├── agents (created_by_org_id)
├── tenant_agent_activations (tenant_id)
├── user_agent_clones (tenant_id)
├── rep_rooms (via user_agent_clones)
├── conversations (tenant_id)
├── credit_ledger_entries (organization_id)
├── webhook_subscriptions (organization_id)
├── agentic_projects (organization_id)
├── mcp_servers (tenant_id)
├── phone_providers (tenant_id)
├── phone_numbers (tenant_id)
├── organization_billing_settings (organization_id)
├── organization_branding (organization_id)
├── notification_settings (organization_id)
├── chat_widgets (organization_id)
└── invitations (organization_id)

agents
├── agent_evaluations (agent_id)
├── tenant_agent_activations (agent_id)
└── organization_agent_exposures (agent_id)

tenant_agent_activations
├── user_agent_clones (tenant_activation_id)
└── conversations (tenant_activation_id)

user_agent_clones
├── rep_rooms (user_agent_clone_id) [1:1]
├── conversations (user_agent_clone_id)
├── rep_room_voice_sessions (user_agent_clone_id)
└── call_sessions (user_agent_clone_id)

conversations
├── messages (conversation_id)
├── call_sessions (conversation_id)
├── agent_evaluations (conversation_id)
└── agent_memory_conversations (implicit via session_id)

agent_memory_conversations
├── agent_memory_messages (conversation_id)
├── agent_conversation_participants (conversation_id)
├── agent_conversation_status (conversation_id) [1:1]
├── agent_conversation_recordings (conversation_id)
└── rep_room_sessions (via session_id)

rep_rooms
├── rep_room_sessions (public_slug)
├── rep_room_voice_sessions (rep_room_id)
├── chat_widgets (rep_room_id)
└── voice_sessions (room_id)

rep_room_sessions
├── rep_room_participants (session_id)
├── rep_room_chat_messages (session_id)
└── agent_memory_conversations (session_id)

rep_room_voice_sessions
├── voice_session_metrics (voice_session_id)
└── voice_usage_logs (voice_session_id)

webhook_subscriptions
├── webhook_deliveries (webhook_subscription_id)
└── webhook_delivery_logs (via webhook_deliveries)

agentic_projects
└── agentic_project_tasks (project_id)

chat_widgets
├── widget_sessions (widget_id)
├── chat_widget_trigger_analytics (chat_widget_id)
└── widget_analytics_simple (via widget_sessions)
```

---

## CRITICAL SECURITY & ISOLATION

### Tenant Isolation Strategy
1. **Tenant ID Column**: Every multi-tenant table has explicit `tenant_id` column
2. **RLS Enforcement**: All tables use Row-Level Security with `tenant_id` checks
3. **JWT Claims**: Uses `org_id` from JWT claims for authorization
4. **Hierarchical Access**: Parent orgs can see descendant org data

### Encryption
- **MCP Server Secrets**: Encrypted as `BYTEA` column
- **Phone Provider Secrets**: Encrypted as `BYTEA` column
- **API Keys**: Hashed with visible prefix only

### Function-Based Authorization
```sql
get_my_org_id() -- Gets org_id from JWT claims
get_my_role() -- Gets role from JWT claims
get_my_user_id() -- Gets user ID from JWT claims
get_descendant_org_ids_or_self(org_id) -- Recursive org hierarchy
is_activation_effectively_active(activation_id) -- Check cascade status
is_clone_effectively_active(clone_id) -- Check cascade status
```

---

## VIEWS & MATERIALIZED VIEWS

### Views
- `mastra_memory_threads` - Compatibility view mapping to `agent_memory_conversations`
- `mastra_memory_messages` - Compatibility view mapping to `agent_memory_messages`
- `active_agent_types_count` - Aggregated active agent types per organization
- `chat_widgets_auto_expand_summary` - Analytics view for auto-expand widgets

---

## RECENT ADDITIONS (REP-4900 & REP-4987)

### REP-4900: Conversation Recording & Participant Tracking
- **Tables Added:**
  - `agent_conversation_participants` - Multi-participant conversation support
  - `agent_conversation_status` - Real-time conversation monitoring
  - `agent_conversation_recordings` - Voice/video recording metadata

### REP-4970: Widget Display Modes & Analytics
- **Tables Added:**
  - `chat_widget_trigger_analytics` - Track widget trigger events
- **New Columns in `chat_widgets`:**
  - `display_mode` - floating or center-screen
  - `skip_phases` - Direct to chat mode

### REP-4987: Auto-Expand Configuration
- **New Columns in `chat_widgets`:**
  - `auto_expand_enabled` - Enable/disable auto-expansion
  - `auto_expand_trigger` - Trigger type (time-based, scroll-based, etc.)
  - `auto_expand_delay` - Delay in seconds (1-60)
  - `auto_expand_scroll_threshold` - Scroll percentage (0-100)
  - `widget_personality` - Sales or support personality
  - `phase_progression_mode` - Sequential or skip to chat

---

## MIGRATION TIMELINE

**Key Migrations by Feature:**
1. **20250428** - Fresh remote schema (base)
2. **20250527** - Agent gateway tables
3. **20250528** - Agentic projects schema
4. **20250529** - Webhook system
5. **20250603** - Rep Room voice sessions
6. **20250624** - Rep Room sessions
7. **20250827** - Chat widgets
8. **20250901** - Shared agent memory
9. **20250905** - Mastra memory compatibility
10. **20251013** - ElevenLabs voice cache
11. **20251015** - Voice cloning schema (complete)
12. **20251019** - Organization branding enhancements
13. **20251022** - Conversation participants, status, recordings (REP-4900)
14. **20251028** - Widget display modes and analytics (REP-4970)
15. **20251029** - Widget auto-expand fields (REP-4987)

---

## DATABASE PERFORMANCE CHARACTERISTICS

### Largest Tables (by typical volume)
1. `agent_memory_messages` - Millions of messages
2. `audit_logs` - Millions of audit entries
3. `webhook_deliveries` - Hundreds of thousands
4. `voice_usage_logs` - Hundreds of thousands
5. `agent_conversation_recordings` - Thousands

### High-Query Tables
1. `conversations` - Real-time conversation lookups
2. `agent_memory_conversations` - Session-based queries
3. `rep_room_sessions` - Active session queries
4. `agent_conversation_status` - Real-time dashboards

### Indexes per Table
- **Most Tables**: 3-7 indexes (primary key + foreign keys + status/timestamp)
- **Complex Tables**: 8-12 indexes (conversations, rep_room_voice_sessions, etc.)
- **Total Database Indexes**: 200+

---

## ACCESS PATTERNS

### Common Query Patterns

**Get User's Agent Clones:**
```sql
SELECT * FROM user_agent_clones
WHERE user_id = auth.uid()
AND status = 'active'
AND tenant_id IN (SELECT id FROM get_descendant_org_ids_or_self(get_my_org_id()))
```

**Get Active Conversations for Dashboard:**
```sql
SELECT cs.*, acp.participant_count
FROM agent_conversation_status cs
JOIN agent_memory_conversations amc ON cs.conversation_id = amc.id
WHERE amc.tenant_id IN (SELECT id FROM get_descendant_org_ids_or_self(get_my_org_id()))
AND cs.is_active = true
ORDER BY cs.last_activity_at DESC
```

**Get Rep Room with Recent Sessions:**
```sql
SELECT rr.*, COUNT(DISTINCT rrs.id) as session_count
FROM rep_rooms rr
LEFT JOIN rep_room_sessions rrs ON rrs.slug = (
  SELECT public_slug FROM rep_rooms WHERE id = rr.id
)
WHERE rr.user_agent_clone_id IN (
  SELECT id FROM user_agent_clones WHERE user_id = auth.uid()
)
GROUP BY rr.id
```

**Get Organization Credit Balance:**
```sql
SELECT credit_balance, activated_agent_limit
FROM organization_billing_settings
WHERE organization_id = get_my_org_id()
```

---

## NOTES & GOTCHAS

1. **Dual Session Tracking**: Both `rep_room_sessions` and `agent_memory_conversations` track Rep Room visitor sessions - they're complementary
2. **Tenant Isolation**: CRITICAL - always include `tenant_id` in WHERE clauses for multi-tenant tables
3. **Status Cascading**: Agent activation status affects clone status; clone status affects rep room functionality
4. **Memory System Integration**: Conversations link to Mastra memory via `ai_memory_resource_id` and `ai_memory_thread_id`
5. **LiveKit Integration**: Voice sessions reference LiveKit room IDs; requires external provider setup
6. **Webhook Delivery**: Uses exponential backoff; check `next_retry_at` for pending deliveries
7. **Recording Storage**: Actual files in Supabase Storage; metadata in `agent_conversation_recordings`
8. **Voice Consent**: GDPR compliance requires checking `voice_consent_records` before voice clone operations

---

**Last Updated:** 2025-11-06  
**Source:** Comprehensive analysis of 100+ migrations  
**Coverage:** 55+ tables, 14 enums, 35+ functions, 200+ indexes