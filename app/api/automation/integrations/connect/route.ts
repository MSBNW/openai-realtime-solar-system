/**
 * API Route: Connect to MCP Server
 * POST /api/automation/integrations/connect
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnectionManager } from '@/lib/automation/mcp-connection-manager';
import { MCP_SERVER_CATALOG } from '../available/route';

export async function POST(request: NextRequest) {
  try {
    const { serverId, envVars } = await request.json();

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    const serverConfig = MCP_SERVER_CATALOG[serverId];
    if (!serverConfig) {
      return NextResponse.json(
        { error: 'Server not found in catalog' },
        { status: 404 }
      );
    }

    const connectionManager = getConnectionManager();

    // Attempt to connect with user-provided environment variables
    const connection = await connectionManager.connect(serverConfig, envVars || {});

    return NextResponse.json({
      success: true,
      connection: {
        serverId: connection.serverId,
        serverName: connection.serverName,
        connected: connection.connected,
        toolCount: connection.tools.length,
        tools: connection.tools.map(t => ({
          name: t.name,
          description: t.description
        }))
      }
    });
  } catch (error: any) {
    console.error('Connection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to connect to MCP server'
      },
      { status: 500 }
    );
  }
}
