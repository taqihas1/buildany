import { useState } from 'react';
import { Smartphone, Download, Play, Check, Camera, Link, Copy, CheckCircle, X, ExternalLink, QrCode, Image } from 'lucide-react';

interface MobilePreviewProps {
  projectId: string;
}

interface PreviewData {
  url?: string;
  qrUrl?: string;
  id?: string;
  expiresIn?: string;
}

interface ScreenshotData {
  device: string;
  screen: string;
  base64?: string;
  width: number;
  height: number;
  note?: string;
}

const DEVICE_OPTIONS = [
  { id: 'iphone-14', name: 'iPhone 14', width: 390, height: 844 },
  { id: 'iphone-14-pro', name: 'iPhone 14 Pro', width: 393, height: 852 },
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667 },
  { id: 'pixel-7', name: 'Pixel 7', width: 412, height: 915 },
  { id: 'ipad', name: 'iPad', width: 768, height: 1024 },
];

const SCREEN_OPTIONS = [
  { id: 'home', name: 'Home Screen' },
  { id: 'search', name: 'Search' },
  { id: 'profile', name: 'Profile' },
  { id: 'settings', name: 'Settings' },
  { id: 'discover', name: 'Discover' },
];

export function MobilePreview({ projectId }: MobilePreviewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'both'>('ios');
  const [status, setStatus] = useState('');
  
  // Preview states
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Screenshot states
  const [selectedDevice, setSelectedDevice] = useState('iphone-14');
  const [selectedScreens, setSelectedScreens] = useState<string[]>(['home']);
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenshots, setScreenshots] = useState<ScreenshotData[]>([]);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);

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

  const publishPreview = async () => {
    setIsPublishing(true);
    setStatus('Publishing preview to rn-preview...');

    try {
      const filesRes = await fetch(`/api/project/${projectId}/files`);
      const filesData = await filesRes.json();
      const files = filesData.files || [];

      const res = await fetch('/api/publish-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, files }),
      });

      const data = await res.json();

      if (data.success) {
        setPreviewData({
          url: data.url,
          qrUrl: data.qrUrl,
          id: data.id,
          expiresIn: data.expiresIn,
        });
        setStatus('Preview published! Share the link below.');
      } else {
        setStatus(`Preview publish failed: ${data.error}`);
      }
    } catch (error) {
      setStatus('Failed to publish preview');
    } finally {
      setIsPublishing(false);
    }
  };

  const copyUrl = () => {
    if (previewData?.url) {
      navigator.clipboard.writeText(previewData.url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const captureScreenshots = async () => {
    setIsCapturing(true);
    setStatus('Capturing screenshots...');

    try {
      const res = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          device: selectedDevice,
          screens: selectedScreens,
        }),
      });

      const data = await res.json();

      if (data.success && data.screenshots) {
        setScreenshots(data.screenshots);
        setStatus(`Screenshots captured on ${selectedDevice}`);
      } else {
        setStatus(`Screenshot failed: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setStatus('Failed to capture screenshots');
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleScreen = (screenId: string) => {
    setSelectedScreens(prev => 
      prev.includes(screenId) 
        ? prev.filter(s => s !== screenId)
        : [...prev, screenId]
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - matches screenshot exactly */}
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
            className="px-3 py-1.5 text-sm border rounded-lg bg-white"
          >
            <option value="ios">iOS</option>
            <option value="android">Android</option>
            <option value="both">Both</option>
          </select>
          
          {isGenerated && (
            <>
              <button
                onClick={() => setShowPreviewModal(true)}
                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 flex items-center gap-1.5"
              >
                <Link className="w-4 h-4" />
                Preview Link
              </button>
              <button
                onClick={() => setShowScreenshotModal(true)}
                className="px-3 py-1.5 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 flex items-center gap-1.5"
              >
                <Camera className="w-4 h-4" />
                Screenshots
              </button>
            </>
          )}
          
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

      {/* Main Content */}
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

      {/* Preview Link Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Link className="w-5 h-5 text-indigo-500" />
                <h3 className="font-semibold">Live Preview</h3>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                Share your app instantly with a link — no build required. Works on iOS, Android, and desktop.
              </p>
              
              {previewData?.url ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border">
                    <input
                      type="text"
                      value={previewData.url}
                      readOnly
                      className="flex-1 text-sm bg-transparent outline-none"
                    />
                    <button
                      onClick={copyUrl}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1"
                    >
                      {copiedUrl ? (
                        <>
                          <Check className="w-4 h-4 text-green-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </button>
                    <a
                      href={previewData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-sm bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </a>
                  </div>
                  
                  {previewData.qrUrl && (
                    <div className="flex justify-center">
                      <img src={previewData.qrUrl} alt="QR" className="w-40 h-40 rounded-lg" />
                    </div>
                  )}
                  
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Preview expires in {previewData.expiresIn}
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={publishPreview}
                  disabled={isPublishing}
                  className="w-full px-4 py-3 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPublishing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Link className="w-4 h-4" />
                      Generate Preview Link
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Modal */}
      {showScreenshotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-gray-700" />
                <h3 className="font-semibold">Screenshots</h3>
              </div>
              <button onClick={() => setShowScreenshotModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 overflow-auto">
              <p className="text-sm text-gray-600 mb-4">
                Capture app screenshots for App Store listings. Select device and screens.
              </p>
              
              {/* Device Selection */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Device</label>
                <div className="flex gap-2 flex-wrap">
                  {DEVICE_OPTIONS.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => setSelectedDevice(device.id)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        selectedDevice === device.id
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {device.name}
                      <span className="text-xs text-gray-400 ml-1">
                        {device.width}×{device.height}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Screen Selection */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Screens</label>
                <div className="flex gap-2 flex-wrap">
                  {SCREEN_OPTIONS.map((screen) => (
                    <button
                      key={screen.id}
                      onClick={() => toggleScreen(screen.id)}
                      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                        selectedScreens.includes(screen.id)
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {selectedScreens.includes(screen.id) && (
                        <Check className="w-3 h-3 inline mr-1" />
                      )}
                      {screen.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={captureScreenshots}
                disabled={isCapturing || selectedScreens.length === 0}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2 mb-4"
              >
                {isCapturing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Capturing...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Capture Screenshots
                  </>
                )}
              </button>

              {/* Results */}
              {screenshots.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {screenshots.map((screenshot, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg border overflow-hidden">
                      <div className="p-2 border-b flex items-center justify-between">
                        <span className="text-sm font-medium">{screenshot.screen}</span>
                        <span className="text-xs text-gray-400">{screenshot.width}×{screenshot.height}</span>
                      </div>
                      <div className="p-3 flex justify-center">
                        {screenshot.base64 ? (
                          <img
                            src={`data:image/png;base64,${screenshot.base64}`}
                            alt={screenshot.screen}
                            className="max-w-full rounded-lg shadow"
                            style={{ maxHeight: 300 }}
                          />
                        ) : (
                          <div className="text-center py-6">
                            <Image className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">{screenshot.note || "Preview unavailable"}</p>
                          </div>
                        )}
                      </div>
                      {screenshot.base64 && (
                        <div className="p-2 border-t">
                          <a
                            href={`data:image/png;base64,${screenshot.base64}`}
                            download={`${screenshot.screen}-${screenshot.device}.png`}
                            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Download PNG
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      {status && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
          {status}
        </div>
      )}
    </div>
  );
}
