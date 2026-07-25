'use client';

/**
 * Kelly API Test Page
 *
 * Simple test interface for verifying /api/kelly works correctly.
 * Access at: http://localhost:3000/kelly-test
 */

import { useState } from "react";

export default function KellyTestPage() {
  const [message, setMessage] = useState("Hello Kelly, what tools do you have?");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = async () => {
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/kelly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || `HTTP ${res.status}`);
      }

      setResponse(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const testTool = async (toolName: string, args: any) => {
    setLoading(true);
    setError("");
    setResponse(null);

    try {
      const res = await fetch("/api/kelly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Execute ${toolName} with args: ${JSON.stringify(args)}`,
          history: [],
        }),
      });

      const data = await res.json();
      setResponse(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🧪 Kelly API Test</h1>
        <p className="text-gray-600 mb-8">
          Test the unified Kelly endpoint and its tools
        </p>

        {/* Message Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <label className="block text-sm font-medium mb-2">Message to Kelly</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 border rounded-lg mb-4 font-mono text-sm"
            rows={3}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send to Kelly"}
          </button>
        </div>

        {/* Quick Tool Tests */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Quick Tool Tests</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => testTool("memory_write", { key: "test", value: "hello", type: "general" })}
              className="p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm"
            >
              📝 Test memory_write
            </button>
            <button
              onClick={() => testTool("github_push", { project_id: "test-project", message: "test" })}
              className="p-3 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-sm"
            >
              🐙 Test github_push
            </button>
            <button
              onClick={() => testTool("cloudflare_deploy", { project_id: "test", project_name: "test", account_id: "test" })}
              className="p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 text-sm"
            >
              ☁️ Test cloudflare_deploy
            </button>
            <button
              onClick={() => testTool("list_project_files", { project_id: "test" })}
              className="p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm"
            >
              📁 Test list_files
            </button>
          </div>
        </div>

        {/* Response Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-700 font-semibold">❌ Error</h3>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {response && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">📨 Response</h2>
            
            {response.content && (
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase">Content</label>
                <div className="bg-gray-50 p-3 rounded mt-1 text-sm whitespace-pre-wrap">
                  {response.content}
                </div>
              </div>
            )}

            {response.tool_calls && (
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase">Tool Calls</label>
                <pre className="bg-gray-900 text-green-400 p-3 rounded mt-1 text-xs overflow-auto">
                  {JSON.stringify(response.tool_calls, null, 2)}
                </pre>
              </div>
            )}

            {response.tool_results && (
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-500 uppercase">Tool Results</label>
                <pre className="bg-gray-900 text-blue-400 p-3 rounded mt-1 text-xs overflow-auto">
                  {JSON.stringify(response.tool_results, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Raw JSON</label>
              <pre className="bg-gray-100 p-3 rounded mt-1 text-xs overflow-auto max-h-96">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* API Status */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Endpoint: <code className="bg-gray-200 px-2 py-1 rounded">/api/kelly</code></p>
          <p className="mt-1">Test with curl:</p>
          <code className="block bg-gray-900 text-green-400 p-3 rounded mt-2 text-xs text-left">
            curl -X POST http://127.0.0.1:3000/api/kelly \\
            <br />
            &nbsp;&nbsp;-H "Content-Type: application/json" \\
            <br />
            &nbsp;&nbsp;-d '{"message": "hello kelly"}'
          </code>
        </div>
      </div>
    </div>
  );
}
