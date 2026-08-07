import { useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MODELS } from '../types';
import type { Conversation, Message } from '../types';

export function useChat() {
  const { state, dispatch } = useApp();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortedRef = useRef(false);

  const fetchStream = useCallback(async (
    targetConversationId: string,
    apiMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
    modelId: string,
    systemPrompt?: string
  ) => {
    const { settings } = state;
    const staticModel = MODELS.find(m => m.id === modelId);
    const modelInfo = staticModel || {
      id: modelId,
      name: modelId,
      provider: 'ollama' as const,
      description: 'Local · Ollama',
    };

    const isDesktop = Boolean(window.nova);

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

    setIsStreaming(true);
    setStreamingContent('');
    abortedRef.current = false;

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
        systemPrompt,
      });
    } else if (modelInfo.provider === 'ollama') {
      try {
        const ollamaUrl = settings.ollamaUrl || 'http://localhost:11434';
        const formattedMessages = systemPrompt
          ? [{ role: 'system', content: systemPrompt }, ...apiMessages]
          : apiMessages;
        const res = await fetch(`${ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelInfo.id, messages: formattedMessages, stream: true }),
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
                // Ignore incomplete JSON frame
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
  }, [state, dispatch]);

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

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', conversationId: targetConversationId, message: userMessage });

    if (pendingConversation.messages.length === 0) {
      const title = content.length > 48 ? content.slice(0, 48) + '…' : content;
      dispatch({ type: 'SET_TITLE', conversationId: targetConversationId, title });
    }

    const apiMessages = [...pendingConversation.messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }));

    const modelId = pendingConversation.model || settings.defaultModel;
    const systemPrompt = pendingConversation.systemPrompt || settings.systemPrompt;
    await fetchStream(targetConversationId, apiMessages, modelId, systemPrompt);
  }, [state, dispatch, isStreaming, fetchStream]);

  const regenerate = useCallback(async (assistantMessageId: string) => {
    const { activeConversation, conversations, settings } = state;
    const conv = activeConversation ?? conversations.find(c => c.messages.some(m => m.id === assistantMessageId));
    if (!conv || isStreaming) return;

    const msgIdx = conv.messages.findIndex(m => m.id === assistantMessageId);
    if (msgIdx === -1) return;

    // Truncate to the message before this assistant message
    const previousMessages = conv.messages.slice(0, msgIdx);
    if (previousMessages.length === 0) return;

    const targetMsgId = previousMessages[previousMessages.length - 1].id;
    dispatch({ type: 'TRUNCATE_TO_MESSAGE', conversationId: conv.id, messageId: targetMsgId });

    const apiMessages = previousMessages.map(m => ({ role: m.role, content: m.content }));
    const modelId = conv.model || settings.defaultModel;
    const systemPrompt = conv.systemPrompt || settings.systemPrompt;
    await fetchStream(conv.id, apiMessages, modelId, systemPrompt);
  }, [state, dispatch, isStreaming, fetchStream]);

  const editAndResend = useCallback(async (userMessageId: string, newContent: string) => {
    const { activeConversation, conversations, settings } = state;
    const conv = activeConversation ?? conversations.find(c => c.messages.some(m => m.id === userMessageId));
    if (!conv || isStreaming) return;

    dispatch({ type: 'EDIT_MESSAGE', conversationId: conv.id, messageId: userMessageId, newContent });

    const msgIdx = conv.messages.findIndex(m => m.id === userMessageId);
    if (msgIdx === -1) return;

    const updatedHistory = conv.messages.slice(0, msgIdx + 1).map(m => ({
      role: m.role,
      content: m.id === userMessageId ? newContent : m.content,
    }));

    const modelId = conv.model || settings.defaultModel;
    const systemPrompt = conv.systemPrompt || settings.systemPrompt;
    await fetchStream(conv.id, updatedHistory, modelId, systemPrompt);
  }, [state, dispatch, isStreaming, fetchStream]);

  const deleteMessage = useCallback((messageId: string) => {
    const { activeConversationId } = state;
    if (!activeConversationId) return;
    dispatch({ type: 'DELETE_MESSAGE', conversationId: activeConversationId, messageId });
  }, [state, dispatch]);

  const stopStreaming = useCallback(() => {
    abortedRef.current = true;
    if (window.nova?.clearListeners) {
      window.nova.clearListeners();
    }
    setIsStreaming(false);
    setStreamingContent('');
  }, []);

  return { sendMessage, regenerate, editAndResend, deleteMessage, isStreaming, streamingContent, stopStreaming };
}
