import React, { useState } from 'react';
import { marked } from 'marked';
import {
  Sparkles,
  User as UserIcon,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Code2,
  Play,
  Terminal,
  ThumbsUp,
  ThumbsDown,
  GitFork,
  Brain,
  Wrench,
  Globe,
} from 'lucide-react';
import { Message, Artifact } from '../types/index.ts';

interface ChatMessageProps {
  message: Message;
  userAvatar?: string;
  onRegenerate?: () => void;
  onFork?: () => void;
  onOpenArtifact?: (artifact: Artifact) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = React.memo(({
  message,
  userAvatar,
  onRegenerate,
  onFork,
  onOpenArtifact,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    // Strip markdown formatting for cleaner speech
    const cleanText = message.content.replace(/```[\s\S]*?```/g, 'Code block omitted.').replace(/[#*_`]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  // Render markdown to HTML safely
  const renderedHtml = React.useMemo(() => {
    if (isUser) return null;
    try {
      return marked.parse(message.content, { gfm: true, breaks: true });
    } catch {
      return message.content;
    }
  }, [message.content, isUser]);

  return (
    <div
      className={`group w-full py-4 px-4 sm:px-6 transition-colors ${
        isUser ? 'bg-transparent' : 'bg-slate-900/40 border-y border-slate-800/40'
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-3.5 sm:gap-4 items-start">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
              {userAvatar ? (
                <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-4 h-4 text-slate-300" />
              )}
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 p-0.5 shadow-md shadow-indigo-600/20">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Header Role and Metadata */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                {isUser ? 'You' : 'NovaMind AI'}
              </span>
              {!isUser && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                  {message.model}
                </span>
              )}
              {message.mode && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider font-semibold">
                  {message.mode}
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-500">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          {/* Attachments preview if user message */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200"
                >
                  {att.mimeType.startsWith('image/') && att.dataBase64 ? (
                    <img src={att.dataBase64} alt={att.name} className="w-6 h-6 object-cover rounded border border-slate-700" />
                  ) : att.mimeType === 'application/pdf' ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      PDF
                    </span>
                  ) : (
                    <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                  <span className="text-[10px] text-slate-400">
                    ({Math.round(att.size / 1024)} KB)
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Thinking Accordion (Advanced Reasoning) */}
          {message.thinkingContent && (
            <div className="border border-purple-500/20 bg-purple-950/10 rounded-lg overflow-hidden text-xs">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="w-full flex items-center justify-between px-3 py-2 text-purple-300 hover:text-purple-200 hover:bg-purple-900/20 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                  Reasoning Process
                  {message.thinkingDurationSec && (
                    <span className="text-[11px] text-purple-400/70 font-mono">
                      (thought for {message.thinkingDurationSec}s)
                    </span>
                  )}
                </span>
                {showThinking ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {showThinking && (
                <div className="p-3 border-t border-purple-500/20 text-slate-300 font-mono text-[11px] whitespace-pre-wrap bg-slate-950/40 leading-relaxed">
                  {message.thinkingContent}
                </div>
              )}
            </div>
          )}

          {/* Tool Executions Badges */}
          {message.toolExecutions && message.toolExecutions.length > 0 && (
            <div className="space-y-1.5">
              {message.toolExecutions.map((tool, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-lg text-xs"
                >
                  <Wrench className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">
                        Tool: {tool.toolName}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          tool.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {tool.success ? 'Success' : 'Error'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                      {tool.output}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Citations from Google Search Grounding */}
          {message.citations && message.citations.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <Globe className="w-3 h-3 text-cyan-400" />
                Verified Research Sources ({message.citations.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {message.citations.map((cite, idx) => (
                  <a
                    key={idx}
                    href={cite.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-md text-xs text-slate-300 hover:text-white transition-colors group/cite"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    <span className="truncate max-w-[180px] font-medium">{cite.title}</span>
                    <ExternalLink className="w-3 h-3 opacity-60 group-hover/cite:opacity-100 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Main Message Text / Markdown */}
          {isUser ? (
            <div className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed font-normal">
              {message.content}
            </div>
          ) : (
            <div
              className="prose prose-invert prose-slate max-w-none text-sm leading-relaxed text-slate-100
                [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mb-1
                [&>h1]:text-lg [&>h1]:font-bold [&>h1]:mt-4 [&>h1]:mb-2
                [&>h2]:text-base [&>h2]:font-bold [&>h2]:mt-3 [&>h2]:mb-2
                [&>h3]:text-sm [&>h3]:font-bold [&>h3]:mt-3 [&>h3]:mb-1
                [&>table]:w-full [&>table]:border-collapse [&>table]:my-3 [&>table]:text-xs
                [&>table_th]:border [&>table_th]:border-slate-700 [&>table_th]:bg-slate-800/80 [&>table_th]:p-2 [&>table_th]:text-left
                [&>table_td]:border [&>table_td]:border-slate-700/80 [&>table_td]:p-2
                [&>pre]:bg-slate-950 [&>pre]:border [&>pre]:border-slate-800 [&>pre]:rounded-xl [&>pre]:p-3 [&>pre]:my-3 [&>pre]:overflow-x-auto
                [&>code]:font-mono [&>code]:text-indigo-300 [&>code]:bg-slate-800/60 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded-md [&>code]:text-xs"
              dangerouslySetInnerHTML={{ __html: renderedHtml as string }}
            />
          )}

          {/* Artifact Preview Card if present */}
          {message.artifact && (
            <div className="mt-2.5 p-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-600/30 text-indigo-400">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">
                    {message.artifact.title}
                  </div>
                  <div className="text-[11px] text-indigo-300/80 uppercase tracking-wider">
                    Interactive {message.artifact.type} Artifact
                  </div>
                </div>
              </div>
              {onOpenArtifact && (
                <button
                  onClick={() => onOpenArtifact(message.artifact!)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  View in Canvas
                </button>
              )}
            </div>
          )}

          {/* Message Bottom Action Bar (Assistant only) */}
          {!isUser && (
            <div className="flex items-center gap-1 pt-1 opacity-70 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                title="Copy response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={handleSpeak}
                className={`p-1.5 rounded-md transition-colors ${
                  isSpeaking ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={isSpeaking ? 'Stop speech' : 'Read aloud'}
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                  title="Regenerate response"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {onFork && (
                <button
                  onClick={onFork}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                  title="Fork branch from this point"
                >
                  <GitFork className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => setLiked(liked === true ? null : true)}
                className={`p-1.5 rounded-md transition-colors ${
                  liked === true ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Helpful"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setLiked(liked === false ? null : false)}
                className={`p-1.5 rounded-md transition-colors ${
                  liked === false ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Not helpful"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>

              {message.tokenUsage && (
                <span className="ml-auto text-[10px] text-slate-500 font-mono">
                  {message.tokenUsage.totalTokens} tokens
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
ChatMessage.displayName = 'ChatMessage';
