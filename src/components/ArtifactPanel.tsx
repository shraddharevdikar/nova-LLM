import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Play,
  Maximize2,
  Minimize2,
  Code2,
  BarChart3,
  FileCode,
  Terminal,
} from 'lucide-react';
import { Artifact } from '../types/index.ts';
import { executeSandboxedCode } from '../utils/tools.ts';

interface ArtifactPanelProps {
  artifact: Artifact | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  artifact,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'source' | 'preview'>('preview');
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  if (!isOpen || !artifact) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunCode = () => {
    const res = executeSandboxedCode(artifact.language || 'javascript', artifact.content);
    setConsoleOutput(res.stdout);
    setExecutionTime(res.executionTimeMs);
    setActiveTab('preview');
  };

  // Render chart if artifact type is chart
  const renderChart = () => {
    try {
      const data = typeof artifact.content === 'string' ? JSON.parse(artifact.content) : artifact.content;
      if (!Array.isArray(data)) return <div className="text-slate-400 p-4">Invalid chart dataset</div>;

      const maxValue = Math.max(...data.map((d: any) => Number(d.value) || 0), 1);

      return (
        <div className="p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">{artifact.title}</h3>
            <p className="text-xs text-slate-400">Dynamic SVG Visualizer ({artifact.chartType || 'Bar'} Chart)</p>
          </div>

          <div className="space-y-3">
            {data.map((item: any, idx: number) => {
              const val = Number(item.value) || 0;
              const pct = Math.round((val / maxValue) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-300">{item.label}</span>
                    <span className="font-mono text-indigo-400 font-semibold">{val.toLocaleString()}</span>
                  </div>
                  <div className="h-6 w-full bg-slate-800 rounded-lg overflow-hidden flex items-center p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-md transition-all duration-500 flex items-center justify-end pr-2 text-[10px] text-white font-bold"
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    >
                      {pct}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    } catch {
      return (
        <div className="p-4 text-xs font-mono text-slate-300 whitespace-pre-wrap">
          {artifact.content}
        </div>
      );
    }
  };

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-40 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl transition-all duration-200 ${
        isFullscreen ? 'inset-0 w-full' : 'w-full lg:w-[480px] xl:w-[560px]'
      }`}
    >
      {/* Canvas Top Bar */}
      <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
            {artifact.type === 'chart' ? (
              <BarChart3 className="w-4 h-4" />
            ) : (
              <Code2 className="w-4 h-4" />
            )}
          </div>
          <div className="truncate">
            <h2 className="text-xs font-bold text-white truncate">{artifact.title}</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Canvas Artifact • {artifact.type}
            </p>
          </div>
        </div>

        {/* Tab switcher & Actions */}
        <div className="flex items-center gap-1.5">
          {artifact.type === 'code' && (
            <button
              onClick={handleRunCode}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Run Code in Sandbox"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Run</span>
            </button>
          )}

          <div className="flex bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab('source')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                activeTab === 'source' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Source
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            title="Copy content"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            title="Close Canvas"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Body */}
      <div className="flex-1 overflow-y-auto bg-slate-950 p-4 font-mono text-xs text-slate-200">
        {activeTab === 'source' ? (
          <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto text-indigo-300 leading-relaxed">
            <code>{artifact.content}</code>
          </pre>
        ) : artifact.type === 'chart' ? (
          renderChart()
        ) : (
          <div className="space-y-4">
            <div className="border border-slate-800 rounded-xl bg-slate-900 p-4 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold border-b border-slate-800 pb-2">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  Isolated Sandbox Console Output
                </span>
                {executionTime !== null && (
                  <span className="text-emerald-400">{executionTime}ms</span>
                )}
              </div>
              <div className="font-mono text-xs space-y-1 text-slate-300 min-h-[120px] bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                {consoleOutput.length > 0 ? (
                  consoleOutput.map((line, idx) => (
                    <div key={idx} className="whitespace-pre-wrap">
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic">
                    Press "Run" to execute this code inside the secure browser sandbox.
                  </div>
                )}
              </div>
            </div>

            <pre className="p-4 bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto text-indigo-300 leading-relaxed">
              <code>{artifact.content}</code>
            </pre>
          </div>
        )}
      </div>
    </aside>
  );
};
