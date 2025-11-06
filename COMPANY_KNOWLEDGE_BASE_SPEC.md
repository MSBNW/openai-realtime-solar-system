# Company Knowledge Base & MCP Anonymization - Critical Enhancement Spec

**Date:** November 6, 2025
**Purpose:** Enable personalized, proof-backed agent conversations with company-specific knowledge
**Relates to:** DREAMCREW_SWARM_ORCHESTRATION_SPEC.md, SWARM_MCP_INTEGRATION_ADDENDUM.md

---

## Executive Summary

Two critical enhancements to make DreamCrew agents truly intelligent and personalized:

1. **MCP Anonymization**: Hide internal tool providers from users - make capabilities feel like magic
2. **Company Knowledge Base**: Every tenant gets their own MCP server exposing company-specific content (reviews, case studies, product specs, photos, videos) that agents can query during conversations

### Why This Matters

**Current State**: Agent says "I used DataForSEO to analyze your website..."
**Desired State**: Agent says "I analyzed your SEO performance..."

**Current State**: Agent has no company context - generic responses
**Desired State**: Agent says "Based on your past project with TechCorp (see attached photos), and your 5-star review from Sarah mentioning fast turnaround, I recommend..."

---

## Part 1: MCP Server Anonymization

### Problem

Users see technical implementation details:
- ❌ "Using DataForSEO to analyze keywords..."
- ❌ "Calling Tavily web search..."
- ❌ "HubSpot MCP server connected..."

This exposes our stack and makes the experience feel technical, not magical.

### Solution: Capability Abstraction Layer

```typescript
// /mastra-agents/lib/swarm/mcp-abstraction.ts

export const MCP_CAPABILITY_MAP: Record<string, MCPCapabilityConfig> = {
  // System MCP Servers (anonymized)
  'dataforseo': {
    publicName: 'SEO Analysis',
    publicDescription: 'Comprehensive SEO and keyword analysis',
    capabilities: ['seo_analysis', 'keyword_research', 'backlink_analysis', 'serp_analysis'],
    icon: '📊',
    category: 'Analytics',
    userFacingMessages: {
      connecting: 'Preparing SEO analysis tools...',
      analyzing: 'Analyzing your website performance...',
      complete: 'SEO analysis complete',
    },
  },

  'tavily': {
    publicName: 'Web Research',
    publicDescription: 'Advanced web search and content extraction',
    capabilities: ['web_search', 'content_extraction', 'site_mapping'],
    icon: '🔍',
    category: 'Research',
    userFacingMessages: {
      connecting: 'Preparing research tools...',
      analyzing: 'Researching across the web...',
      complete: 'Research complete',
    },
  },

  // User MCP Servers (keep original names)
  'hubspot': {
    publicName: 'CRM',
    publicDescription: 'Your customer relationship management system',
    capabilities: ['crm_management', 'deal_creation', 'contact_management'],
    icon: '👥',
    category: 'Business Systems',
    userFacingMessages: {
      connecting: 'Connecting to your CRM...',
      analyzing: 'Accessing customer data...',
      complete: 'CRM operation complete',
    },
  },

  'wordpress': {
    publicName: 'Content Publishing',
    publicDescription: 'Your website content management',
    capabilities: ['content_publishing', 'post_management'],
    icon: '📝',
    category: 'Publishing',
    userFacingMessages: {
      connecting: 'Connecting to your website...',
      analyzing: 'Preparing content...',
      complete: 'Content published',
    },
  },

  'gmail': {
    publicName: 'Email',
    publicDescription: 'Your email system',
    capabilities: ['email_sending', 'inbox_management'],
    icon: '📧',
    category: 'Communication',
    userFacingMessages: {
      connecting: 'Connecting to your email...',
      analyzing: 'Composing message...',
      complete: 'Email sent',
    },
  },

  'google-sheets': {
    publicName: 'Spreadsheets',
    publicDescription: 'Your data management system',
    capabilities: ['spreadsheet_management', 'data_analysis'],
    icon: '📈',
    category: 'Data',
    userFacingMessages: {
      connecting: 'Connecting to your spreadsheets...',
      analyzing: 'Processing data...',
      complete: 'Data updated',
    },
  },

  'slack': {
    publicName: 'Team Chat',
    publicDescription: 'Your team communication system',
    capabilities: ['messaging', 'notifications'],
    icon: '💬',
    category: 'Communication',
    userFacingMessages: {
      connecting: 'Connecting to your team chat...',
      analyzing: 'Composing message...',
      complete: 'Message sent',
    },
  },
};

export class MCPAbstractionLayer {
  /**
   * Get user-facing capability name
   */
  getPublicName(mcpServerName: string): string {
    return MCP_CAPABILITY_MAP[mcpServerName]?.publicName || mcpServerName;
  }

  /**
   * Get user-facing message for MCP operation
   */
  getUserMessage(
    mcpServerName: string,
    operation: 'connecting' | 'analyzing' | 'complete'
  ): string {
    const config = MCP_CAPABILITY_MAP[mcpServerName];
    return config?.userFacingMessages[operation] || `${operation}...`;
  }

  /**
   * Transform tool call message for user display
   */
  anonymizeToolCall(toolName: string, mcpServerName: string, args: any): string {
    const capability = MCP_CAPABILITY_MAP[mcpServerName];

    if (!capability) {
      return `Using ${toolName}...`;
    }

    // Remove technical details, show capability
    if (mcpServerName === 'dataforseo') {
      if (toolName.includes('keyword')) return 'Analyzing keywords...';
      if (toolName.includes('backlink')) return 'Analyzing backlinks...';
      if (toolName.includes('domain_rank')) return 'Analyzing domain authority...';
      if (toolName.includes('serp')) return 'Analyzing search rankings...';
      return 'Analyzing SEO metrics...';
    }

    if (mcpServerName === 'tavily') {
      if (toolName.includes('search')) return 'Searching the web...';
      if (toolName.includes('extract')) return 'Extracting content...';
      if (toolName.includes('map')) return 'Mapping website structure...';
      return 'Researching...';
    }

    // User-configured servers - keep more specific
    return `${capability.icon} ${capability.publicDescription}`;
  }

  /**
   * Get capabilities by category for UI display
   */
  getCapabilitiesByCategory(): Record<string, MCPCapabilityConfig[]> {
    const byCategory: Record<string, MCPCapabilityConfig[]> = {};

    Object.entries(MCP_CAPABILITY_MAP).forEach(([serverName, config]) => {
      if (!byCategory[config.category]) {
        byCategory[config.category] = [];
      }
      byCategory[config.category].push({
        ...config,
        serverName, // Hidden from user, used internally
      });
    });

    return byCategory;
  }
}

interface MCPCapabilityConfig {
  publicName: string;
  publicDescription: string;
  capabilities: string[];
  icon: string;
  category: string;
  userFacingMessages: {
    connecting: string;
    analyzing: string;
    complete: string;
  };
  serverName?: string; // Internal only
}
```

