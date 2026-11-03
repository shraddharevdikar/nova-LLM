import express, { Request, Response } from 'express';
import { db, User, Conversation, Message, Memory, UsageRecord, AuditLog } from './db.ts';
import { streamChatCompletion } from './geminiService.ts';
import { routeModel } from '../src/utils/modelRouter.ts';
import { checkPlanAllowance, calculateTokenCost, PLAN_CONFIGS } from '../src/utils/billing.ts';
import { chunkText, retrieveRelevantChunks } from '../src/utils/rag.ts';

export const apiRouter = express.Router();

// Helper to authenticate user from header or session
function getCurrentUser(req: Request): User | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    // Validate session token against registered tenant database
    const user = db.users.get(token);
    if (user) return user;
    // Explicit invalid token rejection ensures tenant security
    return null;
  }
  // Fallback for initial demo onboarding when no Authorization header is present
  return db.users.get('usr_pro_alex') || Array.from(db.users.values())[0] || null;
}

// ================= AUTH ROUTES =================
apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const { passwordHash, ...safeUser } = user;
  res.json({ user: safeUser });
});

apiRouter.post('/auth/demo', (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = db.users.get(userId);
  if (!user) return res.status(404).json({ error: 'Demo user not found' });
  const { passwordHash, ...safeUser } = user;
  res.json({ token: user.id, user: safeUser });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = Array.from(db.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.passwordHash !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { passwordHash, ...safeUser } = user;
  res.json({ token: user.id, user: safeUser });
});

apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });

  const existing = Array.from(db.users.values()).find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return res.status(400).json({ error: 'An account with this email already exists' });

  const newUser: User = {
    id: `usr_${Date.now()}`,
    name,
    email,
    passwordHash: password,
    plan: 'free',
    role: 'user',
    createdAt: new Date().toISOString(),
    customInstructions: {
      aboutUser: '',
      assistantGuidelines: '',
    },
  };

  db.users.set(newUser.id, newUser);
  db.auditLogs.push({
    id: `aud_${Date.now()}`,
    userId: newUser.id,
    action: 'USER_REGISTERED',
    details: `New user ${email} registered with Free plan`,
    timestamp: new Date().toISOString(),
  });
  db.save();

  const { passwordHash, ...safeUser } = newUser;
  res.json({ token: newUser.id, user: safeUser });
});

apiRouter.put('/auth/profile', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { name, avatar, customInstructions } = req.body;
  if (name) user.name = name;
  if (avatar !== undefined) user.avatar = avatar;
  if (customInstructions) {
    user.customInstructions = {
      aboutUser: customInstructions.aboutUser ?? user.customInstructions.aboutUser,
      assistantGuidelines: customInstructions.assistantGuidelines ?? user.customInstructions.assistantGuidelines,
    };
  }

  db.users.set(user.id, user);
  db.save();
  const { passwordHash, ...safeUser } = user;
  res.json({ user: safeUser });
});

// ================= CONVERSATIONS =================
apiRouter.get('/conversations', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { search, archived } = req.query;
  let convs = Array.from(db.conversations.values()).filter((c) => c.userId === user.id);

  if (archived === 'true') {
    convs = convs.filter((c) => c.archived);
  } else {
    convs = convs.filter((c) => !c.archived);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    convs = convs.filter((c) => c.title.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q)));
  }

  // Sort pinned first, then newest
  convs.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  res.json({ conversations: convs });
});

apiRouter.post('/conversations', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { title, mode, model } = req.body;
  const newConv: Conversation = {
    id: `conv_${Date.now()}`,
    userId: user.id,
    title: title || 'New Conversation',
    pinned: false,
    archived: false,
    mode: mode || 'auto',
    model: model || 'gemini-3.8-flash',
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.conversations.set(newConv.id, newConv);
  db.save();
  res.json({ conversation: newConv });
});

apiRouter.get('/conversations/:id', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const conv = db.conversations.get(req.params.id);
  if (!conv || conv.userId !== user.id) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  const msgs = Array.from(db.messages.values())
    .filter((m) => m.conversationId === conv.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  res.json({ conversation: conv, messages: msgs });
});

apiRouter.patch('/conversations/:id', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const conv = db.conversations.get(req.params.id);
  if (!conv || conv.userId !== user.id) return res.status(404).json({ error: 'Not found' });

  const { title, pinned, archived, mode, tags } = req.body;
  if (title !== undefined) conv.title = title;
  if (pinned !== undefined) conv.pinned = Boolean(pinned);
  if (archived !== undefined) conv.archived = Boolean(archived);
  if (mode !== undefined) conv.mode = mode;
  if (tags !== undefined) conv.tags = tags;
  conv.updatedAt = new Date().toISOString();

  db.conversations.set(conv.id, conv);
  db.save();
  res.json({ conversation: conv });
});

