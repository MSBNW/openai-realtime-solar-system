/**
 * MCP Connection Manager
 * Handles spawning and communicating with MCP servers
 */

import { spawn, ChildProcess } from 'child_process';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPConnection {
  serverId: string;
  serverName: string;
  process: ChildProcess;
  tools: MCPTool[];
  connected: boolean;
  error?: string;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  envVars: string[];
}

class MCPConnectionManager {
  private connections: Map<string, MCPConnection> = new Map();
  private messageId = 0;

  /**
   * Connect to an MCP server
   */
  async connect(config: MCPServerConfig, userEnvVars: Record<string, string> = {}): Promise<MCPConnection> {
    // Check if already connected
    if (this.connections.has(config.id)) {
      const existing = this.connections.get(config.id)!;
      if (existing.connected) {
        return existing;
      }
      // Clean up failed connection
      this.disconnect(config.id);
    }

    // Build environment variables: prioritize user-provided, then fall back to process.env
    const envVars: Record<string, string> = { ...process.env } as Record<string, string>;

    // Add user-provided environment variables
    for (const key of Object.keys(userEnvVars)) {
      if (userEnvVars[key]) {
        envVars[key] = userEnvVars[key];
      }
    }

    // Check required environment variables
    const missingEnvVars = config.envVars.filter(v => !envVars[v]);
    if (missingEnvVars.length > 0) {
      throw new Error(`Missing required API keys: ${missingEnvVars.join(', ')}`);
    }

    // Spawn the MCP server process
    const serverProcess = spawn(config.command, config.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: envVars
    });

    const connection: MCPConnection = {
      serverId: config.id,
      serverName: config.name,
      process: serverProcess,
      tools: [],
      connected: false
    };

    this.connections.set(config.id, connection);

    // Set up error handling
    serverProcess.on('error', (error) => {
      console.error(`MCP server ${config.id} error:`, error);
      connection.error = error.message;
      connection.connected = false;
    });

    serverProcess.on('exit', (code) => {
      console.log(`MCP server ${config.id} exited with code ${code}`);
      connection.connected = false;
    });

    // Initialize the connection
    try {
      await this.initialize(connection);
      await this.discoverTools(connection);
      connection.connected = true;
      console.log(`Connected to MCP server ${config.id}, discovered ${connection.tools.length} tools`);
    } catch (error: any) {
      connection.error = error.message;
      connection.connected = false;
      throw error;
    }

    return connection;
  }

  /**
   * Disconnect from an MCP server
   */
  disconnect(serverId: string): boolean {
    const connection = this.connections.get(serverId);
    if (!connection) {
      return false;
    }

    if (connection.process) {
      connection.process.kill();
    }

    this.connections.delete(serverId);
    return true;
  }

  /**
   * Get all active connections
   */
  getConnections(): MCPConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get a specific connection
   */
  getConnection(serverId: string): MCPConnection | undefined {
    return this.connections.get(serverId);
  }

  /**
   * Get all available tools from all connected servers
   */
  getAllTools(): MCPTool[] {
    const tools: MCPTool[] = [];
    for (const connection of this.connections.values()) {
      if (connection.connected) {
        tools.push(...connection.tools);
      }
    }
    return tools;
  }

  /**
   * Call a tool on an MCP server
   */
  async callTool(toolName: string, parameters: any): Promise<any> {
    // Find which server has this tool
    let targetConnection: MCPConnection | undefined;
    for (const connection of this.connections.values()) {
      if (connection.connected && connection.tools.some(t => t.name === toolName)) {
        targetConnection = connection;
        break;
      }
    }

    if (!targetConnection) {
      throw new Error(`Tool ${toolName} not found in any connected server`);
    }

    return this.sendRequest(targetConnection, 'tools/call', {
      name: toolName,
      arguments: parameters
    });
  }

  /**
   * Initialize connection with MCP server
   */
  private async initialize(connection: MCPConnection): Promise<void> {
    const response = await this.sendRequest(connection, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'solar-system-automation',
        version: '1.0.0'
      }
    });

    if (!response.capabilities) {
      throw new Error('Server did not return capabilities');
    }
  }

  /**
   * Discover available tools from the server
   */
  private async discoverTools(connection: MCPConnection): Promise<void> {
    const response = await this.sendRequest(connection, 'tools/list', {});

    if (response.tools && Array.isArray(response.tools)) {
      connection.tools = response.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema || {}
      }));
    }
  }

  /**
   * Send a JSON-RPC request to an MCP server
   */
  private sendRequest(connection: MCPConnection, method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      const timeout = setTimeout(() => {
        reject(new Error(`Request to ${method} timed out`));
      }, 30000);

      // Set up response handler
      const responseHandler = (data: Buffer) => {
        try {
          const lines = data.toString().split('\n');
          for (const line of lines) {
            if (!line.trim()) continue;

            const response = JSON.parse(line);
            if (response.id === id) {
              clearTimeout(timeout);
              connection.process.stdout?.removeListener('data', responseHandler);

              if (response.error) {
                reject(new Error(response.error.message || 'MCP server error'));
              } else {
                resolve(response.result);
              }
            }
          }
        } catch (error) {
          // Incomplete JSON, wait for more data
        }
      };

      connection.process.stdout?.on('data', responseHandler);

      // Handle stderr
      connection.process.stderr?.on('data', (data) => {
        console.error(`MCP server ${connection.serverId} stderr:`, data.toString());
      });

      // Send the request
      const requestStr = JSON.stringify(request) + '\n';
      connection.process.stdin?.write(requestStr);
    });
  }
}

// Singleton instance
let connectionManager: MCPConnectionManager | null = null;

export function getConnectionManager(): MCPConnectionManager {
  if (!connectionManager) {
    connectionManager = new MCPConnectionManager();
  }
  return connectionManager;
}
