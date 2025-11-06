# White-Label Organizational Hierarchy - Complete Investigation

## Executive Summary

This document provides a complete investigation of the white-label organizational hierarchy system in the platform. It covers database schemas, organizational types, permissions at each level, the agent exposure system, and code enforcement mechanisms.

The system implements a 4-tier organizational hierarchy: **House → Super Agency → Agency → Tenant**, with strict permission controls and multi-tenant isolation.

---

## 1. DATABASE SCHEMA

### 1.1 Organizations Table

**Location:** `/supabase/migrations/20250428000000_fresh_remote_schema.sql`

```sql
CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "org_type" "public"."organization_type" NOT NULL,
    "parent_org_id" "uuid",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "disable_parent_invites" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "organizations_name_check" CHECK ((("char_length"("name") > 0) AND ("char_length"("name") <= 255))),
    CONSTRAINT "organizations_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'inactive'::"text"])))
);
```

**Key Columns:**
- `id` (UUID): Primary key, auto-generated
- `name` (TEXT): Organization name (1-255 characters)
- `org_type` (ENUM): One of: house, super_agency, agency, tenant
- `parent_org_id` (UUID): Reference to parent organization (NULL for House)
- `status` (TEXT): One of: active, suspended, inactive
- `disable_parent_invites` (BOOLEAN): Controls whether parent can invite users

**Indexes:**
- Primary key on `id`
- Foreign key constraint on `parent_org_id` (self-referential)

**Comment:**
> "Represents entities (House, SuperAgencies, Agencies, Tenants) in the platform hierarchy. Status changes trigger cascading status propagation to descendants and their resources (managed by Mylove)."

---

### 1.2 Organization Agent Exposures Table

**Location:** `/supabase/migrations/20250428000000_fresh_remote_schema.sql`

```sql
CREATE TABLE IF NOT EXISTS "public"."organization_agent_exposures" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "agent_id" "text" NOT NULL,
    "exposed_by_org_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);
```

**Key Columns:**
- `id` (UUID): Primary key
- `organization_id` (UUID): The organization that can see/use this agent
- `agent_id` (TEXT): Reference to the agent being exposed
- `exposed_by_org_id` (UUID): The organization that controls this exposure (direct parent)
- `enabled` (BOOLEAN): Whether the agent is currently enabled
- `created_at`, `updated_at`: Timestamp tracking

**Indexes:**
```sql
CREATE UNIQUE INDEX "organization_agent_exposures_organization_id_agent_id_key" 
  ON "organization_agent_exposures" ("organization_id", "agent_id");

CREATE INDEX "idx_org_agent_exposures_agent_id" 
  ON "organization_agent_exposures" ("agent_id");

CREATE INDEX "idx_org_agent_exposures_enabled" 
  ON "organization_agent_exposures" ("enabled");

CREATE INDEX "idx_org_agent_exposures_org_agent" 
  ON "organization_agent_exposures" ("organization_id", "agent_id");
```

**Foreign Keys:**
```sql
ALTER TABLE ONLY "public"."organization_agent_exposures"
    ADD CONSTRAINT "organization_agent_exposures_agent_id_fkey" 
    FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."organization_agent_exposures"
    ADD CONSTRAINT "organization_agent_exposures_exposed_by_org_id_fkey" 
    FOREIGN KEY ("exposed_by_org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."organization_agent_exposures"
    ADD CONSTRAINT "organization_agent_exposures_organization_id_fkey" 
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;
```

**Comment:**
> "Links published agents to organizations they are exposed/available to by their direct parent. Managed by Mylove."

---

### 1.3 Organization Type Enum

**Location:** `/supabase/migrations/20250428000000_fresh_remote_schema.sql` (lines 218-229)

```sql
CREATE TYPE "public"."organization_type" AS ENUM (
    'house',
    'super_agency',
    'agency',
    'tenant'
);

COMMENT ON TYPE "public"."organization_type" IS 'Fixed types for organizational hierarchy tiers.';
```

**Valid Values:**
- `house`: The root/platform level organization (single instance)
- `super_agency`: First partner tier, direct children of House
- `agency`: Second partner tier, direct children of Super Agency
- `tenant`: End-user tier, direct children of Agency

---

### 1.4 User Roles Enum

**Location:** `/supabase/migrations/20250428000000_fresh_remote_schema.sql` (lines 293-312)

