# DreamCrew Database Documentation - Complete Index

**Date Created:** November 6, 2025  
**Documentation Status:** COMPLETE & VERIFIED  
**Schema Coverage:** 100% (55+ tables, 100+ migrations)

---

## Documentation Files Available

### 1. DATABASE_SCHEMA_COMPLETE_MAPPING_20251106.md (55 KB)
**Comprehensive Technical Reference**

Complete technical specification of the entire DreamCrew database schema including:

- Detailed SQL CREATE TABLE statements for all 55+ tables
- Complete column definitions with types and constraints
- Primary keys, foreign keys, and unique constraints
- Full index strategy (200+ indexes total)
- Comprehensive entity relationship diagram (Mermaid format)
- All 14 enum types with values
- 35+ database functions with descriptions
- Row-level security (RLS) policy patterns
- Access patterns and common query examples
- Security considerations and encryption strategy
- Storage bucket configuration
- Notes on recent additions (REP-4900, REP-4970, REP-4987)

**When to use:** For detailed technical implementation, schema validation, query optimization

**File Size:** 1,837 lines | 55 KB

---

### 2. DATABASE_SCHEMA_SUMMARY.md (13 KB)
**Executive Summary & Quick Reference**

High-level overview of the DreamCrew database architecture including:

- Quick facts (55+ tables, 200+ indexes, 14 enums, 100+ migrations)
- Critical tables organized by domain (11 domains)
- Tenant isolation strategy explanation
- Encryption and secrets management
- Recent major additions (REP-4900, REP-4970, REP-4987, voice cloning)
- Key query patterns with SQL examples
- Performance considerations
- Storage buckets list
- JWT-based functions summary
- View descriptions
- GDPR and privacy features
- Migration count by category
- Future roadmap based on schema

**When to use:** For quick lookups, architecture understanding, feature overview

**File Size:** 450+ lines | 13 KB

---

## Quick Navigation Guide

### I Need to...

#### Understand the Overall Architecture
→ Start with `DATABASE_SCHEMA_SUMMARY.md`
- Read "Quick Facts" section (30 seconds)
- Check "Top-Level Organization" diagram
- Review "Critical Tables by Domain"

#### Find a Specific Table Definition
→ Use `DATABASE_SCHEMA_COMPLETE_MAPPING.md`
- Search for table name (e.g., "conversations")
- Review:
  - SQL CREATE TABLE statement
  - All columns with types
  - Indexes and constraints
  - Relationships to other tables

#### Build a Complex Query
→ Check both documents:
1. `SUMMARY.md` "Key Query Patterns" section for examples
2. `COMPLETE_MAPPING.md` for "Database Relationships" ERD
3. Look up specific table column details

#### Implement Tenant Isolation
→ `DATABASE_SCHEMA_SUMMARY.md`
- See "Tenant Isolation Strategy" section
- Copy pattern from RLS Policies section
- Reference tables requiring tenant_id checks

#### Add New Migration
→ `DATABASE_SCHEMA_COMPLETE_MAPPING.md`
- Review existing migrations timeline
- Check current table structures
- Verify all related indexes and constraints
- Ensure RLS policies cover new table

#### Understand Voice Cloning Feature
→ `DATABASE_SCHEMA_SUMMARY.md`
- See "Voice Cloning Infrastructure" section
- Check ElevenLabs integration points
- Review GDPR/consent tables

#### Optimize Database Performance
→ `DATABASE_SCHEMA_COMPLETE_MAPPING.md`
- See "Indexes & Performance" section
- Review largest tables by volume
- Check "Access Patterns" for query optimization

#### Implement GDPR Compliance
→ `DATABASE_SCHEMA_SUMMARY.md`
- See "GDPR & Privacy Features" section
- Check retention policies in recordings table
- Review consent records structure

#### Debug Conversation Features
→ `DATABASE_SCHEMA_COMPLETE_MAPPING.md`
- See conversation tables section (7 related tables)
- Review relationships between:
  - conversations ↔ messages
  - agent_memory_conversations ↔ agent_memory_messages
  - agent_conversation_participants
  - agent_conversation_status
  - agent_conversation_recordings

