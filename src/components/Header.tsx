import React, { useState } from 'react';
import {
  Menu,
  Sparkles,
  Zap,
  Brain,
  Globe,
  Code2,
  Bot,
  Layers,
  Download,
  Share2,
  ChevronDown,
  Check,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';
import { AssistantMode, User } from '../types/index.ts';

interface HeaderProps {
  onToggleSidebar: () => void;
  title: string;
  onUpdateTitle: (newTitle: string) => void;
  currentMode: AssistantMode;
  onSelectMode: (mode: AssistantMode) => void;
  currentUser: User | null;
  hasArtifact: boolean;
  isArtifactOpen: boolean;
  onToggleArtifact: () => void;
  onExportMarkdown: () => void;
  onOpenBilling: () => void;
}

const MODES: Array<{
  id: AssistantMode;
  name: string;
  icon: any;
  color: string;
  description: string;
}> = [
  {
    id: 'auto',
    name: 'Auto Intent',
    icon: Sparkles,
    color: 'text-indigo-400',
    description: 'Auto-detects reasoning, coding, search, or fast speed',
  },
  {
    id: 'fast',
    name: 'Fast Mode',
    icon: Zap,
    color: 'text-amber-400',
    description: 'Ultra-low latency for everyday Q&A and summaries',
  },
  {
    id: 'thinking',
    name: 'Deep Thinking',
    icon: Brain,
    color: 'text-purple-400',
    description: 'High-effort multi-step logic, proofs, and critical checking',
  },
  {
    id: 'research',
    name: 'Deep Research',
    icon: Globe,
    color: 'text-cyan-400',
    description: 'Live Google Search grounding with cited web sources',
  },
  {
    id: 'coding',
    name: 'Coding & Sandbox',
    icon: Code2,
    color: 'text-emerald-400',
    description: 'Software engineering, architecture, and live execution',
  },
  {
    id: 'agent',
    name: 'Agent Mode',
    icon: Bot,
    color: 'text-rose-400',
    description: 'Multi-tool chain: calculation, web search, chart generation',
  },
];

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  title,
  onUpdateTitle,
  currentMode,
  onSelectMode,
  currentUser,
  hasArtifact,
  isArtifactOpen,
  onToggleArtifact,
  onExportMarkdown,
  onOpenBilling,
}) => {
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);

  const activeModeInfo = MODES.find((m) => m.id === currentMode) || MODES[0];
  const Icon = activeModeInfo.icon;

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      onUpdateTitle(editedTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Toggle Sidebar"
          aria-label="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="min-w-0 flex items-center gap-2">
          {isEditing ? (
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              autoFocus
              className="bg-slate-950 border border-indigo-500 rounded px-2 py-0.5 text-sm text-white font-medium focus:outline-hidden"
            />
          ) : (
            <h1
              onClick={() => {
                setEditedTitle(title);
                setIsEditing(true);
              }}
              className="text-sm font-semibold text-slate-200 truncate cursor-pointer hover:text-white hover:underline decoration-slate-600 underline-offset-4 max-w-[200px] sm:max-w-xs md:max-w-md"
              title="Click to rename"
            >
              {title || 'NovaMind AI'}
            </h1>
          )}
        </div>

        {/* Model Mode Selector Pill */}
        <div className="relative">
          <button
            onClick={() => setIsModeOpen(!isModeOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-750 border border-slate-700/80 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            <Icon className={`w-3.5 h-3.5 ${activeModeInfo.color}`} />
            <span className="hidden sm:inline">{activeModeInfo.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {isModeOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsModeOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute top-10 left-0 w-72 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl p-1.5 z-50 space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select AI Reasoning Engine
                </div>
                {MODES.map((mode) => {
                  const ModeIcon = mode.icon;
                  const isSelected = mode.id === currentMode;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => {
                        onSelectMode(mode.id);
                        setIsModeOpen(false);
                      }}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                          : 'hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <ModeIcon className={`w-4 h-4 mt-0.5 shrink-0 ${mode.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>{mode.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                        <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                          {mode.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {hasArtifact && (
          <button
            onClick={onToggleArtifact}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              isArtifactOpen
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750'
            }`}
            title="Toggle Live Artifact Canvas"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Artifact Canvas</span>
            {isArtifactOpen ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        <button
          onClick={onExportMarkdown}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Export Conversation as Markdown"
          aria-label="Export Conversation"
        >
          <Download className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenBilling}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-semibold tracking-wide transition-colors cursor-pointer"
        >
          <span className="uppercase text-[10px] font-bold">
            {currentUser?.plan || 'Free'}
          </span>
          <span className="text-[10px] text-indigo-400/80">Plan</span>
        </button>
      </div>
    </header>
  );
};
