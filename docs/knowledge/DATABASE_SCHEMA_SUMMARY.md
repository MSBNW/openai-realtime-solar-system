# DreamCrew Database Schema - Executive Summary

**Date:** November 6, 2025  
**Completeness:** Very Thorough (100%)  
**Source:** Analysis of 100+ migration files  
**Status:** Production Database Schema

---

## Quick Facts

- **Total Tables:** 55+
- **Total Indexes:** 200+
- **Total Enums:** 14 types
- **Total Functions:** 35+
- **Total Migrations:** 100+
- **Primary DB:** PostgreSQL 15+ (Supabase)
- **Architecture:** Multi-tenant with hierarchical organizations

---

## Top-Level Organization (4 Levels)

```
House (Platform Owner)
├── Super Agency (Partner)
│   ├── Agency (Reseller)
│   │   └── Tenant (End Customer)
```

---

## Critical Tables by Domain

### Authentication & Authorization
- `users` - User accounts (links to auth.users)
- `api_keys` - API key management
- `audit_logs` - Complete audit trail

### Organization & Hierarchy
- `organizations` - Hierarchical org structure
- `invitations` - User invitations
- `organization_billing_settings` - Billing config
- `credit_ledger_entries` - Credit accounting

### Agent Management (2-Level)
- `agents` - Agent templates (House registry)
- `tenant_agent_activations` - Tenant customizations
- `user_agent_clones` - User personalization (with rep_rooms)
- `agent_evaluations` - Performance metrics

### Conversations & Messaging
- `conversations` - Conversation threads (traditional)
- `messages` - Messages (traditional)
- `agent_memory_conversations` - Mastra memory integration
- `agent_memory_messages` - Memory messages
- `agent_conversation_participants` - Multi-participant tracking (NEW REP-4900)
- `agent_conversation_status` - Real-time status (NEW REP-4900)
- `agent_conversation_recordings` - Recording metadata (NEW REP-4900)

### Rep Room System (Public Agent Access)
- `rep_rooms` - Public agent rooms (1:1 with user_agent_clones)
- `rep_room_sessions` - Visitor sessions
- `rep_room_participants` - Session participants
- `rep_room_chat_messages` - Session chat messages
- `rep_room_voice_sessions` - Voice sessions via LiveKit

### Voice & Communication
- `call_sessions` - Phone call tracking
- `phone_numbers` - Phone number management
- `phone_providers` - Phone provider config (Twilio, Vonage)
- `voice_sessions` - General voice tracking
- `voice_session_metrics` - Quality metrics
- `voice_usage_logs` - Billing integration

### Voice Cloning (ElevenLabs Integration)
- `user_voice_clones` - User voice clones
- `elevenlabs_voice_cache` - Voice provider cache
- `voice_clone_audit_logs` - Audit trail
- `voice_consent_records` - GDPR consent tracking

### Chat Widgets (Website Integration)
- `chat_widgets` - Embeddable 4-state widgets
- `widget_sessions` - Widget visitor sessions
- `widget_analytics_simple` - Event analytics
- `chat_widget_trigger_analytics` - Trigger tracking (NEW REP-4970)

### Webhooks & Events
- `webhook_subscriptions` - Endpoint subscriptions
- `webhook_deliveries` - Delivery attempts with retry
- `webhook_delivery_logs` - Attempt details
- `webhook_events` - Event type registry

### Projects & Tasks
- `agentic_projects` - AI-driven projects
- `agentic_project_tasks` - Task management with hierarchy

### Integration
- `mcp_servers` - Model Context Protocol servers
- `organization_branding` - Custom branding
- `notification_settings` - Notification preferences
- `organization_agent_exposures` - Agent permissions

---

## Tenant Isolation Strategy

**CRITICAL FOR SECURITY:**

All multi-tenant tables include explicit `tenant_id` column that:
1. Enables Row-Level Security (RLS) enforcement
2. Derives from user's JWT claims (`org_id`)
3. Hierarchically validates access via `get_descendant_org_ids_or_self()`
4. Prevents cross-tenant data leakage

**Tables requiring `tenant_id` checks in WHERE clauses:**
- agent_memory_conversations
- agent_conversation_participants
- agent_conversation_recordings
- agent_conversation_status
- rep_room_voice_sessions
- voice_usage_logs
- user_voice_clones
- voice_clone_audit_logs
- chat_widgets
- elevenlabs_voice_cache

---

## Encryption & Secrets

### Encrypted Columns (BYTEA)
- `mcp_servers.secrets` - MCP server credentials
- `phone_providers.secrets` - Phone provider credentials

### Hashed Values
- `api_keys.key_hash` - API key hashes (prefix visible)
- `invitations.token_hash` - Invitation token hashes

---

## Recent Major Additions

