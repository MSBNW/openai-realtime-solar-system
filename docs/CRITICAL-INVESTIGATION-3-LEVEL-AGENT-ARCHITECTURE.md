# CRITICAL INVESTIGATION: 3-Level Agent Architecture & Customization System

## Executive Summary

The DreamCrew platform implements a sophisticated **3-level agent cloning and customization system** that allows organizations to provision agents from a master registry, customize them at the tenant level, and further personalize them at the individual user level. This hierarchical system enables multi-tenant SaaS capabilities with granular customization and cascading status management.

---

## Part 1: 3-Level Architecture Overview

### The Three Levels

```
┌─────────────────────────────────────────────────────────┐
│  LEVEL 1: HOUSE AGENTS (Master Registry)                │
│  Table: agents                                            │
│  Scope: Company-wide (House organization)               │
│  Customization: No (template/blueprint only)            │
└─────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LEVEL 2: TENANT ACTIVATIONS (Activation)               │
│  Table: tenant_agent_activations                         │
│  Scope: Organization-wide (Tenant/Agency)               │
│  Customization: Yes (parameters, voice, chat UI, phone) │
└─────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  LEVEL 3: USER CLONES (Personalization)                 │
│  Table: user_agent_clones                                │
│  Scope: Individual user                                  │
│  Customization: Yes (additional overrides on Level 2)   │
└─────────────────────────────────────────────────────────┘
```

### Key Concept: Delegation vs. Duplication

- **NOT** a 1:1:1 relationship (one house agent → multiple tenant activations → multiple user clones)
- **Relationships**:
  - One `agents` row can have **multiple** `tenant_agent_activations` (one per tenant)
  - One `tenant_agent_activations` row can have **multiple** `user_agent_clones` (one per user)
  - Multiple users can create multiple clones from the same activation

---

## Part 2: Complete Schema Definitions

### LEVEL 1: agents Table (House Registry)

**Purpose:** Master blueprint of all AI agents available in the platform. Managed by House Admin.

```sql
CREATE TABLE IF NOT EXISTS "public"."agents" (
    "id" "text" NOT NULL,                          -- Agent ID (primary key)
    "name" "text" NOT NULL,                        -- Agent name
    "name_i18n" "jsonb",                           -- Internationalized names
    "description" "text",                          -- Agent description
    "description_i18n" "jsonb",                    -- Internationalized descriptions
    "version" "text" DEFAULT '1.0.0'::text,       -- Semantic version
    "status" public."agent_status" DEFAULT 'draft', -- draft|pending|published|deprecated|archived
    "configuration" "jsonb",                       -- Full agent configuration from Maestro
    "pricing" "jsonb" DEFAULT '{}'::jsonb,        -- Pricing rates (credits_per_completion_token)
    "is_public" boolean DEFAULT false,             -- Public vs. private availability
    "created_by_org_id" "uuid" NOT NULL,         -- Organization that created it
    "customizable_parameters" "jsonb",            -- Which parameters can be customized
    "voice_config" "jsonb",                        -- Default voice configuration
    "applicable_metrics" "jsonb",                  -- Evaluation metrics
    "chat_ui_settings" "jsonb",                    -- Default chat UI settings
    "phone_settings" "jsonb",                      -- Default phone settings
    "category" "text",                             -- Category classification
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "published_at" timestamp with time zone,
    PRIMARY KEY ("id")
);
```

**Key Fields for Customization:**
- `customizable_parameters` - Specifies which fields can be customized downstream
- `voice_config` - Default voice (can be overridden at tenant/user level)
- `chat_ui_settings` - Default UI (can be customized at tenant/user level)
- `phone_settings` - Default phone config (can be customized at tenant/user level)

**Constraints:**
- `agents_pricing_check` - Must have `credits_per_completion_token`
- `agents_id_check` - ID length 1-100 characters
- `agents_name_check` - Name length 1-255 characters
- `agents_category_check` - Category length ≤ 100 characters

---

### LEVEL 2: tenant_agent_activations Table (Tenant Customization)

**Purpose:** Activation of a House agent for use by a specific tenant/organization, with tenant-level customizations.