```sql
CREATE TYPE "public"."user_role" AS ENUM (
    'house_admin',
    'house_manager',
    'house_support',
    'super_agency_admin',
    'super_agency_manager',
    'super_agency_support',
    'agency_admin',
    'agency_manager',
    'agency_support',
    'tenant_admin',
    'tenant_manager',
    'tenant_user'
);

COMMENT ON TYPE "public"."user_role" IS 'Fixed roles for users within organizations.';
```

---

## 2. ORGANIZATIONAL HIERARCHY

### 2.1 Hierarchy Structure

```
House (Single Root)
└── Super Agency (Direct children of House)
    ├── Agency 1 (Direct children of Super Agency)
    │   ├── Tenant 1
    │   ├── Tenant 2
    │   └── Tenant 3
    └── Agency 2 (Direct children of Super Agency)
        └── Tenant 4
```

### 2.2 Hierarchy Validation

**Test Data Example:**
```sql
INSERT INTO organizations (id, name, slug, type, tier, status, parent_org_id)
VALUES 
  ('10000000-0000-0000-0000-000000000001', 'House', 'house', 'house', 'premium', 'active', NULL),
  ('10000000-0000-0000-0000-000000000002', 'Super Agency', 'super-agency', 'super_agency', 'premium', 'active', '10000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000003', 'Agency 1', 'agency-1', 'agency', 'standard', 'active', '10000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000004', 'Tenant 1', 'tenant-1', 'tenant', 'standard', 'active', '10000000-0000-0000-0000-000000000003');
```

**Source:** `/supabase/tests/organizations-hierarchy.test.sql` (lines 19-29)

---

## 3. PERMISSIONS AT EACH LEVEL

### 3.1 Permission Model

**Source:** `/supabase/functions/shared/rbac.ts`

```typescript
export enum Permissions {
  // House admin permissions
  MANAGE_HOUSE = 'manage:house',
  MANAGE_SUPER_AGENCIES = 'manage:super_agencies',
  MANAGE_AGENTS = 'manage:agents',
  VIEW_ALL_ORGANIZATIONS = 'view:all_organizations',
  
  // Super agency admin permissions
  MANAGE_SUPER_AGENCY = 'manage:super_agency',
  MANAGE_AGENCIES = 'manage:agencies',
  MANAGE_AGENT_EXPOSURES = 'manage:agent_exposures',
  
  // Agency admin permissions
  MANAGE_AGENCY = 'manage:agency',
  MANAGE_TENANTS = 'manage:tenants',
  
  // Tenant admin permissions
  MANAGE_TENANT = 'manage:tenant',
  MANAGE_USERS = 'manage:users',
  
  // User permissions
  USE_AGENTS = 'use:agents',
}
```

### 3.2 Role-Based Permissions

**Source:** `/supabase/functions/shared/rbac.ts` (lines 30-62)

```typescript
const rolePermissions: Record<string, Permissions[]> = {
  'house_admin': [
    Permissions.MANAGE_HOUSE,
    Permissions.MANAGE_SUPER_AGENCIES,
    Permissions.MANAGE_AGENTS,
    Permissions.VIEW_ALL_ORGANIZATIONS,
    Permissions.MANAGE_AGENT_EXPOSURES,
    Permissions.MANAGE_USERS,
  ],
  
  'super_agency_admin': [
    Permissions.MANAGE_SUPER_AGENCY,
    Permissions.MANAGE_AGENCIES,
    Permissions.MANAGE_AGENT_EXPOSURES,
    Permissions.MANAGE_USERS,
  ],
  
  'agency_admin': [
    Permissions.MANAGE_AGENCY,
    Permissions.MANAGE_TENANTS,
    Permissions.MANAGE_USERS,
  ],
  
  'tenant_admin': [
    Permissions.MANAGE_TENANT,
    Permissions.MANAGE_USERS,
    Permissions.USE_AGENTS,
  ],
  
  'tenant_user': [
    Permissions.USE_AGENTS,
  ],
};
```

### 3.3 Permission Summary Table

| Level | Roles | Can Create | Can Manage | Can Manage Exposures | Can View |
|-------|-------|-----------|-----------|----------------------|----------|
| **House** | house_admin, house_manager, house_support | Super Agencies | All | Yes | All Organizations |
| **Super Agency** | super_agency_admin, super_agency_manager, super_agency_support | Agencies, Agents | Agency + own | Yes | Self + Agencies + Tenants |
| **Agency** | agency_admin, agency_manager, agency_support | Tenants | Self + Tenants | No | Self + Tenants |
| **Tenant** | tenant_admin, tenant_manager, tenant_user | (None) | Self, Users | No | Self |

---

## 4. AGENT EXPOSURE SYSTEM

