/**
 * API Route: Execute Automation Task
 * POST /api/automation/execute
 */

import { NextRequest, NextResponse } from 'next/server';
import { TaskAnalyzer } from '@/lib/automation/task-analyzer';
import { getOrchestrator } from '@/lib/automation/agent-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const { task, conversationId } = await request.json();

    if (!task || typeof task !== 'string') {
      return NextResponse.json(
        { error: 'Task description is required' },
        { status: 400 }
      );
    }

    // Analyze the task
    const analyzer = new TaskAnalyzer();
    const analysis = analyzer.analyzeTask(task);

    // Generate task ID
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Start execution (with optional conversationId for continuity)
    const orchestrator = getOrchestrator();
    const execution = await orchestrator.executeTask(taskId, task, analysis, conversationId);

    return NextResponse.json({
      success: true,
      taskId,
      conversationId: execution.conversationId, // Return conversationId for follow-up requests
      analysis,
      execution: {
        status: execution.status,
        logs: execution.logs
      }
    });
  } catch (error: any) {
    console.error('Automation execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute task' },
      { status: 500 }
    );
  }
}