```sql
CREATE TABLE IF NOT EXISTS "public"."tenant_agent_activations" (
    "id" "uuid" DEFAULT extensions.uuid_generate_v4(),  -- Primary key
    "tenant_id" "uuid" NOT NULL,                        -- Tenant (organization) ID
    "agent_id" "text" NOT NULL,                         -- Reference to agents table
    "activated_by_user_id" "uuid",                      -- Who activated it
    "status" public."tenant_activation_status" DEFAULT 'active',
      -- active|inactive|disabled_by_limit|disabled_by_exposure|disabled_by_credits|disabled_by_parent_status
    "custom_parameters" "jsonb",                        -- Tenant-level parameter overrides
    "voice_settings" "jsonb",                           -- Tenant-level voice overrides
    "chat_ui_settings" "jsonb",                         -- Tenant-level UI overrides
    "phone_settings" "jsonb",                           -- Tenant-level phone overrides
    "mcp_server_ids" "uuid"[],                          -- Linked MCP servers for this tenant
    "activated_at" timestamp with time zone DEFAULT now(),
    "deactivated_at" timestamp with time zone,
    PRIMARY KEY ("id"),
    FOREIGN KEY ("tenant_id") REFERENCES organizations(id),
    FOREIGN KEY ("agent_id") REFERENCES agents(id)
);
```

**Customization Fields at Tenant Level:**
- `custom_parameters` - Override customizable_parameters from Level 1
- `voice_settings` - Override voice_config from Level 1
- `chat_ui_settings` - Override chat_ui_settings from Level 1
- `phone_settings` - Override phone_settings from Level 1
- `mcp_server_ids` - Attach MCP servers (tools) to this activation

**Status Cascade Logic:**
```
agents.status change
    ▼
tenant_agent_activations.status may auto-disable
    ▼
user_agent_clones.status may auto-disable (cascade)
```

**Uniqueness:**
- UNIQUE constraint on `(tenant_id, agent_id)` WHERE status='active'
- Only ONE active activation per tenant per agent
- Can have multiple activations if inactive/disabled

---

### LEVEL 3: user_agent_clones Table (User Personalization)

**Purpose:** User-specific, personalized clone of a tenant-activated agent. Allows individual users to customize the activation further.

```sql
CREATE TABLE IF NOT EXISTS "public"."user_agent_clones" (
    "id" "uuid" DEFAULT extensions.uuid_generate_v4(),  -- Primary key
    "user_id" "uuid" NOT NULL,                          -- User who owns this clone
    "tenant_id" "uuid" NOT NULL,                        -- Tenant context
    "tenant_activation_id" "uuid" NOT NULL,            -- Parent activation (LEVEL 2)
    "name" "text",                                      -- User-friendly name for this clone
    "status" public."user_clone_status" DEFAULT 'active',
      -- active|inactive|disabled_by_tenant_activation|disabled_by_parent_status
    "custom_parameters" "jsonb",                        -- User-level parameter overrides
    "voice_settings" "jsonb",                           -- User-level voice overrides
    "chat_ui_settings" "jsonb",                         -- User-level UI overrides
    "phone_settings" "jsonb",                           -- User-level phone overrides
    "phone_number_id" "uuid",                           -- Assigned phone number for voice
    "mcp_server_ids" "uuid"[],                          -- User-specific MCP servers
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    PRIMARY KEY ("id"),
    FOREIGN KEY ("user_id") REFERENCES users(id),
    FOREIGN KEY ("tenant_id") REFERENCES organizations(id),
    FOREIGN KEY ("tenant_activation_id") REFERENCES tenant_agent_activations(id),
    FOREIGN KEY ("phone_number_id") REFERENCES phone_numbers(id),
    CONSTRAINT user_agent_clones_name_check CHECK (char_length(name) <= 255)
);
```

**Customization Fields at User Level:**
- `custom_parameters` - Override tenant-level custom_parameters
- `voice_settings` - Override tenant-level voice_settings
- `chat_ui_settings` - Override tenant-level chat_ui_settings
- `phone_settings` - Override tenant-level phone_settings
- `phone_number_id` - Assign a specific phone number to this clone
- `mcp_server_ids` - User-specific MCP server connections

