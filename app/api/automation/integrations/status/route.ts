/**
 * API Route: Get Connection Status
 * GET /api/automation/integrations/status
 */

import { NextResponse } from 'next/server';
import { getConnectionManager } from '@/lib/automation/mcp-connection-manager';

export async function GET() {
  try {
    const connectionManager = getConnectionManager();

    // Get stored configs that should be connected
    const storedConfigs = connectionManager.getStoredConfigs();

    // Try to reconnect any that are disconnected
    for (const stored of storedConfigs) {
      const existing = connectionManager.getConnection(stored.serverId);
      if (!existing || !existing.connected) {
        try {
          console.log(`Auto-reconnecting to ${stored.serverId}...`);
          await connectionManager.reconnect(stored.serverId);
        } catch (error: any) {
          console.error(`Failed to reconnect to ${stored.serverId}:`, error.message);
        }
      }
    }

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
