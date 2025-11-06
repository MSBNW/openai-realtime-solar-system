# White-Label Branding - Quick Reference

## What DreamCrew Partners Can Customize

| Feature | Status | Implementation |
|---------|--------|-----------------|
| **Brand Name** | ✅ Full | Stores in `brand_name` column, max 50 chars |
| **Logo** | ✅ Full | Stores in `logo_url`, max 2MB, PNG/JPG/SVG/GIF |
| **Favicon** | ✅ Full | Stores in `favicon_url`, 32x32 recommended |
| **Social Image** | ✅ Full | Stores in `social_image_url`, 800x800 recommended |
| **Color Theme** | ✅ Full | 12+ color keys, hex validation, inheritance support |
| **Custom Domain** | ✅ Full | CNAME-based, Vercel integration, SSL automatic |
| **Email Branding** | ⚠️ Partial | UI ready, edge functions need completion |
| **Email Templates** | ⚠️ Partial | Infrastructure in place, not all functions updated |

---

## Key Database Tables

### `organization_branding`

```
organization_id (uuid, PK)
├─ brand_name (text, max 50 chars)
├─ logo_url (text, max 500 chars)
├─ favicon_url (text, max 500 chars)
├─ social_image_url (text, max 500 chars)
├─ custom_domain (text, subdomain required)
├─ domain_status ('pending'|'verified'|'failed')
├─ brand_colors (jsonb, 12+ color keys)
├─ inherit_parent_colors (boolean)
├─ settings (jsonb, email branding nested)
└─ updated_at (timestamptz)
```

---

## API Endpoints (Edge Functions)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `branding-get` | POST | Fetch branding with inheritance |
| `branding-update` | POST | Update brand name, colors, domain, images |
| `branding-verify-domain` | POST | Verify DNS CNAME and add to Vercel |

---

## Who Can Use White-Label?

| Role | Can Customize | Can Inherit | Notes |
|------|---------------|-------------|-------|
| House Admin | ✅ Any org | ❌ No | Sets baseline |
| Super Agency Admin | ✅ Own org | ❌ No | Parent org for agencies |
| Agency Admin | ✅ Own org | ✅ Optional | Can use super agency colors |
| Tenant Admin | ✅ Own org | ✅ Default | Can use agency branding |

---

## Inheritance Chain Example

```
House "DreamCrew"
└─ Super Agency "Acme Corp" (sets its own branding)
   └─ Agency "Acme Sales" (can inherit or customize)
      ├─ Tenant A (no custom branding) → Uses Agency branding
      └─ Tenant B (custom branding) → Uses own branding
```

---

## Custom Domain Workflow

### Step 1: User Enters Domain
- Input: `app.acmeagency.com`
- Status set to `pending`

### Step 2: System Shows DNS Instructions
```
Type: CNAME
Name: app.acmeagency.com
Value: cname.vercel-dns.com
TTL: 3600
```

### Step 3: User Verifies Domain
- System checks DNS via Google DNS API
- Adds domain to Vercel project
- Provisions SSL certificate (1-2 min)
- Sets status to `verified`

---

## Hook: `useOrganizationBranding()`

```typescript
const {
  displayName,          // Brand name or empty
  logoUrl,              // Logo URL (own or inherited)
  faviconUrl,           // Favicon URL (own or inherited)
  socialImageUrl,       // Social image (own or inherited)
  parentTheme,          // Parent's color palette
  isInherited,          // Whether using parent branding
  updateBranding(),     // Update function
  verifyDomain(),       // Domain verification
  refresh()             // Refresh data
} = useOrganizationBranding();
```

---

## Logo Upload Flow

1. User selects file (max 2MB)
2. Validated (PNG/JPG/SVG/GIF)
3. Uploaded to `organization-logos` bucket
4. Public URL generated
5. Saved to `logo_url` column
6. Hook returns via `effective_logo_url`

---

## Color Palette Structure

```json
{
  "primary": "#1976d2",
  "secondary": "#424242",
  "accent": "#82b1ff",
  "background": "#ffffff",
  "surface": "#f5f5f5",
  "error": "#f44336",
  "success": "#4caf50",
  "warning": "#ff9800",
  "info": "#2196f3",
  "text_primary": "#212121",
  "text_secondary": "#757575",
  "text_disabled": "#bdbdbd"
}
```

---

## Email Branding Settings

Stored in `organization_branding.settings.email`:

```json
{
  "from_name": "Acme Agency",
  "reply_to": "support@acmeagency.com",
  "support_url": "https://acmeagency.com/support",
  "footer_text": "© 2025 Acme Agency"
}
```

---

## RLS Policies Summary

| Policy | Access |
|--------|--------|
| `branding_view_own_org` | Users view own org branding |
| `branding_view_any_org_house` | House admins view all |
| `branding_insert_admin_only` | Admins only create branding |
| `branding_update_admin_only` | Admins only update (own or all) |
| `branding_delete_admin_only` | House admins only delete |

---

## UI Component: `BrandingSettings`

Located at: `src/components/settings/BrandingSettings.tsx`

**Sections**:
- Brand Name input (50 char max)
- Logo upload (2MB max)
- Favicon upload (1MB max)
- Social image upload (2MB max)
- Custom domain input
- Domain verification status

---

## What Can't Be Hidden (Without Code Changes)

- ⚠️ "DreamCrew" in platform footer
- ⚠️ "DreamCrew" in browser title
- ⚠️ "DreamCrew" in meta tags
- ⚠️ Email template HTML structure

---

## Recent Migrations

| Migration | Date | Feature |
|-----------|------|---------|
| `20251019100000` | 2025-10-19 | Brand name + RLS policies |
| `20251019140000` | 2025-10-19 | Tenant white-label support |
| `20251019163654` | 2025-10-19 | Color system + inheritance |
| `20251026000003` | 2025-10-26 | Logo URL support |
| `20251026000004` | 2025-10-26 | Favicon + social image |
| `20251027000001` | 2025-10-27 | RLS policy fixes |

---

## Implementation Status by Org Type

### House
- ✅ Can set brand name
- ✅ Can set logo/favicon/social
- ✅ Can set colors
- ✅ Can set domain
- ❓ Email branding (needs testing)

### Super Agency
- ✅ Can set brand name (own org)
- ✅ Can set logo/favicon/social (own)
- ✅ Can set colors (own)
- ✅ Can set domain (own)
- ⚠️ Email branding (partial)

### Agency
- ✅ Can set brand name (own org)
- ✅ Can set logo/favicon/social (own)
- ✅ Can inherit colors (optional)
- ✅ Can set domain (own)
- ⚠️ Email branding (partial)

### Tenant
- ✅ Can set brand name (own org)
- ✅ Can set logo/favicon/social (own)
- ✅ Can inherit colors (default)
- ✅ Can set domain (own)
- ⚠️ Email branding (partial)

---

## Common Tasks

### Fetch Branding for Organization
```typescript
const { data: branding } = await supabase.functions.invoke('branding-get', {
  body: { organization_id: orgId }
});
```

### Update Brand Name
```typescript
await supabase.functions.invoke('branding-update', {
  body: { 
    organization_id: orgId,
    brand_name: 'My Company'
  }
});
```

### Upload Logo
```typescript
// 1. Upload to storage
const { data } = await supabase.storage
  .from('organization-logos')
  .upload(`${orgId}/logo-${Date.now()}.png`, file);

// 2. Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('organization-logos')
  .getPublicUrl(data.path);

// 3. Save URL to branding
await supabase.functions.invoke('branding-update', {
  body: { organization_id: orgId, logo_url: publicUrl }
});
```

### Verify Custom Domain
```typescript
const { verified } = await supabase.functions.invoke('branding-verify-domain', {
  body: { organization_id: orgId }
});
```

---

## File Locations

| Component | Path |
|-----------|------|
| Schema | `supabase/migrations/20250428000000_fresh_remote_schema.sql:1579-1587` |
| Hook | `src/hooks/useOrganizationBranding.ts` |
| Settings UI | `src/components/settings/BrandingSettings.tsx` |
| Get Function | `supabase/functions/branding-get/index.ts` |
| Update Function | `supabase/functions/branding-update/index.ts` |
| Verify Function | `supabase/functions/branding-verify-domain/index.ts` |
| Requirements | `docs/platform-ssot/06-WHITELABEL-MVP.md` |

---

## Status Summary

- **Database**: ✅ Complete
- **Core API**: ✅ Complete
- **Branding Display**: ✅ Complete
- **Logo/Favicon/Social**: ✅ Complete
- **Color Customization**: ✅ Complete
- **Domain Setup**: ✅ Complete
- **Email Branding**: ⚠️ Partial (needs function updates)
- **Complete White-Label**: ⚠️ Mostly (footer/meta tags may leak)

---

**Last Updated**: 2025-11-06
**Investigation**: Complete