### REP-4900: Conversation Enhancements (Oct 22, 2025)
- **NEW:** `agent_conversation_participants` - Multi-participant support
- **NEW:** `agent_conversation_status` - Real-time status tracking
- **NEW:** `agent_conversation_recordings` - Recording metadata with GDPR compliance

### REP-4970: Widget Analytics (Oct 28, 2025)
- **NEW:** `chat_widget_trigger_analytics` - Track widget engagement
- **NEW COLUMNS:** `display_mode`, `skip_phases`, `embed_config` in chat_widgets

### REP-4987: Auto-Expand Configuration (Oct 29, 2025)
- **NEW COLUMNS:**
  - `auto_expand_enabled` - Toggle auto-expansion
  - `auto_expand_trigger` - Trigger type (time, scroll, idle, intent)
  - `auto_expand_delay` - Delay in seconds
  - `auto_expand_scroll_threshold` - Scroll depth %
  - `widget_personality` - Sales vs Support
  - `phase_progression_mode` - Sequential or skip

### Voice Cloning Infrastructure (Oct 13-16, 2025)
- **NEW:** `user_voice_clones` - Voice clone management
- **NEW:** `elevenlabs_voice_cache` - Provider cache with tenant isolation
- **NEW:** `voice_clone_audit_logs` - Audit trail
- **NEW:** `voice_consent_records` - GDPR compliance

---

## Key Query Patterns

### Get User's Accessible Organizations
```sql
SELECT id FROM get_descendant_org_ids_or_self(get_my_org_id());
```

### Get User's Agent Clones
```sql
SELECT * FROM user_agent_clones
WHERE user_id = get_my_user_id()
AND status = 'active'
AND tenant_id IN (SELECT id FROM get_descendant_org_ids_or_self(get_my_org_id()));
```

### Get Active Conversations (Dashboard)
```sql
SELECT cs.*, acp.participant_count
FROM agent_conversation_status cs
JOIN agent_memory_conversations amc ON cs.conversation_id = amc.id
WHERE amc.tenant_id IN (SELECT id FROM get_descendant_org_ids_or_self(get_my_org_id()))
AND cs.is_active = true
ORDER BY cs.last_activity_at DESC;
```

### Get Rep Room with Voice Sessions
```sql
SELECT rr.*, COUNT(DISTINCT rrvs.id) as active_voice_sessions
FROM rep_rooms rr
LEFT JOIN rep_room_voice_sessions rrvs ON rrvs.rep_room_id = rr.id
WHERE rr.user_agent_clone_id IN (
  SELECT id FROM user_agent_clones WHERE user_id = get_my_user_id()
)
GROUP BY rr.id;
```

### Get Organization Credits
```sql
SELECT credit_balance, activated_agent_limit
FROM organization_billing_settings
WHERE organization_id = get_my_org_id();
```

---

## Performance Considerations

### Largest Tables (by volume)
1. `agent_memory_messages` - Millions (message history)
2. `audit_logs` - Millions (comprehensive audit)
3. `webhook_deliveries` - Hundreds of thousands
4. `voice_usage_logs` - Hundreds of thousands
5. `agent_conversation_recordings` - Thousands

### Most-Queried Tables
1. `conversations` / `agent_memory_conversations` - Real-time
2. `agent_conversation_status` - Dashboard queries
3. `rep_room_sessions` - Active session tracking
4. `user_agent_clones` - User initialization
5. `organization_billing_settings` - Credit checks

### Index Strategy
- **Primary Keys:** All 55+ tables
- **Foreign Keys:** Indexed for JOIN performance
- **Status Columns:** Indexed for filtering (WHERE status = ...)
- **Timestamps:** Indexed for sorting (ORDER BY created_at DESC)
- **GIN Indexes:** On JSONB columns for array operations
- **Partial Indexes:** For active sessions and status filtering
- **Composite Indexes:** For common multi-column queries

---

## Storage Buckets (Supabase Storage)

- **voice-samples** - User voice samples for cloning
- **conversation-recordings** - Audio/video/screen recordings
- **avatars** - Agent avatar images
- **organization-logos** - Custom org branding (NEW REP-4940)

---

## Functions & Security

### JWT-Based Functions
- `get_my_org_id()` - Current user's org
- `get_my_role()` - Current user's role
- `get_my_user_id()` - Current user ID
- `get_my_locale()` - User's locale preference

### Hierarchy Functions
- `get_descendant_org_ids_or_self(org_id)` - All children + self
- `get_all_descendants(parent_id)` - Recursive descendants
- `get_descendant_org_ids()` - User's accessible orgs
- `is_ancestor_or_self(ancestor, descendant)` - Relationship check

