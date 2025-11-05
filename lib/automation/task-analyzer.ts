/**
 * Task Analyzer - MVP Implementation
 * Analyzes natural language tasks and determines execution plan
 */

export interface TaskAnalysis {
  taskType: 'code_analysis' | 'documentation' | 'marketing' | 'automation' | 'general';
  complexity: 'simple' | 'medium' | 'complex';
  requiredAgents: AgentSpec[];
  estimatedTime: number; // minutes
  steps: string[];
}

export interface AgentSpec {
  role: string;
  responsibility: string;
}

export class TaskAnalyzer {
  /**
   * Analyze a task description and create execution plan
   */
  analyzeTask(taskDescription: string): TaskAnalysis {
    const lower = taskDescription.toLowerCase();

    // Determine task type
    let taskType: TaskAnalysis['taskType'] = 'general';
    if (lower.includes('code') || lower.includes('analyze') || lower.includes('refactor')) {
      taskType = 'code_analysis';
    } else if (lower.includes('document') || lower.includes('readme') || lower.includes('guide')) {
      taskType = 'documentation';
    } else if (lower.includes('market') || lower.includes('content') || lower.includes('blog')) {
      taskType = 'marketing';
    } else if (lower.includes('automate') || lower.includes('workflow')) {
      taskType = 'automation';
    }

    // Determine complexity based on keywords
    let complexity: TaskAnalysis['complexity'] = 'simple';
    const complexityIndicators = {
      complex: ['comprehensive', 'full', 'complete', 'entire', 'all', 'every'],
      medium: ['multiple', 'several', 'analyze', 'research']
    };

    if (complexityIndicators.complex.some(word => lower.includes(word))) {
      complexity = 'complex';
    } else if (complexityIndicators.medium.some(word => lower.includes(word))) {
      complexity = 'medium';
    }

    // Determine required agents based on task type
    const requiredAgents = this.getAgentsForTask(taskType, complexity);

    // Estimate time
    const estimatedTime = this.estimateTime(complexity, requiredAgents.length);

    // Generate steps
    const steps = this.generateSteps(taskType, taskDescription);

    return {
      taskType,
      complexity,
      requiredAgents,
      estimatedTime,
      steps
    };
  }

  private getAgentsForTask(
    taskType: TaskAnalysis['taskType'],
    complexity: TaskAnalysis['complexity']
  ): AgentSpec[] {
    const agentTemplates: Record<string, AgentSpec[]> = {
      code_analysis: [
        { role: 'Code Analyzer', responsibility: 'Analyze code structure and patterns' },
        { role: 'Documentation Specialist', responsibility: 'Document findings' }
      ],
      documentation: [
        { role: 'Technical Writer', responsibility: 'Create clear documentation' },
        { role: 'Code Reader', responsibility: 'Understand codebase' }
      ],
      marketing: [
        { role: 'Content Strategist', responsibility: 'Plan content strategy' },
        { role: 'Copywriter', responsibility: 'Write marketing content' },
        { role: 'SEO Specialist', responsibility: 'Optimize for search' }
      ],
      automation: [
        { role: 'Process Analyst', responsibility: 'Analyze workflow' },
        { role: 'Automation Engineer', responsibility: 'Design automation' }
      ],
      general: [
        { role: 'General Assistant', responsibility: 'Complete the task' }
      ]
    };

    const agents = agentTemplates[taskType] || agentTemplates.general;

    // For simple tasks, reduce agents
    if (complexity === 'simple') {
      return agents.slice(0, 1);
    }

    return agents;
  }

  private estimateTime(
    complexity: TaskAnalysis['complexity'],
    agentCount: number
  ): number {
    const baseTime = {
      simple: 5,
      medium: 15,
      complex: 30
    };

    // More agents can work in parallel, reducing time
    const parallelFactor = Math.max(1, agentCount / 2);

    return Math.ceil(baseTime[complexity] / parallelFactor);
  }

  private generateSteps(
    taskType: TaskAnalysis['taskType'],
    description: string
  ): string[] {
    const stepTemplates: Record<string, string[]> = {
      code_analysis: [
        'Scan codebase structure',
        'Analyze code patterns and architecture',
        'Identify key components and dependencies',
        'Generate analysis report'
      ],
      documentation: [
        'Review existing code and structure',
        'Identify documentation gaps',
        'Write comprehensive documentation',
        'Format and organize content'
      ],
      marketing: [
        'Research target audience',
        'Develop content strategy',
        'Create marketing content',
        'Optimize for SEO and engagement'
      ],
      automation: [
        'Analyze current workflow',
        'Identify automation opportunities',
        'Design automation solution',
        'Document implementation plan'
      ],
      general: [
        'Understand the request',
        'Plan approach',
        'Execute task',
        'Deliver results'
      ]
    };

    return stepTemplates[taskType] || stepTemplates.general;
  }
}
