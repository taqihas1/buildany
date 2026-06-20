import { useState, useEffect } from "react";
import { Brain, Search, Trash2, Tag, Clock, Zap } from "lucide-react";

interface Memory {
  id: string;
  content: string;
  category: string;
  importance: number;
  accessCount: number;
  createdAt: string;
  tags?: string;
}

interface MemoryPanelProps {
  projectId: string;
}

export function MemoryPanel({ projectId }: MemoryPanelProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);

  const fetchMemories = async () => {
    try {
      const res = await fetch(`/api/memory?projectId=${projectId}&limit=50`);
      const data = await res.json();
      if (data.success) {
        setMemories(data.results);
      }
    } catch (error) {
      console.error("Failed to fetch memories:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/memory");
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    }
  };

  useEffect(() => {
    fetchMemories();
    fetchStatus();
  }, [projectId]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchMemories();
      return;
    }
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search",
          query: searchQuery,
          projectId,
          limit: 20,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMemories(data.results);
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      const data = await res.json();
      if (data.success) {
        setMemories((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const handleConsolidate = async () => {
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "consolidate", archiveThreshold: 30 }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Consolidated: ${data.result.archived} archived, ${data.result.merged} merged`);
        fetchMemories();
        fetchStatus();
      }
    } catch (error) {
      console.error("Consolidate failed:", error);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      user: "bg-purple-100 text-purple-800",
      project: "bg-blue-100 text-blue-800",
      tech: "bg-green-100 text-green-800",
      design: "bg-pink-100 text-pink-800",
      decision: "bg-amber-100 text-amber-800",
      general: "bg-gray-100 text-gray-800",
    };
    return colors[category] || colors.general;
  };

  const getImportanceColor = (importance: number) => {
    if (importance >= 70) return "text-red-500";
    if (importance >= 50) return "text-yellow-500";
    return "text-gray-400";
  };

  return (
    <div className="h-full flex flex-col bg-white p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Kelly's Memory
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Persistent memories across projects — Kelly learns from every interaction
          </p>
        </div>
        {status && (
          <div className="flex gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              {status.hot} hot
            </span>
            <span>{status.total} total</span>
          </div>
        )}
      </div>

      {/* Search + Actions */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search memories..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
        >
          Search
        </button>
        <button
          onClick={handleConsolidate}
          className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200 transition-colors"
        >
          Consolidate
        </button>
      </div>

      {/* Memories List */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading memories...</div>
      ) : memories.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
          <Brain className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No memories yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Kelly will start remembering after generating code.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm text-gray-800 leading-relaxed">{memory.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getCategoryColor(
                        memory.category
                      )}`}
                    >
                      {memory.category}
                    </span>
                    {memory.tags && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Tag className="h-3 w-3" />
                        {memory.tags}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock className="h-3 w-3" />
                      {new Date(memory.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold ${getImportanceColor(memory.importance)}`}
                    title={`Importance: ${memory.importance}/100`}
                  >
                    {memory.importance}
                  </span>
                  <button
                    onClick={() => handleDelete(memory.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