#### Understand Rep Rooms & Widgets
→ `DATABASE_SCHEMA_SUMMARY.md` then `COMPLETE_MAPPING.md`
- See Rep Room System tables (5 tables)
- Chat Widgets tables (4 tables)
- Voice integration details
- Recent enhancements (auto-expand, analytics)

---

## Domain-Based Quick Reference

### Organizations & Hierarchy
**Tables:** organizations, users, invitations, api_keys  
**Key Functions:** `get_descendant_org_ids_or_self()`, `is_ancestor_or_self()`  
**Levels:** House → Super Agency → Agency → Tenant

### Agent Management (2-Level)
**Tables:** agents, tenant_agent_activations, user_agent_clones, agent_evaluations  
**Features:** House registry → Tenant customization → User personalization

### Conversations & Messaging
**Tables:** 7 tables (conversations, messages, agent_memory_*, agent_conversation_*)  
**New (REP-4900):** Participants, status, recordings  
**Integration:** Mastra memory system

### Rep Rooms & Public Access
**Tables:** rep_rooms, rep_room_sessions, rep_room_participants, rep_room_chat_messages, rep_room_voice_sessions  
**Integration:** LiveKit for voice/video  
**Linking:** 1:1 with user_agent_clones

### Voice & Communication
**Tables:** 8 tables (voice_sessions*, call_sessions, phone_*, user_voice_clones, elevenlabs_*, voice_consent_*, voice_clone_audit_logs)  
**New:** Voice cloning with ElevenLabs, GDPR consent tracking  
**Billing:** Voice usage logs for credit deduction

### Chat Widgets
**Tables:** chat_widgets, widget_sessions, widget_analytics_simple, chat_widget_trigger_analytics  
**New (REP-4970):** Trigger analytics  
**New (REP-4987):** Auto-expand configuration

### Webhooks & Events
**Tables:** webhook_subscriptions, webhook_deliveries, webhook_delivery_logs, webhook_events  
**Features:** 30+ event types, retry logic, rate limiting

### Projects & Tasks
**Tables:** agentic_projects, agentic_project_tasks  
**Features:** AI-driven projects with task hierarchy

### Billing & Credits
**Tables:** organization_billing_settings, credit_ledger_entries  
**Features:** Double-entry ledger, credit allocation/consumption

---

## Security & Compliance Features

### Tenant Isolation
- Explicit `tenant_id` column in all multi-tenant tables
- Row-Level Security (RLS) on all 55+ tables
- JWT-based access control
- Hierarchical organization visibility

### Encryption
- MCP server secrets (BYTEA)
- Phone provider secrets (BYTEA)
- API key hashing (with visible prefix)
- Invitation token hashing

### GDPR Compliance
- Voice consent records with version tracking
- Voice clone audit logs for all operations
- Recording retention policies (standard/extended/permanent/gdpr_compliant)
- Soft deletes for data preservation
- Redaction support for recordings

### Audit Trail
- Complete audit_logs table (millions of entries)
- User action tracking
- IP address and user agent logging
- Change tracking via JSON

---

## Performance Tuning

### Largest Tables (by volume)
1. `agent_memory_messages` - Millions
2. `audit_logs` - Millions
3. `webhook_deliveries` - Hundreds of thousands
4. `voice_usage_logs` - Hundreds of thousands
5. `agent_conversation_recordings` - Thousands

### Most-Queried Tables
1. `conversations` / `agent_memory_conversations`
2. `agent_conversation_status`
3. `rep_room_sessions`
4. `user_agent_clones`
5. `organization_billing_settings`

### Index Strategy
- 200+ indexes total across database
- Partial indexes for active session filtering
- Composite indexes for multi-column queries
- GIN indexes on JSONB columns
- Foreign key indexes for JOIN performance

---

## Recent Changes & Roadmap

### October 22, 2025 (REP-4900)
- agent_conversation_participants (multi-participant support)
- agent_conversation_status (real-time monitoring)
- agent_conversation_recordings (recording metadata)

