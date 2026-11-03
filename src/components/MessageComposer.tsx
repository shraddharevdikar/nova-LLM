import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  Paperclip,
  Mic,
  MicOff,
  Globe,
  Brain,
  X,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Zap,
  Files,
} from 'lucide-react';
import { AssistantMode, Attachment } from '../types/index.ts';
import { PRESET_SAMPLE_FILES } from '../utils/sampleData.ts';

interface MessageComposerProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  currentMode: AssistantMode;
  onSelectMode: (mode: AssistantMode) => void;
  dailyUsage?: { used: number; limit: number; planName: string };
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  currentMode,
  onSelectMode,
  dailyUsage,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  // Web Speech API Voice recognition
  const toggleVoice = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setText((prev) => (prev ? prev + ' ' + transcript : transcript));
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isStreaming) return;
    onSendMessage(text.trim(), attachments);
    setText('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const [showSampleMenu, setShowSampleMenu] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');

      if (isPdf || isImage || isAudio) {
        reader.onload = () => {
          const base64 = reader.result as string;
          setAttachments((prev) => [
            ...prev,
            {
              id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              mimeType: isPdf ? 'application/pdf' : file.type,
              size: file.size,
              dataBase64: base64,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        // Read text/document
        reader.onload = () => {
          const content = reader.result as string;
          setAttachments((prev) => [
            ...prev,
            {
              id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              mimeType: file.type || 'text/plain',
              size: file.size,
              extractedText: content,
            },
          ]);
        };
        reader.readAsText(file);
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSelectSample = (sample: (typeof PRESET_SAMPLE_FILES)[0]) => {
    setAttachments((prev) => [...prev, sample.attachment]);
    setText(sample.suggestedPrompt);
    onSelectMode(sample.suggestedMode);
    setShowSampleMenu(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 pb-4">
      {/* Attachments Preview Chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-900/90 border border-slate-800 rounded-xl">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200"
            >
              {att.mimeType.startsWith('image/') ? (
                <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="truncate max-w-[140px]">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="p-0.5 hover:text-rose-400 text-slate-400 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <div className="relative bg-slate-900 border border-slate-800 hover:border-slate-700 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-2xl shadow-xl transition-all duration-150">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask NovaMind anything, attach data, or trigger research..."
          rows={1}
          className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm p-3.5 pb-12 focus:outline-hidden resize-none max-h-52 leading-relaxed"
        />

        {/* Bottom Toolbar inside input */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-auto">
          {/* Left Buttons: Attachments, Web Search, Thinking Toggle */}
          <div className="flex items-center gap-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Attach document, code, CSV, PDF, or image"
              aria-label="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Quick Sample Files Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSampleMenu(!showSampleMenu)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  showSampleMenu ? 'bg-indigo-600/30 text-indigo-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Attach Preset Test File (PDF, CSV, Research, Image)"
                aria-label="Sample test files"
              >
                <Files className="w-4 h-4 text-indigo-400" />
              </button>

              {showSampleMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowSampleMenu(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute bottom-10 left-0 w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-40 space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Attach Test Sample Document / Image
                    </div>
                    {PRESET_SAMPLE_FILES.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSample(sample)}
                        className="w-full flex items-start gap-2.5 p-2 rounded-xl text-left hover:bg-slate-800 transition-colors cursor-pointer group"
                      >
                        <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-indigo-600/20 text-indigo-400 shrink-0">
                          {sample.attachment.mimeType === 'application/pdf' ? (
                            <FileText className="w-4 h-4 text-rose-400" />
                          ) : sample.attachment.mimeType.startsWith('image/') ? (
                            <ImageIcon className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <FileText className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-white truncate">
                            {sample.name}
                          </div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">
                            {sample.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Quick Web Search Grounding toggle */}
            <button
              onClick={() => onSelectMode(currentMode === 'research' ? 'auto' : 'research')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                currentMode === 'research'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Toggle Live Web Search Grounding"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Search</span>
            </button>

            {/* Quick Deep Reasoning toggle */}
            <button
              onClick={() => onSelectMode(currentMode === 'thinking' ? 'auto' : 'thinking')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                currentMode === 'thinking'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Toggle Deep Reasoning Engine"
            >
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Reasoning</span>
            </button>
          </div>

          {/* Right Buttons: Voice Input, Send / Stop */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleVoice}
              className={`p-1.5 rounded-lg transition-all ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={isRecording ? 'Stop Recording' : 'Voice Input (Speech-to-Text)'}
              aria-label={isRecording ? 'Stop Recording' : 'Voice Input'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {isStreaming ? (
              <button
                onClick={onStopStreaming}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-white text-slate-900 flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-md"
                title="Stop generation"
                aria-label="Stop generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!text.trim() && attachments.length === 0}
                className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white flex items-center justify-center transition-all disabled:cursor-not-allowed cursor-pointer shadow-md shadow-indigo-600/30"
                title="Send message"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Quota & Mode Info Notice */}
      <div className="flex items-center justify-between px-2 pt-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <span>Active Mode: <strong className="text-slate-400 capitalize">{currentMode}</strong></span>
          <span>•</span>
          <span>Shift+Enter for newline</span>
        </div>
        {dailyUsage && (
          <div className="font-mono">
            {dailyUsage.planName}: {dailyUsage.used} / {dailyUsage.limit} msgs
          </div>
        )}
      </div>
    </div>
  );
};