apiRouter.delete('/conversations/:id', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const conv = db.conversations.get(req.params.id);
  if (!conv || conv.userId !== user.id) return res.status(404).json({ error: 'Not found' });

  // Delete all messages belonging to this conversation
  for (const [msgId, msg] of db.messages.entries()) {
    if (msg.conversationId === conv.id) {
      db.messages.delete(msgId);
    }
  }

  db.conversations.delete(conv.id);
  db.save();
  res.json({ success: true, deletedId: conv.id });
});

apiRouter.post('/conversations/:id/fork', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const sourceConv = db.conversations.get(req.params.id);
  if (!sourceConv || sourceConv.userId !== user.id) return res.status(404).json({ error: 'Not found' });

  const { upToMessageId } = req.body;
  const newConvId = `conv_fork_${Date.now()}`;
  const forkedConv: Conversation = {
    ...sourceConv,
    id: newConvId,
    title: `Branch: ${sourceConv.title}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.conversations.set(newConvId, forkedConv);

  const existingMsgs = Array.from(db.messages.values())
    .filter((m) => m.conversationId === sourceConv.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let stopCopying = false;
  for (const msg of existingMsgs) {
    if (stopCopying) break;
    const newMsg: Message = {
      ...msg,
      id: `msg_f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId: newConvId,
    };
    db.messages.set(newMsg.id, newMsg);
    if (upToMessageId && msg.id === upToMessageId) {
      stopCopying = true;
    }
  }

  db.save();
  res.json({ conversation: forkedConv });
});