### 4.1 How Agent Exposure Works

The `organization_agent_exposures` table implements the **agent visibility cascade** where:

1. **House** creates/publishes agents
2. **House** exposes agents to **Super Agencies** (via `enabled=true`)
3. **Super Agencies** expose agents to **Agencies** (creating exposure records)
4. **Agencies** expose agents to **Tenants** (via tenant_agent_activations)

### 4.2 Exposure Logic by Level

**For Super Agency Admin (creating exposure for Agency):**
```typescript
// Source: /supabase/functions/organization-agent-exposures-manage/index.ts (lines 163-171)

if (isSuperAgencyRole) {
  // For Super Agency, check if the agent is public
  if (!agent.is_public) {
    return errorResponse(
      'Agent is not available to your organization',
      'Agent is not public, cannot be used by Super Agency',
      403
    );
  }
}
```

**For Agency Admin (creating exposure for Tenant):**
```typescript
// Source: /supabase/functions/organization-agent-exposures-manage/index.ts (lines 172-218)

else if (isAgencyRole) {
  // For Agency, check if the agent is exposed and enabled by their parent SA
  
  // First, find the parent SA
  const { data: agencyData, error: agencyError } = await supabaseClient
    .from('organizations')
    .select('parent_org_id')
    .eq('id', user.organization_id)
    .single();
    
  const parentSAId = agencyData.parent_org_id;
    
  // Now check if the agent is enabled by the parent SA
  const { data: exposure, error: exposureError } = await supabaseClient
    .from('organization_agent_exposures')
    .select('id, enabled')
    .eq('organization_id', parentSAId)
    .eq('agent_id', requestData.agent_id)
    .single();
    
  if (!exposure || !exposure.enabled) {
    return errorResponse(
      'Agent is not available to your organization',
      'Agent not enabled by parent Super Agency',
      403
    );
  }
}
```

### 4.3 Agent Activation Flow

```
House Admin: Creates Agent → Sets is_public=true
  ↓
Super Agency Admin: Enables Agent via organization_agent_exposures
  ↓ exposed_by_org_id = super_agency_id, organization_id = agency_id
  ↓
Agency Admin: Enables Agent via organization_agent_exposures
  ↓ exposed_by_org_id = agency_id, organization_id = tenant_id
  ↓
Tenant User: Activates Agent via tenant_agent_activations
```

### 4.4 Example: Checking Agent Exposures

**Source:** `/tools/check-agent-exposures.js` (complete working example)

```javascript
// Sign in as Super Agency admin
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'mike+mello-superagency-admin1@get100x.com',
  password: 'As12345678'
});

// Get Super Agency org ID
const { data: userData } = await supabase
  .from('users')
  .select('organization_id')
  .eq('id', authData.user.id)
  .single();

const superAgencyOrgId = userData.organization_id;

// Check all exposures for this organization
const { data: exposures } = await supabase
  .from('organization_agent_exposures')
  .select('*')
  .eq('organization_id', superAgencyOrgId);

console.log(`Found ${exposures?.length || 0} exposure records`);

// Check specifically for Crew Chief
const crewChiefExposure = exposures?.find(exp => exp.agent_id === 'crewChiefAgent');
if (crewChiefExposure) {
  console.log('Found Crew Chief exposure:', {
    enabled: crewChiefExposure.enabled,
    exposed_by: crewChiefExposure.exposed_by_org_id,
    created_at: crewChiefExposure.created_at
  });
} else {
  console.log('NO exposure record found for Crew Chief - child agencies cannot see it!');
}
```

---

## 5. ROW LEVEL SECURITY (RLS) POLICIES

### 5.1 Organizations Table RLS

**Source:** `/supabase/migrations/20250428000000_fresh_remote_schema.sql`

#### House Admin Policies

```sql
-- House admin can do anything with organizations
CREATE POLICY "organizations_house_admin_select" ON "public"."organizations" 
  FOR SELECT USING (("public"."get_my_role"() = 'house_admin'::"text"));

CREATE POLICY "organizations_house_admin_insert" ON "public"."organizations" 
  FOR INSERT WITH CHECK (("public"."get_my_role"() = 'house_admin'::"text"));

CREATE POLICY "organizations_house_admin_update" ON "public"."organizations" 
  FOR UPDATE USING (("public"."get_my_role"() = 'house_admin'::"text")) 
  WITH CHECK (("public"."get_my_role"() = 'house_admin'::"text"));

CREATE POLICY "organizations_house_admin_delete" ON "public"."organizations" 
  FOR DELETE USING (("public"."get_my_role"() = 'house_admin'::"text"));
```

