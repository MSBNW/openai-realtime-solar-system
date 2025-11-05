'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TaskAnalysis {
  taskType: string;
  complexity: string;
  requiredAgents: { role: string; responsibility: string }[];
  estimatedTime: number;
  steps: string[];
}

interface TaskExecution {
  taskId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  result?: any;
  error?: string;
  logs: string[];
}

export default function AutomationPage() {
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<{
    taskId: string;
    analysis: TaskAnalysis;
  } | null>(null);
  const [execution, setExecution] = useState<TaskExecution | null>(null);
  const [allTasks, setAllTasks] = useState<any[]>([]);

  const exampleTasks = [
    "Analyze the codebase and create a comprehensive README.md",
    "Create a marketing plan for this solar system visualization project",
    "Document the API endpoints and component structure",
    "Generate blog post ideas about interactive 3D web experiences",
    "Analyze the code quality and suggest improvements"
  ];

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/automation/tasks');
      const data = await res.json();
      if (data.success) {
        setAllTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setCurrentTask(null);
    setExecution(null);

    try {
      const res = await fetch('/api/automation/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });

      const data = await res.json();

      if (data.success) {
        setCurrentTask({
          taskId: data.taskId,
          analysis: data.analysis
        });
        setExecution(data.execution);

        // Poll for status updates
        startPolling(data.taskId);
      } else {
        alert('Failed to execute task: ' + data.error);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit task');
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (taskId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/automation/status/${taskId}`);
        const data = await res.json();

        if (data.success) {
          setExecution(data.execution);

          if (data.execution.status === 'completed' || data.execution.status === 'failed') {
            clearInterval(pollInterval);
            loadTasks();
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(pollInterval);
      }
    }, 2000);

    // Clean up after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            <h1 className="text-5xl font-bold text-white">
              AI Automation Platform
            </h1>
            <Link
              href="/automation/integrations"
              className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-200 border border-blue-400/30 hover:bg-blue-500/30 text-sm"
            >
              🔌 MCP Integrations
            </Link>
          </div>
          <p className="text-xl text-purple-200">
            Powered by Claude-Flow Agent Swarms
          </p>
          <p className="text-sm text-purple-300">
            Describe any task in natural language - AI agents will handle it
          </p>
        </div>

        {/* Task Input */}
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-purple-300/20">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                What do you need help with?
              </label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="e.g., Analyze the codebase and create documentation..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-purple-300/30 text-white placeholder-purple-200/50 focus:outline-none focus:border-purple-400"
                disabled={loading}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-purple-200 text-sm self-center">Examples:</span>
              {exampleTasks.map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTask(example)}
                  className="text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 border border-purple-400/30"
                  disabled={loading}
                >
                  {example.slice(0, 50)}...
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={!task || loading}
              className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Analyzing Task...' : 'Execute Task'}
            </button>
          </form>
        </div>

        {/* Task Analysis */}
        {currentTask && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-purple-300/20 space-y-4">
            <h2 className="text-2xl font-bold text-white">Task Analysis</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-400/30">
                <div className="text-purple-200 text-sm">Task Type</div>
                <div className="text-white font-semibold text-lg capitalize">
                  {currentTask.analysis.taskType.replace('_', ' ')}
                </div>
              </div>

              <div className="bg-pink-500/20 rounded-lg p-4 border border-pink-400/30">
                <div className="text-pink-200 text-sm">Complexity</div>
                <div className="text-white font-semibold text-lg capitalize">
                  {currentTask.analysis.complexity}
                </div>
              </div>

              <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-400/30">
                <div className="text-blue-200 text-sm">Estimated Time</div>
                <div className="text-white font-semibold text-lg">
                  ~{currentTask.analysis.estimatedTime} min
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Agent Team</h3>
              <div className="space-y-2">
                {currentTask.analysis.requiredAgents.map((agent, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-3 border border-purple-300/20">
                    <div className="text-purple-200 font-medium">{agent.role}</div>
                    <div className="text-purple-300 text-sm">{agent.responsibility}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Execution Steps</h3>
              <ol className="space-y-2">
                {currentTask.analysis.steps.map((step, i) => (
                  <li key={i} className="text-purple-200 flex gap-2">
                    <span className="text-purple-400">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* Execution Status */}
        {execution && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-purple-300/20 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Execution Status</h2>
              <div className={`px-4 py-2 rounded-full font-semibold ${
                execution.status === 'completed' ? 'bg-green-500/20 text-green-200 border border-green-400/30' :
                execution.status === 'failed' ? 'bg-red-500/20 text-red-200 border border-red-400/30' :
                execution.status === 'running' ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-400/30' :
                'bg-blue-500/20 text-blue-200 border border-blue-400/30'
              }`}>
                {execution.status.toUpperCase()}
              </div>
            </div>

            {execution.logs && execution.logs.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Execution Logs</h3>
                <div className="bg-black/30 rounded-lg p-4 font-mono text-sm text-green-300 max-h-64 overflow-y-auto">
                  {execution.logs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </div>
            )}

            {execution.result && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Results</h3>
                <div className="bg-white/5 rounded-lg p-4 border border-purple-300/20 space-y-3">
                  {/* Summary */}
                  <div className="bg-green-500/20 rounded p-3 border border-green-400/30">
                    <div className="text-green-200 font-semibold">{execution.result.summary}</div>
                    {execution.result.model && (
                      <div className="text-green-300 text-xs mt-1">Model: {execution.result.model}</div>
                    )}
                    {execution.result.tokensUsed && (
                      <div className="text-green-300 text-xs">Tokens: {execution.result.tokensUsed}</div>
                    )}
                  </div>

                  {/* MCP Tool Calls Section */}
                  {execution.result.toolCalls && execution.result.toolCalls.length > 0 && (
                    <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-400/30">
                      <h4 className="text-blue-200 font-semibold mb-3">🔧 MCP Tool Usage (Verifiable)</h4>
                      <div className="space-y-3">
                        {execution.result.toolCalls.map((call: any, idx: number) => (
                          <div key={idx} className="bg-black/30 rounded p-3 border border-blue-400/20">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs px-2 py-1 rounded ${call.success ? 'bg-green-500/30 text-green-200' : 'bg-red-500/30 text-red-200'}`}>
                                {call.success ? '✓ Success' : '✗ Failed'}
                              </span>
                              <span className="text-blue-100 font-semibold">{call.tool}</span>
                            </div>

                            <details className="mb-2">
                              <summary className="text-xs text-blue-300 cursor-pointer hover:text-blue-200">
                                📤 View Input (what AI sent to tool)
                              </summary>
                              <pre className="text-xs text-blue-200 mt-1 whitespace-pre-wrap bg-black/20 p-2 rounded">
                                {JSON.stringify(call.input, null, 2)}
                              </pre>
                            </details>

                            <details>
                              <summary className="text-xs text-blue-300 cursor-pointer hover:text-blue-200">
                                📥 View Output (what tool returned)
                              </summary>
                              <pre className="text-xs text-blue-200 mt-1 whitespace-pre-wrap bg-black/20 p-2 rounded max-h-60 overflow-y-auto">
                                {call.success ? JSON.stringify(call.output, null, 2) : call.error}
                              </pre>
                            </details>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Main Output */}
                  {execution.result.output && (
                    <div className="bg-black/30 rounded-lg p-4">
                      <h4 className="text-purple-200 font-semibold mb-2">📝 Final AI Response</h4>
                      <pre className="text-purple-100 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                        {execution.result.output}
                      </pre>
                    </div>
                  )}

                  {/* Simulated Output */}
                  {execution.result.simulatedOutput && (
                    <div className="bg-black/30 rounded-lg p-4">
                      <pre className="text-purple-100 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                        {execution.result.simulatedOutput}
                      </pre>
                    </div>
                  )}

                  {/* Note */}
                  {execution.result.note && (
                    <div className="bg-yellow-500/20 rounded p-3 border border-yellow-400/30">
                      <div className="text-yellow-200 text-sm">{execution.result.note}</div>
                    </div>
                  )}

                  {/* Raw JSON (collapsed by default) */}
                  <details className="cursor-pointer">
                    <summary className="text-purple-300 text-sm hover:text-purple-200">
                      View Raw JSON
                    </summary>
                    <pre className="text-purple-300 text-xs mt-2 whitespace-pre-wrap">
                      {JSON.stringify(execution.result, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}

            {execution.error && (
              <div className="bg-red-500/20 rounded-lg p-4 border border-red-400/30">
                <h3 className="text-lg font-semibold text-red-200 mb-2">Error</h3>
                <p className="text-red-300">{execution.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Recent Tasks */}
        {allTasks.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-purple-300/20">
            <h2 className="text-2xl font-bold text-white mb-4">Recent Tasks</h2>
            <div className="space-y-2">
              {allTasks.slice(0, 5).map((t) => (
                <div key={t.taskId} className="bg-white/5 rounded-lg p-3 border border-purple-300/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      t.status === 'completed' ? 'bg-green-400' :
                      t.status === 'failed' ? 'bg-red-400' :
                      t.status === 'running' ? 'bg-yellow-400' :
                      'bg-blue-400'
                    }`} />
                    <span className="text-purple-200 font-mono text-sm">{t.taskId}</span>
                  </div>
                  <span className="text-purple-300 text-sm capitalize">{t.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Setup Instructions */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-lg rounded-lg p-6 border border-yellow-400/30">
          <div className="flex items-start gap-4">
            <div className="text-3xl">⚡</div>
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-bold text-yellow-200">Enable Real AI Execution</h3>
              <p className="text-yellow-100/80 text-sm">
                Currently running in <strong>simulation mode</strong>. To execute tasks with real AI:
              </p>
              <ol className="text-yellow-100/90 text-sm space-y-1 list-decimal list-inside">
                <li>Install Anthropic SDK: <code className="bg-black/30 px-2 py-0.5 rounded">npm install @anthropic-ai/sdk</code></li>
                <li>Get API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-yellow-300 hover:underline">console.anthropic.com</a></li>
                <li>Create <code className="bg-black/30 px-2 py-0.5 rounded">.env.local</code> file with: <code className="bg-black/30 px-2 py-0.5 rounded">ANTHROPIC_API_KEY=your-key</code></li>
                <li>Restart dev server: <code className="bg-black/30 px-2 py-0.5 rounded">npm run dev</code></li>
              </ol>
              <p className="text-yellow-100/70 text-xs italic">
                💡 Simulation mode still works great for testing the UI and workflow!
              </p>
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 border border-purple-300/20 text-center">
          <p className="text-purple-200 text-sm">
            This is a working MVP of a universal business automation platform.
            <br />
            The system analyzes tasks, creates agent crews, and executes them dynamically.
          </p>
        </div>
      </div>
    </div>
  );
}
