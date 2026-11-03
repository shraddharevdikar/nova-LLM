export type AssistantMode = 'auto' | 'fast' | 'thinking' | 'research' | 'coding' | 'agent';

export interface ModelRoutingDecision {
  mode: AssistantMode;
  targetModel: string;
  fallbackModel: string;
  enableThinking: boolean;
  thinkingLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  enableSearchGrounding: boolean;
  enableTools: boolean;
  systemPromptModifier: string;
}

export function detectIntent(prompt: string): AssistantMode {
  const lower = prompt.toLowerCase();

  // Agent mode cues (action execution, multi-step tool commands)
  if (
    lower.includes('calculate and graph') ||
    lower.includes('run this script') ||
    lower.includes('execute the code') ||
    lower.includes('save this memory') ||
    lower.includes('perform tool')
  ) {
    return 'agent';
  }

  // Research mode cues (latest news, web citations, current events, recent discoveries)
  if (
    lower.includes('latest') ||
    lower.includes('current news') ||
    lower.includes('who won') ||
    lower.includes('research') ||
    lower.includes('recent') ||
    lower.includes('find sources') ||
    lower.includes('cite') ||
    lower.includes('market price today')
  ) {
    return 'research';
  }

  // Coding mode cues
  if (
    lower.includes('function') ||
    lower.includes('write code') ||
    lower.includes('debug') ||
    lower.includes('typescript') ||
    lower.includes('python') ||
    lower.includes('sql query') ||
    lower.includes('refactor') ||
    lower.includes('react component') ||
    lower.includes('api endpoint')
  ) {
    return 'coding';
  }

  // Deep thinking cues
  if (
    lower.includes('solve this proof') ||
    lower.includes('step by step proof') ||
    lower.includes('complex logic') ||
    lower.includes('deep analysis') ||
    lower.includes('game theory') ||
    lower.includes('probability puzzle')
  ) {
    return 'thinking';
  }

  return 'fast';
}

export function routeModel(
  requestedMode: AssistantMode,
  prompt: string,
  userCustomInstructions?: string
): ModelRoutingDecision {
  const resolvedMode = requestedMode === 'auto' ? detectIntent(prompt) : requestedMode;

  switch (resolvedMode) {
    case 'thinking':
      return {
        mode: 'thinking',
        targetModel: 'gemini-3.8-flash',
        fallbackModel: 'gemini-3.1-flash-lite',
        enableThinking: true,
        thinkingLevel: 'HIGH',
        enableSearchGrounding: false,
        enableTools: false,
        systemPromptModifier:
          'You are NovaMind in Thinking Mode. Deeply analyze all constraints, verify mathematical logic, consider alternative explanations, and formulate structured, verified answers.',
      };

    case 'research':
      return {
        mode: 'research',
        targetModel: 'gemini-3.8-flash',
        fallbackModel: 'gemini-3.1-flash-lite',
        enableThinking: false,
        thinkingLevel: 'LOW',
        enableSearchGrounding: true,
        enableTools: false,
        systemPromptModifier:
          'You are NovaMind in Deep Research Mode. Always ground claims in up-to-date facts, evaluate source authority, synthesize findings with clarity, and provide citations for verifiable facts.',
      };

    case 'coding':
      return {
        mode: 'coding',
        targetModel: 'gemini-3.8-flash',
        fallbackModel: 'gemini-3.1-flash-lite',
        enableThinking: true,
        thinkingLevel: 'MEDIUM',
        enableSearchGrounding: false,
        enableTools: true,
        systemPromptModifier:
          'You are NovaMind in Coding Mode. Produce production-grade, idiomatic, secure, and cleanly formatted code. Provide explanations, error handling, and test cases where helpful.',
      };

    case 'agent':
      return {
        mode: 'agent',
        targetModel: 'gemini-3.8-flash',
        fallbackModel: 'gemini-3.1-flash-lite',
        enableThinking: true,
        thinkingLevel: 'MEDIUM',
        enableSearchGrounding: true,
        enableTools: true,
        systemPromptModifier:
          'You are NovaMind in Autonomous Agent Mode. Use available tools (calculator, safe code execution, web search, data visualization, memory persistence) to solve the user task step by step.',
      };

    case 'fast':
    default:
      return {
        mode: 'fast',
        targetModel: 'gemini-3.8-flash',
        fallbackModel: 'gemini-3.1-flash-lite',
        enableThinking: false,
        thinkingLevel: 'LOW',
        enableSearchGrounding: false,
        enableTools: false,
        systemPromptModifier:
          'You are NovaMind in Fast Response Mode. Deliver direct, concise, and helpful answers quickly.',
      };
  }
}
