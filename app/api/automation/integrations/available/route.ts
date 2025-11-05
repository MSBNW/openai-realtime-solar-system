/**
 * API Route: List Available MCP Servers
 * GET /api/automation/integrations/available
 */

import { NextRequest, NextResponse } from 'next/server';

export const MCP_SERVER_CATALOG = {
  claude_flow: {
    id: 'claude_flow',
    name: 'Claude-Flow Orchestration',
    category: 'orchestration',
    description: 'Multi-agent coordination, swarm management, and task orchestration',
    transport: 'stdio',
    command: 'npx',
    args: ['claude-flow', 'mcp', 'start'],
    envVars: [],
    capabilities: ['swarm_init', 'agent_spawn', 'task_orchestrate', 'memory_usage', 'performance_monitoring'],
    setupUrl: null
  },
  tavily: {
    id: 'tavily',
    name: 'Tavily Search',
    category: 'research',
    description: 'Web search and research capabilities',
    transport: 'sse',
    url: 'https://mcp.tavily.com/mcp/',
    envVars: ['TAVILY_API_KEY'],
    capabilities: ['web_search', 'news_search', 'research'],
    setupUrl: 'https://tavily.com/'
  },
  github: {
    id: 'github',
    name: 'GitHub',
    category: 'development',
    description: 'Access repositories, issues, and pull requests',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    envVars: ['GITHUB_TOKEN'],
    capabilities: ['code_repository', 'issues', 'pull_requests'],
    setupUrl: 'https://github.com/settings/tokens'
  },
  google_drive: {
    id: 'google_drive',
    name: 'Google Drive',
    category: 'productivity',
    description: 'Access and manage Google Drive files',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-gdrive'],
    envVars: ['GDRIVE_CLIENT_ID', 'GDRIVE_CLIENT_SECRET'],
    capabilities: ['file_storage', 'document_access'],
    setupUrl: 'https://console.cloud.google.com/'
  },
  slack: {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    description: 'Send messages and manage channels',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-slack'],
    envVars: ['SLACK_BOT_TOKEN'],
    capabilities: ['messaging', 'channels', 'notifications'],
    setupUrl: 'https://api.slack.com/apps'
  },
  postgres: {
    id: 'postgres',
    name: 'PostgreSQL',
    category: 'database',
    description: 'Query and manage PostgreSQL databases',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres'],
    envVars: ['POSTGRES_CONNECTION_STRING'],
    capabilities: ['database_query', 'data_analysis'],
    setupUrl: null
  }
};

export async function GET(request: NextRequest) {
  try {
    const servers = Object.values(MCP_SERVER_CATALOG);

    return NextResponse.json({
      success: true,
      servers: servers.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        description: s.description,
        capabilities: s.capabilities,
        envVars: s.envVars,
        setupUrl: s.setupUrl
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to list servers' },
      { status: 500 }
    );
  }
}