### Update Progress Broadcasting

```typescript
// Modify: /mastra-agents/lib/swarm/progress-broadcaster.ts

import { MCPAbstractionLayer } from './mcp-abstraction';

export class ProgressBroadcaster {
  private mcpAbstraction: MCPAbstractionLayer;

  constructor(
    private supabase: SupabaseClient,
    private repRoomSlug: string,
    private sessionId: string
  ) {
    this.mcpAbstraction = new MCPAbstractionLayer();
  }

  /**
   * Broadcast tool call with anonymized message
   */
  async broadcastToolCall(
    toolName: string,
    mcpServerName: string,
    args: any
  ): Promise<void> {
    // BEFORE: "Using dataforseo_labs_google_ranked_keywords..."
    // AFTER: "Analyzing keywords..."
    const userMessage = this.mcpAbstraction.anonymizeToolCall(
      toolName,
      mcpServerName,
      args
    );

    await this.broadcast({
      message: userMessage,
      type: 'agent_update',
      useVoice: false, // Don't speak every tool call
      metadata: {
        internalToolName: toolName, // Hidden from user
        mcpServer: mcpServerName,  // Hidden from user
      },
    });
  }
}
```

### UI: Capabilities Display (Not MCP Servers)

```typescript
// /src/components/settings/CapabilitiesPanel.tsx

import { MCPAbstractionLayer } from '@/lib/mcp-abstraction';

export function CapabilitiesPanel({ tenantId }: { tenantId: string }) {
  const [capabilities, setCapabilities] = useState<any>({});
  const abstraction = new MCPAbstractionLayer();

  useEffect(() => {
    loadCapabilities();
  }, [tenantId]);

  const loadCapabilities = async () => {
    // Get tenant's MCP servers
    const { data: mcpServers } = await supabase
      .from('mcp_servers')
      .select('name, status')
      .or(`tenant_id.eq.${tenantId},is_system_server.eq.true`)
      .eq('status', 'active');

    // Group by category
    const byCategory = abstraction.getCapabilitiesByCategory();

    // Filter to only available capabilities
    const available = {};
    Object.entries(byCategory).forEach(([category, configs]) => {
      available[category] = configs.filter(config =>
        mcpServers.some(server => server.name === config.serverName)
      );
    });

    setCapabilities(available);
  };

  return (
    <div className="capabilities-panel">
      <h2>Your AI Capabilities</h2>
      <p className="text-muted-foreground">
        Your agents have access to these powerful capabilities
      </p>

      {Object.entries(capabilities).map(([category, configs]: [string, any[]]) => (
        <Card key={category} className="mb-4">
          <CardHeader>
            <h3>{category}</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {configs.map(config => (
                <div key={config.publicName} className="flex items-start gap-3">
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <p className="font-medium">{config.publicName}</p>
                    <p className="text-sm text-muted-foreground">
                      {config.publicDescription}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## Part 2: Company Knowledge Base MCP Server

### Architecture Overview

Every tenant gets their own **company knowledge base** that agents can query:

```
┌─────────────────────────────────────────────────────────┐
│ Content Sources                                         │
│ - Web scraper (company website, social media)          │
│ - Manual uploads (documents, images, videos)           │
│ - Google My Business reviews                           │
│ - Past project data                                    │
│ - Product catalogs                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Ingestion Pipeline                                      │
│ - Text extraction                                       │
│ - Image analysis (GPT-4 Vision)                        │
│ - Video frame analysis                                 │
│ - Embedding generation (OpenAI text-embedding-3)       │
│ - Metadata extraction                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Storage (Supabase PostgreSQL)                          │
│                                                         │
│ Table: company_knowledge_items                         │
│ - id, tenant_id, user_id (optional)                    │
│ - content_type (text, image, video, review, etc.)     │
│ - title, description, content                          │
│ - source_url, source_type                             │
│ - embedding (vector 1536)                             │
│ - image_analysis (JSONB)                              │
│ - metadata (JSONB)                                     │
│ - tags[], categories[]                                 │
│ - is_public (tenant vs user-specific)                 │
│                                                         │
│ Indexes:                                               │
│ - Vector index for semantic search (pgvector)         │
│ - GIN index on tags[], categories[]                    │
│ - Full-text search on content                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Company Knowledge MCP Server (per tenant)              │
│                                                         │
│ Tools Exposed:                                         │
│ - search_company_knowledge                            │
│ - get_similar_projects                                │
│ - get_customer_reviews                                │
│ - get_product_info                                    │
│ - get_case_studies                                    │
│ - search_images                                       │
│                                                         │
│ Implements: MCP Protocol (stdio/SSE)                   │
│ Framework: Mastra MCP Server API                       │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Swarm Agents                                           │
│ - Automatically connect to tenant's knowledge base     │
│ - Query during conversations                           │
│ - Show images, cite reviews, reference past work      │
│ - Provide proof-backed recommendations                 │
└─────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Company Knowledge Base