### October 28, 2025 (REP-4970)
- chat_widget_trigger_analytics (engagement tracking)
- New widget columns: display_mode, skip_phases, embed_config

### October 29, 2025 (REP-4987)
- Auto-expand configuration: enabled, trigger, delay, scroll_threshold
- Widget personality: sales vs support
- Phase progression mode: sequential vs skip

### October 13-16, 2025 (Voice Cloning)
- user_voice_clones (clone management)
- elevenlabs_voice_cache (provider cache)
- voice_clone_audit_logs (compliance)
- voice_consent_records (GDPR)

### Future Phases
- Phase 4: Recording & playback enhancement
- Phase 5: Advanced analytics dashboards
- Phase 6: Vector embeddings for semantic search

---

## Document Maintenance

### Version History
- **v1.0 (Nov 6, 2025):** Initial comprehensive mapping

### Update Process
1. When new migrations are added to `/supabase/migrations/`
2. Update COMPLETE_MAPPING with new table details
3. Update SUMMARY with feature highlights
4. Reference specific migration file in documentation

### Next Update Triggers
- New major feature release
- Schema changes beyond minor field additions
- New integration (e.g., additional voice providers)
- Performance optimization recommendations
- Security policy updates

---

## Troubleshooting & Common Issues

### Issue: "Tenant isolation not working"
**Solution:** Check `tenant_id` column exists in table and is included in WHERE clause. Review RLS policies in migration files.

### Issue: "Conversation not appearing in real-time"
**Solution:** Verify `agent_conversation_status` table has corresponding record. Check `is_active` and `last_activity_at` columns.

### Issue: "Voice session not connecting"
**Solution:** Check LiveKit integration. Verify `livekit_room_id` and `livekit_session_id` are set. Review `voice_sessions` vs `rep_room_voice_sessions` difference.

### Issue: "Widget not tracking analytics"
**Solution:** Ensure `chat_widget_trigger_analytics` is being populated. Check RLS policies allow insert without auth.

### Issue: "Recording not processing"
**Solution:** Check `agent_conversation_recordings` `processing_status`. Verify storage bucket exists. Check `processing_error` field for details.

---

## Related Documentation

### Other Schema References
- `/docs/knowledge/10132025/DATABASE_SCHEMA.md` - Previous version
- `/src/types/supabase.ts` - TypeScript type definitions
- `/supabase/migrations/` - All migration files (source of truth)

### Architecture Documentation
- `/docs/architecture/` - System design documents
- `/docs/platform-ssot/02-DATABASE-SCHEMA.md` - Single source of truth
- `/docs/analysis/` - Analysis reports

---

## How to Use These Documents

### For New Team Members
1. Start with SUMMARY.md
2. Read "Quick Facts" and "Critical Tables by Domain"
3. Pick your feature area and dive into COMPLETE_MAPPING.md
4. Review "Security & Compliance Features" section

### For Developers
1. Use COMPLETE_MAPPING.md as reference
2. Search for specific table names
3. Check indexes and constraints
4. Review query patterns section
5. Reference security considerations

### For Database Administrators
1. Review performance tuning section
2. Check index strategy
3. Monitor largest tables
4. Plan archival for audit logs
5. Track migration history

### For Architects
1. Read SUMMARY.md for overview
2. Review organization hierarchy structure
3. Check integration points
4. Plan for scalability
5. Review future roadmap

---

## Support & Questions

For questions about:
- **Specific tables:** See COMPLETE_MAPPING.md
- **Features:** See SUMMARY.md
- **Relationships:** See ERD in COMPLETE_MAPPING.md
- **Queries:** See "Access Patterns" in COMPLETE_MAPPING.md
- **Security:** See both documents' security sections
- **Performance:** See "Indexes & Performance" section

---

**Documentation Generated:** November 6, 2025  
**Schema Basis:** PostgreSQL/Supabase with 100+ migrations  
**Coverage:** Complete (55+ tables verified)  
**Status:** Production Ready

This documentation is a comprehensive reference for the DreamCrew platform database architecture. Keep it updated as schema evolves.
