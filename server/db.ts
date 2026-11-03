import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  plan: 'free' | 'plus' | 'pro' | 'team';
  role: 'user' | 'admin';
  createdAt: string;
  customInstructions: {
    aboutUser: string;
    assistantGuidelines: string;
  };
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataBase64?: string;
  extractedText?: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
  snippet?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinkingContent?: string;
  thinkingDurationSec?: number;
  model: string;
  mode: 'auto' | 'fast' | 'thinking' | 'research' | 'coding' | 'agent';
  citations?: GroundingSource[];
  toolExecutions?: Array<{
    toolName: string;
    args: any;
    output: string;
    success: boolean;
  }>;
  attachments?: Attachment[];
  artifact?: {
    type: 'code' | 'chart' | 'html' | 'document';
    title: string;
    content: string;
    language?: string;
  };
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  pinned: boolean;
  archived: boolean;
  mode: 'auto' | 'fast' | 'thinking' | 'research' | 'coding' | 'agent';
  model: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Memory {
  id: string;
  userId: string;
  content: string;
  category: 'preference' | 'personal' | 'work' | 'technical';
  createdAt: string;
  updatedAt: string;
}

export interface UsageRecord {
  id: string;
  userId: string;
  timestamp: string;
  model: string;
  mode: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
  ip?: string;
}

// In-memory + persistent cache state
class Database {
  private dataDir = path.resolve(process.cwd(), '.data');
  private dbFile = path.resolve(this.dataDir, 'novamind_store.json');

  public users: Map<string, User> = new Map();
  public conversations: Map<string, Conversation> = new Map();
  public messages: Map<string, Message> = new Map();
  public memories: Map<string, Memory> = new Map();
  public usageRecords: UsageRecord[] = [];
  public auditLogs: AuditLog[] = [];

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
      } catch (e) {
        // Fallback for sandboxes
      }
    }

    if (fs.existsSync(this.dbFile)) {
      try {
        const raw = fs.readFileSync(this.dbFile, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users) parsed.users.forEach((u: User) => this.users.set(u.id, u));
        if (parsed.conversations) parsed.conversations.forEach((c: Conversation) => this.conversations.set(c.id, c));
        if (parsed.messages) parsed.messages.forEach((m: Message) => this.messages.set(m.id, m));
        if (parsed.memories) parsed.memories.forEach((mem: Memory) => this.memories.set(mem.id, mem));
        if (parsed.usageRecords) this.usageRecords = parsed.usageRecords;
        if (parsed.auditLogs) this.auditLogs = parsed.auditLogs;
      } catch (err) {
        console.warn('Could not read existing store, bootstrapping fresh:', err);
      }
    }

    // Seed default demo users if empty
    if (this.users.size === 0) {
      this.seedDefaultData();
    }
  }

  public save() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      const payload = {
        users: Array.from(this.users.values()),
        conversations: Array.from(this.conversations.values()),
        messages: Array.from(this.messages.values()),
        memories: Array.from(this.memories.values()),
        usageRecords: this.usageRecords.slice(-500),
        auditLogs: this.auditLogs.slice(-200),
      };
      const tmpFile = `${this.dbFile}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf-8');
      fs.renameSync(tmpFile, this.dbFile);
    } catch (err) {
      // Graceful in-memory fallback if filesystem is read-only
    }
  }

  private seedDefaultData() {
    const defaultUsers: User[] = [
      {
        id: 'usr_pro_alex',
        name: 'Alex Vance',
        email: 'alex@novamind.ai',
        passwordHash: 'novamind123',
        plan: 'pro',
        role: 'user',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
        customInstructions: {
          aboutUser: 'Lead AI Engineer & Solutions Architect. Prefers concise, robust TypeScript and systems designs.',
          assistantGuidelines: 'Provide production-ready patterns, benchmarked calculations, and no unrequested pleasantries.',
        },
      },
      {
        id: 'usr_admin_elena',
        name: 'Elena Rostova (Admin)',
        email: 'admin@novamind.ai',
        passwordHash: 'admin123',
        plan: 'team',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
        customInstructions: {
          aboutUser: 'Platform Administrator managing NovaMind clusters and enterprise quotas.',
          assistantGuidelines: 'Emphasize security, latency metrics, and audit log tracking.',
        },
      },
      {
        id: 'usr_plus_sarah',
        name: 'Sarah Chen',
        email: 'sarah@novamind.ai',
        passwordHash: 'novamind123',
        plan: 'plus',
        role: 'user',
        createdAt: new Date().toISOString(),
        customInstructions: {
          aboutUser: 'Fintech Product Manager conducting market research and quantitative analysis.',
          assistantGuidelines: 'Include sources, citation links, and comparative financial tables.',
        },
      },
      {
        id: 'usr_free_guest',
        name: 'Guest Explorer',
        email: 'guest@novamind.ai',
        passwordHash: 'novamind123',
        plan: 'free',
        role: 'user',
        createdAt: new Date().toISOString(),
        customInstructions: {
          aboutUser: 'Exploring NovaMind platform capabilities.',
          assistantGuidelines: 'Be welcoming, informative, and demonstrate AI reasoning and fast answers.',
        },
      },
    ];

    defaultUsers.forEach((u) => this.users.set(u.id, u));

    // Seed default sample memories
    const sampleMemories: Memory[] = [
      {
        id: 'mem_1',
        userId: 'usr_pro_alex',
        content: 'Preferred frontend tech stack: React 19, Tailwind CSS, TypeScript with strict mode enabled.',
        category: 'technical',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mem_2',
        userId: 'usr_pro_alex',
        content: 'Working on autonomous multi-agent pipelines and token-optimized architectures.',
        category: 'work',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    sampleMemories.forEach((m) => this.memories.set(m.id, m));

    // Seed sample conversation for Alex
    const sampleConv: Conversation = {
      id: 'conv_sample_1',
      userId: 'usr_pro_alex',
      title: 'Architecting Distributed AI Agent Networks',
      pinned: true,
      archived: false,
      mode: 'thinking',
      model: 'gemini-3.8-flash',
      tags: ['Architecture', 'Agents'],
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    };
    this.conversations.set(sampleConv.id, sampleConv);

    const sampleMsg1: Message = {
      id: 'msg_s1',
      conversationId: 'conv_sample_1',
      role: 'user',
      content: 'How should we structure state synchronization and conflict resolution across distributed subagents in real-time collaboration?',
      model: 'gemini-3.8-flash',
      mode: 'thinking',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    };

    const sampleMsg2: Message = {
      id: 'msg_s2',
      conversationId: 'conv_sample_1',
      role: 'assistant',
      content: `### High-Order Architecture: Distributed Subagent State Synchronization