CREATE TABLE company_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant & User
  tenant_id UUID NOT NULL,
  user_id UUID, -- NULL = tenant-wide, set = user-specific

  -- Content
  content_type TEXT NOT NULL CHECK (content_type IN (
    'text', 'image', 'video', 'review', 'case_study',
    'product_spec', 'testimonial', 'guide', 'faq'
  )),

  title TEXT NOT NULL,
  description TEXT,
  content TEXT, -- Full text content

  -- Source
  source_url TEXT,
  source_type TEXT, -- 'web_scrape', 'manual_upload', 'google_reviews', etc.

  -- Embeddings for semantic search
  embedding vector(1536),

  -- Image/Video Analysis
  image_url TEXT,
  image_analysis JSONB, -- {objects: [], description: '', colors: [], text_detected: ''}
  video_url TEXT,
  video_thumbnails TEXT[],

  -- Metadata
  metadata JSONB DEFAULT '{}',
  tags TEXT[],
  categories TEXT[],

  -- Permissions
  is_public BOOLEAN DEFAULT true, -- Visible to all tenant users

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending_review')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_company_knowledge_tenant
  ON company_knowledge_items(tenant_id);

CREATE INDEX idx_company_knowledge_user
  ON company_knowledge_items(tenant_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_company_knowledge_type
  ON company_knowledge_items(tenant_id, content_type);

-- Vector index for semantic search (pgvector)
CREATE INDEX idx_company_knowledge_embedding
  ON company_knowledge_items
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search
CREATE INDEX idx_company_knowledge_fts
  ON company_knowledge_items
  USING GIN (to_tsvector('english', title || ' ' || description || ' ' || content));

-- GIN indexes for array columns
CREATE INDEX idx_company_knowledge_tags
  ON company_knowledge_items USING GIN (tags);

CREATE INDEX idx_company_knowledge_categories
  ON company_knowledge_items USING GIN (categories);


-- Knowledge Base Ingestion Jobs

CREATE TABLE knowledge_ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id UUID NOT NULL,
  user_id UUID, -- Who initiated

  job_type TEXT NOT NULL CHECK (job_type IN (
    'web_scrape', 'manual_upload', 'google_reviews',
    'social_media_scan', 'bulk_import'
  )),

  -- Configuration
  config JSONB NOT NULL, -- {urls: [], selectors: {}, etc.}

  -- Progress
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed', 'cancelled'
  )),
  progress_percentage INTEGER DEFAULT 0,
  items_processed INTEGER DEFAULT 0,
  items_total INTEGER,

  -- Results
  items_created UUID[], -- Array of knowledge item IDs
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_jobs_tenant
  ON knowledge_ingestion_jobs(tenant_id, status);
