# CRITICAL INVESTIGATION: Credit System & Billing Infrastructure

**Investigation Date:** November 6, 2025  
**Database:** PostgreSQL (Supabase)  
**Scope:** Complete credit system, billing settings, agent limits, and revenue cascade

---

## 1. DATABASE SCHEMA

### organization_billing_settings Table

**Location:** Created in migration 20250428000000_fresh_remote_schema.sql

```sql
CREATE TABLE IF NOT EXISTS "public"."organization_billing_settings" (
    "organization_id" "uuid" PRIMARY KEY NOT NULL,
    "credit_balance" numeric(18,6) DEFAULT 0.0 NOT NULL,
    "activated_agent_limit" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    
    CONSTRAINT "organization_billing_settings_activated_agent_limit_check" 
        CHECK (("activated_agent_limit" >= 0)),
    CONSTRAINT "organization_billing_settings_credit_balance_check" 
        CHECK (("credit_balance" >= '-5000.00'::numeric))
);
```

**Key Fields:**
- **organization_id** (UUID): Foreign key to organizations table
- **credit_balance** (numeric(18,6)): Current available credits (default: 0.0)
  - Can go negative down to -5000.00 (overdraft tolerance)
  - Type: NUMERIC(18,6) = up to 18 total digits with 6 decimal places
  - Max value: 999,999,999,999.999999
- **activated_agent_limit** (integer): Maximum number of agents this org can activate
  - Default: 0 (no agents allowed)
  - Max value: 2,147,483,647 (INT32_MAX, used for "unlimited" on House org)
- **updated_at** (timestamptz): Last update timestamp

**One-to-One Relationship:** Each organization has exactly one billing settings record

---

### credit_ledger_entries Table

**Location:** Created in migration 20250428000000_fresh_remote_schema.sql

```sql
CREATE TABLE IF NOT EXISTS "public"."credit_ledger_entries" (
    "id" "uuid" DEFAULT uuid_generate_v4() PRIMARY KEY NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "transaction_group" "uuid" NOT NULL,
    "entry_type" "public"."credit_ledger_entry_type" NOT NULL,
    "amount" numeric(18,6) NOT NULL,
    "balance_after" numeric(18,6) NOT NULL,
    "metadata" "jsonb",
    "external_ref" "text",
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

**Key Fields:**
- **id** (UUID): Unique ledger entry identifier
- **organization_id** (UUID): Which organization this entry is for
- **transaction_group** (UUID): Links related entries (e.g., allocation_sent & allocation_received)
- **entry_type** (ENUM): Type of transaction (see below)
- **amount** (numeric(18,6)): Credit amount (negative for deductions, positive for additions)
- **balance_after** (numeric(18,6)): Running balance after this transaction
- **metadata** (JSONB): Flexible data structure varying by entry_type
- **external_ref** (text): Optional reference to external systems
- **created_at** (timestamptz): Transaction timestamp (immutable)

**Immutable:** This table is append-only (no updates/deletes allowed by RLS)

**Entry Type Enum:**
```sql
CREATE TYPE "public"."credit_ledger_entry_type" AS ENUM (
    'allocation_sent',          -- Credits sent to child org
    'allocation_received',      -- Credits received from parent org
    'consumption',              -- Credits consumed by usage (AI, voice, etc.)
    'refund',                   -- Credits refunded after error/cancellation
    'initial_balance',          -- Initial credit grant
    'adjustment_increase',      -- Admin adjustment (increase)
    'adjustment_decrease'       -- Admin adjustment (decrease)
);
```

**Metadata Structure by Entry Type:**

```json
{
  "allocation_sent": {
    "to_org_id": "uuid",
    "allocated_by_user_id": "uuid",
    "notes": "optional string"
  },
  "allocation_received": {
    "from_org_id": "uuid",
    "allocated_by_user_id": "uuid",
    "notes": "optional string"
  },
  "consumption": {
    "usage": {
      "type": "string",           // "tokens", "voice_minutes", "api_calls"
      "quantity": "number",
      "unit_cost": "number"
    },
    "source": "string",            // "chat_session", "voice", "api"
    "session_id": "uuid"
  },
  "initial_balance": {
    "reason": "string",
    "reference": "optional string"
  },
  "refund": {
    "reason": "string",
    "reference_transaction_group": "uuid"
  },
  "adjustment_increase": {
    "reason": "string",
    "approved_by_user_id": "uuid",
    "notes": "optional string"
  },
  "adjustment_decrease": {
    "reason": "string",
    "approved_by_user_id": "uuid",
    "notes": "optional string"
  }
}
```

---

### voice_usage_logs Table

**Location:** Created in migration 20250604000001_create_voice_usage_logs.sql

```sql
CREATE TABLE IF NOT EXISTS public.voice_usage_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY NOT NULL,
    session_id uuid NOT NULL,
    rep_room_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    
    -- Service details
    service_type public.voice_service_type NOT NULL,  -- ENUM: tts, stt, voice_call
    provider text NOT NULL,                            -- "elevenlabs", "deepgram", "twilio"
    model text,                                        -- Specific model used
    
    -- Usage metrics
    characters_processed integer,                      -- For TTS
    audio_duration_seconds numeric(10,3),             -- For STT/LiveKit
    api_calls integer DEFAULT 1 NOT NULL,
    
    -- Cost calculation
    unit_cost numeric(18,6) NOT NULL,                 -- Cost per unit
    total_cost numeric(18,6) NOT NULL,                -- Total cost in USD
    credits_consumed numeric(18,6) DEFAULT 0.0,       -- Credits consumed
    
    -- Request/Response metadata
    request_metadata jsonb DEFAULT '{}'::jsonb,
    response_metadata jsonb DEFAULT '{}'::jsonb,
    
    -- Audit fields
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
```

**Purpose:** Track voice service usage for billing and analytics

---

## 2. CREDIT ALLOCATION SYSTEM

### Hierarchical Credit Flow

```
House Organization
  ├─ credit_balance: 999,999,999,999.999999 (unlimited)
  ├─ activated_agent_limit: 2,147,483,647 (unlimited)
  │
  ├─ SuperAgency 1
  │  ├─ credit_balance: Allocated by House
  │  ├─ activated_agent_limit: Set by House
  │  │
  │  ├─ Agency 1
  │  │  ├─ credit_balance: Allocated by SuperAgency
  │  │  ├─ activated_agent_limit: Set by SuperAgency
  │  │  │
  │  │  ├─ Tenant A
  │  │  │  ├─ credit_balance: Allocated by Agency
  │  │  │  └─ activated_agent_limit: Set by Agency
  │  │  │
  │  │  └─ Tenant B
  │  │     ├─ credit_balance: Allocated by Agency
  │  │     └─ activated_agent_limit: Set by Agency