#### Admin Policies (Super Agency, Agency)

```sql
-- Admins can create children (with validation of org_type progression)
CREATE POLICY "organizations_admins_create_children" ON "public"."organizations" 
  FOR INSERT WITH CHECK ((
    ("public"."get_my_org_id"() IS NOT NULL) 
    AND ("public"."get_my_role"() = ANY (ARRAY['house_admin', 'house_manager', 'super_agency_admin', 'super_agency_manager', 'agency_admin', 'agency_manager']))
    AND ("parent_org_id" = "public"."get_my_org_id"())
    AND (validation of org_type hierarchy)
  ));

-- Admins can view own org and direct children
CREATE POLICY "organizations_admins_view_own_and_direct_children" ON "public"."organizations" 
  FOR SELECT USING ((
    ("public"."get_my_org_id"() IS NOT NULL) 
    AND ("public"."get_my_role"() = ANY (ARRAY[...]))
    AND (("id" = "public"."get_my_org_id"()) OR ("parent_org_id" = "public"."get_my_org_id"()))
  ));

-- Admins can delete their children
CREATE POLICY "organizations_admins_delete_children" ON "public"."organizations" 
  FOR DELETE USING ((
    ("public"."get_my_org_id"() IS NOT NULL) 
    AND ("parent_org_id" = "public"."get_my_org_id"()) 
    AND ("public"."get_my_role"() = ANY (ARRAY['house_admin', 'super_agency_admin', 'agency_admin']))
  ));

-- Admins can update children's name
CREATE POLICY "organizations_admins_update_children_name" ON "public"."organizations" 
  FOR UPDATE USING ((
    ("public"."get_my_org_id"() IS NOT NULL) 
    AND ("parent_org_id" = "public"."get_my_org_id"()) 
    AND ("public"."get_my_role"() = ANY (ARRAY[...]))
  ))
  WITH CHECK ((same conditions));

-- Admins can update children's status
CREATE POLICY "organizations_admins_update_children_status" ON "public"."organizations" 
  FOR UPDATE USING ((
    ("public"."get_my_org_id"() IS NOT NULL) 
    AND ("parent_org_id" = "public"."get_my_org_id"()) 
    AND ("public"."get_my_role"() = ANY (ARRAY['house_admin', 'super_agency_admin', 'agency_admin']))
  ))
  WITH CHECK ((same conditions));
```

#### Regular User Policies

```sql
-- Users can see their own organization
CREATE POLICY "organizations_users_see_own_org" ON "public"."organizations" 
  FOR SELECT USING (("id" = "public"."get_my_org_id"()));

-- Regular authenticated users can view their organization
CREATE POLICY "Allow authenticated users to select their organization" ON "public"."organizations" 
  FOR SELECT TO "authenticated" 
  USING (("id" IN ( SELECT "users"."organization_id" FROM "public"."users")));
```

### 5.2 Organization Agent Exposures RLS

**Source:** `/supabase/migrations/20250428000000_fresh_remote_schema.sql`

#### House Admin Policies

```sql
CREATE POLICY "org_agent_exposures_house_admin_select" ON "public"."organization_agent_exposures" 
  FOR SELECT USING (("public"."get_my_role"() = 'house_admin'::"text"));

CREATE POLICY "org_agent_exposures_house_admin_insert" ON "public"."organization_agent_exposures" 
  FOR INSERT WITH CHECK (("public"."get_my_role"() = 'house_admin'::"text"));

CREATE POLICY "org_agent_exposures_house_admin_update" ON "public"."organization_agent_exposures" 
  FOR UPDATE USING (("public"."get_my_role"() = 'house_admin'::"text")) 
  WITH CHECK (("public"."get_my_role"() = 'house_admin'::"text"));

CREATE POLICY "org_agent_exposures_house_admin_delete" ON "public"."organization_agent_exposures" 
  FOR DELETE USING (("public"."get_my_role"() = 'house_admin'::"text"));
```

#### Admin Policies (Super Agency, Agency)