```

### Content Ingestion System

```typescript
// /mastra-agents/lib/knowledge-base/ingestion-manager.ts

import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

export class KnowledgeBaseIngestionManager {
  constructor(
    private supabase: SupabaseClient,
    private openai: OpenAI,
    private tenantId: string
  ) {}

  /**
   * Scrape company website and add to knowledge base
   */
  async scrapeWebsite(config: WebScrapeConfig): Promise<string> {
    // Create ingestion job
    const { data: job } = await this.supabase
      .from('knowledge_ingestion_jobs')
      .insert({
        tenant_id: this.tenantId,
        user_id: config.userId,
        job_type: 'web_scrape',
        config: {
          urls: config.urls,
          includeImages: config.includeImages,
          includeReviews: config.includeReviews,
        },
        status: 'running',
      })
      .select()
      .single();

    // Execute scraping (background job)
    this.executeScrape(job.id, config).catch(console.error);

    return job.id;
  }

  private async executeScrape(jobId: string, config: WebScrapeConfig): Promise<void> {
    try {
      const items: any[] = [];

      for (const url of config.urls) {
        // Use Tavily MCP to scrape
        const content = await this.tavily.extract(url);

        // Extract text content
        const textItem = await this.processTextContent(
          content.rawContent,
          url,
          'web_scrape'
        );
        items.push(textItem);

        // Extract and analyze images
        if (config.includeImages && content.images) {
          for (const imageUrl of content.images) {
            const imageItem = await this.processImage(imageUrl, url);
            items.push(imageItem);
          }
        }
      }

      // Store all items
      const { data: created } = await this.supabase
        .from('company_knowledge_items')
        .insert(items.map(item => ({ ...item, tenant_id: this.tenantId })))
        .select('id');

      // Update job
      await this.supabase
        .from('knowledge_ingestion_jobs')
        .update({
          status: 'completed',
          items_total: items.length,
          items_processed: items.length,
          items_created: created.map(i => i.id),
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

    } catch (error) {
      await this.supabase
        .from('knowledge_ingestion_jobs')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', jobId);
    }
  }

  /**
   * Process text content: generate embedding
   */
  private async processTextContent(
    content: string,
    sourceUrl: string,
    sourceType: string
  ): Promise<Partial<KnowledgeItem>> {
    // Generate embedding
    const embeddingResponse = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Extract title (first line or H1)
    const title = this.extractTitle(content);

    // Generate description (summary)
    const description = await this.generateSummary(content);

    return {
      content_type: 'text',
      title,
      description,
      content,
      source_url: sourceUrl,
      source_type: sourceType,
      embedding,
    };
  }

  /**
   * Process image: analyze with GPT-4 Vision
   */
  private async processImage(
    imageUrl: string,
    sourceUrl: string
  ): Promise<Partial<KnowledgeItem>> {
    // Analyze image with GPT-4 Vision
    const analysis = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image in detail. Describe:
1. What objects/people are visible
2. The setting and context
3. Any text visible in the image
4. Colors and visual style
5. Potential use case (e.g., portfolio work, team photo, product shot)

Provide a comprehensive description that would help an AI assistant discuss this image in conversation.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const imageDescription = analysis.choices[0].message.content;

    // Generate embedding from description
    const embeddingResponse = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: imageDescription,
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Extract structured analysis
    const structuredAnalysis = await this.extractImageMetadata(imageDescription);

    return {
      content_type: 'image',
      title: structuredAnalysis.title || 'Image from website',
      description: imageDescription,
      content: imageDescription,
      image_url: imageUrl,
      source_url: sourceUrl,
      source_type: 'web_scrape',
      embedding,
      image_analysis: structuredAnalysis,
      tags: structuredAnalysis.tags || [],
    };
  }

  /**
   * Extract structured metadata from image description
   */
  private async extractImageMetadata(description: string): Promise<any> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Extract structured metadata from image description. Return JSON only.',
        },
        {
          role: 'user',
          content: `${description}\n\nExtract: title, objects[], setting, hasText, colors[], useCase, tags[]`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(completion.choices[0].message.content);
  }

  /**
   * Generate summary of text content
   */
  private async generateSummary(content: string): Promise<string> {
    if (content.length < 200) return content;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Summarize the following content in 1-2 sentences.',
        },
        {
          role: 'user',
          content,
        },
      ],
      max_tokens: 100,
    });

    return completion.choices[0].message.content;
  }

  /**
   * Scrape Google My Business reviews
   */
  async scrapeGoogleReviews(businessName: string, location: string): Promise<void> {
    // Use DataForSEO Business Listings API
    // Implementation details...
  }

  /**
   * Manual upload (user provides files)
   */
  async uploadFiles(files: File[], metadata: any): Promise<void> {
    // Process uploaded files
    // Implementation details...
  }

  private extractTitle(content: string): string {
    // Extract H1 or first line
    const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match) return h1Match[1];

    const lines = content.split('\n').filter(l => l.trim());
    return lines[0]?.substring(0, 100) || 'Untitled';
  }
}