**Status Cascade Logic:**
```
tenant_agent_activations.status changes
    ▼
user_agent_clones.status auto-updates to 'disabled_by_tenant_activation'
(if tenant activation becomes inactive/disabled)
```

**Special Features:**
- One user can create **multiple** clones from the same activation
- Each clone is independent with own customizations
- Linked to `rep_rooms` via one-to-one relationship

---

## Part 3: Relationships & Data Flow

### Relationship Hierarchy

```
organizations (House)
    ├─ agents (Master templates)
    │   └─ [Multiple agents published by House]
    │
    └─ organizations (Tenant/Agency)
        ├─ tenant_agent_activations
        │   ├─ agent_id → agents
        │   ├─ tenant_id → organizations
        │   └─ [Tenant-level customizations]
        │       └─ user_agent_clones
        │           ├─ tenant_activation_id → tenant_agent_activations
        │           ├─ user_id → users
        │           ├─ [User-level customizations]
        │           └─ rep_rooms (1-to-1)
        │               ├─ public_slug
        │               ├─ settings
        │               └─ rep_room_sessions
        │
        └─ users
            ├─ id → auth.users
            ├─ organization_id → organizations
            └─ [Can create multiple user_agent_clones]
```

### Customization Inheritance Chain

```
Level 1 (House Agent)
│
├─ configuration (JSONB)
├─ voice_config (JSONB)
├─ chat_ui_settings (JSONB)
├─ phone_settings (JSONB)
└─ customizable_parameters (JSONB - specifies what can be overridden)

        ▼ (inherited but overrideable)

Level 2 (Tenant Activation)
│
├─ custom_parameters (overrides Level 1)
├─ voice_settings (overrides Level 1)
├─ chat_ui_settings (overrides Level 1)
├─ phone_settings (overrides Level 1)
└─ mcp_server_ids (Level 1 + tenant additions)

        ▼ (inherited but overrideable)

Level 3 (User Clone)
│
├─ custom_parameters (overrides Level 2)
├─ voice_settings (overrides Level 2)
├─ chat_ui_settings (overrides Level 2)
├─ phone_settings (overrides Level 2)
└─ mcp_server_ids (Level 2 + user additions)
```

**Resolution Algorithm:**
```javascript
// Get final configuration for a user clone
const finalConfig = {
  ...houseAgent.voice_config,              // Level 1 base
  ...tenantActivation.voice_settings,      // Level 2 overrides
  ...userClone.voice_settings              // Level 3 overrides (highest priority)
};
```

---

## Part 4: Voice Cloning System (Advanced Customization)

### Related Tables: Voice Cloning Infrastructure

```sql
CREATE TABLE IF NOT EXISTS public.user_voice_clones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- ElevenLabs Integration
  elevenlabs_voice_id TEXT UNIQUE NOT NULL,
  voice_name TEXT NOT NULL,
  
  -- Sample Audio References (encrypted in Supabase Storage)
  sample_audio_urls TEXT[] NOT NULL,
  sample_duration_seconds INTEGER NOT NULL,
  sample_count INTEGER NOT NULL DEFAULT 1 CHECK (sample_count >= 1),
  sample_audio_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Clone Configuration
  clone_type TEXT NOT NULL CHECK (clone_type IN ('instant', 'professional')),
  clone_quality_score DECIMAL(3,2) CHECK (clone_quality_score >= 0 AND clone_quality_score <= 1.0),
  similarity_score DECIMAL(3,2) CHECK (similarity_score >= 0 AND similarity_score <= 1.0),
  
  -- Voice Settings (ElevenLabs parameters)
  voice_settings JSONB DEFAULT jsonb_build_object(
    'stability', 0.6,
    'similarity_boost', 0.8,
    'style_exaggeration', 0.0
  ),
  
  -- Consent Management (GDPR/CCPA compliance)
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  consent_ip_address INET,
  consent_user_agent TEXT,
  terms_version TEXT NOT NULL,
  
  -- Privacy & Verification
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'failed', 'expired')),
  
  -- Deletion Management (GDPR Article 17 - Right to Erasure)
  deletion_requested_at TIMESTAMPTZ,
  deletion_scheduled_for TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  -- Audit & Usage Tracking
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0)
);
```