```sql
-- Admins can expose agents to their direct children
CREATE POLICY "org_agent_exposures_admins_insert_children_exposures" 
  ON "public"."organization_agent_exposures" FOR INSERT WITH CHECK ((
    ("public"."get_my_org_id"() IS NOT NULL) 
    AND ("exposed_by_org_id" = "public"."get_my_org_id"()) 
    AND "public"."is_direct_child"("public"."get_my_org_id"(), "organization_id") 
    AND ("public"."get_my_role"() = ANY (ARRAY['house_admin', 'house_manager', 'super_agency_admin', 'super_agency_manager', 'agency_admin', 'agency_manager']))
  ));

-- Admins can view exposures of their direct children
CREATE POLICY "org_agent_exposures_admins_select_children_exposures" 
  ON "public"."organization_agent_exposures" FOR SELECT USING ((
    ("public"."get_my_org_id"() IS NOT NULL) 
    AND ("exposed_by_org_id" = "public"."get_my_org_id"()) 
    AND "public"."is_direct_child"("public"."get_my_org_id"(), "organization_id") 
    AND ("public"."get_my_role"() = ANY (ARRAY[...]))
  ));

-- Admins can update exposures of their direct children
CREATE POLICY "org_agent_exposures_admins_update_children_exposures" 
  ON "public"."organization_agent_exposures" FOR UPDATE 
  USING ((("public"."get_my_org_id"() IS NOT NULL) AND ("exposed_by_org_id" = "public"."get_my_org_id"()) AND "public"."is_direct_child"("public"."get_my_org_id"(), "organization_id") AND ("public"."get_my_role"() = ANY (ARRAY[...]))))
  WITH CHECK ((("public"."get_my_org_id"() IS NOT NULL) AND ("exposed_by_org_id" = "public"."get_my_org_id"()) AND "public"."is_direct_child"("public"."get_my_org_id"(), "organization_id") AND ("public"."get_my_role"() = ANY (ARRAY[...]))));

-- Admins can delete exposures of their direct children
CREATE POLICY "org_agent_exposures_admins_delete_children_exposures" 
  ON "public"."organization_agent_exposures" FOR DELETE 
  USING ((("public"."get_my_org_id"() IS NOT NULL) AND ("exposed_by_org_id" = "public"."get_my_org_id"()) AND "public"."is_direct_child"("public"."get_my_org_id"(), "organization_id") AND ("public"."get_my_role"() = ANY (ARRAY[...]))));
```

#### User View Policies

```sql
-- Users can view exposures for their own organization
CREATE POLICY "org_agent_exposures_users_view_to_my_org" 
  ON "public"."organization_agent_exposures" FOR SELECT 
  USING ((("public"."get_my_org_id"() IS NOT NULL) AND ("organization_id" = "public"."get_my_org_id"())));
```

---

## 6. HIERARCHY TRAVERSAL FUNCTIONS

### 6.1 Descendant Retrieval

**Source:** `/supabase/migrations/20250428000000_fresh_remote_schema.sql` (lines 1050-1063)

```sql
CREATE OR REPLACE FUNCTION "public"."organization_descendants"("org_id" "uuid") 
  RETURNS TABLE("id" "uuid")
  LANGUAGE "sql" STABLE SECURITY DEFINER
AS $$
  WITH RECURSIVE descendants AS (
    SELECT o.id
    FROM organizations o
    WHERE o.parent_org_id = org_id
    UNION ALL
    SELECT o.id
    FROM organizations o
    JOIN descendants d ON o.parent_org_id = d.id
  )
  SELECT id FROM descendants;
$$;
```

### 6.2 Descendant IDs with Self Option

**Source:** `/supabase/migrations/20250428000000_fresh_remote_schema.sql` (lines 481-499)

```sql
CREATE OR REPLACE FUNCTION "public"."get_descendant_org_ids_or_self"("p_org_id" "uuid") 
  RETURNS SETOF "uuid"
  LANGUAGE "sql" SECURITY DEFINER
  SET "search_path" TO 'public'
AS $$
  WITH RECURSIVE descendants AS (
    -- Base case: the organization itself
    SELECT id FROM organizations WHERE id = p_org_id
    
    UNION ALL
    
    -- Recursive case: children of the organization
    SELECT o.id 
    FROM organizations o
    JOIN descendants d ON o.parent_org_id = d.id
    WHERE o.status = 'active' -- Only include active organizations
  )
  SELECT id FROM descendants;
$$;
```

### 6.3 Check Ancestor Relationship

**Source:** `/supabase/migrations/20250428000000_fresh_remote_schema.sql` (lines 893-928)