interface WebScrapeConfig {
  urls: string[];
  includeImages: boolean;
  includeReviews: boolean;
  userId?: string;
}

interface KnowledgeItem {
  content_type: string;
  title: string;
  description: string;
  content: string;
  image_url?: string;
  source_url: string;
  source_type: string;
  embedding: number[];
  image_analysis?: any;
  tags?: string[];
}
```

### Company Knowledge MCP Server

```typescript
// /mastra-agents/lib/knowledge-base/mcp-server.ts

import { MCPServer } from '@mastra/mcp';
import { z } from 'zod';

export class CompanyKnowledgeMCPServer {
  private server: MCPServer;

  constructor(
    private supabase: SupabaseClient,
    private tenantId: string,
    private userId?: string
  ) {
    this.server = new MCPServer({
      name: 'company-knowledge',
      version: '1.0.0',
      description: 'Company knowledge base and context',
    });

    this.registerTools();
  }

  private registerTools() {
    // Tool 1: Semantic search across knowledge base
    this.server.addTool({
      name: 'search_company_knowledge',
      description: 'Search the company knowledge base semantically. Returns relevant content, images, reviews, case studies, etc.',
      inputSchema: z.object({
        query: z.string().describe('Search query or topic'),
        limit: z.number().default(5).describe('Number of results to return'),
        contentTypes: z.array(z.string()).optional().describe('Filter by content types'),
      }),
      execute: async (args) => {
        return this.semanticSearch(args.query, args.limit, args.contentTypes);
      },
    });

    // Tool 2: Get similar past projects
    this.server.addTool({
      name: 'get_similar_projects',
      description: 'Find similar past projects or case studies from company portfolio',
      inputSchema: z.object({
        description: z.string().describe('Project description or requirements'),
        limit: z.number().default(3),
      }),
      execute: async (args) => {
        return this.getSimilarProjects(args.description, args.limit);
      },
    });

    // Tool 3: Get customer reviews
    this.server.addTool({
      name: 'get_customer_reviews',
      description: 'Retrieve customer reviews and testimonials, optionally filtered by topic',
      inputSchema: z.object({
        topic: z.string().optional().describe('Topic or keyword to filter reviews'),
        minRating: z.number().optional().describe('Minimum star rating (1-5)'),
        limit: z.number().default(5),
      }),
      execute: async (args) => {
        return this.getCustomerReviews(args.topic, args.minRating, args.limit);
      },
    });

    // Tool 4: Get product information
    this.server.addTool({
      name: 'get_product_info',
      description: 'Get product specifications, features, and details',
      inputSchema: z.object({
        productName: z.string().optional(),
        category: z.string().optional(),
      }),
      execute: async (args) => {
        return this.getProductInfo(args.productName, args.category);
      },
    });

    // Tool 5: Search images
    this.server.addTool({
      name: 'search_images',
      description: 'Search for relevant images from company portfolio, showing visual proof of work',
      inputSchema: z.object({
        query: z.string().describe('What to search for in images'),
        limit: z.number().default(3),
      }),
      execute: async (args) => {
        return this.searchImages(args.query, args.limit);
      },
    });
  }