### ElevenLabs Voice Cache

```sql
CREATE TABLE IF NOT EXISTS public.elevenlabs_voice_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voice_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  labels JSONB,
  preview_url TEXT,
  available_for_tiers TEXT[],
  settings JSONB,
  
  -- Tenant Isolation (REP-4686)
  tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- For cloned voices
  is_cloned BOOLEAN DEFAULT false,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cloned_voice_id UUID REFERENCES public.user_voice_clones(id) ON DELETE CASCADE,
  
  -- Cache Management
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Voice Consent Records

```sql
CREATE TABLE IF NOT EXISTS public.voice_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Consent details
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  consent_ip_address INET,
  consent_user_agent TEXT,
  consent_version TEXT NOT NULL, -- Terms version accepted
  
  -- Voice sample details
  voice_sample_count INTEGER DEFAULT 0,
  total_sample_duration_seconds INTEGER DEFAULT 0,
  
  -- Consent scope
  consent_purposes TEXT[] DEFAULT ARRAY['voice_cloning', 'tts_generation'],
  consent_restrictions JSONB, -- Any restrictions
  
  -- Revocation
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Part 5: Code Examples

### Example 1: Create Tenant Activation (Level 2)

```typescript
// Activate an agent for a tenant
// File: supabase/functions/agent-activation/index.ts

const { data: activationData, error: activationError } = await serviceClient
  .from('tenant_agent_activations')
  .insert({
    tenant_id: organizationId,           // Level 2 scope
    agent_id: agent_type_id,             // Reference to Level 1
    status: 'active',
    activated_by_user_id: user.id,
    
    // Tenant-level customizations
    custom_parameters: {
      // Overrides from agents.customizable_parameters
      description: 'Custom tenant description',
      // ... other overrides
    },
    
    voice_settings: {
      // Overrides from agents.voice_config
      voice_id: 'custom-voice-id',
      stability: 0.7,
      similarity_boost: 0.85
    },
    
    chat_ui_settings: {
      // Overrides from agents.chat_ui_settings
      color_theme: 'dark',
      // ... other UI overrides
    },
    
    phone_settings: {
      // Overrides from agents.phone_settings
      provider: 'twilio',
      // ... other phone overrides
    },
    
    mcp_server_ids: [mcp1_uuid, mcp2_uuid]  // Tenant's MCP servers
  })
  .select()
  .single();
```

### Example 2: Create User Clone (Level 3)

```typescript
// Create user-personalized clone of tenant activation
// File: supabase/functions/create-user-clone/index.ts

const cloneData = {
  id: cloneId,
  user_id: user.id,                           // User who owns this
  tenant_id: organizationId,                  // Tenant context
  tenant_activation_id: activation_id,        // Parent (Level 2)
  parent_agent_id: parent_agent_id,           // Reference to Level 1
  name,                                       // User-friendly name
  status: 'active',
  
  // User-level customizations (overrides Level 2)
  custom_parameters: {
    description: description || '',
    personalization: personalization || {},
    static_overrides: finalStaticOverrides,
    presentation_overrides: presentation_overrides || {}
  },
  
  voice_settings: {
    // User-specific voice overrides
    // These override both Level 1 and Level 2 settings
  },
  
  chat_ui_settings: {
    // User-specific UI overrides
  },
  
  phone_settings: {
    // User-specific phone overrides
  },
  
  phone_number_id: phoneNumberId,            // Assigned phone number
  
  mcp_server_ids: [],                         // User can add their own
  
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const { error: insertError } = await supabaseClient
  .from('user_agent_clones')
  .insert(cloneData);
```

### Example 3: Configuration Resolution (How Customizations Cascade)

