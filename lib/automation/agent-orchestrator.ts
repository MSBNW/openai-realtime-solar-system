/**
 * Agent Orchestrator - Real Implementation
 * Coordinates AI agents using Anthropic API to execute tasks
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { TaskAnalysis } from './task-analyzer';
import { getConnectionManager } from './mcp-connection-manager';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

// Import Anthropic if available
let Anthropic: any;
try {
  Anthropic = require('@anthropic-ai/sdk');
} catch (e) {
  // Will install later
  Anthropic = null;
}

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
   * Run the task using Anthropic API
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

      // Build prompt for AI execution
      const connectionManager = getConnectionManager();

      // Try to reconnect any stored configs that aren't connected
      const storedConfigs = await connectionManager.getStoredConfigs();
      if (storedConfigs.length > 0) {
        execution.logs.push(`🔄 Checking ${storedConfigs.length} stored MCP connection(s)...`);
        for (const stored of storedConfigs) {
          const existing = await connectionManager.getConnection(stored.serverId);
          if (!existing || !existing.connected) {
            try {
              execution.logs.push(`   Reconnecting to ${stored.serverId}...`);
              await connectionManager.reconnect(stored.serverId);
              execution.logs.push(`   ✓ Reconnected to ${stored.serverId}`);
            } catch (error: any) {
              execution.logs.push(`   ✗ Failed to reconnect to ${stored.serverId}: ${error.message}`);
            }
          } else {
            execution.logs.push(`   ✓ ${stored.serverId} already connected`);
          }
        }
      }

      const mcpTools = await connectionManager.getAllTools();

      // Show connection status
      const connections = await connectionManager.getConnections();
      execution.logs.push(`📡 MCP Status: ${connections.length} server(s) connected, ${mcpTools.length} tool(s) available`);
      for (const conn of connections) {
        execution.logs.push(`   - ${conn.serverName}: ${conn.connected ? '✓ Connected' : '✗ Disconnected'} (${conn.tools.length} tools)`);
      }

      if (mcpTools.length === 0) {
        execution.logs.push(`⚠️  WARNING: No MCP tools available. Connect to MCP servers at /automation/integrations`);
      }

      const prompt = this.buildPrompt(taskDescription, analysis, mcpTools);

      // Store prompt
      await fs.writeFile(
        path.join(taskWorkspace, 'prompt.txt'),
        prompt
      );

      execution.logs.push('Initializing AI execution...');

      // Check if Anthropic API key is available
      if (!process.env.ANTHROPIC_API_KEY) {
        execution.logs.push('⚠️  No ANTHROPIC_API_KEY found - running in simulation mode');
        execution.logs.push('📝 To enable real AI execution:');
        execution.logs.push('   1. Get API key from https://console.anthropic.com/');
        execution.logs.push('   2. Add to .env.local: ANTHROPIC_API_KEY=your-key-here');
        execution.logs.push('   3. Restart the dev server');
        execution.logs.push('');

        // Simulate execution
        await this.simulateExecution(execution, taskDescription, analysis);

      } else if (!Anthropic) {
        execution.logs.push('⚠️  Anthropic SDK not installed - running in simulation mode');
        execution.logs.push('📦 To install: npm install @anthropic-ai/sdk');
        execution.logs.push('');

        // Simulate execution
        await this.simulateExecution(execution, taskDescription, analysis);

      } else {
        // Real AI execution
        execution.logs.push('🤖 Executing with real AI agents...');
        await this.executeWithAnthropic(execution, taskDescription, analysis, prompt);
      }

      // Save result
      const result = execution.result || {
        taskId,
        summary: 'Task execution completed',
        timestamp: new Date().toISOString()
      };

      await fs.writeFile(
        path.join(taskWorkspace, 'result.json'),
        JSON.stringify(result, null, 2)
      );

      execution.status = 'completed';
      execution.endTime = new Date();
      execution.logs.push(`✅ Task completed at ${execution.endTime.toISOString()}`);

    } catch (error: any) {
      execution.status = 'failed';
      execution.error = error.message;
      execution.endTime = new Date();
      execution.logs.push(`❌ Error: ${error.message}`);
    }
  }

  /**
   * Execute task using Anthropic API with MCP tool support
   */
  private async executeWithAnthropic(
    execution: TaskExecution,
    taskDescription: string,
    analysis: TaskAnalysis,
    prompt: string
  ): Promise<void> {
    try {
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });

      // Get available MCP tools
      const connectionManager = getConnectionManager();
      const mcpTools = await connectionManager.getAllTools();

      if (mcpTools.length > 0) {
        execution.logs.push(`🔧 ${mcpTools.length} MCP tools available: ${mcpTools.map(t => t.name).join(', ')}`);
      }

      // Convert MCP tools to Claude API format
      const tools = mcpTools.map(tool => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.inputSchema
      }));

      execution.logs.push('🔄 Sending request to Claude API...');

      // Initial message
      const messages: any[] = [{
        role: 'user',
        content: prompt
      }];

      let totalTokens = 0;
      let conversationTurns = 0;
      const maxTurns = 10; // Prevent infinite loops

      // Agentic loop: keep going until Claude returns a final answer (no more tool uses)
      while (conversationTurns < maxTurns) {
        conversationTurns++;

        const requestParams: any = {
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 8096,
          messages
        };

        // Only add tools if we have MCP connections
        if (tools.length > 0) {
          requestParams.tools = tools;
        }

        const message = await anthropic.messages.create(requestParams);

        totalTokens += message.usage.input_tokens + message.usage.output_tokens;

        // Check if Claude wants to use tools
        const toolUseBlocks = message.content.filter((block: any) => block.type === 'tool_use');

        if (toolUseBlocks.length === 0) {
          // No tool use - final answer
          execution.logs.push('✨ Received final response from AI');

          const responseText = message.content
            .filter((block: any) => block.type === 'text')
            .map((block: any) => block.text)
            .join('\n');

          execution.logs.push('📊 Processing results...');

          // Preserve existing tool calls if any
          const existingToolCalls = execution.result?.toolCalls || [];

          execution.result = {
            taskId: execution.taskId,
            summary: `AI completed ${analysis.taskType} task with ${conversationTurns} turn(s)`,
            output: responseText,
            agents: analysis.requiredAgents.map(a => a.role),
            complexity: analysis.complexity,
            timestamp: new Date().toISOString(),
            model: 'claude-sonnet-4-5-20250929',
            tokensUsed: totalTokens,
            toolsAvailable: mcpTools.length > 0 ? mcpTools.map(t => t.name) : [],
            toolCalls: existingToolCalls,
            conversationTurns
          };

          execution.logs.push(`💬 Total tokens used: ${totalTokens}`);
          break;
        }

        // Claude wants to use tools
        execution.logs.push(`🔧 AI requesting ${toolUseBlocks.length} tool(s)...`);

        // Add assistant message to conversation
        messages.push({
          role: 'assistant',
          content: message.content
        });

        // Execute each tool
        const toolResults: any[] = [];
        for (const toolUse of toolUseBlocks) {
          execution.logs.push(`  → Calling ${toolUse.name}...`);
          execution.logs.push(`     Input: ${JSON.stringify(toolUse.input).substring(0, 200)}${JSON.stringify(toolUse.input).length > 200 ? '...' : ''}`);

          try {
            const result = await connectionManager.callTool(toolUse.name, toolUse.input);
            const resultStr = JSON.stringify(result);

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: resultStr
            });

            execution.logs.push(`  ✓ ${toolUse.name} succeeded`);
            execution.logs.push(`     Output preview: ${resultStr.substring(0, 300)}${resultStr.length > 300 ? '...' : ''}`);

            // Store detailed tool call info for results display
            if (!execution.result) {
              execution.result = { toolCalls: [] };
            }
            if (!execution.result.toolCalls) {
              execution.result.toolCalls = [];
            }
            execution.result.toolCalls.push({
              tool: toolUse.name,
              input: toolUse.input,
              output: result,
              success: true
            });
          } catch (error: any) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Error: ${error.message}`,
              is_error: true
            });
            execution.logs.push(`  ✗ ${toolUse.name} failed: ${error.message}`);

            // Store failed tool call
            if (!execution.result) {
              execution.result = { toolCalls: [] };
            }
            if (!execution.result.toolCalls) {
              execution.result.toolCalls = [];
            }
            execution.result.toolCalls.push({
              tool: toolUse.name,
              input: toolUse.input,
              error: error.message,
              success: false
            });
          }
        }

        // Add tool results to conversation
        messages.push({
          role: 'user',
          content: toolResults
        });

        execution.logs.push('🔄 Continuing conversation with tool results...');
      }

      if (conversationTurns >= maxTurns) {
        execution.logs.push('⚠️  Max conversation turns reached');
      }

    } catch (error: any) {
      execution.logs.push(`❌ AI execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Simulate execution for demo purposes
   */
  private async simulateExecution(
    execution: TaskExecution,
    taskDescription: string,
    analysis: TaskAnalysis
  ): Promise<void> {
    execution.logs.push('🎭 Simulating AI agent execution...');

    // Simulate agent work
    for (const agent of analysis.requiredAgents) {
      execution.logs.push(`👤 ${agent.role}: ${agent.responsibility}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    execution.logs.push('');
    execution.logs.push('📝 Generating simulated results...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    execution.result = {
      taskId: execution.taskId,
      summary: `Simulated ${analysis.taskType} task completion`,
      note: 'This is a simulated result. Add ANTHROPIC_API_KEY to .env.local for real AI execution.',
      taskDescription,
      agents: analysis.requiredAgents.map(a => a.role),
      steps: analysis.steps,
      simulatedOutput: this.generateSimulatedOutput(taskDescription, analysis),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate simulated output based on task type
   */
  private generateSimulatedOutput(description: string, analysis: TaskAnalysis): string {
    const outputs: Record<string, string> = {
      marketing: `# Marketing Plan

## Executive Summary
This plan outlines a comprehensive marketing strategy for the solar system visualization project.

## Target Audience
- Science enthusiasts
- Education professionals
- Web developers interested in 3D graphics
- Astronomy hobbyists

## Marketing Channels
1. Social Media (Twitter, LinkedIn, Reddit r/webdev)
2. Developer communities (Dev.to, Hacker News)
3. Educational platforms (Khan Academy, Coursera partnerships)
4. Tech blogs and publications

## Content Strategy
- Weekly blog posts about 3D web development
- Video tutorials on interactive astronomy visualizations
- Case studies of educational applications
- Open source community engagement

## Success Metrics
- 10K+ unique visitors in first month
- 1K+ GitHub stars
- Featured on major tech publications`,

      code_analysis: `# Code Analysis Report

## Architecture Overview
- Next.js 15 application with React 19
- 3D visualization using Spline
- Real-time data with WebRTC
- OpenAI API integration

## Code Quality Assessment
✅ Modern TypeScript implementation
✅ Component-based architecture
✅ Responsive design with Tailwind
⚠️  Could benefit from unit tests
⚠️  API error handling could be improved

## Recommendations
1. Add comprehensive test coverage
2. Implement error boundaries
3. Add loading states for async operations
4. Consider code splitting for performance
5. Add accessibility features (ARIA labels)`,

      documentation: `# API & Component Documentation

## API Endpoints

### POST /api/session
Creates a new realtime session
- Returns: { client_secret, id }

### POST /api/automation/execute
Executes an automation task
- Body: { task: string }
- Returns: { taskId, analysis, execution }

## Component Structure

### Main Components
- App: Main application container
- Scene: 3D visualization scene
- Controls: User interaction controls
- Logs: Real-time logging display

### Automation Components
- AutomationPage: Task submission and monitoring
- AutomationLink: Navigation component
- TaskAnalyzer: Task intelligence engine
- AgentOrchestrator: Execution coordinator`,

      automation: `# Workflow Automation Plan

## Current Workflow Analysis
- Manual task execution
- Limited coordination
- No automation framework

## Proposed Automation
1. Task Intelligence: Auto-analyze and categorize requests
2. Agent Coordination: Dynamic crew composition
3. Real-time Monitoring: Live progress tracking
4. Result Delivery: Structured output format

## Implementation Steps
1. Install Anthropic SDK
2. Configure API keys
3. Connect MCP servers (optional)
4. Test with sample tasks
5. Monitor and optimize

## Expected Benefits
- 10x faster task completion
- Reduced manual work
- Consistent quality
- Scalable execution`,

      general: `# Task Completion Report

## Task: ${description}

## Approach
Our AI agent team analyzed and executed this task using the following methodology:
1. Understanding the requirements
2. Breaking down into subtasks
3. Parallel execution where possible
4. Quality assurance and review

## Results
Task has been completed successfully with all requirements addressed.

## Recommendations
- Review the output for accuracy
- Provide feedback for continuous improvement
- Consider additional related tasks`
    };

    return outputs[analysis.taskType] || outputs.general;
  }

  /**
   * Build prompt for AI agents
   */
  private buildPrompt(taskDescription: string, analysis: TaskAnalysis, mcpTools: any[]): string {
    const agentRoles = analysis.requiredAgents
      .map(a => `- ${a.role}: ${a.responsibility}`)
      .join('\n');

    const hasOrchestrationTools = mcpTools.some(t =>
      ['task_orchestrate', 'agent_spawn', 'swarm_init'].includes(t.name)
    );

    let toolsSection = '';
    if (mcpTools.length > 0) {
      toolsSection = `

## Available Tools
You have access to the following MCP tools that can help complete this task:
${mcpTools.map(t => `- **${t.name}**: ${t.description}`).join('\n')}

**IMPORTANT**: If the task requires current information, web searches, or data that you don't have, you MUST use the appropriate tools. Don't make up information or provide generic answers when tools are available.`;

      if (hasOrchestrationTools) {
        toolsSection += `

## 🤖 Multi-Agent Orchestration - USE THIS!
You have multi-agent orchestration capabilities! **START by using task_orchestrate** to demonstrate the system's capabilities:

**REQUIRED FIRST STEP:**
1. **Call task_orchestrate FIRST** with the full task description
   - This will spawn specialized agents (researcher, analyzer, coder, planner, writer, coordinator)
   - Agents work in parallel for better results
   - Shows real multi-agent coordination in action

2. Then proceed with the actual work using other tools (Tavily, etc.)

**Why orchestrate:**
- Demonstrates parallel agent execution
- Shows specialized agent roles working together
- Provides better results through coordination
- User can see real-time agent activity

**Example:**
\`\`\`
task_orchestrate({
  task: "create content strategy for gmax.co.il",
  parallel: true
})
\`\`\`

After orchestrating, continue with research and execution using available tools.`;
      }
    }

    return `# Task Execution Brief

## Task Description
${taskDescription}

## Task Analysis
- Type: ${analysis.taskType}
- Complexity: ${analysis.complexity}
- Estimated Time: ${analysis.estimatedTime} minutes

## Agent Team
${agentRoles}
${toolsSection}

## Execution Steps
${analysis.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

## Context
This is part of the OpenAI Realtime Solar System project, a Next.js application showcasing interactive 3D solar system visualization.

## Instructions
Execute this task efficiently and provide detailed results. ${mcpTools.length > 0 ? 'USE THE AVAILABLE TOOLS when you need current information or external data.' : ''} Store your findings in a structured format.

## Deliverables
Provide clear, actionable results that can be used immediately. Include:
- Summary of what was accomplished
- Key findings or outputs
- Any recommendations or next steps
`;
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