```sql
CREATE OR REPLACE FUNCTION "public"."is_ancestor_or_self"("ancestor_org_id" "uuid", "descendant_org_id" "uuid") 
  RETURNS boolean
  LANGUAGE "plpgsql" SECURITY DEFINER
  SET "search_path" TO 'public'
AS $$
DECLARE
  is_ancestor BOOLEAN;
BEGIN
  -- Check if the IDs are the same (self check)
  IF ancestor_org_id = descendant_org_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if ancestor_org_id is in the ancestor chain of descendant_org_id
  SELECT EXISTS (
    WITH RECURSIVE ancestors AS (
      -- Base case: start with the descendant organization's parent
      SELECT parent_org_id, id
      FROM organizations
      WHERE id = descendant_org_id
      
      UNION ALL
      
      -- Recursive case: get the parent of each ancestor
      SELECT o.parent_org_id, o.id
      FROM organizations o
      JOIN ancestors a ON o.id = a.parent_org_id
      WHERE o.parent_org_id IS NOT NULL
    )
    SELECT 1
    FROM ancestors
    WHERE parent_org_id = ancestor_org_id
  ) INTO is_ancestor;
  
  RETURN is_ancestor;
END;
$$;
```

### 6.4 Check Direct Child

**Source:** `/supabase/migrations/20250428000000_fresh_remote_schema.sql` (lines 975-984)

```sql
CREATE OR REPLACE FUNCTION "public"."is_direct_child"("ancestor_org_id" "uuid", "descendant_org_id" "uuid") 
  RETURNS boolean
  LANGUAGE "sql" STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations child
    WHERE child.id = descendant_org_id
    AND child.parent_org_id = ancestor_org_id
  );
$$;
```

### 6.5 Check Organization and Ancestors Active

**Source:** `/supabase/migrations/20250428000000_fresh_remote_schema.sql` (lines 1022-1040)

```sql
CREATE OR REPLACE FUNCTION "public"."is_organization_active_and_ancestors_active"("p_org_id" "uuid") 
  RETURNS boolean
  LANGUAGE "sql" STABLE SECURITY DEFINER
AS $$
  SELECT NOT EXISTS (
    WITH RECURSIVE org_hierarchy AS (
      SELECT id, parent_org_id, status
      FROM public.organizations
      WHERE id = p_org_id
      UNION ALL
      SELECT o.id, o.parent_org_id, o.status
      FROM public.organizations o
      JOIN org_hierarchy h ON o.id = h.parent_org_id
      WHERE h.parent_org_id IS NOT NULL
    )
    SELECT 1
    FROM org_hierarchy
    WHERE status != 'active'
  );
$$;
```

---

## 7. APPLICATION-LEVEL PERMISSION ENFORCEMENT

### 7.1 Organization Service

**Source:** `/src/lib/services/organization-service.ts`

```typescript
// Helper function to get current user's organization ID
export async function getCurrentUserOrgId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data.user) {
    throw new Error('User is not authenticated');
  }
  
  // Extract organization_id from JWT claims
  const claims = data.user.app_metadata;
  const orgId = claims?.organization_id;
  
  if (!orgId) {
    throw new Error('User has no organization');
  }
  
  return orgId;
}

// Fetch organization by ID
export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error) {
    throw error;
  }

  return data as Organization;
}
```

### 7.2 Organization Types

**Source:** `/src/types/organization.ts`

```typescript
export interface Organization {
  id: string;
  name: string;
  org_type: 'house' | 'super_agency' | 'agency' | 'tenant';
  parent_org_id?: string | null;
  status: 'active' | 'inactive' | 'deleted' | 'suspended';
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  disable_parent_invites: boolean;
  credit_balance?: number;
  activated_agent_limit?: number;
  currently_active_agent_types?: number;
  active_agent_count?: number;
}

export interface OrganizationCreateData {
  name: string;
  org_type: 'super_agency' | 'agency' | 'tenant';  // NOTE: house cannot be created
  parent_org_id?: string;
  disable_parent_invites?: boolean;
}
```

### 7.3 Agent Exposure Management Hook

**Source:** `/src/hooks/useManageExposure.ts`