```typescript
// Get final voice settings for a user clone
// Demonstrates inheritance chain

async function getFinalVoiceSettings(userCloneId: string) {
  // Step 1: Get the user clone
  const { data: userClone } = await db
    .from('user_agent_clones')
    .select(`
      id,
      voice_settings,
      tenant_activation_id
    `)
    .eq('id', userCloneId)
    .single();

  // Step 2: Get the tenant activation
  const { data: activation } = await db
    .from('tenant_agent_activations')
    .select(`
      id,
      voice_settings,
      agent_id
    `)
    .eq('id', userClone.tenant_activation_id)
    .single();

  // Step 3: Get the house agent
  const { data: agent } = await db
    .from('agents')
    .select('voice_config')
    .eq('id', activation.agent_id)
    .single();

  // Step 4: Merge with cascade priority (Level 1 → 2 → 3)
  const finalVoiceSettings = {
    ...agent.voice_config,           // Level 1: House defaults
    ...activation.voice_settings,    // Level 2: Tenant overrides
    ...userClone.voice_settings      // Level 3: User overrides (highest priority)
  };

  return finalVoiceSettings;
}
```

### Example 4: Status Cascade (Auto-Disable Logic)

```sql
-- When a tenant activation is deactivated, cascade to user clones
CREATE OR REPLACE FUNCTION cascade_tenant_activation_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('inactive', 'disabled_by_limit', 'disabled_by_exposure', 'disabled_by_credits', 'disabled_by_parent_status')
  AND OLD.status = 'active'
  THEN
    -- Update all child user clones
    UPDATE public.user_agent_clones
    SET status = 'disabled_by_tenant_activation'
    WHERE tenant_activation_id = NEW.id
      AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_cascade_tenant_activation_status
  BEFORE UPDATE ON public.tenant_agent_activations
  FOR EACH ROW
  EXECUTE FUNCTION cascade_tenant_activation_status();
```

### Example 5: Voice Cloning Process with Consent

```typescript
// Create voice clone with consent management
// File: supabase/functions/voice-clone-create/index.ts

// 1. Check consent
const { data: consent } = await db
  .from('voice_consent_records')
  .select('*')
  .eq('user_id', userId)
  .eq('consent_given', true)
  .eq('revoked', false)
  .single();

if (!consent) {
  throw new Error('User must consent to voice cloning first');
}

// 2. Create voice clone
const { data: voiceClone } = await db
  .from('user_voice_clones')
  .insert({
    user_id: userId,
    tenant_id: tenantId,
    organization_id: organizationId,
    elevenlabs_voice_id: elevenlabsVoiceId,
    voice_name: voiceName,
    sample_audio_urls: uploadedUrls,
    sample_duration_seconds: totalDuration,
    sample_count: audioFiles.length,
    clone_type: 'instant', // or 'professional'
    status: 'processing',
    consent_given: true,
    consent_timestamp: now(),
    terms_version: 'v1.0'
  })
  .select()
  .single();

// 3. Call ElevenLabs API to create voice
const elevenlabsResponse = await fetch(
  'https://api.elevenlabs.io/v1/voice_cloning/add',
  {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: voiceName,
      description: 'User voice clone',
      labels: { user_id: userId },
      files: audioFiles,
      remove_background_noise: true
    })
  }
);

const { voice_id } = await elevenlabsResponse.json();

// 4. Update with ElevenLabs voice ID
await db
  .from('user_voice_clones')
  .update({
    elevenlabs_voice_id: voice_id,
    status: 'active',
    processing_completed_at: now()
  })
  .eq('id', voiceClone.id);
```

---

## Part 6: Customization Options at Each Level

### What CAN Be Customized at Each Level

| Field | Level 1 (House) | Level 2 (Tenant) | Level 3 (User) | Notes |
|-------|-----------------|------------------|----------------|-------|
| `name` | ✓ (set once) | ✗ | ✓ | User can name their clone |
| `description` | ✓ (set once) | ✓ | ✓ | House agent describes itself |
| `configuration` | ✓ (House only) | Via `custom_parameters` | Via `custom_parameters` | Overrides spec'd in `customizable_parameters` |
| `voice_config` | ✓ | Via `voice_settings` | Via `voice_settings` | Full voice override capability |
| `voice_id` | ✓ (default) | ✓ | ✓ or user voice clone | Can use house default or custom cloned voice |
| `chat_ui_settings` | ✓ | Via `chat_ui_settings` | Via `chat_ui_settings` | Theme, colors, layout |
| `phone_settings` | ✓ | Via `phone_settings` | Via `phone_settings` | Provider, number type, etc. |
| `phone_number` | ✗ | ✗ | ✓ (phone_number_id) | User gets assigned a specific number |
| `mcp_servers` | ✓ (attached to agent) | Via `mcp_server_ids` | Via `mcp_server_ids` | Tenant/user adds tools |
| `pricing` | ✓ (House only) | ✗ | ✗ | Fixed by House admin |
| `status` | ✓ (House only) | ✓ | ✓ | Can be auto-disabled by cascade |

