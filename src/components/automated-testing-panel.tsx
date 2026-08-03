import { useState, useEffect } from "react";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Play, 
  Eye, 
  Image 
} from "lucide-react";

interface TestResult {
  id: string;
  status: string;
  summary: string;
  screenshots: Array<{
    name: string;
    path: string;
    width: number;
    height: number;
  }>;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
    duration: number;
  }>;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

interface AutomatedTestingPanelProps {
  projectId: string;
  appUrl?: string;
}

export function AutomatedTestingPanel({ projectId, appUrl }: AutomatedTestingPanelProps) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const fetchResults = async () => {
    // Playwright removed - testing disabled
    setResults([]);
  };

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 10000);
    return () => clearInterval(interval);
  }, [projectId]);

  const runTest = async () => {
    alert(Automated testing is disabled. Playwright has been removed.);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      passed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      running: "bg-blue-100 text-blue-800",
      error: "bg-yellow-100 text-yellow-800",
    };
    const labels = {
      passed: "Passed",
      failed: "Failed",
      running: "Running",
      error: "Error",
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.error}`}>
        {labels[status as keyof typeof labels] || "Error"}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Automated Testing</h2>
          <p className="text-sm text-gray-500 mt-1">
            Run automated browser tests to verify your app works correctly
          </p>
        </div>
        <button
          onClick={runTest}
          disabled={loading || !appUrl}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run Tests
            </>
          )}
        </button>
      </div>

      {!appUrl && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            Deploy your app first to enable automated testing. Tests will verify
            navigation, responsiveness, links, forms, and images.
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-500">
            Test Results ({results.length})
          </h3>

          {results.map((result) => (
            <div
              key={result.id}
              className={`border rounded-lg overflow-hidden transition-all hover:shadow-md cursor-pointer ${
                selectedTest?.id === result.id ? "ring-2 ring-blue-500 border-blue-500" : "border-gray-200"
              }`}
              onClick={() => setSelectedTest(selectedTest?.id === result.id ? null : result)}
            >
              <div className="px-4 py-3 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  <span className="text-sm font-medium text-gray-900">
                    Test {result.id.split("_")[1]}
                  </span>
                </div>
                {getStatusBadge(result.status)}
              </div>
              <div className="px-4 py-2 text-xs text-gray-500">
                {result.summary}
              </div>

              {selectedTest?.id === result.id && (
                <div className="px-4 pb-4 space-y-4">
                  {result.screenshots.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Screenshots ({result.screenshots.length})
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {result.screenshots.map((screenshot) => (
                          <div
                            key={screenshot.name}
                            className="relative group cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedScreenshot(screenshot.path);
                            }}
                          >
                            <img
                              src={screenshot.path}
                              alt={screenshot.name}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200 hover:border-blue-500 transition-colors"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 rounded-lg transition-opacity">
                              <Eye className="h-5 w-5 text-white" />
                            </div>
                            <p className="text-xs text-center mt-1 capitalize text-gray-600">
                              {screenshot.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium mb-2">Checks</h4>
                    <div className="space-y-2">
                      {result.checks.map((check, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                            check.passed
                              ? "bg-green-50 text-green-800"
                              : "bg-red-50 text-red-800"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {check.passed ? (
                              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                            )}
                            <span>{check.name}</span>
                          </div>
                          <span className="text-xs opacity-70">
                            {check.duration}ms
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {result.error && (
                    <div className="p-3 bg-red-50 rounded-lg text-sm text-red-800">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && !loading && (
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
          <p className="text-sm text-gray-400">
            No tests run yet. Click "Run Tests" to start automated testing.
          </p>
        </div>
      )}

      {selectedScreenshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedScreenshot}
              alt="Screenshot"
              className="max-w-full max-h-[90vh] rounded-lg"
            />
            <button
              className="absolute top-2 right-2 px-3 py-1 bg-white text-gray-800 rounded-lg text-sm hover:bg-gray-100"
              onClick={() => setSelectedScreenshot(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
