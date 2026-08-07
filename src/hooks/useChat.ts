import { useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MODELS } from '../types';
import type { Conversation, Message } from '../types';

export function useChat() {
  const { state, dispatch } = useApp();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortedRef = useRef(false);

  const sendMessage = useCallback(async (content: string, conversationId?: string) => {
    const { activeConversationId, conversations, settings } = state;
    const targetConversationId = conversationId ?? activeConversationId;
    if (!targetConversationId || isStreaming) return;

    const conversation = conversations.find(c => c.id === targetConversationId);
    if (!conversation && !conversationId) return;
    const pendingConversation: Pick<Conversation, 'messages' | 'model'> = conversation ?? {
      messages: [],
      model: settings.defaultModel,
    };

    const modelId = pendingConversation.model || settings.defaultModel;
    const staticModel = MODELS.find(m => m.id === modelId);
    const modelInfo = staticModel || {
      id: modelId,
      name: modelId,
      provider: 'ollama' as const,
      description: 'Local · Ollama',
    };

    const isDesktop = Boolean(window.nova);

    // Ollama is local — no API key needed
    if (!isDesktop && modelInfo.provider !== 'ollama') {
      dispatch({
        type: 'ADD_MESSAGE',
        conversationId: targetConversationId,
        message: {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ No API key found for **${modelInfo.provider}**. Please add your key in Settings (⚙️).`,
          timestamp: Date.now(),
          isError: true,
        },
      });
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', conversationId: targetConversationId, message: userMessage });

    // Auto-title from first user message
    if (pendingConversation.messages.length === 0) {
      const title = content.length > 48 ? content.slice(0, 48) + '…' : content;
      dispatch({ type: 'SET_TITLE', conversationId: targetConversationId, title });
    }

    // Start streaming
    setIsStreaming(true);
    setStreamingContent('');
    abortedRef.current = false;

    // Prepare message history for API
    const apiMessages = [...pendingConversation.messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }));

    // If window.nova (Electron IPC) is available:
    if (window.nova) {
      window.nova.clearListeners?.();

      window.nova.onChunk((chunk: string) => {
        if (!abortedRef.current) {
          setStreamingContent(prev => prev + chunk);
        }
      });

      window.nova.onDone((fullText: string) => {
        if (!abortedRef.current) {
          dispatch({
            type: 'ADD_MESSAGE',
            conversationId: targetConversationId,
            message: {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: fullText,
              timestamp: Date.now(),
              model: modelInfo.id,
            },
          });
        }
        setIsStreaming(false);
        setStreamingContent('');
      });

      window.nova.onError((err: string) => {
        if (!abortedRef.current) {
          dispatch({
            type: 'ADD_MESSAGE',
            conversationId: targetConversationId,
            message: {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `⚠️ Error: ${err}`,
              timestamp: Date.now(),
              isError: true,
            },
          });
        }
        setIsStreaming(false);
        setStreamingContent('');
      });

      window.nova.sendMessage({
        messages: apiMessages,
        model: modelInfo.id,
        provider: modelInfo.provider,
        ollamaUrl: settings.ollamaUrl || 'http://localhost:11434',
      });
    } else if (modelInfo.provider === 'ollama') {
      // Fallback for browser mode: direct fetch to Ollama API
      try {
        const ollamaUrl = settings.ollamaUrl || 'http://localhost:11434';
        const res = await fetch(`${ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelInfo.id, messages: apiMessages, stream: true }),
        });

        if (!res.ok) {
          throw new Error(`Ollama HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const json = JSON.parse(line.trim());
                const chunk = json.message?.content ?? '';
                if (chunk && !abortedRef.current) {
                  fullText += chunk;
                  setStreamingContent(prev => prev + chunk);
                }
              } catch {
                // Ignore an incomplete JSON chunk and continue reading the stream.
              }
            }
          }
        }

        if (!abortedRef.current) {
          dispatch({
            type: 'ADD_MESSAGE',
            conversationId: targetConversationId,
            message: {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: fullText,
              timestamp: Date.now(),
              model: modelInfo.id,
            },
          });
        }
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (!abortedRef.current) {
          dispatch({
            type: 'ADD_MESSAGE',
            conversationId: targetConversationId,
            message: {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: `⚠️ Ollama Connection Error: ${err.message || err}. Is Ollama running on localhost:11434?`,
              timestamp: Date.now(),
              isError: true,
            },
          });
        }
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
      }
    } else {
      dispatch({
        type: 'ADD_MESSAGE',
        conversationId: targetConversationId,
        message: {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `⚠️ Desktop window.nova context bridge not detected. Please run the desktop application using "npm start".`,
          timestamp: Date.now(),
          isError: true,
        },
      });
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [state, dispatch, isStreaming]);

  const stopStreaming = useCallback(() => {
    abortedRef.current = true;
    if (window.nova?.clearListeners) {
      window.nova.clearListeners();
    }
    setIsStreaming(false);
    setStreamingContent('');
  }, []);

  return { sendMessage, isStreaming, streamingContent, stopStreaming };
}
