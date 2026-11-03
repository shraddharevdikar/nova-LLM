import React, { useState } from 'react';
import { Brain, X, Plus, Trash2, Save, Sparkles, Check } from 'lucide-react';
import { Memory, User } from '../types/index.ts';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: Memory[];
  onAddMemory: (content: string, category: string) => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
  user: User | null;
  onUpdateInstructions: (instructions: { aboutUser: string; assistantGuidelines: string }) => Promise<void>;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({
  isOpen,
  onClose,
  memories,
  onAddMemory,
  onDeleteMemory,
  user,
  onUpdateInstructions,
}) => {
  const [activeTab, setActiveTab] = useState<'memories' | 'instructions'>('memories');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'preference' | 'personal' | 'work' | 'technical'>('preference');
  const [aboutUser, setAboutUser] = useState(user?.customInstructions?.aboutUser || '');
  const [guidelines, setGuidelines] = useState(user?.customInstructions?.assistantGuidelines || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    await onAddMemory(newContent.trim(), newCategory);
    setNewContent('');
  };

  const handleSaveInstructions = async () => {
    await onUpdateInstructions({
      aboutUser,
      assistantGuidelines: guidelines,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Memory & Personalization</h2>
              <p className="text-xs text-slate-400">Manage persistent context and custom system instructions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 px-6 pt-2 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('memories')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'memories'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Saved Memories ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab('instructions')}
            className={`pb-2.5 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'instructions'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Instructions
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'memories' ? (
            <div className="space-y-4">
              {/* Add Memory Form */}
              <form onSubmit={handleCreateMemory} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="text-xs font-medium text-slate-300">Add New Fact or Preference</div>
                <input
                  type="text"
                  placeholder="e.g. Always write code using strict TypeScript and Tailwind CSS..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Category:</span>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                    >
                      <option value="preference">Preference</option>
                      <option value="technical">Technical</option>
                      <option value="work">Work</option>
                      <option value="personal">Personal</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Save Memory
                  </button>
                </div>
              </form>

              {/* Memory List */}
              <div className="space-y-2">
                {memories.map((mem) => (
                  <div
                    key={mem.id}
                    className="flex items-start justify-between p-3 bg-slate-800/40 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-1 pr-3">
                      <div className="text-xs text-slate-200">{mem.content}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="uppercase font-semibold text-indigo-400/80">
                          {mem.category}
                        </span>
                        <span>•</span>
                        <span>{new Date(mem.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteMemory(mem.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Delete memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {memories.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No memories saved yet. NovaMind automatically learns key context as you chat, or you can add them manually above.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  What would you like NovaMind to know about you to provide better responses?
                </label>
                <textarea
                  rows={4}
                  value={aboutUser}
                  onChange={(e) => setAboutUser(e.target.value)}
                  placeholder="e.g. I am a senior engineer leading a distributed team. I focus on microservices and enterprise security..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  How would you like NovaMind to respond?
                </label>
                <textarea
                  rows={4}
                  value={guidelines}
                  onChange={(e) => setGuidelines(e.target.value)}
                  placeholder="e.g. Be direct and avoid conversational filler. Prefer full executable code examples over pseudocode..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={handleSaveInstructions}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors cursor-pointer"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      Saved Successfully
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Custom Instructions
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
