import type { ApiClient } from './client.js';

export interface AIAssistantMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIAssistantRequest {
  message: string;
  history?: AIAssistantMessage[];
  contextProjectId?: string;
  geminiApiKey?: string;
  openaiApiKey?: string;
  language?: string;
}

export interface AIAssistantResponse {
  answer: string;
  facts: string[];
  analysis: string[];
  missingData: string[];
  sources: string[];
  recommendedActions: string[];
  toolCallsExecuted: string[];
  modelUsed: string;
  roleContext: string;
}

// Matches AIToolDefinition in apps/api/src/services/aiAgent/aiTools.ts — the
// catalog of server-side controlled tools returned by GET /ai/tools.
export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
}

export interface AIAssistantApi {
  ask(request: AIAssistantRequest): Promise<AIAssistantResponse>;
  getTools(): Promise<{ tools: AIToolDefinition[]; enforcement: string }>;
}

export function createAIAssistantApi(client: ApiClient): AIAssistantApi {
  return {
    ask(request: AIAssistantRequest): Promise<AIAssistantResponse> {
      return client.post<AIAssistantResponse>('/ai/assistant', request);
    },
    getTools(): Promise<{ tools: AIToolDefinition[]; enforcement: string }> {
      return client.get('/ai/tools');
    },
  };
}

