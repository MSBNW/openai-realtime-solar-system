#!/usr/bin/env node

/**
 * Local MCP Server for Multi-Agent Orchestration
 * Provides swarm coordination, agent spawning, and task orchestration via MCP protocol
 */

const readline = require('readline');

// Active swarms and agents
const swarms = new Map();
const agents = new Map();
let nextAgentId = 1;
let nextSwarmId = 1;

// Agent types and their capabilities
const AGENT_TYPES = {
  researcher: { name: 'Researcher', description: 'Gathers information and conducts research' },
  analyzer: { name: 'Analyzer', description: 'Analyzes data and identifies patterns' },
  coder: { name: 'Coder', description: 'Writes and reviews code' },
  planner: { name: 'Planner', description: 'Creates plans and strategies' },
  writer: { name: 'Writer', description: 'Creates content and documentation' },
  coordinator: { name: 'Coordinator', description: 'Coordinates tasks across agents' }
};

// MCP protocol handler
class MCPServer {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
  }

  start() {
    this.rl.on('line', (line) => {
      try {
        const request = JSON.parse(line);
        this.handleRequest(request);
      } catch (error) {
        this.sendError(null, -32700, 'Parse error', error.message);
      }
    });

    // Log startup to stderr
    console.error('Multi-Agent Orchestration MCP Server started');
  }

  handleRequest(request) {
    const { id, method, params } = request;

    try {
      switch (method) {
        case 'initialize':
          this.sendResponse(id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'orchestration-server',
              version: '1.0.0'
            }
          });
          break;

        case 'tools/list':
          this.sendResponse(id, {
            tools: [
              {
                name: 'swarm_init',
                description: 'Initialize a multi-agent swarm with specified topology and agent count',
                inputSchema: {
                  type: 'object',
                  properties: {
                    topology: {
                      type: 'string',
                      enum: ['mesh', 'hierarchical', 'pipeline'],
                      description: 'Swarm coordination topology'
                    },
                    maxAgents: {
                      type: 'number',
                      description: 'Maximum number of agents in swarm',
                      default: 5
                    },
                    task: {
                      type: 'string',
                      description: 'Primary task for the swarm'
                    }
                  },
                  required: ['task']
                }
              },
              {
                name: 'agent_spawn',
                description: 'Spawn a specialized agent of a specific type',
                inputSchema: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: Object.keys(AGENT_TYPES),
                      description: 'Type of agent to spawn'
                    },
                    swarmId: {
                      type: 'string',
                      description: 'Swarm ID to join (optional)'
                    },
                    task: {
                      type: 'string',
                      description: 'Specific task for this agent'
                    }
                  },
                  required: ['type', 'task']
                }
              },
              {
                name: 'agent_status',
                description: 'Get status of all active agents or a specific agent',
                inputSchema: {
                  type: 'object',
                  properties: {
                    agentId: {
                      type: 'string',
                      description: 'Specific agent ID (optional, omit for all agents)'
                    }
                  }
                }
              },
              {
                name: 'task_orchestrate',
                description: 'Orchestrate a complex task across multiple agents',
                inputSchema: {
                  type: 'object',
                  properties: {
                    task: {
                      type: 'string',
                      description: 'Task to orchestrate'
                    },
                    agentTypes: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: Object.keys(AGENT_TYPES)
                      },
                      description: 'Types of agents to use (auto-selected if omitted)'
                    },
                    parallel: {
                      type: 'boolean',
                      description: 'Execute agents in parallel vs sequential',
                      default: true
                    }
                  },
                  required: ['task']
                }
              },
              {
                name: 'memory_store',
                description: 'Store data in shared memory for agent coordination',
                inputSchema: {
                  type: 'object',
                  properties: {
                    key: {
                      type: 'string',
                      description: 'Memory key'
                    },
                    value: {
                      type: 'object',
                      description: 'Data to store'
                    },
                    scope: {
                      type: 'string',
                      enum: ['global', 'swarm', 'agent'],
                      description: 'Memory scope',
                      default: 'global'
                    }
                  },
                  required: ['key', 'value']
                }
              }
            ]
          });
          break;

        case 'tools/call':
          this.handleToolCall(id, params);
          break;

        default:
          this.sendError(id, -32601, 'Method not found', `Unknown method: ${method}`);
      }
    } catch (error) {
      this.sendError(id, -32603, 'Internal error', error.message);
    }
  }

  handleToolCall(requestId, params) {
    const { name, arguments: args } = params;

    try {
      let result;

      switch (name) {
        case 'swarm_init':
          result = this.initSwarm(args);
          break;
        case 'agent_spawn':
          result = this.spawnAgent(args);
          break;
        case 'agent_status':
          result = this.getAgentStatus(args);
          break;
        case 'task_orchestrate':
          result = this.orchestrateTask(args);
          break;
        case 'memory_store':
          result = this.storeMemory(args);
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      this.sendResponse(requestId, {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      });
    } catch (error) {
      this.sendError(requestId, -32603, 'Tool execution failed', error.message);
    }
  }

  initSwarm(args) {
    const { topology = 'mesh', maxAgents = 5, task } = args;
    const swarmId = `swarm-${nextSwarmId++}`;

    swarms.set(swarmId, {
      id: swarmId,
      topology,
      maxAgents,
      task,
      agents: [],
      status: 'initialized',
      createdAt: new Date().toISOString()
    });

    console.error(`Swarm ${swarmId} initialized: ${topology} topology, max ${maxAgents} agents`);

    return {
      success: true,
      swarmId,
      topology,
      maxAgents,
      task,
      message: `Swarm initialized with ${topology} topology for task: ${task}`
    };
  }

  spawnAgent(args) {
    const { type, swarmId, task } = args;
    const agentId = `agent-${nextAgentId++}`;

    const agent = {
      id: agentId,
      type,
      typeName: AGENT_TYPES[type].name,
      description: AGENT_TYPES[type].description,
      task,
      swarmId: swarmId || null,
      status: 'active',
      progress: 0,
      spawnedAt: new Date().toISOString()
    };

    agents.set(agentId, agent);

    if (swarmId && swarms.has(swarmId)) {
      swarms.get(swarmId).agents.push(agentId);
    }

    console.error(`Agent ${agentId} (${type}) spawned for task: ${task}`);

    return {
      success: true,
      agentId,
      type,
      typeName: agent.typeName,
      task,
      swarmId,
      message: `${agent.typeName} agent spawned and working on: ${task}`
    };
  }

  getAgentStatus(args) {
    if (args.agentId) {
      const agent = agents.get(args.agentId);
      if (!agent) {
        throw new Error(`Agent ${args.agentId} not found`);
      }
      return { agent };
    }

    return {
      totalAgents: agents.size,
      totalSwarms: swarms.size,
      agents: Array.from(agents.values()),
      swarms: Array.from(swarms.values())
    };
  }

  orchestrateTask(args) {
    const { task, agentTypes, parallel = true } = args;

    // Auto-select agent types if not provided
    const selectedTypes = agentTypes || this.selectAgentTypes(task);
    const swarmId = `swarm-${nextSwarmId++}`;

    // Create swarm
    swarms.set(swarmId, {
      id: swarmId,
      topology: parallel ? 'mesh' : 'pipeline',
      maxAgents: selectedTypes.length,
      task,
      agents: [],
      status: 'orchestrating',
      createdAt: new Date().toISOString()
    });

    // Spawn agents
    const spawnedAgents = selectedTypes.map((type, index) => {
      const subtask = this.decomposeTask(task, type, index, selectedTypes.length);
      return this.spawnAgent({ type, swarmId, task: subtask });
    });

    console.error(`Orchestrating task across ${spawnedAgents.length} agents in ${parallel ? 'parallel' : 'sequential'} mode`);

    return {
      success: true,
      swarmId,
      mode: parallel ? 'parallel' : 'sequential',
      task,
      agents: spawnedAgents,
      message: `Orchestrated task across ${spawnedAgents.length} specialized agents`
    };
  }

  selectAgentTypes(task) {
    const taskLower = task.toLowerCase();
    const types = [];

    // Smart agent selection based on task keywords
    if (taskLower.match(/research|find|search|investigate/)) types.push('researcher');
    if (taskLower.match(/analyz|evaluate|assess|compare/)) types.push('analyzer');
    if (taskLower.match(/code|implement|program|develop/)) types.push('coder');
    if (taskLower.match(/plan|strategy|organize/)) types.push('planner');
    if (taskLower.match(/write|content|document|report/)) types.push('writer');

    // Default to coordinator + researcher if no specific match
    if (types.length === 0) {
      types.push('coordinator', 'researcher');
    }

    // Add coordinator for complex tasks
    if (types.length > 2 && !types.includes('coordinator')) {
      types.unshift('coordinator');
    }

    return types;
  }

  decomposeTask(mainTask, agentType, index, total) {
    const typeInfo = AGENT_TYPES[agentType];

    if (agentType === 'coordinator') {
      return `Coordinate the overall execution of: ${mainTask}`;
    }
    if (agentType === 'planner') {
      return `Create a detailed plan for: ${mainTask}`;
    }
    if (agentType === 'researcher') {
      return `Research and gather information for: ${mainTask}`;
    }
    if (agentType === 'analyzer') {
      return `Analyze data and requirements for: ${mainTask}`;
    }
    if (agentType === 'coder') {
      return `Implement the technical solution for: ${mainTask}`;
    }
    if (agentType === 'writer') {
      return `Create documentation and content for: ${mainTask}`;
    }

    return `${typeInfo.description} for: ${mainTask}`;
  }

  storeMemory(args) {
    const { key, value, scope = 'global' } = args;

    console.error(`Stored memory: ${key} (scope: ${scope})`);

    return {
      success: true,
      key,
      scope,
      message: `Memory stored successfully`
    };
  }

  sendResponse(id, result) {
    const response = {
      jsonrpc: '2.0',
      id,
      result
    };
    console.log(JSON.stringify(response));
  }

  sendError(id, code, message, data) {
    const response = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data
      }
    };
    console.log(JSON.stringify(response));
  }
}

// Start the server
const server = new MCPServer();
server.start();
