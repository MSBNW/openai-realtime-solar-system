/**
 * API Route: Get Task Status
 * GET /api/automation/status/[taskId]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/automation/agent-orchestrator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    const orchestrator = getOrchestrator();
    const execution = orchestrator.getExecution(taskId);

    if (!execution) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      execution: {
        taskId: execution.taskId,
        status: execution.status,
        startTime: execution.startTime,
        endTime: execution.endTime,
        result: execution.result,
        error: execution.error,
        logs: execution.logs
      }
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get task status' },
      { status: 500 }
    );
  }
}