  /**
   * Semantic search using vector similarity
   */
  private async semanticSearch(
    query: string,
    limit: number,
    contentTypes?: string[]
  ): Promise<any> {
    // Generate query embedding
    const openai = new OpenAI();
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search using pgvector
    let sql = this.supabase
      .rpc('search_company_knowledge', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: limit,
        p_tenant_id: this.tenantId,
      });

    if (contentTypes && contentTypes.length > 0) {
      sql = sql.in('content_type', contentTypes);
    }

    const { data: results, error } = await sql;

    if (error) throw error;

    // Format results
    return {
      results: results.map(r => ({
        title: r.title,
        description: r.description,
        contentType: r.content_type,
        content: r.content?.substring(0, 500), // Truncate long content
        imageUrl: r.image_url,
        imageAnalysis: r.image_analysis,
        sourceUrl: r.source_url,
        tags: r.tags,
        similarity: r.similarity,
      })),
      count: results.length,
    };
  }

  /**
   * Get similar projects (case studies)
   */
  private async getSimilarProjects(description: string, limit: number): Promise<any> {
    return this.semanticSearch(description, limit, ['case_study', 'text']);
  }

  /**
   * Get customer reviews
   */
  private async getCustomerReviews(
    topic?: string,
    minRating?: number,
    limit?: number
  ): Promise<any> {
    let query = this.supabase
      .from('company_knowledge_items')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('content_type', 'review')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (minRating) {
      query = query.gte('metadata->rating', minRating);
    }

    const { data: reviews } = await query;

    // If topic specified, filter semantically
    if (topic && reviews) {
      const withScores = await Promise.all(
        reviews.map(async (review) => {
          const similarity = await this.calculateSimilarity(topic, review.content);
          return { ...review, similarity };
        })
      );

      return {
        reviews: withScores
          .filter(r => r.similarity > 0.7)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit)
          .map(r => ({
            customerName: r.metadata?.customerName,
            rating: r.metadata?.rating,
            review: r.content,
            date: r.created_at,
            relevance: r.similarity,
          })),
      };
    }

    return {
      reviews: reviews.map(r => ({
        customerName: r.metadata?.customerName,
        rating: r.metadata?.rating,
        review: r.content,
        date: r.created_at,
      })),
    };
  }

  /**
   * Get product information
   */
  private async getProductInfo(productName?: string, category?: string): Promise<any> {
    let query = this.supabase
      .from('company_knowledge_items')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('content_type', 'product_spec')
      .eq('status', 'active');

    if (productName) {
      query = query.ilike('title', `%${productName}%`);
    }

    if (category) {
      query = query.contains('categories', [category]);
    }

    const { data: products } = await query;

    return {
      products: products.map(p => ({
        name: p.title,
        description: p.description,
        specifications: p.metadata?.specifications,
        features: p.metadata?.features,
        imageUrl: p.image_url,
        pricing: p.metadata?.pricing,
      })),
    };
  }

  /**
   * Search images
   */
  private async searchImages(query: string, limit: number): Promise<any> {
    const results = await this.semanticSearch(query, limit, ['image']);

    return {
      images: results.results.map(r => ({
        url: r.imageUrl,
        description: r.description,
        analysis: r.imageAnalysis,
        context: r.content,
        tags: r.tags,
      })),
    };
  }

  /**
   * Calculate semantic similarity between query and text
   */
  private async calculateSimilarity(query: string, text: string): Promise<number> {
    // Generate embeddings and calculate cosine similarity
    // Implementation details...
    return 0.85; // Placeholder
  }

  /**
   * Start MCP server (stdio)
   */
  async start(): Promise<void> {
    await this.server.start();
  }
}
```

### SQL Function for Vector Search

```sql
-- PostgreSQL function for semantic search

