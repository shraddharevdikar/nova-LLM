import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { ChatMessage } from './components/ChatMessage.tsx';
import { MessageComposer } from './components/MessageComposer.tsx';
import { ArtifactPanel } from './components/ArtifactPanel.tsx';
import { MemoryModal } from './components/MemoryModal.tsx';
import { BillingModal } from './components/BillingModal.tsx';
import { AdminModal } from './components/AdminModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { LandingHero } from './components/LandingHero.tsx';
import {
  User,
  Conversation,
  Message,
  Memory,
  BillingOverview,
  AssistantMode,
  Attachment,
  Artifact,
} from './types/index.ts';
import {
  getMe,
  getConversations,
  getConversation,
  createConversation,
  updateConversation,
  deleteConversation,
  forkConversation,
  getMemories,
  addMemory,
  deleteMemory,
  updateProfile,
  getBillingOverview,
  upgradePlan,
  streamChatMessage,
  switchDemoUser,
} from './services/api.ts';

export default function App() {
  // Application State
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMode, setCurrentMode] = useState<AssistantMode>('auto');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStatus, setStreamingStatus] = useState<string | null>(null);

  // Modals & Canvas
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isBillingOpen, setIsBillingOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Data cache
  const [memories, setMemories] = useState<Memory[]>([]);
  const [billingOverview, setBillingOverview] = useState<BillingOverview | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll messages
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length]);

  // Initial Data Fetch
  useEffect(() => {
    const initApp = async () => {
      try {
        const meRes = await getMe();
        setUser(meRes.user);

        const convsRes = await getConversations();
        setConversations(convsRes.conversations);

        if (convsRes.conversations.length > 0) {
          const first = convsRes.conversations[0];
          setActiveConversationId(first.id);
          loadConversation(first.id);
        }

        const memRes = await getMemories();
        setMemories(memRes.memories);

        const billRes = await getBillingOverview();
        setBillingOverview(billRes);
      } catch (err) {
        console.error('App init error:', err);
      }
    };
    initApp();
  }, []);

  // Keyboard shortcut Ctrl+N / Cmd+N for New Chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewConversation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadConversation = async (id: string) => {
    setIsLoadingMessages(true);
    setActiveConversationId(id);
    try {
      const res = await getConversation(id);
      setMessages(res.messages);
      if (res.conversation.mode) {
        setCurrentMode(res.conversation.mode);
      }
      // Check for any artifact in message history
      const lastArtifact = [...res.messages].reverse().find((m) => m.artifact)?.artifact;
      if (lastArtifact) {
        setActiveArtifact(lastArtifact);
      }
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleNewConversation = async (mode: AssistantMode = 'auto') => {
    try {
      const res = await createConversation('New Conversation', mode);
      setConversations((prev) => [res.conversation, ...prev]);
      setActiveConversationId(res.conversation.id);
      setMessages([]);
      setCurrentMode(mode);
      setActiveArtifact(null);
      setIsArtifactOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      const res = await updateConversation(id, { title: newTitle });
      setConversations((prev) => prev.map((c) => (c.id === id ? res.conversation : c)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeConversationId === id) {
        if (remaining.length > 0) {
          loadConversation(remaining[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      const res = await updateConversation(id, { pinned: !currentPinned });
      setConversations((prev) => prev.map((c) => (c.id === id ? res.conversation : c)));
    } catch (err) {
      console.error(err);
    }
  };

  const handleForkConversation = async (id: string) => {
    try {
      const res = await forkConversation(id);
      setConversations((prev) => [res.conversation, ...prev]);
      loadConversation(res.conversation.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (prompt: string, attachments: Attachment[] = []) => {
    if (isStreaming) return;

    // Temporary optimistic user message
    const tempUserMsg: Message = {
      id: `msg_temp_u_${Date.now()}`,
      conversationId: activeConversationId || '',
      role: 'user',
      content: prompt,
      attachments,
      model: 'gemini-3.8-flash',
      mode: currentMode,
      createdAt: new Date().toISOString(),
    };

    // Temporary assistant placeholder
    const tempAssistantMsg: Message = {
      id: `msg_temp_a_${Date.now()}`,
      conversationId: activeConversationId || '',
      role: 'assistant',
      content: '',
      model: 'gemini-3.8-flash',
      mode: currentMode,
      citations: [],
      toolExecutions: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg, tempAssistantMsg]);
    setIsStreaming(true);
    setStreamingStatus('Thinking...');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let streamedContent = '';
    const citations: any[] = [];
    const toolExecs: any[] = [];

    try {
      await streamChatMessage(
        {
          conversationId: activeConversationId || undefined,
          prompt,
          mode: currentMode,
          attachments,
        },
        {
          onInit: (data) => {
            if (!activeConversationId) {
              setActiveConversationId(data.conversationId);
              getConversations().then((res) => setConversations(res.conversations));
            }
          },
          onChunk: (chunk) => {
            streamedContent += chunk;
            setMessages((prev) =>
              prev.map((m, idx) =>
                idx === prev.length - 1 ? { ...m, content: streamedContent } : m
              )
            );
            scrollToBottom(true);
          },
          onStatus: (status) => {
            setStreamingStatus(status);
          },
          onCitation: (citation) => {
            citations.push(citation);
            setMessages((prev) =>
              prev.map((m, idx) =>
                idx === prev.length - 1 ? { ...m, citations: [...citations] } : m
              )
            );
          },
          onToolCall: (toolCall) => {
            toolExecs.push(toolCall);
            setMessages((prev) =>
              prev.map((m, idx) =>
                idx === prev.length - 1 ? { ...m, toolExecutions: [...toolExecs] } : m
              )
            );
            if (toolCall.artifact) {
              setActiveArtifact(toolCall.artifact);
              setIsArtifactOpen(true);
            }
          },
          onComplete: (data) => {
            setMessages((prev) =>
              prev.map((m, idx) => (idx === prev.length - 1 ? data.message : m))
            );
            if (data.message.artifact) {
              setActiveArtifact(data.message.artifact);
              setIsArtifactOpen(true);
            }
            // Refresh conversation title if newly generated
            getConversations().then((res) => setConversations(res.conversations));
            getBillingOverview().then((b) => setBillingOverview(b));
          },
          onError: (errMsg) => {
            setMessages((prev) =>
              prev.map((m, idx) =>
                idx === prev.length - 1
                  ? { ...m, content: streamedContent + `\n\n*[Error: ${errMsg}]*` }
                  : m
              )
            );
          },
        },
        abortController.signal
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Streaming request error:', err);
        const errMsg = err?.message || 'Failed to complete request';
        setMessages((prev) =>
          prev.map((m, idx) =>
            idx === prev.length - 1
              ? {
                  ...m,
                  content:
                    m.content ||
                    `> ⚠️ **Request Interrupted**: ${errMsg}\n>\n> *If you are seeing a quota limit (429), please wait a moment or configure a billing-enabled key in **Settings > Secrets**.*`,
                }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      setStreamingStatus(null);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setStreamingStatus(null);
    }
  };

  const handleExportMarkdown = () => {
    const currentConv = conversations.find((c) => c.id === activeConversationId);
    let md = `# ${currentConv?.title || 'NovaMind Conversation'}\n\n`;
    md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

    for (const msg of messages) {
      md += `### ${msg.role === 'user' ? 'User' : 'NovaMind AI'}\n\n`;
      if (msg.thinkingContent) {
        md += `> **Reasoning:**\n> ${msg.thinkingContent.replace(/\n/g, '\n> ')}\n\n`;
      }
      md += `${msg.content}\n\n`;
      if (msg.citations && msg.citations.length > 0) {
        md += `**Sources:**\n`;
        msg.citations.forEach((c) => {
          md += `- [${c.title}](${c.uri})\n`;
        });
        md += `\n`;
      }
      md += `---\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(currentConv?.title || 'conversation').toLowerCase().replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Demo user quick switch
  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await switchDemoUser(userId);
      setUser(res.user);
      const convsRes = await getConversations();
      setConversations(convsRes.conversations);
      if (convsRes.conversations.length > 0) {
        loadConversation(convsRes.conversations[0].id);
      } else {
        setActiveConversationId(null);
        setMessages([]);
      }
      const memRes = await getMemories();
      setMemories(memRes.memories);
      const billRes = await getBillingOverview();
      setBillingOverview(billRes);
    } catch (e) {
      console.error(e);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  return (
    <div className="flex h-full w-full bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        conversations={conversations}
        activeId={activeConversationId}
        onSelectConversation={loadConversation}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onTogglePin={handleTogglePin}
        onForkConversation={handleForkConversation}
        currentUser={user}
        onOpenMemories={() => setIsMemoryOpen(true)}
        onOpenBilling={() => setIsBillingOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSwitchUser={handleSwitchUser}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          title={activeConv?.title || 'New Conversation'}
          onUpdateTitle={(newTitle) => {
            if (activeConversationId) {
              handleRenameConversation(activeConversationId, newTitle);
            }
          }}
          currentMode={currentMode}
          onSelectMode={(mode) => setCurrentMode(mode)}
          currentUser={user}
          hasArtifact={Boolean(activeArtifact)}
          isArtifactOpen={isArtifactOpen}
          onToggleArtifact={() => setIsArtifactOpen(!isArtifactOpen)}
          onExportMarkdown={handleExportMarkdown}
          onOpenBilling={() => setIsBillingOpen(true)}
        />

        {/* Streaming Status Pill banner if active */}
        {streamingStatus && (
          <div className="bg-indigo-950/70 border-b border-indigo-500/30 px-4 py-1.5 flex items-center justify-center gap-2 text-xs text-indigo-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
            <span>{streamingStatus}</span>
          </div>
        )}

        {/* Message Thread Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
          {messages.length === 0 ? (
            <LandingHero
              onSelectPrompt={(prompt, mode) => {
                setCurrentMode(mode);
                handleSendMessage(prompt);
              }}
            />
          ) : (
            <div className="flex-1 py-4 space-y-1">
              {messages.map((msg, index) => (
                <ChatMessage
                  key={msg.id || index}
                  message={msg}
                  userAvatar={user?.avatar}
                  onRegenerate={
                    msg.role === 'assistant' && index === messages.length - 1 && !isStreaming
                      ? () => {
                          const lastUser = [...messages]
                            .reverse()
                            .find((m) => m.role === 'user');
                          if (lastUser) {
                            handleSendMessage(lastUser.content, lastUser.attachments);
                          }
                        }
                      : undefined
                  }
                  onFork={
                    activeConversationId
                      ? () => forkConversation(activeConversationId, msg.id)
                      : undefined
                  }
                  onOpenArtifact={(art) => {
                    setActiveArtifact(art);
                    setIsArtifactOpen(true);
                  }}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Composer bottom bar */}
        <MessageComposer
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onStopStreaming={handleStopStreaming}
          currentMode={currentMode}
          onSelectMode={(m) => setCurrentMode(m)}
          dailyUsage={
            billingOverview
              ? {
                  used: billingOverview.stats.messagesToday,
                  limit: billingOverview.plan.messagesPerDay,
                  planName: billingOverview.plan.name,
                }
              : undefined
          }
        />
      </div>

      {/* Artifact Canvas Panel (Claude / ChatGPT style side sheet) */}
      <ArtifactPanel
        artifact={activeArtifact}
        isOpen={isArtifactOpen}
        onClose={() => setIsArtifactOpen(false)}
      />

      {/* Modals */}
      <MemoryModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        memories={memories}
        onAddMemory={async (content, category) => {
          const res = await addMemory(content, category);
          setMemories((prev) => [res.memory, ...prev]);
        }}
        onDeleteMemory={async (id) => {
          await deleteMemory(id);
          setMemories((prev) => prev.filter((m) => m.id !== id));
        }}
        user={user}
        onUpdateInstructions={async (inst) => {
          const res = await updateProfile({ customInstructions: inst });
          setUser(res.user);
        }}
      />

      <BillingModal
        isOpen={isBillingOpen}
        onClose={() => setIsBillingOpen(false)}
        billingOverview={billingOverview}
        onUpgradePlan={async (planId) => {
          await upgradePlan(planId);
          const updated = await getBillingOverview();
          setBillingOverview(updated);
          const me = await getMe();
          setUser(me.user);
        }}
      />

      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(authedUser) => {
          setUser(authedUser);
          getConversations().then((res) => setConversations(res.conversations));
        }}
      />
    </div>
  );
}
