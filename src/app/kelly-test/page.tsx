"use client";

import { useState } from "react";

export default function KellyTestPage() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kelly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setResponse(data);
    } catch (e: any) {
      setResponse({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">🧠 Kelly Unified Test</h1>
      <div className="flex gap-2 mb-4">
        <input
          className="flex-1 px-4 py-2 rounded bg-slate-800 border border-slate-700"
          placeholder="Say something to Kelly..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="px-6 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
      {response && (
        <pre className="bg-slate-900 p-4 rounded text-sm overflow-auto max-h-96">
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  );
}
