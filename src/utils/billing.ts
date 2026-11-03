export interface PlanLimits {
  id: 'free' | 'plus' | 'pro' | 'team';
  name: string;
  priceMonthly: number;
  messagesPerDay: number;
  maxFilesPerDay: number;
  allowedModes: ('auto' | 'fast' | 'thinking' | 'research' | 'coding' | 'agent')[];
  maxThinkingTokens: number;
  supportsArtifacts: boolean;
  supportsCodeExecution: boolean;
  supportsVoice: boolean;
}

export const PLAN_CONFIGS: Record<string, PlanLimits> = {
  free: {
    id: 'free',
    name: 'Free Starter',
    priceMonthly: 0,
    messagesPerDay: 50,
    maxFilesPerDay: 5,
    allowedModes: ['auto', 'fast', 'thinking', 'research', 'coding', 'agent'],
    maxThinkingTokens: 4096,
    supportsArtifacts: true,
    supportsCodeExecution: true,
    supportsVoice: true,
  },
  plus: {
    id: 'plus',
    name: 'NovaMind Plus',
    priceMonthly: 20,
    messagesPerDay: 200,
    maxFilesPerDay: 15,
    allowedModes: ['auto', 'fast', 'thinking', 'research', 'coding'],
    maxThinkingTokens: 8192,
    supportsArtifacts: true,
    supportsCodeExecution: true,
    supportsVoice: true,
  },
  pro: {
    id: 'pro',
    name: 'NovaMind Pro',
    priceMonthly: 40,
    messagesPerDay: 1000,
    maxFilesPerDay: 100,
    allowedModes: ['auto', 'fast', 'thinking', 'research', 'coding', 'agent'],
    maxThinkingTokens: 32768,
    supportsArtifacts: true,
    supportsCodeExecution: true,
    supportsVoice: true,
  },
  team: {
    id: 'team',
    name: 'NovaMind Enterprise Team',
    priceMonthly: 100,
    messagesPerDay: 5000,
    maxFilesPerDay: 500,
    allowedModes: ['auto', 'fast', 'thinking', 'research', 'coding', 'agent'],
    maxThinkingTokens: 65536,
    supportsArtifacts: true,
    supportsCodeExecution: true,
    supportsVoice: true,
  },
};

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

// Model pricing per 1M tokens (approximate USD)
export const MODEL_PRICING: Record<string, { promptPerMillion: number; completionPerMillion: number }> = {
  'gemini-3.8-flash': { promptPerMillion: 0.15, completionPerMillion: 0.60 },
  'gemini-3.1-flash-lite': { promptPerMillion: 0.075, completionPerMillion: 0.30 },
  'gemini-4-argon': { promptPerMillion: 1.25, completionPerMillion: 5.00 },
};

/**
 * Calculates estimated cost in USD from token usage
 */
export function calculateTokenCost(
  modelName: string,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = MODEL_PRICING[modelName] || MODEL_PRICING['gemini-3.8-flash'];
  const promptCost = (promptTokens / 1_000_000) * pricing.promptPerMillion;
  const completionCost = (completionTokens / 1_000_000) * pricing.completionPerMillion;
  return Number((promptCost + completionCost).toFixed(6));
}

/**
 * Validates if a user's plan permits the requested mode and daily message quota
 */
export function checkPlanAllowance(
  planId: string,
  mode: 'auto' | 'fast' | 'thinking' | 'research' | 'coding' | 'agent',
  usedMessagesToday: number
): { allowed: boolean; reason?: string } {
  const plan = PLAN_CONFIGS[planId] || PLAN_CONFIGS.free;

  if (usedMessagesToday >= plan.messagesPerDay) {
    return {
      allowed: false,
      reason: `Daily message quota of ${plan.messagesPerDay} reached for ${plan.name}. Please upgrade to continue.`,
    };
  }

  if (!plan.allowedModes.includes(mode)) {
    return {
      allowed: false,
      reason: `Mode "${mode.toUpperCase()}" is not available on the ${plan.name} plan. Upgrade to unlock this capability.`,
    };
  }

  return { allowed: true };
}
