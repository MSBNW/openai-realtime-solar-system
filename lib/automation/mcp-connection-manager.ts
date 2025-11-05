/**
 * MCP Connection Manager
 * Handles spawning and communicating with MCP servers
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPConnection {
  serverId: string;
  serverName: string;
  transport: 'stdio' | 'sse';
  process?: ChildProcess;
  url?: string;
  tools: MCPTool[];
  connected: boolean;
  error?: string;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: 'stdio' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  envVars: string[];
}

class MCPConnectionManager {
  private connections: Map<string, MCPConnection> = new Map();
  private connectionConfigs: Map<string, { config: MCPServerConfig; envVars: Record<string, string> }> = new Map();
  private messageId = 0;
  private configFile = path.join(process.cwd(), '.mcp-connections.json');
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    // Load stored configs on startup
    this.loadingPromise = this.loadConfigs();
  }

  /**
   * Ensure configs are loaded before proceeding
   */
  private async ensureLoaded(): Promise<void> {
    if (this.loadingPromise) {
      await this.loadingPromise;
      this.loadingPromise = null;
    }
  }

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

    // Store the config for reconnection
    this.connectionConfigs.set(config.id, { config, envVars });

    // Persist to disk
    await this.saveConfigs();

    if (config.transport === 'sse') {
      // SSE transport (URL-based like Tavily)
      return this.connectSSE(config, envVars);
    } else {
      // stdio transport (local NPX packages)
      return this.connectStdio(config, envVars);
    }
  }

  /**
   * Reconnect to a previously connected server (e.g., after hot reload)
   */
  async reconnect(serverId: string): Promise<MCPConnection> {
    const stored = this.connectionConfigs.get(serverId);
    if (!stored) {
      throw new Error(`No stored configuration for ${serverId}`);
    }

    // Try to connect again
    return this.connect(stored.config, stored.envVars);
  }

  /**
   * Get stored connection configs (for persistence)
   */
  async getStoredConfigs(): Promise<Array<{ serverId: string; config: MCPServerConfig; hasApiKey: boolean }>> {
    await this.ensureLoaded();
    return Array.from(this.connectionConfigs.entries()).map(([serverId, { config, envVars }]) => ({
      serverId,
      config,
      hasApiKey: config.envVars.every(v => !!envVars[v])
    }));
  }

  /**
   * Connect to an SSE-based MCP server (like Tavily)
   */
  private async connectSSE(config: MCPServerConfig, envVars: Record<string, string>): Promise<MCPConnection> {
    if (!config.url) {
      throw new Error('SSE transport requires a URL');
    }

    // Build URL with API key as query parameter
    const url = new URL(config.url);
    for (const envVar of config.envVars) {
      const value = envVars[envVar];
      if (value) {
        // Convert env var name to query param (e.g., TAVILY_API_KEY -> tavilyApiKey)
        const paramName = envVar
          .split('_')
          .map((part, i) => i === 0 ? part.toLowerCase() : part.charAt(0) + part.slice(1).toLowerCase())
          .join('');
        url.searchParams.set(paramName, value);
      }
    }

    const connection: MCPConnection = {
      serverId: config.id,
      serverName: config.name,
      transport: 'sse',
      url: url.toString(),
      tools: [],
      connected: false
    };

    this.connections.set(config.id, connection);

    // Initialize the connection
    try {
      await this.initializeSSE(connection);
      await this.discoverToolsSSE(connection);
      connection.connected = true;
      console.log(`Connected to SSE MCP server ${config.id}, discovered ${connection.tools.length} tools`);
    } catch (error: any) {
      connection.error = error.message;
      connection.connected = false;
      throw error;
    }

    return connection;
  }

  /**
   * Connect to a stdio-based MCP server (local NPX packages)
   */
  private async connectStdio(config: MCPServerConfig, envVars: Record<string, string>): Promise<MCPConnection> {
    if (!config.command || !config.args) {
      throw new Error('stdio transport requires command and args');
    }

    // Spawn the MCP server process
    const serverProcess = spawn(config.command, config.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: envVars
    });

    const connection: MCPConnection = {
      serverId: config.id,
      serverName: config.name,
      transport: 'stdio',
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
      await this.initializeStdio(connection);
      await this.discoverToolsStdio(connection);
      connection.connected = true;
      console.log(`Connected to stdio MCP server ${config.id}, discovered ${connection.tools.length} tools`);
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
  disconnect(serverId: string, removeConfig: boolean = true): boolean {
    const connection = this.connections.get(serverId);
    if (!connection) {
      return false;
    }

    // Kill process for stdio connections
    if (connection.transport === 'stdio' && connection.process) {
      connection.process.kill();
    }

    // For SSE connections, just remove from map (no process to kill)
    this.connections.delete(serverId);

    // Optionally remove stored config (false when reconnecting)
    if (removeConfig) {
      this.connectionConfigs.delete(serverId);
      // Persist to disk
      this.saveConfigs().catch(err => {
        console.error('Failed to save configs after disconnect:', err.message);
      });
    }

    return true;
  }

  /**
   * Get all active connections
   */
  async getConnections(): Promise<MCPConnection[]> {
    await this.ensureLoaded();
    return Array.from(this.connections.values());
  }

  /**
   * Get a specific connection
   */
  async getConnection(serverId: string): Promise<MCPConnection | undefined> {
    await this.ensureLoaded();
    return this.connections.get(serverId);
  }

  /**
   * Get all available tools from all connected servers
   */
  async getAllTools(): Promise<MCPTool[]> {
    await this.ensureLoaded();
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

    if (targetConnection.transport === 'sse') {
      return this.sendRequestSSE(targetConnection, 'tools/call', {
        name: toolName,
        arguments: parameters
      });
    } else {
      return this.sendRequestStdio(targetConnection, 'tools/call', {
        name: toolName,
        arguments: parameters
      });
    }
  }

  /**
   * Initialize SSE connection
   */
  private async initializeSSE(connection: MCPConnection): Promise<void> {
    const response = await this.sendRequestSSE(connection, 'initialize', {
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
   * Discover tools from SSE server
   */
  private async discoverToolsSSE(connection: MCPConnection): Promise<void> {
    const response = await this.sendRequestSSE(connection, 'tools/list', {});

    if (response.tools && Array.isArray(response.tools)) {
      connection.tools = response.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema || {}
      }));
    }
  }

  /**
   * Send JSON-RPC request to SSE server via HTTP
   */
  private async sendRequestSSE(connection: MCPConnection, method: string, params: any): Promise<any> {
    if (!connection.url) {
      throw new Error('SSE connection missing URL');
    }

    const requestId = ++this.messageId;
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };

    const response = await fetch(connection.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SSE request failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    // Parse SSE stream
    const text = await response.text();

    // SSE format: "event: message\ndata: {...}\n\n"
    const lines = text.split('\n');
    let jsonData = '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        jsonData = line.substring(6); // Remove "data: " prefix
        break;
      }
    }

    if (!jsonData) {
      throw new Error('No data found in SSE response');
    }

    const data = JSON.parse(jsonData);

    if (data.error) {
      throw new Error(data.error.message || 'MCP server error');
    }

    return data.result;
  }

  /**
   * Initialize stdio connection
   */
  private async initializeStdio(connection: MCPConnection): Promise<void> {
    const response = await this.sendRequestStdio(connection, 'initialize', {
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
   * Discover tools from stdio server
   */
  private async discoverToolsStdio(connection: MCPConnection): Promise<void> {
    const response = await this.sendRequestStdio(connection, 'tools/list', {});

    if (response.tools && Array.isArray(response.tools)) {
      connection.tools = response.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema || {}
      }));
    }
  }

  /**
   * Send a JSON-RPC request to a stdio MCP server
   */
  private sendRequestStdio(connection: MCPConnection, method: string, params: any): Promise<any> {
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

  /**
   * Save connection configs to disk
   */
  private async saveConfigs(): Promise<void> {
    try {
      const data = Array.from(this.connectionConfigs.entries()).map(([id, { config, envVars }]) => ({
        id,
        config,
        envVars
      }));

      await fs.writeFile(this.configFile, JSON.stringify(data, null, 2));
      console.log(`Saved ${data.length} MCP connection configs`);
    } catch (error: any) {
      console.error('Failed to save MCP configs:', error.message);
    }
  }

  /**
   * Load connection configs from disk and reconnect
   */
  private async loadConfigs(): Promise<void> {
    try {
      const data = await fs.readFile(this.configFile, 'utf-8');
      const configs = JSON.parse(data);

      console.log(`Loading ${configs.length} stored MCP connection configs...`);

      for (const { id, config, envVars } of configs) {
        this.connectionConfigs.set(id, { config, envVars });

        // Try to reconnect and wait for it
        try {
          console.log(`Auto-reconnecting to ${id}...`);
          await this.reconnect(id);
          console.log(`✓ Successfully reconnected to ${id}`);
        } catch (err: any) {
          console.error(`✗ Failed to auto-reconnect to ${id}:`, err.message);
        }
      }

      console.log(`Finished loading MCP configs. ${this.connections.size} connection(s) active.`);
    } catch (error: any) {
      // File doesn't exist or is invalid - that's okay
      if (error.code !== 'ENOENT') {
        console.error('Failed to load MCP configs:', error.message);
      }
    }
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