```

### allocate_credits() Function

**Location:** Migration 20250428000000_create_allocate_credits_function.sql

**Purpose:** Safely transfer credits between parent and child organizations

**Signature:**
```plpgsql
CREATE OR REPLACE FUNCTION public.allocate_credits(
  from_org_id UUID,
  to_org_id UUID,
  amount NUMERIC,
  allocated_by_user_id UUID,
  notes TEXT DEFAULT NULL
) RETURNS JSON
```

**Logic:**
1. Verify both organizations exist and are active
2. Verify `to_org_id` is a direct child of `from_org_id`
3. Verify amount is positive
4. Lock both organizations' billing settings for atomic transaction
5. Deduct from source organization
6. Add to target organization
7. Create TWO ledger entries:
   - `allocation_sent` for source org (negative amount)
   - `allocation_received` for target org (positive amount)
8. Both entries share same `transaction_group` UUID

**Returns:**
```json
{
  "transaction_id": "uuid",
  "from_balance": "numeric",
  "to_balance": "numeric"
}
```

**Constraints:**
- Parent org can go negative (down to -5000)
- Only direct parent-child relationships allowed
- Atomic: Either both succeed or both rollback

**Example Call:**
```typescript
const result = await supabaseAdmin.rpc('allocate_credits', {
  from_org_id: 'parent-uuid',
  to_org_id: 'child-uuid',
  amount: 1000.50,
  allocated_by_user_id: 'admin-uuid',
  notes: 'Monthly allocation Q4 2025'
});
```

---

### Calculate Available Agent Limit Capacity

**Location:** Migration 20250429112224_add_calculate_available_agent_limit_capacity_function.sql

**Purpose:** Calculate how many agents a parent org can still allocate to children

**Signature:**
```plpgsql
CREATE OR REPLACE FUNCTION public.calculate_available_agent_limit_capacity(
  parent_org_id UUID,
  child_org_id UUID DEFAULT NULL
) RETURNS INTEGER
```

**Logic:**
1. Get parent organization type
2. If parent is "house": Return INT_MAX (2,147,483,647) = infinite
3. If parent is other type:
   - Get parent's `activated_agent_limit`
   - Sum all children's `activated_agent_limit` (excluding specified child if provided)
   - Return: `parent_limit - sum_of_children_limits`

**Returns:** Integer representing available slots

**Example:**
```
Parent Agency has limit: 50
Child Tenant 1 has: 10
Child Tenant 2 has: 15
Available capacity = 50 - (10 + 15) = 25
```

**Usage Example:**
```typescript
const available = await supabaseAdmin.rpc('calculate_available_agent_limit_capacity', {
  parent_org_id: 'agency-uuid',
  child_org_id: 'tenant-uuid'  // optional: exclude this child from calculation
});
```

---

## 3. CREDIT CONSUMPTION

### What Consumes Credits?

1. **AI Interactions (Chat):**
   - Each prompt/response interaction deducts credits
   - Amount based on tokens used
   - Entry type: `consumption` with metadata.usage.type = "tokens"

2. **Voice Services:**
   - TTS (Text-to-Speech): Charged per character processed
   - STT (Speech-to-Text): Charged per audio second
   - Voice Calls: Charged per minute
   - Tracked in `voice_usage_logs` table
   - Entry type: `consumption` with metadata.usage.type = "voice_minutes"

3. **API Calls:**
   - Direct API usage may consume credits
   - Entry type: `consumption` with metadata.usage.type = "api_calls"

### Credit Deduction Process

**Code Example from ai-interaction-start/index.ts:**

```typescript
// 1. Check credit balance before allowing interaction
if (billingData.credit_balance <= 0) {
  return new Response(
    JSON.stringify({ error: 'Payment Required', message: 'Insufficient credits' }),
    { status: 402, headers: corsHeaders }
  );
}

