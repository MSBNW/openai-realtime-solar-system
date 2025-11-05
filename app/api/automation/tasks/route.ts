/**
 * API Route: List All Tasks
 * GET /api/automation/tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/automation/agent-orchestrator';

export async function GET(request: NextRequest) {
  try {
    const orchestrator = getOrchestrator();
    const executions = orchestrator.getAllExecutions();

    return NextResponse.json({
      success: true,
      tasks: executions.map(ex => ({
        taskId: ex.taskId,
        status: ex.status,
        startTime: ex.startTime,
        endTime: ex.endTime,
        hasResult: !!ex.result,
        hasError: !!ex.error
      }))
    });
  } catch (error: any) {
    console.error('List tasks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list tasks' },
      { status: 500 }
    );
  }
}