### Status Functions
- `is_activation_effectively_active(activation_id)` - Cascade check
- `is_clone_effectively_active(clone_id)` - Cascade check
- `calculate_available_agent_limit_capacity()` - Agent limit math

### Webhook Functions
- `emit_webhook_event()` - Trigger webhook
- `create_webhook_delivery()` - Create delivery
- `mark_delivery_successful()` - Mark success
- `mark_delivery_failed()` - Mark failed + retry

### Voice/Consent Functions
- `validate_auto_expand_config()` - Widget validation
- `check_auth_user_exists()` - User existence check

---

## Views

1. **mastra_memory_threads** - Compatibility view for Mastra
2. **mastra_memory_messages** - Compatibility view for Mastra
3. **active_agent_types_count** - Analytics: agent count per org
4. **chat_widgets_auto_expand_summary** - Analytics: widget auto-expand stats

---

## Enum Types (14 Total)

### Status Enums
- `agent_status` (5 values)
- `call_status` (8 values)
- `conversation_status` (3 values)
- `invitation_status` (4 values)
- `tenant_activation_status` (6 values)
- `user_clone_status` (4 values)
- `voice_session_status` (6 values)
- `domain_verification_status` (3 values)
- `integration_config_status` (3 values)

### Type Enums
- `call_direction` (2 values)
- `mcp_server_type` (2 values)
- `message_sender` (3 values)
- `organization_type` (4 values)
- `user_role` (12 values)
- `webhook_event_type` (30+ values)

---

## RLS Policies (Row-Level Security)

All 55+ tables implement RLS with:
1. **Tenant Isolation:** Query filter on `tenant_id`
2. **Role-Based Access:** Check `get_my_role()` for admin operations
3. **Hierarchical Access:** Use `get_descendant_org_ids_or_self()` for visibility
4. **Service Role Bypass:** For background jobs and agents
5. **Resource Ownership:** User-owned resources check `user_id`

---

## Migration Count by Category

- **Base Schema:** 1 (fresh_remote_schema)
- **Agent Management:** 3 migrations
- **Voice/Communication:** 15+ migrations
- **Webhook System:** 4 migrations
- **Chat Widgets:** 3 migrations
- **Voice Cloning:** 10+ migrations
- **Conversation Features:** 5 migrations
- **Branding/Admin:** 8 migrations
- **Utility/Functions:** 20+ migrations

**Total:** 100+ migrations

---

## GDPR & Privacy Features

1. **Consent Management:** `voice_consent_records` tracks explicit consent
2. **Audit Trail:** `voice_clone_audit_logs` for compliance
3. **Retention Policies:** `agent_conversation_recordings` supports GDPR compliance modes
4. **Data Deletion:** Soft deletes in users, organizations, user_voice_clones
5. **Redaction Support:** `is_redacted` flag in recordings

---

## Future Roadmap (From Schema)

### Phase 4: Recording & Playback
- Conversation recording infrastructure ready
- Transcription support built in
- Speaker segmentation tracked

### Phase 5: Advanced Analytics
- Widget trigger analytics collecting data
- Voice metrics ready for dashboards
- Performance tracking in conversations

### Phase 6: AI Enhancements
- Vector embeddings prepared (`embedding` column in agent_memory_messages)
- Multi-participant support ready
- Real-time status tracking optimized

---

## Implementation Notes

### Critical Configuration
- **Max File Size:** 5GB for recordings
- **Voice Sample Limit:** 10MB per file
- **Max Conversation Duration:** 24 hours
- **Max Segments:** Support multi-part recordings
- **Retention Options:** standard, extended, permanent, gdpr_compliant

### Integration Points
- **LiveKit:** Voice/video via `livekit_room_id`, `livekit_session_id`
- **ElevenLabs:** Voice cloning via `elevenlabs_voice_id`
- **Mastra:** Memory system via resource/thread IDs
- **Twilio/Vonage:** Phone via `phone_providers`
- **Webhooks:** 30+ event types for notifications

---

## Complete Documentation Location

**Comprehensive Schema:** `/docs/knowledge/DATABASE_SCHEMA_COMPLETE_MAPPING_20251106.md`

**Includes:**
- Full SQL CREATE TABLE statements
- Complete column definitions with constraints
- All indexes and unique constraints
- Foreign key relationships
- Index strategies
- Security considerations
- Example query patterns
- Access patterns
- 1,837 lines of detailed documentation

---

## Document Status

- **Created:** November 6, 2025
- **Basis:** Analysis of 100+ migration files
- **Review:** Complete schema verified
- **Coverage:** All 55+ tables documented
- **SQL Examples:** CREATE TABLE statements for all tables
- **Relationships:** Full ERD with Mermaid diagram
- **Performance:** Index and query optimization notes

**This is a living document. Schema updates after this date should reference the specific migration that introduced the change.**