// 2. Process interaction (AI call, voice processing, etc.)
// ...

// 3. Create ledger entry (via service_role client)
const transactionGroup = crypto.randomUUID();
const usageAmount = -0.5;  // Negative for deduction

await serviceClient.from('credit_ledger_entries').insert({
  organization_id: organizationId,
  transaction_group: transactionGroup,
  entry_type: 'consumption',
  amount: usageAmount,
  balance_after: billingData.credit_balance + usageAmount,
  metadata: {
    usage: {
      type: 'tokens',
      quantity: 100,
      cost_per_token: 0.005
    },
    source: 'chat_session',
    session_id: response.id,
    user_id: user.id
  }
});

// 4. Update billing settings with new balance
await serviceClient
  .from('organization_billing_settings')
  .update({ credit_balance: billingData.credit_balance + usageAmount })
  .eq('organization_id', organizationId);
```

### Real-Time Balance Tracking

- Ledger entries are IMMUTABLE (append-only)
- Current balance is stored in `organization_billing_settings.credit_balance`
- Balance is updated immediately after consumption
- Full history preserved in credit_ledger_entries

---

## 4. AGENT LIMIT ENFORCEMENT

### Agent Limits Stored In:

**organization_billing_settings.activated_agent_limit** (INTEGER)

- Default: 0 (no agents allowed without explicit allocation)
- House organization: 2,147,483,647 (effectively unlimited)
- Checked during agent activation

### How Limits Are Enforced:

**1. Count Active Agent Types:**

```plpgsql
CREATE OR REPLACE FUNCTION public.count_active_agent_types(p_tenant_id UUID)
RETURNS INTEGER
AS $$
BEGIN
  SELECT COUNT(DISTINCT agent_id) INTO active_count
  FROM tenant_agent_activations
  WHERE tenant_id = p_tenant_id
  AND status = 'active';
  RETURN active_count;
END;
$$;
```

**2. Activation Check (from ai-interaction-start/index.ts):**

```typescript
// Get current count of active agent types
const { data: activeAgentData } = await supabaseClient
  .from('active_agent_types_count')
  .select('count')
  .eq('organization_id', organizationId)
  .single();

// Check if agent limit is reached
if (activeAgentData.count >= agentLimitData.activated_agent_limit) {
  return new Response(
    JSON.stringify({ error: 'Conflict', message: 'Agent limit exceeded' }),
    { status: 409, headers: corsHeaders }
  );
}
```

**3. Parent Limit Cascade:**

When creating child organizations, parent's available capacity is checked:

```typescript
// From organizations-update/index.ts
const { data: parentBillingSettings } = await supabaseClient
  .from('organization_billing_settings')
  .select('credit_balance, activated_agent_limit')
  .eq('organization_id', parentOrgId)
  .single();