### Customizable Parameters Schema (Level 1)

The `customizable_parameters` field in agents table specifies what CAN be overridden:

```json
{
  "configuration": {
    "fields": ["system_prompt", "temperature", "max_tokens"],
    "constraints": {
      "temperature": { "min": 0.0, "max": 2.0 },
      "max_tokens": { "min": 1, "max": 4096 }
    }
  },
  "voice": {
    "fields": ["voice_id", "stability", "similarity_boost"],
    "locked_fields": ["voice_provider"]
  },
  "chat_ui": {
    "fields": ["theme", "title", "avatar_url"],
    "allowed_themes": ["light", "dark", "custom"]
  },
  "phone": {
    "fields": ["provider", "greeting"],
    "locked_fields": ["sms_capability"]
  }
}
```

If a field is NOT in `customizable_parameters`, it CANNOT be overridden at Levels 2 or 3.

---

## Part 7: Voice Cloning Integration

### Voice Cloning Process

1. **User Creates Voice Clone** (not the agent clone, but their personal voice)
   - Upload audio samples (1-5 minutes)
   - Get consent and store in `voice_consent_records`
   - Create entry in `user_voice_clones`
   - Call ElevenLabs API to create voice model
   - Store ElevenLabs voice ID in `elevenlabs_voice_id`

2. **Use Voice in Agent Clone**
   - In `user_agent_clones.voice_settings`
   - Set `voice_id` to the user's cloned voice
   - When agent speaks, uses user's voice

3. **ElevenLabs Voice Cache**
   - Cache entry created with `is_cloned = true`
   - `owner_user_id` tracks who created it
   - `cloned_voice_id` links to `user_voice_clones`
   - 7-day TTL for cloned voices (vs 24-hour for library voices)

### Cost/Credit Consumption

- **Voice Cloning Creation**: Credits deducted per minute of audio processed
- **Voice Usage in TTS**: Credits deducted per character generated
- **Clone Types**:
  - `instant` - 1-2 minutes processing (cheaper)
  - `professional` - Up to 4 weeks with manual review (more expensive)

---

## Part 8: Status Lifecycle & Cascading

### Status Enums

**agents.status** (House level):
```
draft → pending → published → deprecated → archived
```

**tenant_agent_activations.status** (Tenant level):
```
active
├─ inactive (manually deactivated)
├─ disabled_by_limit (billing limit reached)
├─ disabled_by_exposure (not exposed to this org)
├─ disabled_by_credits (insufficient credits)
└─ disabled_by_parent_status (House agent not published)
```

**user_agent_clones.status** (User level):
```
active
├─ inactive (manually deactivated by user)
├─ disabled_by_tenant_activation (parent activation disabled)
└─ disabled_by_parent_status (House agent unpublished)
```

### Status Cascade Rules

```
Level 1 Change                  →  Level 2 Effect           →  Level 3 Effect
─────────────────────────────────────────────────────────────────────────────
agents.status ≠ 'published'     →  Auto-set to            →  Auto-set to
                                   'disabled_by_parent'        'disabled_by_parent'

tenant_activation.status ≠      →  Child clones            →  (No further cascade)
'active'                            auto-set to
                                   'disabled_by_tenant'
```

---

## Part 9: Security & RLS Policies

