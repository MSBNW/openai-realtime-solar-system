/**
 * API Route: Get Connection Status
 * GET /api/automation/integrations/status
 */

import { NextResponse } from 'next/server';
import { getConnectionManager } from '@/lib/automation/mcp-connection-manager';

export async function GET() {
  try {
    const connectionManager = getConnectionManager();
    const connections = connectionManager.getConnections();

    return NextResponse.json({
      success: true,
      connections: connections.map(conn => ({
        serverId: conn.serverId,
        serverName: conn.serverName,
        connected: conn.connected,
        toolCount: conn.tools.length,
        error: conn.error,
        tools: conn.tools.map(t => ({
          name: t.name,
          description: t.description
        }))
      }))
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get connection status'
      },
      { status: 500 }
    );
  }
}