if (currentActiveAgentCount >= (parentBillingSettings.activated_agent_limit || 5)) {
  return new Response(
    JSON.stringify({ error: 'Agent limit reached for parent organization' }),
    { status: 409, headers: corsHeaders }
  );
}
```

---

## 5. CRITICAL FUNCTIONS

### 1. allocate_credits()
**File:** supabase/migrations/20250428000000_create_allocate_credits_function.sql  
**Purpose:** Transfer credits parent → child  
**Returns:** Transaction details with new balances  
**Atomic:** Yes (all-or-nothing)

### 2. calculate_available_agent_limit_capacity()
**File:** supabase/migrations/20250429112224_add_calculate_available_agent_limit_capacity_function.sql  
**Purpose:** Calculate available agent slots for allocation  
**Returns:** Integer (remaining slots)

### 3. count_active_agent_types()
**File:** supabase/migrations/20250429000000_add_count_active_agent_types_function.sql  
**Purpose:** Count distinct active agents for organization  
**Returns:** Integer (count)

### 4. is_activation_effectively_active()
**Note:** Searched but NOT FOUND in current codebase  
**Likely Missing Function** for checking cascade status

### 5. is_clone_effectively_active()
**Note:** Searched but NOT FOUND in current codebase  
**Likely Missing Function** for checking clone cascade status

---

## 6. HOUSE ORGANIZATION SPECIAL CASE

**Migration:** 20251024000000_rep_4920_update_house_billing_limits.sql

The House organization has special unlimited configuration:

```plpgsql
-- Set essentially unlimited values for internal operations
INSERT INTO public.organization_billing_settings (
  organization_id,
  credit_balance,
  activated_agent_limit,
  updated_at
) VALUES (
  v_house_org_id,
  999999999999::numeric(18,6),           -- 999 billion credits
  2147483647,                             -- INT32_MAX = unlimited agents
  NOW()
) ON CONFLICT (organization_id) DO UPDATE SET
  credit_balance = EXCLUDED.credit_balance,
  activated_agent_limit = EXCLUDED.activated_agent_limit;
```

**Rationale:** House org is internal infrastructure and should never run out of credits/agents

---

## 7. ROW LEVEL SECURITY (RLS)

### organization_billing_settings RLS Policies

**House Roles (Full Access):**
```sql
-- View all billing settings
CREATE POLICY "house_roles_view_all_billing" 
  ON organization_billing_settings FOR SELECT 
  USING (get_my_role() IN ('house_admin', 'house_manager', 'house_support'));

-- Update all billing settings
CREATE POLICY "house_admin_update_all_billing" 
  ON organization_billing_settings FOR UPDATE 
  USING (get_my_role() = 'house_admin');

CREATE POLICY "house_manager_update_all_billing" 
  ON organization_billing_settings FOR UPDATE 
  USING (get_my_role() = 'house_manager');
```

**Agency Roles (Own + Descendants):**
```sql
-- View own and descendant billing
CREATE POLICY "agency_roles_view_billing" 
  ON organization_billing_settings FOR SELECT 
  USING (
    get_my_role() IN ('agency_admin', 'agency_manager', 'agency_support')
    AND (
      organization_id = get_my_org_id()
      OR organization_id IN (
        SELECT id FROM organization_descendants(get_my_org_id())
      )
    )
  );

-- Update own and descendant billing
CREATE POLICY "agency_admin_update_billing" 
  ON organization_billing_settings FOR UPDATE 
  USING (similar condition as above);
```

### credit_ledger_entries RLS Policies

**House Admin (Full Access):**
```sql
CREATE POLICY "credit_ledger_house_admin_select" 
  ON credit_ledger_entries FOR SELECT 
  USING (get_my_role() = 'house_admin');

CREATE POLICY "credit_ledger_house_admin_insert" 
  ON credit_ledger_entries FOR INSERT 
  WITH CHECK (get_my_role() = 'house_admin');
```

**Service Role (Automated Inserts):**
```sql
CREATE POLICY "credit_ledger_service_role_insert" 
  ON credit_ledger_entries FOR INSERT TO service_role 
  WITH CHECK (true);