### Row-Level Security for agents
```sql
-- House admin can view all agents
-- Tenant users can only see public agents or those exposed to their org
CREATE POLICY "agents_visibility"
  ON public.agents
  FOR SELECT
  USING (
    is_public = true
    OR created_by_org_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
    OR id IN (
      SELECT agent_id FROM public.organization_agent_exposures
      WHERE organization_id IN (
        SELECT organization_id FROM public.users WHERE id = auth.uid()
      )
    )
  );
```

### RLS for tenant_agent_activations
```sql
CREATE POLICY "activations_tenant_scope"
  ON public.tenant_agent_activations
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT organization_id FROM public.users WHERE id = auth.uid()
    )
  );
```

### RLS for user_agent_clones
```sql
CREATE POLICY "clones_user_scope"
  ON public.user_agent_clones
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR tenant_id IN (
      SELECT organization_id FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```

---

## Part 10: Query Examples

### Get All Activations for a Tenant

```sql
SELECT 
  taa.id,
  a.name,
  a.id as agent_id,
  taa.status,
  taa.custom_parameters,
  taa.voice_settings
FROM public.tenant_agent_activations taa
JOIN public.agents a ON taa.agent_id = a.id
WHERE taa.tenant_id = $1
AND taa.status = 'active';
```

### Get User Clone with Full Config

```sql
SELECT 
  uac.id,
  uac.name,
  uac.status,
  uac.custom_parameters,
  uac.voice_settings,
  taa.voice_settings as tenant_voice_settings,
  a.voice_config as house_voice_config
FROM public.user_agent_clones uac
JOIN public.tenant_agent_activations taa ON uac.tenant_activation_id = taa.id
JOIN public.agents a ON taa.agent_id = a.id
WHERE uac.id = $1;
```

### List All Clones with Cascade Status Check

```sql
SELECT 
  uac.id,
  uac.name,
  uac.status as clone_status,
  taa.status as activation_status,
  a.status as agent_status,
  CASE 
    WHEN a.status != 'published' THEN 'disabled_by_agent_status'
    WHEN taa.status != 'active' THEN 'disabled_by_activation_status'
    WHEN uac.status != 'active' THEN uac.status
    ELSE 'active'
  END as effective_status
FROM public.user_agent_clones uac
JOIN public.tenant_agent_activations taa ON uac.tenant_activation_id = taa.id
JOIN public.agents a ON taa.agent_id = a.id
WHERE uac.user_id = $1;
```

---

## Part 11: Key Takeaways

1. **3-Level System Enables Multi-Tenant SaaS**
   - Level 1: House manages master agent templates
   - Level 2: Tenants activate and customize agents
   - Level 3: Users personalize for their specific needs

2. **Customization is Cumulative & Hierarchical**
   - Each level builds on the previous
   - Level 3 overrides take precedence over Level 2, which override Level 1
   - Only fields in `customizable_parameters` can be overridden

3. **Status Cascades Downward**
   - House agent unpublished → all activations disabled
   - Activation disabled → all user clones disabled
   - User can manually disable their own clone

4. **Voice Cloning is Optional Enhancement**
   - Users can create personal voice clones via ElevenLabs
   - Integration with `user_voice_clones` table
   - Requires explicit consent (GDPR compliant)
   - Can be used in any user clone's voice_settings

5. **One-to-Many Relationships**
   - One agent → Multiple tenant activations (one per tenant)
   - One activation → Multiple user clones (one per user, but user can create multiple)
   - Enables flexibility and personalization

6. **Billing & Credits**
   - Consumed at user clone level (per interaction)
   - Tracked at tenant level (organization_billing_settings)
   - House controls pricing (credits_per_completion_token)

---

## References

**Key Files:**
- `/supabase/migrations/20250428000000_fresh_remote_schema.sql` - Agent tables
- `/supabase/functions/agent-activation/index.ts` - Level 2 creation
- `/supabase/functions/create-user-clone/index.ts` - Level 3 creation
- `/supabase/migrations/20251015_create_voice_cloning_schema.sql` - Voice system
- `/supabase/migrations/20251013084200_create_elevenlabs_voice_cache.sql` - Voice cache

**Related Tickets:**
- REP-4680 - Voice cloning system
- REP-4686 - Voice cache tenant isolation
- REP-4900 - Conversation recording & participants
