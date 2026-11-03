import { User, Conversation, Message, Memory, BillingOverview, Attachment, GroundingSource, ToolExecution, Artifact } from '../types/index.ts';

const TOKEN_KEY = 'novamind_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || 'usr_pro_alex';
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

// Authentication
export async function getMe(): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/me');
}

export async function login(email: string, password: string): Promise<{ token: string; user: User }> {
  const data = await request<{ token: string; user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(data.token);
  return data;
}

export async function register(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
  const data = await request<{ token: string; user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  setAuthToken(data.token);
  return data;
}

export async function switchDemoUser(userId: string): Promise<{ token: string; user: User }> {
  const data = await request<{ token: string; user: User }>('/auth/demo', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  setAuthToken(data.token);
  return data;
}

export async function updateProfile(updates: Partial<User>): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

// Conversations
export async function getConversations(search?: string, archived?: boolean): Promise<{ conversations: Conversation[] }> {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (archived) params.append('archived', 'true');
  const query = params.toString() ? `?${params.toString()}` : '';
  return request<{ conversations: Conversation[] }>(`/conversations${query}`);
}

export async function getConversation(id: string): Promise<{ conversation: Conversation; messages: Message[] }> {
  return request<{ conversation: Conversation; messages: Message[] }>(`/conversations/${id}`);
}

export async function createConversation(title?: string, mode?: string): Promise<{ conversation: Conversation }> {
  return request<{ conversation: Conversation }>('/conversations', {
    method: 'POST',
    body: JSON.stringify({ title, mode }),
  });
}

export async function updateConversation(id: string, updates: Partial<Conversation>): Promise<{ conversation: Conversation }> {
  return request<{ conversation: Conversation }>(`/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deleteConversation(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/conversations/${id}`, {
    method: 'DELETE',
  });
}

export async function forkConversation(id: string, upToMessageId?: string): Promise<{ conversation: Conversation }> {
  return request<{ conversation: Conversation }>(`/conversations/${id}/fork`, {
    method: 'POST',
    body: JSON.stringify({ upToMessageId }),
  });
}

// Memory
export async function getMemories(): Promise<{ memories: Memory[]; customInstructions: { aboutUser: string; assistantGuidelines: string } }> {
  return request('/memories');
}

export async function addMemory(content: string, category: string): Promise<{ memory: Memory }> {
  return request('/memories', {
    method: 'POST',
    body: JSON.stringify({ content, category }),
  });
}

export async function deleteMemory(id: string): Promise<{ success: boolean }> {
  return request(`/memories/${id}`, {
    method: 'DELETE',
  });
}

// Billing
export async function getBillingOverview(): Promise<BillingOverview> {
  return request('/billing/overview');
}

export async function upgradePlan(planId: string): Promise<{ success: boolean }> {
  return request('/billing/upgrade', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });
}

// Admin
export async function getAdminOverview(): Promise<any> {
  return request('/admin/overview');
}

// Streaming Chat Client
export interface StreamCallbacks {
  onInit?: (data: { conversationId: string; userMessageId: string }) => void;
  onChunk: (text: string) => void;
  onStatus?: (status: string) => void;
  onCitation?: (citation: GroundingSource) => void;
  onToolCall?: (toolCall: ToolExecution) => void;
  onComplete: (data: { message: Message; costUsd: number }) => void;
  onError: (error: string) => void;
}

export async function streamChatMessage(
  params: {
    conversationId?: string;
    prompt: string;
    mode: string;
    attachments?: Attachment[];
  },
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const token = getAuthToken();

  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
    signal,
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const errData = await res.json();
      if (errData?.error) errorMsg = errData.error;
    } catch {
      try {
        const text = await res.text();
        if (text) errorMsg = text.slice(0, 150);
      } catch {
        // default
      }
    }
    throw new Error(errorMsg);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('Readable stream not supported');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      let eventType = 'message';
      let dataStr = '';

      for (const rawLine of line.split('\n')) {
        if (rawLine.startsWith('event: ')) {
          eventType = rawLine.slice(7).trim();
        } else if (rawLine.startsWith('data: ')) {
          dataStr = rawLine.slice(6);
        }
      }

      if (dataStr) {
        try {
          const data = JSON.parse(dataStr);
          if (eventType === 'init') {
            callbacks.onInit?.(data);
          } else if (eventType === 'chunk') {
            callbacks.onChunk(data.text);
          } else if (eventType === 'status') {
            callbacks.onStatus?.(data.status);
          } else if (eventType === 'citation') {
            callbacks.onCitation?.(data.citation);
          } else if (eventType === 'tool_call') {
            callbacks.onToolCall?.(data.toolCall);
          } else if (eventType === 'complete') {
            callbacks.onComplete(data);
          } else if (eventType === 'error') {
            callbacks.onError(data.error);
          }
        } catch (e) {
          // ignore malformed SSE chunks
        }
      }
    }
  }
}