CREATE OR REPLACE FUNCTION search_company_knowledge(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_tenant_id uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  content text,
  content_type text,
  image_url text,
  image_analysis jsonb,
  source_url text,
  tags text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cki.id,
    cki.title,
    cki.description,
    cki.content,
    cki.content_type,
    cki.image_url,
    cki.image_analysis,
    cki.source_url,
    cki.tags,
    1 - (cki.embedding <=> query_embedding) as similarity
  FROM company_knowledge_items cki
  WHERE cki.tenant_id = p_tenant_id
    AND cki.status = 'active'
    AND 1 - (cki.embedding <=> query_embedding) > match_threshold
  ORDER BY cki.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### Integration with Swarm Agents

```typescript
// Update AgentPoolManager to automatically connect to company knowledge

export class AgentPoolManager {
  async spawnWorker(
    workerType: AgentWorkerType,
    taskDescription: string,
    taskId: string,
    context: SwarmContext
  ): Promise<AgentWorker> {

    // Get MCP configuration (existing)
    const mcpConfig = await this.mcpConfigurator.configureAgentMCPAccess(
      workerType,
      this.tenantId
    );

    // *** NEW: Add company knowledge MCP server ***
    const companyKnowledgeServer = {
      id: `company-knowledge-${this.tenantId}`,
      name: 'company-knowledge',
      type: 'stdio' as const,
      availableTools: [
        'search_company_knowledge',
        'get_similar_projects',
        'get_customer_reviews',
        'get_product_info',
        'search_images',
      ],
      isSystem: true, // Auto-configured
      config: {
        tenantId: this.tenantId,
        userId: context.userId,
      },
    };

    mcpConfig.assignedServers.push(companyKnowledgeServer);

    // Rest of spawn logic...
    // Agents now have access to company-specific context!
  }
}
```

---

## Real-World Conversation Examples

### Example 1: Consultant with Portfolio

**User**: "Can you help me pitch to a potential client in the e-commerce space?"

**Agent (with company knowledge)**:
```
Absolutely! Based on your portfolio, I can help craft a compelling pitch.

I found 3 highly relevant past projects:

📸 **TechStore Redesign** (2024)
- E-commerce platform, increased conversions by 45%
- [Shows image of before/after]
- Customer review: "Outstanding work, sales tripled in 3 months" - Sarah Chen

📸 **FashionHub Mobile App** (2023)
- Mobile-first e-commerce with AR try-on
- [Shows app screenshots]
- Technical highlight: Integrated payment processing, inventory management

📸 **GourmetBox Subscription Service** (2023)
- Subscription e-commerce model
- [Shows dashboard images]
- Customer review: "They delivered ahead of schedule and under budget" - Mike R.

For your pitch, I recommend highlighting:
1. Your 45% conversion increase track record
2. Mobile-first expertise (critical for e-commerce)
3. Your fast delivery reputation (backed by reviews)

Would you like me to draft a pitch deck using these case studies?
```

### Example 2: Agency with Google Reviews

**User**: "What do our clients say about our customer service?"

**Agent (with company knowledge)**:
```
Your customer service consistently gets praised! Here are the highlights from your Google reviews:

⭐⭐⭐⭐⭐ **"Exceptional communication"** - Jennifer L. (3 months ago)
"They responded to every email within hours and kept us updated throughout the project."

⭐⭐⭐⭐⭐ **"Very responsive team"** - David M. (5 months ago)
"Even after project completion, they've been available for support. Rare to find these days."

⭐⭐⭐⭐⭐ **"Felt like partners, not vendors"** - Amanda K. (1 month ago)
"They took time to understand our business goals, not just execute tasks."

**Common themes across 47 reviews:**
- Response time: Avg mentioned "within hours" or "same day"
- Proactive updates: 34 reviews mention regular progress updates
- Post-project support: 28 reviews mention continued availability

Your average rating is 4.8/5 with customer service mentioned in 82% of reviews.
```

### Example 3: Product Company with Specs

**User**: "Can you compare our Pro and Enterprise plans for a potential customer?"

**Agent (with company knowledge)**:
```
Here's a comparison based on your product specs:

**Pro Plan** ($99/month)
✓ Up to 10 team members
✓ 50GB storage
✓ Standard support (24hr response)
✓ Basic analytics
✓ API access (1,000 calls/day)

**Enterprise Plan** ($299/month)
✓ Unlimited team members
✓ 1TB storage
✓ Priority support (1hr response) + dedicated account manager
✓ Advanced analytics + custom reports
✓ API access (unlimited)
✓ SSO & advanced security
✓ Custom integrations

**Key differentiators for Enterprise:**
1. Dedicated account manager (highly valued - see review from TechCorp)
2. Custom integrations (17 custom integrations built to date)
3. Priority support (99.8% uptime SLA)

📊 **Usage insight**: 78% of Pro customers upgrade to Enterprise within 6 months as their teams grow.

Would they benefit from a 14-day Enterprise trial?
```

### Example 4: SEO Swarm with Company Context

**User**: "Increase revenue for gmax.co.il"

**Swarm with Company Knowledge**:

**Researcher Agent**:
```
🔍 I'm analyzing gmax.co.il alongside your company's knowledge base...

Found relevant experience:
📸 You worked with 2 education companies before:
- LanguagePro (2023): 85% organic traffic increase
- StudyHub (2024): Ranked #1 for "online tutoring Israel"

Their positive reviews mention:
✅ "Data-driven approach" (3 reviews)
✅ "Fast implementation" (5 reviews)

This gives us credibility in the education space!
```

**SEO Specialist**:
```
📊 SEO Analysis complete for gmax.co.il

Current performance:
- 45 keywords ranking
- Domain authority: 32
- Technical issues: 15 identified

**Recommendation informed by your past work:**
Similar to the LanguagePro project where you achieved 85% traffic growth, I recommend:

1. Content expansion (you have portfolio examples of this)
2. Technical SEO fixes (your team's specialty per reviews)
3. Local SEO (you've done this successfully for 3 Israeli businesses)

**Proof you can deliver:**
📸 [Shows screenshot from LanguagePro case study]
📊 [Shows growth chart from past project]
⭐ Review: "They tripled our inquiries in 4 months" - LanguagePro CEO
```

**Strategist**:
```
📋 Creating implementation plan...

**Phase 1: Quick Wins** (Week 1-2)
Based on your past TechStore project (completed in 2 weeks), prioritizing:
1. Fix 15 technical SEO issues
2. Optimize top 10 pages

**Phase 2: Content Strategy** (Week 3-8)
Replicating LanguagePro's successful blog strategy:
- 12 keyword-optimized articles
- 3 guide pages
- Local content (proven effective for Israeli audience per past work)

**Phase 3: Link Building** (Ongoing)
Using relationships from past education clients...

**Expected Results** (based on similar projects):
- 60-85% organic traffic increase
- Timeline: 3-4 months
- Success rate: 87% (based on 15 similar projects)

📸 **Reference materials:**
- LanguagePro case study (detailed)
- StudyHub results summary
- Technical SEO checklist (refined over 3 years)
```

---

This is **completely different** from a generic agent because it has:
- ✅ Proof (images of past work)
- ✅ Credibility (reviews from real customers)
- ✅ Context (similar projects, proven strategies)
- ✅ Specificity (exact numbers from past results)
- ✅ Visual evidence (screenshots, photos, charts)

---

## Implementation Priority

### Phase 1: MCP Anonymization (Week 1)
- Implement MCPAbstractionLayer
- Update ProgressBroadcaster to anonymize messages
- Update UI to show capabilities instead of MCP servers

### Phase 2: Knowledge Base Schema (Week 2)
- Add database tables
- Implement vector search function
- Create indexes

### Phase 3: Ingestion System (Week 3-4)
- Web scraper with image analysis
- Manual upload system
- Google reviews integration
- Embedding generation

### Phase 4: Company Knowledge MCP Server (Week 5)
- Implement MCP server with tools
- Register with agent spawning
- Test semantic search

### Phase 5: Integration & UI (Week 6-7)
- Knowledge base management UI
- Ingestion job monitoring
- Agent displays knowledge citations

---

## Conclusion

These two enhancements transform DreamCrew from "generic AI" to "your company's intelligent assistant":

1. **MCP Anonymization**: Makes capabilities feel magical, not technical
2. **Company Knowledge Base**: Provides proof-backed, personalized conversations with images, reviews, and past work

Every agent conversation becomes specific, credible, and visually rich.

---

**Document Status**: Critical Enhancement Spec
**Last Updated**: November 6, 2025
**Version**: 1.0