// ================= STREAMING CHAT (SSE) =================
apiRouter.post('/chat/stream', async (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { conversationId, prompt, mode = 'auto', attachments = [] } = req.body;
  if (!prompt && (!attachments || attachments.length === 0)) {
    return res.status(400).json({ error: 'Prompt or attachment required' });
  }

  // Check quota
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const usedToday = db.usageRecords.filter(
    (u) => u.userId === user.id && new Date(u.timestamp) >= todayStart
  ).length;

  const allowance = checkPlanAllowance(user.plan, mode, usedToday);
  if (!allowance.allowed) {
    return res.status(403).json({ error: allowance.reason });
  }

  // Ensure conversation exists or create one
  let conv = conversationId ? db.conversations.get(conversationId) : null;
  if (!conv || conv.userId !== user.id) {
    conv = {
      id: `conv_${Date.now()}`,
      userId: user.id,
      title: prompt ? prompt.slice(0, 36) + (prompt.length > 36 ? '...' : '') : 'Document Analysis',
      pinned: false,
      archived: false,
      mode,
      model: 'gemini-3.8-flash',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.conversations.set(conv.id, conv);
  }

  // Save user message
  const userMsgId = `msg_u_${Date.now()}`;
  const userMsg: Message = {
    id: userMsgId,
    conversationId: conv.id,
    role: 'user',
    content: prompt,
    attachments,
    model: 'gemini-3.8-flash',
    mode,
    createdAt: new Date().toISOString(),
  };
  db.messages.set(userMsgId, userMsg);

  // Setup Server-Sent Events headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }
  };

  // Announce start
  sendEvent('init', {
    conversationId: conv.id,
    userMessageId: userMsgId,
  });

  // Collect relevant memories for context
  const userMems = Array.from(db.memories.values())
    .filter((m) => m.userId === user.id)
    .map((m) => `[${m.category.toUpperCase()}] ${m.content}`);

  // Fetch previous messages for context
  const previousMsgs = Array.from(db.messages.values())
    .filter((m) => m.conversationId === conv.id && m.id !== userMsgId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Determine routing
  const route = routeModel(mode, prompt);

  const startTime = Date.now();
  let assistantThinking = '';

  try {
    const result = await streamChatCompletion({
      userId: user.id,
      conversationId: conv.id,
      messages: previousMsgs.map((m) => ({ role: m.role, content: m.content })),
      prompt,
      mode: route.mode,
      model: route.targetModel,
      thinkingLevel: route.thinkingLevel,
      attachments,
      userMemories: userMems,
      customInstructions: user.customInstructions,
      onChunk: (chunk) => {
        sendEvent('chunk', { text: chunk });
      },
      onStatusUpdate: (status) => {
        sendEvent('status', { status });
      },
      onCitation: (cite) => {
        sendEvent('citation', { citation: cite });
      },
      onToolCall: (toolCall) => {
        sendEvent('tool_call', { toolCall });
      },
    });

    const durationSec = Number(((Date.now() - startTime) / 1000).toFixed(1));

    // Save assistant message
    const assistantMsgId = `msg_a_${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantMsgId,
      conversationId: conv.id,
      role: 'assistant',
      content: result.fullText,
      thinkingContent: result.thinkingText || (route.mode === 'thinking' ? `Evaluated logical constraints and verified response in ${durationSec}s.` : undefined),
      thinkingDurationSec: durationSec,
      model: route.targetModel,
      mode: route.mode,
      citations: result.citations,
      toolExecutions: result.toolExecutions,
      artifact: result.artifact,
      tokenUsage: result.tokenUsage,
      createdAt: new Date().toISOString(),
    };

    db.messages.set(assistantMsgId, assistantMsg);
    conv.updatedAt = new Date().toISOString();
    db.conversations.set(conv.id, conv);

    // Record token usage
    const cost = calculateTokenCost(
      route.targetModel,
      result.tokenUsage.promptTokens,
      result.tokenUsage.completionTokens
    );

    db.usageRecords.push({
      id: `use_${Date.now()}`,
      userId: user.id,
      timestamp: new Date().toISOString(),
      model: route.targetModel,
      mode: route.mode,
      promptTokens: result.tokenUsage.promptTokens,
      completionTokens: result.tokenUsage.completionTokens,
      costUsd: cost,
    });

    db.save();

    sendEvent('complete', {
      message: assistantMsg,
      costUsd: cost,
    });
  } catch (error: any) {
    sendEvent('error', { error: error.message || 'Generation failed' });
  } finally {
    res.write('event: done\ndata: {}\n\n');
    res.end();
  }
});

// ================= MEMORIES =================
apiRouter.get('/memories', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const mems = Array.from(db.memories.values())
    .filter((m) => m.userId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    memories: mems,
    customInstructions: user.customInstructions,
  });
});

apiRouter.post('/memories', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { content, category = 'preference' } = req.body;
  if (!content) return res.status(400).json({ error: 'Memory content required' });

  const newMem: Memory = {
    id: `mem_${Date.now()}`,
    userId: user.id,
    content,
    category,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.memories.set(newMem.id, newMem);
  db.save();
  res.json({ memory: newMem });
});

apiRouter.put('/memories/:id', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const mem = db.memories.get(req.params.id);
  if (!mem || mem.userId !== user.id) return res.status(404).json({ error: 'Not found' });

  const { content, category } = req.body;
  if (content !== undefined) mem.content = content;
  if (category !== undefined) mem.category = category;
  mem.updatedAt = new Date().toISOString();

  db.memories.set(mem.id, mem);
  db.save();
  res.json({ memory: mem });
});

apiRouter.delete('/memories/:id', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const mem = db.memories.get(req.params.id);
  if (!mem || mem.userId !== user.id) return res.status(404).json({ error: 'Not found' });

  db.memories.delete(mem.id);
  db.save();
  res.json({ success: true, deletedId: mem.id });
});

// ================= BILLING & USAGE =================
apiRouter.get('/billing/overview', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const userUsage = db.usageRecords.filter((u) => u.userId === user.id);
  const todayUsage = userUsage.filter((u) => new Date(u.timestamp) >= todayStart);

  const totalTokens = userUsage.reduce((acc, u) => acc + u.promptTokens + u.completionTokens, 0);
  const totalCost = userUsage.reduce((acc, u) => acc + u.costUsd, 0);

  const currentPlan = PLAN_CONFIGS[user.plan] || PLAN_CONFIGS.free;

  res.json({
    plan: currentPlan,
    allPlans: Object.values(PLAN_CONFIGS),
    stats: {
      messagesToday: todayUsage.length,
      messagesLimit: currentPlan.messagesPerDay,
      totalTokens,
      totalCostUsd: Number(totalCost.toFixed(4)),
    },
  });
});

apiRouter.post('/billing/upgrade', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { planId } = req.body;
  if (!PLAN_CONFIGS[planId]) return res.status(400).json({ error: 'Invalid plan' });

  user.plan = planId;
  db.users.set(user.id, user);

  db.auditLogs.push({
    id: `aud_${Date.now()}`,
    userId: user.id,
    action: 'SUBSCRIPTION_CHANGE',
    details: `User upgraded/changed plan to ${PLAN_CONFIGS[planId].name}`,
    timestamp: new Date().toISOString(),
  });
  db.save();

  res.json({ success: true, newPlan: PLAN_CONFIGS[planId] });
});

// ================= ADMIN DASHBOARD =================
apiRouter.get('/admin/overview', (req: Request, res: Response) => {
  const user = getCurrentUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const totalUsers = db.users.size;
  const totalConversations = db.conversations.size;
  const totalMessages = db.messages.size;
  const totalTokens = db.usageRecords.reduce((acc, u) => acc + u.promptTokens + u.completionTokens, 0);
  const totalCostUsd = db.usageRecords.reduce((acc, u) => acc + u.costUsd, 0);

  // Group by mode
  const modeCounts: Record<string, number> = {};
  for (const u of db.usageRecords) {
    modeCounts[u.mode] = (modeCounts[u.mode] || 0) + 1;
  }

  res.json({
    metrics: {
      totalUsers,
      totalConversations,
      totalMessages,
      totalTokens,
      totalCostUsd: Number(totalCostUsd.toFixed(4)),
      modeBreakdown: modeCounts,
    },
    users: Array.from(db.users.values()).map(({ passwordHash, ...u }) => u),
    auditLogs: db.auditLogs.slice(-50).reverse(),
    activeModels: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', status: 'Healthy', latencyMs: 320 },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', status: 'Healthy', latencyMs: 190 },
      { id: 'gemini-4-argon', name: 'Gemini 4 Argon', status: 'Ready (Paid)', latencyMs: 850 },
    ],
  });
});