When orchestrating autonomous agents operating concurrently over a shared task context, state desynchronization and race conditions are primary points of failure. Here is the recommended architectural blueprint:

#### 1. CRDTs & Conflict-Free State Trees
- **State Partitioning**: Decompose agent workspace into a hierarchically keyed JSON CRDT (Conflict-Free Replicated Data Type) using state-based PN-Counters and LWW-Element-Sets.
- **Delta-State Distribution**: Rather than broadcasting full states, transmit compact compressed delta patches over low-latency message queues.

#### 2. Authority & Supervisor Arbiter
\`\`\`typescript
export interface SubagentTurn<TState> {
  agentId: string;
  proposedPatch: JsonDelta;
  vectorClock: Record<string, number>;
  confidenceScore: number;
}
\`\`\`

#### 3. Verification Gating
Each state mutation by an agent runs through an idempotency validator before committing to the shared context store, preventing hallucinated reversions.`,
      thinkingContent: `1. Analyzed problem space: multi-agent state coordination, eventual consistency, concurrency controls.
2. Evaluated Vector Clocks vs. CRDTs: CRDTs provide mathematical guarantees against merge conflicts.
3. Structured architectural components: Partitioning, Delta distribution, Supervisor arbiter.
4. Synthesized practical TypeScript interfaces.`,
      thinkingDurationSec: 3.2,
      model: 'gemini-3.8-flash',
      mode: 'thinking',
      tokenUsage: {
        promptTokens: 48,
        completionTokens: 382,
        totalTokens: 430,
      },
      createdAt: new Date(Date.now() - 7100000).toISOString(),
    };

    this.messages.set(sampleMsg1.id, sampleMsg1);
    this.messages.set(sampleMsg2.id, sampleMsg2);

    // Initial usage record
    this.usageRecords.push({
      id: 'use_init',
      userId: 'usr_pro_alex',
      timestamp: new Date().toISOString(),
      model: 'gemini-3.8-flash',
      mode: 'thinking',
      promptTokens: 48,
      completionTokens: 382,
      costUsd: 0.000236,
    });

    this.auditLogs.push({
      id: 'aud_1',
      userId: 'usr_admin_elena',
      action: 'SYSTEM_BOOTSTRAP',
      details: 'NovaMind AI Core Engine and security perimeter initialized.',
      timestamp: new Date().toISOString(),
    });

    this.save();
  }
}

export const db = new Database();
