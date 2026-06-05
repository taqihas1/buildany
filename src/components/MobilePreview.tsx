import { useState } from 'react';
import { Smartphone, Download, Play, Check } from 'lucide-react';

interface MobilePreviewProps {
  projectId: number;
}

export function MobilePreview({ projectId }: MobilePreviewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'both'>('ios');
  const [status, setStatus] = useState('');

  const generateMobile = async () => {
    setIsGenerating(true);
    setStatus('Generating Expo project...');

    try {
      const res = await fetch(`/api/project/${projectId}/generate/mobile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });

      const data = await res.json();

      if (data.success) {
        setIsGenerated(true);
        setStatus(`Mobile project ready! Estimated build: ${data.estimatedTime}`);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setStatus('Failed to generate mobile project');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadZip = () => {
    window.open(`/api/project/${projectId}/download/mobile`, '_blank');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="font-semibold">Mobile Preview</h3>
            <p className="text-sm text-gray-500">Expo SDK 54 + React Native 0.81.5</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as 'ios' | 'android' | 'both')}
            className="px-3 py-1.5 text-sm border rounded-lg"
          >
            <option value="ios">iOS</option>
            <option value="android">Android</option>
            <option value="both">Both</option>
          </select>
          <button
            onClick={generateMobile}
            disabled={isGenerating}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Generate
              </>
            )}
          </button>
          {isGenerated && (
            <button
              onClick={downloadZip}
              className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gray-50">
        {isGenerated ? (
          <div className="text-center">
            <div className="w-64 h-[500px] bg-gray-900 rounded-[32px] border-8 border-gray-800 shadow-2xl mx-auto overflow-hidden relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-xl" />
              <div className="h-full bg-white p-4 pt-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-indigo-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <Smartphone className="w-8 h-8 text-white" />
                  </div>
                  <h4 className="font-bold text-lg">App Ready!</h4>
                  <p className="text-sm text-gray-500 mt-1">Download and run locally</p>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p className="font-medium">1. Download ZIP</p>
                    <p className="text-gray-500 text-xs">Extract to your machine</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p className="font-medium">2. Install dependencies</p>
                    <p className="text-gray-500 text-xs">npm install --legacy-peer-deps</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p className="font-medium">3. Run with Expo</p>
                    <p className="text-gray-500 text-xs">npx expo start --clear</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">{status}</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-64 h-[500px] bg-gray-200 rounded-[32px] border-8 border-gray-300 mx-auto flex items-center justify-center">
              <div className="text-center">
                <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Click Generate to create</p>
                <p className="text-gray-500 text-sm">mobile project</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
