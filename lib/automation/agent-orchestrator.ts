/**
 * Agent Orchestrator - MVP Implementation
 * Coordinates AI agents using claude-flow to execute tasks
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { TaskAnalysis } from './task-analyzer';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export interface TaskExecution {
  taskId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  logs: string[];
}

export class AgentOrchestrator {
  private executions: Map<string, TaskExecution> = new Map();
  private workspaceRoot: string;

  constructor() {
    this.workspaceRoot = path.join(process.cwd(), '.automation-workspace');
  }

  /**
   * Initialize workspace
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.workspaceRoot, { recursive: true });
      await fs.mkdir(path.join(this.workspaceRoot, 'tasks'), { recursive: true });
      await fs.mkdir(path.join(this.workspaceRoot, 'results'), { recursive: true });
    } catch (error) {
      console.error('Failed to initialize workspace:', error);
    }
  }

  /**
   * Execute a task with AI agents
   */
  async executeTask(
    taskId: string,
    taskDescription: string,
    analysis: TaskAnalysis
  ): Promise<TaskExecution> {
    const execution: TaskExecution = {
      taskId,
      status: 'queued',
      logs: []
    };

    this.executions.set(taskId, execution);

    // Start execution in background
    this.runTask(taskId, taskDescription, analysis).catch(error => {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = new Date();
    });

    return execution;
  }

  /**
   * Run the task using claude-flow
   */
  private async runTask(
    taskId: string,
    taskDescription: string,
    analysis: TaskAnalysis
  ): Promise<void> {
    const execution = this.executions.get(taskId);
    if (!execution) return;

    execution.status = 'running';
    execution.startTime = new Date();
    execution.logs.push(`Starting task execution at ${execution.startTime.toISOString()}`);

    try {
      // Create task workspace
      const taskWorkspace = path.join(this.workspaceRoot, 'tasks', taskId);
      await fs.mkdir(taskWorkspace, { recursive: true });

      // Store task context
      const taskContext = {
        id: taskId,
        description: taskDescription,
        analysis,
        timestamp: new Date().toISOString()
      };

      await fs.writeFile(
        path.join(taskWorkspace, 'context.json'),
        JSON.stringify(taskContext, null, 2)
      );

      execution.logs.push(`Task analyzed: ${analysis.complexity} ${analysis.taskType}`);
      execution.logs.push(`Agents assigned: ${analysis.requiredAgents.map(a => a.role).join(', ')}`);
      execution.logs.push(`Estimated time: ${analysis.estimatedTime} minutes`);

      // Build prompt for claude-flow
      const prompt = this.buildPrompt(taskDescription, analysis);

      // Store prompt
      await fs.writeFile(
        path.join(taskWorkspace, 'prompt.txt'),
        prompt
      );

      execution.logs.push('Initializing AI agent swarm...');

      // Execute using claude-flow
      const swarmCommand = this.buildSwarmCommand(taskWorkspace, prompt, analysis);

      execution.logs.push(`Command: ${swarmCommand}`);

      try {
        const { stdout, stderr } = await execAsync(swarmCommand, {
          cwd: taskWorkspace,
          timeout: 5 * 60 * 1000, // 5 minute timeout
          env: {
            ...process.env,
            TASK_ID: taskId
          }
        });

        if (stdout) {
          execution.logs.push('Swarm output:');
          execution.logs.push(stdout);
        }

        if (stderr) {
          execution.logs.push('Warnings:');
          execution.logs.push(stderr);
        }
      } catch (execError: any) {
        // Claude-flow may exit with code 1 even on success
        if (execError.stdout) {
          execution.logs.push('Output:');
          execution.logs.push(execError.stdout);
        }
      }

      // Try to retrieve results from memory
      execution.logs.push('Retrieving results from agent memory...');

      const result = await this.retrieveResults(taskWorkspace, taskId);

      execution.result = result;
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.logs.push(`Task completed at ${execution.endTime.toISOString()}`);

    } catch (error: any) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = new Date();
      execution.logs.push(`Error: ${error.message}`);
    }
  }

  /**
   * Build prompt for AI agents
   */
  private buildPrompt(taskDescription: string, analysis: TaskAnalysis): string {
    const agentRoles = analysis.requiredAgents
      .map(a => `- ${a.role}: ${a.responsibility}`)
      .join('\n');

    return `# Task Execution Brief

## Task Description
${taskDescription}

## Task Analysis
- Type: ${analysis.taskType}
- Complexity: ${analysis.complexity}
- Estimated Time: ${analysis.estimatedTime} minutes

## Agent Team
${agentRoles}

## Execution Steps
${analysis.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Context
This is part of the OpenAI Realtime Solar System project, a Next.js application showcasing interactive 3D solar system visualization.

## Instructions
Execute this task efficiently and provide detailed results. Store your findings in a structured format.

## Deliverables
Provide clear, actionable results that can be used immediately. Include:
- Summary of what was accomplished
- Key findings or outputs
- Any recommendations or next steps
`;
  }

  /**
   * Build claude-flow swarm command
   */
  private buildSwarmCommand(
    workspace: string,
    prompt: string,
    analysis: TaskAnalysis
  ): string {
    const topology = analysis.complexity === 'complex' ? 'hierarchical' : 'star';
    const maxAgents = analysis.requiredAgents.length;

    // For MVP, we'll use a simpler approach - just echo the command
    // In production, this would execute the actual swarm
    return `echo "Simulating swarm execution..." && echo "${prompt}" > output.txt`;
  }

  /**
   * Retrieve results from task execution
   */
  private async retrieveResults(workspace: string, taskId: string): Promise<any> {
    try {
      // Try to read output file
      const outputPath = path.join(workspace, 'output.txt');
      const output = await fs.readFile(outputPath, 'utf-8');

      return {
        taskId,
        summary: 'Task simulation completed',
        output: output,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        taskId,
        summary: 'Task completed but no output file found',
        note: 'This is a simulated execution for MVP demo'
      };
    }
  }

  /**
   * Get task execution status
   */
  getExecution(taskId: string): TaskExecution | undefined {
    return this.executions.get(taskId);
  }

  /**
   * Get all executions
   */
  getAllExecutions(): TaskExecution[] {
    return Array.from(this.executions.values());
  }
}

// Singleton instance
let orchestratorInstance: AgentOrchestrator | null = null;

export function getOrchestrator(): AgentOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new AgentOrchestrator();
    orchestratorInstance.initialize();
  }
  return orchestratorInstance;
}
