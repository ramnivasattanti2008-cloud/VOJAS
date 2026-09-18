'use client';

/**
 * useAIAssistant — Hook for conversational VOJAS Copilot
 */

import { apiClient } from '@/lib/api';
import { createAIAssistantApi, type AIAssistantMessage, type AIAssistantResponse } from '@vojas/api-client';
import { useCallback, useState } from 'react';

const aiApi = createAIAssistantApi(apiClient);

export interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  responsePayload?: AIAssistantResponse;
}

export function useAIAssistant(initialProjectId?: string) {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string, contextProjectId?: string, language: string = 'en') => {
      if (!text.trim() || isLoading) return;

      const userEntry: ChatEntry = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userEntry]);
      setIsLoading(true);
      setError(null);

      try {
        const savedGeminiKey =
          typeof window !== 'undefined' ? localStorage.getItem('vojas_gemini_api_key') || undefined : undefined;

        // Build history from current messages
        const history: AIAssistantMessage[] = messages.map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const result = await aiApi.ask({
          message: text.trim(),
          history,
          contextProjectId: contextProjectId || initialProjectId,
          geminiApiKey: savedGeminiKey,
          language,
        });

        const assistantEntry: ChatEntry = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          responsePayload: result,
        };

        setMessages((prev) => [...prev, assistantEntry]);
        return result;
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to reach AI assistant. Please check connection.';
        setError(errMsg);

        const errorEntry: ChatEntry = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: 'AI assistance is temporarily unavailable or experienced a timeout. Your request could not be completed.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorEntry]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages, initialProjectId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
}

