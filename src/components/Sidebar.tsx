import React, { useState } from 'react';
import {
  MessageSquarePlus,
  Search,
  Pin,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Zap,
  Brain,
  Globe,
  Code2,
  Bot,
  ShieldCheck,
  CreditCard,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Archive,
  GitFork,
  Settings,
  PanelLeftClose,
} from 'lucide-react';
import { Conversation, User, AssistantMode } from '../types/index.ts';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: (mode?: AssistantMode) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onTogglePin: (id: string, currentPinned: boolean) => void;
  onForkConversation: (id: string) => void;
  currentUser: User | null;
  onOpenMemories: () => void;
  onOpenBilling: () => void;
  onOpenAdmin: () => void;
  onOpenAuth: () => void;
  onSwitchUser: (userId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onTogglePin,
  onForkConversation,
  currentUser,
  onOpenMemories,
  onOpenBilling,
  onOpenAdmin,
  onOpenAuth,
  onSwitchUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Filter conversations
  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedConvs = filtered.filter((c) => c.pinned);
  const unpinnedConvs = filtered.filter((c) => !c.pinned);

  // Group by date
  const now = new Date().getTime();
  const todayConvs = unpinnedConvs.filter((c) => now - new Date(c.updatedAt).getTime() < 86400000);
  const recentConvs = unpinnedConvs.filter(
    (c) =>
      now - new Date(c.updatedAt).getTime() >= 86400000 &&
      now - new Date(c.updatedAt).getTime() < 86400000 * 7
  );
  const olderConvs = unpinnedConvs.filter(
    (c) => now - new Date(c.updatedAt).getTime() >= 86400000 * 7
  );

  const handleStartRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (id: string, e: React.FormEvent | React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col w-72 bg-slate-900 border-r border-slate-800 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:border-none lg:overflow-hidden'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-violet-600 to-cyan-400 shadow-md shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
              <div className="absolute -inset-0.5 rounded-lg bg-indigo-500/20 blur-xs -z-10" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white font-['Plus_Jakarta_Sans']">
                  NovaMind
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Autonomous Intelligence</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
            title="Collapse Sidebar"
            aria-label="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="p-3 space-y-2">
          <button
            onClick={() => onNewConversation('auto')}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg shadow-sm shadow-indigo-600/30 text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <MessageSquarePlus className="w-4 h-4" />
              New Conversation
            </span>
            <span className="px-1.5 py-0.5 text-[9px] bg-white/20 rounded font-mono">⌘N</span>
          </button>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/60 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden transition-colors"
            />
          </div>
        </div>

        {/* Chat List Scrollable */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-800">
          {/* Pinned Section */}
          {pinnedConvs.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 px-2 mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <Pin className="w-3 h-3 text-amber-400" />
                Pinned
              </div>
              <div className="space-y-0.5">
                {pinnedConvs.map((c) => renderConversationItem(c))}
              </div>
            </div>
          )}

          {/* Today Section */}
          {todayConvs.length > 0 && (
            <div>
              <div className="px-2 mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Today
              </div>
              <div className="space-y-0.5">
                {todayConvs.map((c) => renderConversationItem(c))}
              </div>
            </div>
          )}

          {/* Previous 7 Days */}
          {recentConvs.length > 0 && (
            <div>
              <div className="px-2 mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Previous 7 Days
              </div>
              <div className="space-y-0.5">
                {recentConvs.map((c) => renderConversationItem(c))}
              </div>
            </div>
          )}

          {/* Older */}
          {olderConvs.length > 0 && (
            <div>
              <div className="px-2 mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Older
              </div>
              <div className="space-y-0.5">
                {olderConvs.map((c) => renderConversationItem(c))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-500 text-xs">
              {searchQuery ? 'No conversations matching query' : 'No conversations yet'}
            </div>
          )}
        </div>

        {/* Footer User Profile & Settings */}
        <div className="p-3 border-t border-slate-800 relative bg-slate-900/90">
          {showUserMenu && (
            <div className="absolute bottom-16 left-3 right-3 bg-slate-950 border border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 p-1.5 space-y-1 text-xs">
              <div className="px-2.5 py-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                Demo Quick-Switch
              </div>
              <button
                onClick={() => {
                  onSwitchUser('usr_pro_alex');
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-900 rounded-md text-left text-slate-300 hover:text-white"
              >
                <span>Alex Vance</span>
                <span className="px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 rounded font-semibold">
                  PRO
                </span>
              </button>
              <button
                onClick={() => {
                  onSwitchUser('usr_admin_elena');
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-900 rounded-md text-left text-slate-300 hover:text-white"
              >
                <span>Elena Rostova</span>
                <span className="px-1.5 py-0.5 text-[10px] bg-rose-500/20 text-rose-300 rounded font-semibold">
                  ADMIN
                </span>
              </button>
              <button
                onClick={() => {
                  onSwitchUser('usr_plus_sarah');
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-900 rounded-md text-left text-slate-300 hover:text-white"
              >
                <span>Sarah Chen</span>
                <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-300 rounded font-semibold">
                  PLUS
                </span>
              </button>
              <button
                onClick={() => {
                  onSwitchUser('usr_free_guest');
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-slate-900 rounded-md text-left text-slate-300 hover:text-white"
              >
                <span>Guest Explorer</span>
                <span className="px-1.5 py-0.5 text-[10px] bg-slate-700 text-slate-300 rounded font-semibold">
                  FREE
                </span>
              </button>

              <div className="my-1 border-t border-slate-800/80" />

              <button
                onClick={() => {
                  onOpenMemories();
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-900 rounded-md text-left text-slate-300 hover:text-white"
              >
                <Brain className="w-3.5 h-3.5 text-indigo-400" />
                Persistent Memories
              </button>
              <button
                onClick={() => {
                  onOpenBilling();
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-900 rounded-md text-left text-slate-300 hover:text-white"
              >
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                Upgrade & Billing
              </button>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => {
                    onOpenAdmin();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-900 rounded-md text-left text-slate-300 hover:text-white"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                  Admin Dashboard
                </button>
              )}
              <button
                onClick={() => {
                  onOpenAuth();
                  setShowUserMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-900 rounded-md text-left text-slate-400 hover:text-white"
              >
                <UserIcon className="w-3.5 h-3.5" />
                Account Settings / Login
              </button>
            </div>
          )}

          <div
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/80 cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-3.5 h-3.5 text-indigo-300" />
                )}
              </div>
              <div className="truncate text-left">
                <div className="text-xs font-medium text-slate-200 truncate">
                  {currentUser?.name || 'User'}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    {currentUser?.plan || 'free'}
                  </span>
                  {currentUser?.role === 'admin' && (
                    <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1 rounded font-bold">
                      Admin
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </div>
        </div>
      </aside>
    </>
  );

  function renderConversationItem(c: Conversation) {
    const isActive = activeId === c.id;
    const isEditing = editingId === c.id;

    return (
      <div
        key={c.id}
        onClick={() => onSelectConversation(c.id)}
        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 ${
          isActive
            ? 'bg-slate-800 text-white font-medium shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <div className="flex items-center gap-2 truncate flex-1 min-w-0 pr-2">
          {c.mode === 'thinking' ? (
            <Brain className="w-3.5 h-3.5 shrink-0 text-amber-400" />
          ) : c.mode === 'research' ? (
            <Globe className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
          ) : c.mode === 'coding' ? (
            <Code2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
          ) : c.mode === 'agent' ? (
            <Bot className="w-3.5 h-3.5 shrink-0 text-purple-400" />
          ) : (
            <Zap className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
          )}

          {isEditing ? (
            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename(c.id, e);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                autoFocus
                className="w-full bg-slate-950 border border-indigo-500/50 rounded px-1.5 py-0.5 text-xs text-white focus:outline-hidden"
              />
              <button
                onClick={(e) => handleSaveRename(c.id, e)}
                className="p-1 hover:text-emerald-400"
              >
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditingId(null)} className="p-1 hover:text-rose-400">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className="truncate text-xs">{c.title}</span>
          )}
        </div>

        {/* Hover action buttons */}
        {!isEditing && (
          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(c.id, c.pinned);
              }}
              className={`p-1 rounded hover:bg-slate-700/60 ${c.pinned ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
              title={c.pinned ? 'Unpin' : 'Pin to top'}
            >
              <Pin className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onForkConversation(c.id);
              }}
              className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-white"
              title="Fork Conversation branch"
            >
              <GitFork className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => handleStartRename(c, e)}
              className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-white"
              title="Rename"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(c.id);
              }}
              className="p-1 rounded hover:bg-slate-700/60 text-slate-400 hover:text-rose-400"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }
};
