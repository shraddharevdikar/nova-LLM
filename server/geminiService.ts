import 'dotenv/config';
import { GoogleGenAI, ThinkingLevel, Type, FunctionDeclaration } from '@google/genai';
import { safeCalculate, executeSandboxedCode } from '../src/utils/tools.ts';
import { chunkText, retrieveRelevantChunks } from '../src/utils/rag.ts';
import { db } from './db.ts';

function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Function tool declarations
const calculateFunctionDeclaration: FunctionDeclaration = {
  name: 'calculate',
  description: 'Evaluates a mathematical or arithmetic expression safely.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      expression: {
        type: Type.STRING,
        description: 'The mathematical expression to evaluate, e.g. "Math.sqrt(144) + 12 * 5"',
      },
    },
    required: ['expression'],
  },
};

const executeCodeFunctionDeclaration: FunctionDeclaration = {
  name: 'executeCode',
  description: 'Executes JavaScript code in an isolated execution sandbox and returns standard output.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      language: {
        type: Type.STRING,
        description: 'Language to execute, e.g. "javascript"',
      },
      code: {
        type: Type.STRING,
        description: 'The code to execute in the sandbox',
      },
    },
    required: ['language', 'code'],
  },
};

const generateChartFunctionDeclaration: FunctionDeclaration = {
  name: 'generateChart',
  description: 'Generates a structured data visualization (bar, line, pie, area) for display in the interactive artifacts canvas.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Title of the chart' },
      chartType: { type: Type.STRING, description: 'Type: bar, line, pie, or area' },
      data: {
        type: Type.STRING,
        description: 'JSON array of data points with "label" and "value" keys',
      },
    },
    required: ['title', 'chartType', 'data'],
  },
};

const saveMemoryFunctionDeclaration: FunctionDeclaration = {
  name: 'saveMemory',
  description: 'Saves a key fact, user preference, or project context into long-term persistent memory.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: 'The fact or preference to remember' },
      category: {
        type: Type.STRING,
        description: 'Category: preference, personal, work, or technical',
      },
    },
    required: ['content', 'category'],
  },
};

export interface ChatGenerateOptions {
  userId: string;
  conversationId: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  prompt: string;
  mode: 'auto' | 'fast' | 'thinking' | 'research' | 'coding' | 'agent';
  model?: string;
  thinkingLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  attachments?: Array<{ name: string; mimeType: string; dataBase64?: string; extractedText?: string }>;
  userMemories?: string[];
  customInstructions?: { aboutUser: string; assistantGuidelines: string };
  onChunk: (chunkText: string) => void;
  onThinkingChunk?: (thinkingText: string) => void;
  onStatusUpdate?: (status: string) => void;
  onCitation?: (citation: { title: string; uri: string; snippet?: string }) => void;
  onToolCall?: (toolCall: { toolName: string; args: any; output: string; success: boolean; artifact?: any }) => void;
}

/**
 * Normalizes error messages from the Gemini SDK into clear, readable guidance
 */
function formatGeminiError(err: any): string {
  const rawMsg = err?.message || String(err);

  // Check if raw message contains JSON error details
  let parsedErrorMsg = '';
  try {
    const jsonMatch = rawMsg.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error?.message) {
        parsedErrorMsg = parsed.error.message;
      }
    }
  } catch {
    // ignore json parse errors
  }

  const effectiveMsg = parsedErrorMsg || rawMsg;

  if (effectiveMsg.includes('503') || effectiveMsg.includes('UNAVAILABLE') || effectiveMsg.includes('high demand') || effectiveMsg.includes('overloaded')) {
    return (
      `\n\n> ⚠️ **Gemini Model High Demand Notice (HTTP 503)**\n>\n` +
      `> The primary model cluster is experiencing temporary high demand.\n` +
      `> NovaMind automatically routes to the low-latency **gemini-3.1-flash-lite** engine. Please retry in a moment.`
    );
  }

  if (effectiveMsg.includes('429') || effectiveMsg.includes('RESOURCE_EXHAUSTED') || effectiveMsg.includes('quota')) {
    return (
      `\n\n> ⚠️ **Gemini API Quota Limit Exceeded (HTTP 429)**\n>\n` +
      `> Your attached API key has reached its current free-tier rate or per-minute token quota.\n` +
      `> **Next Steps:**\n` +
      `> 1. Wait 20–30 seconds for your per-minute token window to reset.\n` +
      `> 2. Open the **Settings > Secrets** panel in the AI Studio header and select a billing-enabled API key for unrestricted quota.\n` +
      `> 3. Switch to **Fast Mode** for significantly lower token usage per query.`
    );
  }

  if (effectiveMsg.includes('API_KEY_INVALID') || effectiveMsg.includes('PERMISSION_DENIED') || effectiveMsg.includes('403')) {
    return (
      `\n\n> ⚠️ **Gemini API Key Authentication Error**\n>\n` +
      `> The server could not authenticate with the Gemini API. Please verify that your API key is configured in the **Settings > Secrets** panel.`
    );
  }

  if (effectiveMsg.includes('404') || effectiveMsg.includes('NOT_FOUND')) {
    return `\n\n> ⚠️ **Model Not Found**: The selected model endpoint is currently unavailable. NovaMind has switched to the active core model.`;
  }

  return `\n\n> ⚠️ **AI Model Notice**: ${effectiveMsg}`;
}