```typescript
/**
 * Hook for listing and managing agent exposures to child organizations
 * This is primarily used by super_agency_admin and agency_admin users
 */
export function useManageExposure() {
  /**
   * List agent exposures with optional filtering
   */
  const listExposures = async (params: AgentExposuresListParams = {}): Promise<AgentExposuresListResponse> => {
    // Build URL with query parameters for GET request
    let url = 'organization-agent-exposures-list';
    if (params.organization_id) {
      // Validate organization_id is a valid UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.organization_id)) {
        console.warn('Invalid organization_id format:', params.organization_id);
      } else {
        url += `?organization_id=${encodeURIComponent(params.organization_id)}`;
      }
    }
    
    // Call the Edge Function to list exposures
    const { data, error } = await supabase.functions.invoke(url, {
      method: 'GET',
      headers: retryCount > 0 ? { 'Cache-Control': 'no-cache' } : undefined
    });

    if (error) throw error;
    return data;
  };

  /**
   * Manage agent exposure (expose/unexpose) to the current organization
   */
  const manageExposure = async (params: ManageExposureParams): Promise<{ success: boolean; message?: string; exposure?: AgentExposure }> => {
    // Validate input parameters
    if (!params.agent_id) {
      throw new Error('Missing required parameter: agent_id');
    }
    
    if (typeof params.enabled !== 'boolean') {
      throw new Error('Parameter "enabled" must be a boolean value');
    }
    
    // Call the organization-agent-exposures-manage endpoint
    const { data, error } = await supabase.functions.invoke(
      'organization-agent-exposures-manage',
      {
        method: 'POST',
        body: {
          agent_id: params.agent_id,
          enabled: params.enabled
        }
      }
    );

    if (error) {
      throw new Error(error.message || 'Failed to manage agent exposure');
    }
    
    // Check for standardized success field from new edge function format
    if (data.success === false) {
      throw new Error(data.error || 'Operation failed');
    }
    
    return {
      success: true,
      message: data.message || 'Agent exposure updated successfully',
      exposure: data.data?.exposure || data.exposure
    };
  };

  return {
    listExposures,
    manageExposure,
    // ... other helper methods
  };
}
```

---

## 8. EDGE FUNCTION ENFORCEMENT

### 8.1 Agent Exposure Management Endpoint

**Source:** `/supabase/functions/organization-agent-exposures-manage/index.ts`

**Key Validation Steps:**

1. **Authentication Check:**
   ```typescript
   const user = req.user;
   if (!user) {
     return errorResponse('Authentication error', 'User object missing from request', 401);
   }
   ```

2. **Role Validation:**
   ```typescript
   // Verify user has appropriate role (House Admin, SA Admin, Agency Admin)
   const isHouseRole = user.role.startsWith('house_');
   const isSuperAgencyRole = user.role.startsWith('super_agency_');
   const isAgencyRole = user.role.startsWith('agency_');

   if (!isHouseRole && !isSuperAgencyRole && !isAgencyRole) {
     return new Response(
       JSON.stringify({ error: 'Unauthorized: Insufficient permissions to manage agent exposures' }),
       { status: 403 }
     );
   }
   ```

3. **Agent Validation:**
   ```typescript
   // Verify the agent exists and is published
   const { data: agent, error: agentError } = await supabaseClient
     .from('agents')
     .select('id, status, is_public')
     .eq('id', requestData.agent_id)
     .eq('status', 'published')
     .single();

   if (agentError || !agent) {
     return errorResponse('Agent not found or not published', agentError?.message || 'Unknown error', 404);
   }
   ```

4. **Hierarchical Permission Check for Super Agency:**
   ```typescript
   if (isSuperAgencyRole) {
     // For Super Agency, check if the agent is public
     if (!agent.is_public) {
       return errorResponse(
         'Agent is not available to your organization',
         'Agent is not public, cannot be used by Super Agency',
         403
       );
     }
   }
   ```

5. **Hierarchical Permission Check for Agency:**
   ```typescript
   else if (isAgencyRole) {
     // For Agency, check if the agent is exposed and enabled by their parent SA
     
     // First, find the parent SA
     const { data: agencyData } = await supabaseClient
       .from('organizations')
       .select('parent_org_id')
       .eq('id', user.organization_id)
       .single();
       
     const parentSAId = agencyData.parent_org_id;
       
     // Now check if the agent is enabled by the parent SA
     const { data: exposure } = await supabaseClient
       .from('organization_agent_exposures')
       .select('id, enabled')
       .eq('organization_id', parentSAId)
       .eq('agent_id', requestData.agent_id)
       .single();
       
     if (!exposure || !exposure.enabled) {
       return errorResponse(
         'Agent is not available to your organization',
         'Agent not enabled by parent Super Agency',
         403
       );
     }
   }
   ```

6. **Insertion/Update of Exposure Record:**
   ```typescript
   if (existingRecord) {
     // Update existing record
     const { data: updatedRecord, error: updateError } = await supabaseClient
       .from('organization_agent_exposures')
       .update({ enabled: requestData.enabled, updated_at: new Date().toISOString() })
       .eq('id', existingRecord.id)
       .select()
       .single();
   } else {
     // Insert new record
     const { data: newRecord, error: insertError } = await supabaseClient
       .from('organization_agent_exposures')
       .insert({
         organization_id: user.organization_id,
         agent_id: requestData.agent_id,
         exposed_by_org_id: user.organization_id, // Enabler's org ID
         enabled: requestData.enabled
       })
       .select()
       .single();
   }
   ```

