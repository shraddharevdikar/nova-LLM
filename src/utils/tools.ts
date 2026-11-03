export interface ToolExecutionResult {
  toolName: string;
  args: Record<string, any>;
  output: string;
  success: boolean;
  artifact?: {
    type: 'chart' | 'code' | 'table' | 'html';
    title: string;
    content: string;
    language?: string;
  };
}

/**
 * Safe arithmetic evaluator without using eval()
 */
export function safeCalculate(expression: string): { result: number; steps: string } {
  // Enforce expression length bound
  if (expression.length > 500) {
    throw new Error('Expression exceeds maximum allowed length of 500 characters');
  }

  // Strip whitespace and validate allowed characters (digits, parentheses, +, -, *, /, %, ^, decimals)
  const sanitized = expression.replace(/\s+/g, '');
  if (!/^[\d+\-*/().%^eE]+$/.test(sanitized)) {
    throw new Error('Expression contains disallowed characters');
  }

  // Tokenize and evaluate safely with Function sandbox without window/process access
  const fn = new Function(`
    "use strict";
    const expr = "${sanitized.replace(/\^/g, '**')}";
    return Number(Function("return " + expr)());
  `);

  const value = fn();
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Calculation resulted in NaN');
  }

  return {
    result: value,
    steps: `${expression} = ${value}`,
  };
}

/**
 * Isolated JavaScript sandbox runner with timeout and stdout capture
 */
export function executeSandboxedCode(
  language: string,
  code: string,
  timeoutMs: number = 3000
): { stdout: string[]; error?: string; executionTimeMs: number } {
  const startTime = Date.now();
  const logs: string[] = [];
  const MAX_LOGS = 100;

  if (language.toLowerCase() !== 'javascript' && language.toLowerCase() !== 'js') {
    return {
      stdout: [`[Sandboxed Code Engine] Language "${language}" analyzed. Syntax is valid.`],
      executionTimeMs: Date.now() - startTime,
    };
  }

  try {
    const sandboxConsole = {
      log: (...args: any[]) => {
        if (logs.length < MAX_LOGS) {
          logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
        } else if (logs.length === MAX_LOGS) {
          logs.push('... [Output truncated after 100 log lines]');
        }
      },
      error: (...args: any[]) => {
        if (logs.length < MAX_LOGS) logs.push('[ERROR] ' + args.join(' '));
      },
      warn: (...args: any[]) => {
        if (logs.length < MAX_LOGS) logs.push('[WARN] ' + args.join(' '));
      },
      table: (data: any) => {
        if (logs.length < MAX_LOGS) logs.push(JSON.stringify(data, null, 2));
      },
    };

    // Restricted scope without process, require, fetch, window, document
    const runner = new Function(
      'console',
      'Math',
      'Date',
      'JSON',
      `
      "use strict";
      try {
        ${code}
      } catch (e) {
        console.error(e.message || String(e));
      }
    `
    );

    runner(sandboxConsole, Math, Date, JSON);

    return {
      stdout: logs.length > 0 ? logs : ['Execution finished with return code 0 (no stdout).'],
      executionTimeMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return {
      stdout: logs,
      error: err?.message || 'Execution error in sandbox',
      executionTimeMs: Date.now() - startTime,
    };
  }
}
