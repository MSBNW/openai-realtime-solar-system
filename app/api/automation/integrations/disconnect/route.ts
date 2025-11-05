/**
 * API Route: Disconnect from MCP Server
 * POST /api/automation/integrations/disconnect
 */

import { NextRequest, NextResponse } from 'next/server';
import { getConnectionManager } from '@/lib/automation/mcp-connection-manager';

export async function POST(request: NextRequest) {
  try {
    const { serverId } = await request.json();

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    const connectionManager = getConnectionManager();
    const success = connectionManager.disconnect(serverId);

    if (!success) {
      return NextResponse.json(
        { error: 'Server not connected or not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Disconnected from ${serverId}`
    });
  } catch (error: any) {
    console.error('Disconnection error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to disconnect from MCP server'
      },
      { status: 500 }
    );
  }
}
