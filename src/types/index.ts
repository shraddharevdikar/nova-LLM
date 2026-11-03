export type AssistantMode = 'auto' | 'fast' | 'thinking' | 'research' | 'coding' | 'agent';

export interface User {
  id: string;
  name: string;
  email: string;
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

export interface ToolExecution {
  toolName: string;
  args: any;
  output: string;
  success: boolean;
  artifact?: Artifact;
}

export interface Artifact {
  type: 'code' | 'chart' | 'html' | 'document';
  title: string;
  content: string;
  language?: string;
  chartType?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinkingContent?: string;
  thinkingDurationSec?: number;
  model: string;
  mode: AssistantMode;
  citations?: GroundingSource[];
  toolExecutions?: ToolExecution[];
  attachments?: Attachment[];
  artifact?: Artifact;
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
  mode: AssistantMode;
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

export interface PlanLimits {
  id: 'free' | 'plus' | 'pro' | 'team';
  name: string;
  priceMonthly: number;
  messagesPerDay: number;
  maxFilesPerDay: number;
  allowedModes: AssistantMode[];
  maxThinkingTokens: number;
  supportsArtifacts: boolean;
  supportsCodeExecution: boolean;
  supportsVoice: boolean;
}

export interface BillingOverview {
  plan: PlanLimits;
  allPlans: PlanLimits[];
  stats: {
    messagesToday: number;
    messagesLimit: number;
    totalTokens: number;
    totalCostUsd: number;
  };
}

export interface AdminMetrics {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  totalCostUsd: number;
  modeBreakdown: Record<string, number>;
}