---

## 9. KEY SECURITY PRINCIPLES

### 9.1 Multi-Tenant Isolation

1. **Parent-Child Relationship Enforcement:**
   - Organizations form a tree structure via `parent_org_id`
   - RLS policies enforce "can only manage direct children" rule
   - Recursive functions validate entire ancestor chain for status propagation

2. **Organization-Scoped Data:**
   - All major tables reference `organization_id` or `tenant_id`
   - RLS policies filter data by user's organization
   - Cross-organization access requires explicit hierarchical relationship

3. **Status Cascade:**
   - When parent organization becomes inactive, all descendants become inaccessible
   - `is_organization_active_and_ancestors_active()` ensures entire ancestor chain is active
   - Agent activations check this function before becoming "effectively active"

### 9.2 Agent Exposure Control

1. **Direct Parent Control:**
   - Only direct parent can enable/disable agents for child organizations
   - `exposed_by_org_id` field tracks who enabled the exposure
   - `is_direct_child()` function validates parent-child relationship

2. **Hierarchical Availability:**
   - House agents must be `is_public=true` to be available to Super Agencies
   - Super Agency agents must be exposed/enabled to be available to Agencies
   - Agency agents must be exposed/enabled to be available to Tenants

3. **Permission-Based Access:**
   - Only House/Super Agency/Agency admins can manage exposures
   - Tenants cannot manage exposures (they can only activate)
   - RLS policies enforce role-based access to exposure records

### 9.3 Role-Based Enforcement

1. **Hierarchical Roles:**
   - house_admin > super_agency_admin > agency_admin > tenant_admin
   - Each level has specific permissions for their tier
   - Role prefixes determine permission groupings

2. **Application-Level Checks:**
   - Edge functions verify user role before processing requests
   - Service layer validates permissions before database operations
   - RLS provides database-level enforcement as last line of defense

3. **Three-Level Defense:**
   - RLS policies (database level)
   - Edge function validation (API level)
   - Application service checks (client/service level)

---

## 10. TESTING

### 10.1 Hierarchy Test Suite

**Source:** `/supabase/tests/organizations-hierarchy.test.sql`

Tests cover:
- Descendant retrieval functions
- Depth-limited descendant queries
- Circular reference handling
- Depth calculation accuracy
- Inactive organization filtering

### 10.2 RLS Test Suite

**Source:** `/supabase/tests/organizations-rls.test.sql`

Tests cover:
- Organization visibility based on role
- Child organization management permissions
- Status update restrictions
- Ancestor/descendant relationship validation

---

## 11. CRITICAL FILES REFERENCE

| File | Purpose |
|------|---------|
| `/supabase/migrations/20250428000000_fresh_remote_schema.sql` | Core schema definition, RLS policies, hierarchy functions |
| `/supabase/migrations/20250529154200_add_organization_hierarchy_functions.sql` | Advanced hierarchy functions (ancestors, inherited activations) |
| `/supabase/migrations/20250501000000_add_get_all_descendants_function.sql` | Descendant retrieval optimization |
| `/src/types/organization.ts` | TypeScript type definitions |
| `/src/lib/services/organization-service.ts` | Organization service layer |
| `/src/hooks/useManageExposure.ts` | Agent exposure management hook |
| `/supabase/functions/organization-agent-exposures-manage/index.ts` | Edge function for managing exposures |
| `/supabase/functions/shared/rbac.ts` | RBAC permission enum and role mapping |
| `/supabase/tests/organizations-hierarchy.test.sql` | Hierarchy tests |
| `/supabase/tests/organizations-rls.test.sql` | RLS policy tests |
| `/tools/check-agent-exposures.js` | Debugging tool for exposure visibility |

---

## 12. CONCLUSION

The white-label organizational hierarchy system implements a sophisticated multi-tenant architecture with:

- **4-tier hierarchical structure** (House → Super Agency → Agency → Tenant)
- **Strict permission model** based on organizational roles
- **Agent exposure system** with parent-controlled visibility
- **Multi-layer security** (RLS, Edge functions, Application layer)
- **Status propagation** cascading from parents to descendants
- **Comprehensive audit trail** via created_at/updated_at timestamps

The system prioritizes **data isolation** and **permission enforcement** at every level, ensuring that organizations can only see/manage their direct children and their own resources.
