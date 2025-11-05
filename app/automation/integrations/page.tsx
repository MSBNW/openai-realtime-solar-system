'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MCPServer {
  id: string;
  name: string;
  category: string;
  description: string;
  capabilities: string[];
  envVars: string[];
  setupUrl: string | null;
}

interface ServerWithStatus extends MCPServer {
  connected?: boolean;
  toolCount?: number;
}

export default function IntegrationsPage() {
  const [servers, setServers] = useState<ServerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    loadServers();
    // Poll for connection status every 3 seconds
    const interval = setInterval(loadConnectionStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const loadServers = async () => {
    try {
      const res = await fetch('/api/automation/integrations/available');
      const data = await res.json();
      if (data.success) {
        setServers(data.servers);
        // Also load connection status
        await loadConnectionStatus();
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConnectionStatus = async () => {
    try {
      const res = await fetch('/api/automation/integrations/status');
      const data = await res.json();
      if (data.success) {
        // Update servers with connection status
        setServers(prevServers =>
          prevServers.map(server => {
            const connection = data.connections.find(
              (c: any) => c.serverId === server.id
            );
            return {
              ...server,
              connected: connection?.connected || false,
              toolCount: connection?.toolCount || 0
            };
          })
        );
      }
    } catch (error) {
      console.error('Failed to load connection status:', error);
    }
  };

  const handleConnect = async (serverId: string) => {
    setConnecting(serverId);
    try {
      const res = await fetch('/api/automation/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId,
          envVars: apiKeys[serverId] || {}
        })
      });
      const data = await res.json();

      if (data.success) {
        alert(`✓ Connected to ${data.connection.serverName}!\n${data.connection.toolCount} tools available.`);
        await loadConnectionStatus();
      } else {
        alert(`Failed to connect: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Connection error: ${error.message}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleApiKeyChange = (serverId: string, envVar: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [serverId]: {
        ...prev[serverId],
        [envVar]: value
      }
    }));
  };

  const handleDisconnect = async (serverId: string) => {
    setConnecting(serverId);
    try {
      const res = await fetch('/api/automation/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId })
      });
      const data = await res.json();

      if (data.success) {
        alert(`Disconnected from ${serverId}`);
        await loadConnectionStatus();
      } else {
        alert(`Failed to disconnect: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Disconnection error: ${error.message}`);
    } finally {
      setConnecting(null);
    }
  };

  const categoryColors: Record<string, string> = {
    research: 'from-blue-500/20 to-cyan-500/20 border-blue-400/30',
    development: 'from-green-500/20 to-emerald-500/20 border-green-400/30',
    productivity: 'from-purple-500/20 to-pink-500/20 border-purple-400/30',
    communication: 'from-yellow-500/20 to-orange-500/20 border-yellow-400/30',
    database: 'from-red-500/20 to-rose-500/20 border-red-400/30'
  };

  const categoryIcons: Record<string, string> = {
    research: '🔍',
    development: '💻',
    productivity: '📊',
    communication: '💬',
    database: '🗄️'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">MCP Integrations</h1>
            <p className="text-purple-200 mt-2">
              Connect external tools to supercharge your AI agents
            </p>
          </div>
          <Link
            href="/automation"
            className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-400/30 hover:bg-purple-500/30"
          >
            ← Back to Automation
          </Link>
        </div>

        {/* Setup Instructions Banner */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-lg rounded-lg p-6 border border-blue-400/30">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🔌</div>
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-bold text-blue-200">Connect MCP Servers</h3>
              <p className="text-blue-100/80 text-sm">
                MCP integrations give AI agents access to external tools and live data:
              </p>
              <ul className="text-blue-100/90 text-sm space-y-1 list-disc list-inside">
                <li>Web search (Tavily) for real-time research</li>
                <li>GitHub for code repository access</li>
                <li>Google Drive for document management</li>
                <li>Slack for team communication</li>
                <li>Databases for data analysis</li>
              </ul>
              <p className="text-blue-100/70 text-xs italic mt-3">
                💡 Get API keys from the provider (click "Get API Key →"), enter them in the fields below, then click Connect!
              </p>
            </div>
          </div>
        </div>

        {/* Available Servers */}
        {loading ? (
          <div className="text-center text-purple-300">Loading integrations...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {servers.map((server) => (
              <div
                key={server.id}
                className={`bg-gradient-to-br ${
                  categoryColors[server.category] || 'from-gray-500/20 to-slate-500/20 border-gray-400/30'
                } backdrop-blur-lg rounded-lg p-6 border`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">
                    {categoryIcons[server.category] || '🔌'}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-white">{server.name}</h3>
                      <span className="px-3 py-1 rounded-full text-xs bg-black/30 text-purple-200 capitalize">
                        {server.category}
                      </span>
                    </div>

                    <p className="text-purple-200 text-sm">{server.description}</p>

                    <div>
                      <div className="text-purple-300 text-xs font-semibold mb-1">Capabilities:</div>
                      <div className="flex flex-wrap gap-1">
                        {server.capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="px-2 py-1 rounded text-xs bg-black/30 text-purple-200"
                          >
                            {cap.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-purple-300 text-xs font-semibold mb-2">
                        Required API Keys:
                      </div>
                      <div className="space-y-2">
                        {server.envVars.map((envVar) => (
                          <div key={envVar} className="space-y-1">
                            <label className="text-xs text-purple-300">
                              {envVar}
                            </label>
                            <input
                              type="password"
                              value={apiKeys[server.id]?.[envVar] || ''}
                              onChange={(e) => handleApiKeyChange(server.id, envVar, e.target.value)}
                              placeholder={`Enter your ${envVar}`}
                              disabled={server.connected}
                              className="w-full px-3 py-1.5 rounded bg-black/30 border border-purple-300/30 text-purple-100 text-xs placeholder-purple-300/50 focus:outline-none focus:border-purple-400 disabled:opacity-50"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {server.setupUrl && (
                      <a
                        href={server.setupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-sm text-purple-300 hover:text-purple-200 underline"
                      >
                        Get API Key →
                      </a>
                    )}

                    {server.connected ? (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-green-300 text-sm">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          Connected • {server.toolCount} tools
                        </div>
                        <button
                          onClick={() => handleDisconnect(server.id)}
                          disabled={connecting === server.id}
                          className="w-full px-4 py-2 rounded-lg bg-red-500/20 text-red-200 border border-red-400/30 hover:bg-red-500/30 disabled:opacity-50 text-sm"
                        >
                          {connecting === server.id ? 'Disconnecting...' : 'Disconnect'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleConnect(server.id)}
                        disabled={connecting === server.id}
                        className="w-full mt-3 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-200 border border-purple-400/30 hover:bg-purple-500/30 disabled:opacity-50 text-sm"
                      >
                        {connecting === server.id ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Setup Instructions */}
        <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-purple-300/20">
          <h3 className="text-lg font-bold text-white mb-3">How MCP Integrations Will Work</h3>
          <ol className="text-purple-200 text-sm space-y-2 list-decimal list-inside">
            <li>Select an integration from the catalog above</li>
            <li>Get API credentials from the provider</li>
            <li>Add credentials to your <code className="bg-black/30 px-2 py-0.5 rounded">.env.local</code> file</li>
            <li>Connect the integration (one click)</li>
            <li>AI agents will automatically use these tools when needed</li>
          </ol>
          <p className="text-purple-300 text-sm mt-4">
            Example: Ask "Research the latest AI trends and post to Slack" - agents will use Tavily for research and Slack to post results!
          </p>
        </div>
      </div>
    </div>
  );
}