export async function streamChatCompletion(options: ChatGenerateOptions): Promise<{
  fullText: string;
  thinkingText: string;
  citations: Array<{ title: string; uri: string; snippet?: string }>;
  toolExecutions: Array<{ toolName: string; args: any; output: string; success: boolean }>;
  artifact?: any;
  tokenUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
}> {
  const ai = getAIClient();
  const selectedModel = options.model || 'gemini-3.8-flash';
  const fallbackModel = 'gemini-3.1-flash-lite';

  let systemInstruction = `You are NovaMind AI, an elite, independent, next-generation AI assistant.
You are articulate, deeply analytical, helpful, and concise. You provide well-structured markdown answers with code syntax, tables, and clear explanations.
Do not emulate or mention ChatGPT, OpenAI, or other brands. You are NovaMind AI.`;

  if (options.customInstructions) {
    if (options.customInstructions.aboutUser) {
      systemInstruction += `\n[User Profile Context]: ${options.customInstructions.aboutUser}`;
    }
    if (options.customInstructions.assistantGuidelines) {
      systemInstruction += `\n[User Response Preferences]: ${options.customInstructions.assistantGuidelines}`;
    }
  }

  if (options.userMemories && options.userMemories.length > 0) {
    systemInstruction += `\n[Persistent Long-Term Memories]:\n${options.userMemories.map((m) => `- ${m}`).join('\n')}`;
  }

  // Configure tools and thinking according to mode
  const tools: any[] = [];
  let toolConfig: any = undefined;
  let thinkingConfig: any = undefined;

  if (options.mode === 'thinking') {
    thinkingConfig = {
      thinkingLevel: ThinkingLevel.HIGH,
    };
    systemInstruction += '\nPerform rigorous, transparent, step-by-step reasoning. Evaluate edge cases and verify correctness.';
  } else if (options.mode === 'fast') {
    thinkingConfig = {
      thinkingLevel: ThinkingLevel.LOW,
    };
  } else if (options.mode === 'research') {
    tools.push({ googleSearch: {} });
    systemInstruction += '\nSearch grounding is active. Use current real-world knowledge and cite reputable sources.';
  } else if (options.mode === 'coding') {
    tools.push({
      functionDeclarations: [executeCodeFunctionDeclaration, calculateFunctionDeclaration],
    });
    systemInstruction += '\nOptimize for production-grade software engineering, clean modular code, unit tests, and performance.';
  } else if (options.mode === 'agent') {
    tools.push({ googleSearch: {} });
    tools.push({
      functionDeclarations: [
        calculateFunctionDeclaration,
        executeCodeFunctionDeclaration,
        generateChartFunctionDeclaration,
        saveMemoryFunctionDeclaration,
      ],
    });
    toolConfig = { includeServerSideToolInvocations: true };
    systemInstruction += '\nAutonomous agent mode enabled. Actively use your available tools (search, calculation, code execution, chart creation, memory) to solve multi-step requests.';
  }

  // Format content history with strictly alternating roles (user -> model -> user -> model)
  const rawContents: any[] = [];

  for (const msg of options.messages.slice(-6)) {
    if (!msg.content || !msg.content.trim()) continue;
    const role = msg.role === 'assistant' ? 'model' : 'user';
    rawContents.push({
      role,
      parts: [{ text: msg.content.trim() }],
    });
  }

  // Latest user prompt parts with any attachments
  const userParts: any[] = [];

  if (options.attachments && options.attachments.length > 0) {
    for (const att of options.attachments) {
      // 1. Multimodal Images, PDFs, and Audio via inlineData
      if (
        (att.mimeType.startsWith('image/') ||
          att.mimeType === 'application/pdf' ||
          att.mimeType.startsWith('audio/')) &&
        att.dataBase64
      ) {
        userParts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.dataBase64.replace(/^data:[^;]+;base64,/, ''),
          },
        });
      }
      // 2. Structured Documents, CSV, TXT, JSON with Semantic RAG Chunking
      else if (att.extractedText) {
        const textLen = att.extractedText.length;
        if (textLen > 1500) {
          // Perform semantic chunking & relevance retrieval
          const chunkDocId = (att as any).id || att.name;
          const chunks = chunkText(att.extractedText, chunkDocId, att.name, 500, 80);
          const relevant = retrieveRelevantChunks(options.prompt, chunks, 4);

          let ragContext = '';
          if (relevant.length > 0) {
            ragContext =
              `\n[Top Semantic RAG Chunks from "${att.name}"]:\n` +
              relevant
                .map(
                  (m) =>
                    `--- [Section ${m.chunk.chunkIndex + 1} | Relevance Match: ${(m.score * 100).toFixed(0)}%] ---\n${m.chunk.content}`
                )
                .join('\n\n');
          }

          userParts.push({
            text:
              `[Attached Document "${att.name}" | Size: ${Math.round(textLen / 1024)} KB]:\n` +
              (ragContext ? `${ragContext}\n\n[Document Header Preview]:\n` : '') +
              `${att.extractedText.slice(0, 1500)}`,
          });
        } else {
          userParts.push({
            text: `[Attached Document "${att.name}"]:\n${att.extractedText}`,
          });
        }
      }
    }
  }

  userParts.push({ text: options.prompt.trim() || 'Hello' });

  // Merge consecutive turns with identical roles to satisfy Gemini API requirements
  const contents: any[] = [];
  let lastRole: string | null = null;

  for (const turn of rawContents) {
    if (turn.role === lastRole && contents.length > 0) {
      // Append text parts to previous turn
      contents[contents.length - 1].parts.push(...turn.parts);
    } else {
      contents.push({ role: turn.role, parts: [...turn.parts] });
      lastRole = turn.role;
    }
  }

  // Ensure last turn is user
  if (lastRole === 'user' && contents.length > 0) {
    contents[contents.length - 1].parts.push(...userParts);
  } else {
    contents.push({ role: 'user', parts: userParts });
  }

  const citations: Array<{ title: string; uri: string; snippet?: string }> = [];
  const toolExecutions: Array<{ toolName: string; args: any; output: string; success: boolean }> = [];
  let artifact: any = null;
  let fullText = '';
  let thinkingText = '';

  const config: any = {
    systemInstruction,
  };
  if (tools.length > 0) config.tools = tools;
  if (toolConfig) config.toolConfig = toolConfig;
  if (thinkingConfig) config.thinkingConfig = thinkingConfig;

  options.onStatusUpdate?.('Synthesizing neural response...');

  // Helper to process response stream chunks
  async function processStream(stream: any) {
    for await (const chunk of stream) {
      // Check for grounding citations
      const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && Array.isArray(groundingChunks)) {
        for (const gc of groundingChunks) {
          if (gc.web?.uri) {
            const webObj = gc.web as any;
            const cite = {
              title: webObj.title || new URL(webObj.uri).hostname,
              uri: webObj.uri,
              snippet: webObj.snippet || '',
            };
            if (!citations.some((c) => c.uri === cite.uri)) {
              citations.push(cite);
              options.onCitation?.(cite);
            }
          }
        }
      }

      // Check for function calls
      const funcCalls = chunk.functionCalls;
      if (funcCalls && funcCalls.length > 0) {
        for (const fc of funcCalls) {
          const fcArgs = (fc.args || {}) as Record<string, any>;
          const toolName = fc.name || 'unknown';
          options.onStatusUpdate?.(`Running tool: ${toolName}...`);
          let toolResultStr = '';
          let success = true;

          try {
            if (toolName === 'calculate') {
              const res = safeCalculate(String(fcArgs.expression || ''));
              toolResultStr = `Calculation result: ${res.steps}`;
            } else if (toolName === 'executeCode') {
              const res = executeSandboxedCode(String(fcArgs.language || 'javascript'), String(fcArgs.code || ''));
              toolResultStr = res.stdout.join('\n') + (res.error ? `\nError: ${res.error}` : '');
              artifact = {
                type: 'code',
                title: 'Code Sandbox Execution',
                content: String(fcArgs.code || ''),
                language: String(fcArgs.language || 'javascript'),
              };
            } else if (toolName === 'generateChart') {
              toolResultStr = `Chart "${fcArgs.title}" generated successfully.`;
              artifact = {
                type: 'chart',
                title: String(fcArgs.title || 'Data Chart'),
                content: String(fcArgs.data || '[]'),
                chartType: String(fcArgs.chartType || 'bar'),
              };
            } else if (toolName === 'saveMemory') {
              const newMem = {
                id: `mem_${Date.now()}`,
                userId: options.userId,
                content: String(fcArgs.content || ''),
                category: String(fcArgs.category || 'preference'),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              db.memories.set(newMem.id, newMem as any);
              db.save();
              toolResultStr = `Memory saved: "${fcArgs.content}"`;
            } else {
              toolResultStr = `Executed ${toolName}.`;
            }
          } catch (e: any) {
            toolResultStr = `Tool execution failed: ${e.message}`;
            success = false;
          }

          const toolRecord = {
            toolName,
            args: fcArgs,
            output: toolResultStr,
            success,
            artifact,
          };
          toolExecutions.push(toolRecord);
          options.onToolCall?.(toolRecord);
        }
      }

      const text = chunk.text;
      if (text) {
        fullText += text;
        options.onChunk(text);
      }
    }
  }

  // Model execution with automatic fallback
  try {
    const stream = await ai.models.generateContentStream({
      model: selectedModel,
      contents,
      config,
    });
    await processStream(stream);
  } catch (primaryErr: any) {
    const isRecoverableError =
      String(primaryErr?.message || '').includes('429') ||
      String(primaryErr?.message || '').includes('503') ||
      String(primaryErr?.message || '').includes('UNAVAILABLE') ||
      String(primaryErr?.message || '').includes('RESOURCE_EXHAUSTED') ||
      String(primaryErr?.message || '').includes('high demand') ||
      String(primaryErr?.message || '').includes('overloaded') ||
      String(primaryErr?.message || '').includes('quota');

    if (isRecoverableError && selectedModel !== fallbackModel) {
      console.warn(`Primary model ${selectedModel} returned recoverable error. Falling back to ${fallbackModel}...`);
      options.onStatusUpdate?.('Switching to Flash-Lite fallback model...');

      try {
        // Fallback with minimal overhead (disable thinkingLevel which is high cost)
        const fallbackConfig: any = {
          systemInstruction,
        };
        if (tools.length > 0) fallbackConfig.tools = tools;

        const fallbackStream = await ai.models.generateContentStream({
          model: fallbackModel,
          contents,
          config: fallbackConfig,
        });
        await processStream(fallbackStream);
      } catch (fallbackErr: any) {
        console.error('Fallback model also hit error:', fallbackErr);
        const formatted = formatGeminiError(fallbackErr);
        fullText += formatted;
        options.onChunk(formatted);
      }
    } else {
      console.error('Gemini generation error:', primaryErr);
      const formatted = formatGeminiError(primaryErr);
      fullText += formatted;
      options.onChunk(formatted);
    }
  }

  // Token estimate
  const promptTokens = Math.ceil(
    (userParts.reduce((acc, p) => acc + (p.text?.length || 50), 0) + systemInstruction.length) / 4
  );
  const completionTokens = Math.max(Math.ceil(fullText.length / 4), 1);

  return {
    fullText,
    thinkingText,
    citations,
    toolExecutions,
    artifact,
    tokenUsage: {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    },
  };
}