```

**Admins (Own + Descendants):**
```sql
CREATE POLICY "credit_ledger_admins_view_own_and_descendants" 
  ON credit_ledger_entries FOR SELECT 
  USING (
    get_my_org_id() IS NOT NULL
    AND is_ancestor_or_self(get_my_org_id(), organization_id)
    AND get_my_role() IN ('house_admin', 'agency_admin', 'super_agency_admin', etc.)
  );
```

**Tenant Users (Own Only):**
```sql
CREATE POLICY "credit_ledger_tenant_users_view_own_entries" 
  ON credit_ledger_entries FOR SELECT 
  USING (
    get_my_org_id() IS NOT NULL
    AND organization_id = get_my_org_id()
    AND get_my_role() = 'tenant_user'
  );
```

---

## 8. API ENDPOINTS

### organizations-allocate-credits
**Endpoint:** Edge Function: `POST /allocate-credits`

**Request:**
```json
{
  "from_org_id": "uuid",
  "to_org_id": "uuid",
  "amount": 1000.50,
  "allocated_by_user_id": "uuid",
  "notes": "optional"
}
```

**Response:**
```json
{
  "transaction_id": "uuid",
  "from_balance": 8999.50,
  "to_balance": 2000.50
}
```

### organizations-get-billing-settings
**Endpoint:** Edge Function: `GET /get-billing-settings`

**Query Parameters:** `organization_id`

**Response:**
```json
{
  "credit_balance": 5000.00,
  "activated_agent_limit": 10
}
```

### organizations-update-billing
**Endpoint:** Edge Function: `PUT /update-billing`

**Request:**
```json
{
  "organization_id": "uuid",
  "activated_agent_limit": 15
}
```

### organizations-credit-ledger
**Endpoint:** Edge Function: `GET /credit-ledger`

**Query Parameters:** `organization_id`

**Response:**
```json
{
  "entries": [
    {
      "id": "uuid",
      "organization_id": "uuid",
      "entry_type": "consumption",
      "amount": -0.50,
      "balance_after": 4999.50,
      "metadata": {...},
      "created_at": "2025-11-06T10:00:00Z"
    }
  ]
}
```

---

## 9. CRITICAL FINDINGS & GAPS

### What Works:
✓ Credit allocation between parent-child orgs  
✓ Credit ledger with full audit trail  
✓ Agent limit enforcement at activation  
✓ Voice usage tracking and cost calculation  
✓ RLS policies for multi-tenant access control  
✓ House org with unlimited credits/agents  

### What's Missing/Incomplete:
✗ `is_activation_effectively_active()` - Cascade status checking  
✗ `is_clone_effectively_active()` - Cascade status checking  
✗ Revenue share configuration (parent-child split)  
✗ Subscription management (recurring billing)  
✗ Usage-based billing automation (batch processing)  
✗ Credit consumption for all feature types documented  
✗ Overdraft policies (currently allows -5000, undocumented rules)  
✗ Credit expiration/retention policies  
✗ Low balance alerts/notifications  

### Potential Issues:
1. **No automatic credit consumption after transaction:** Credits must be manually deducted; no automatic post-charge reconciliation
2. **Overdraft tolerance unclear:** Why -5000? No documented business rule
3. **No revenue share implementation:** Billing cascade not reflected in code
4. **Missing cascade status functions:** Critical for determining if clones/activations should work
5. **Voice usage requires manual ledger entry:** No automation visible in voice functions

---

## 10. COMPLETE FLOW EXAMPLE: Voice Call with Credits

```
1. User initiates voice call in Rep Room
   ↓
2. Voice session created, starts consuming minutes
   ↓
3. Voice provider (ElevenLabs, Deepgram) bills in real-time
   ↓
4. voice_usage_logs entry created with:
   - session_id
   - audio_duration_seconds
   - unit_cost
   - total_cost (in USD)
   - credits_consumed (calculated from total_cost)
   ↓
5. Credit ledger entry inserted:
   {
     "entry_type": "consumption",
     "amount": -12.50,  // negative (deduction)
     "balance_after": 987.50,
     "metadata": {
       "usage": {
         "type": "voice_minutes",
         "quantity": 5.2,
         "unit_cost": 2.40
       }
     }
   }
   ↓
6. organization_billing_settings.credit_balance updated to 987.50
   ↓
7. Session ends; ledger is immutable (forever preserved)
```

---

**End of Investigation Report**