import { useState, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MODELS, ASSISTANT_MODES } from '../types';
import type { Conversation, Message, Provider } from '../types';
import { soundEffects } from '../utils/soundEffects';
import { detectLanguage } from '../utils/languageDetector';
import { memoryService } from '../services/memoryService';
import { contextCompressor } from '../services/contextCompressor';
import { toolRouter } from '../services/toolRouter';

export function useChat() {
  const { state, dispatch } = useApp();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortedRef = useRef(false);

  const speakResponse = useCallback((text: string, voiceSpeed?: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text.trim()) return;
    try {
      const cleanText = text
        .replace(/```[\s\S]*?```/g, 'Code block omitted.')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/[*_#~>|]/g, '')
        .replace(/[-*+]\s+/g, '')
        .replace(/\n+/g, '. ')
        .trim();

      if (!cleanText) return;

      const detected = detectLanguage(cleanText);
      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = voiceSpeed ?? 1.02;
      utterance.pitch = 1.0;
      utterance.lang = detected.code;

      const voices = synth.getVoices();
      const shortLang = detected.shortCode.toLowerCase();
      const fullLang = detected.code.toLowerCase();

      let matchingVoice = voices.find(v => v.lang.toLowerCase() === fullLang)
        || voices.find(v => v.lang.toLowerCase().startsWith(shortLang))
        || voices.find(v => v.name.toLowerCase().includes(detected.name.toLowerCase()));

      if (!matchingVoice && shortLang === 'pa') {
        matchingVoice = voices.find(v => v.lang.startsWith('hi'))
          || voices.find(v => v.lang.startsWith('en-IN'));
      }

      if (!matchingVoice && shortLang === 'en') {
        matchingVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('David') || v.name.includes('Zira') || v.name.includes('Google')))
          || voices.find(v => v.lang.startsWith('en'));
      }

      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      synth.speak(utterance);
    } catch (e) {
      console.warn('Auto-speak error:', e);
    }
  }, []);

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
          soundEffects.playSuccess();
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

          if (settings.autoSpeak) {
            speakResponse(fullText, settings.voiceSpeed);
          }
        }
        setIsStreaming(false);
        setStreamingContent('');
      });

      window.nova.onError((err: string) => {
        if (!abortedRef.current) {
          soundEffects.playError();
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
    } else if (modelInfo.provider === 'gemini') {
      try {
        const apiKey = settings.geminiKey;
        if (!apiKey) {
          console.warn('[AI ROUTER] No Gemini key configured. Silently routing to local Ollama llama3.2.');
          return fetchStream(targetConversationId, apiMessages, 'llama3.2', systemPrompt);
        }
        const contents = apiMessages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));
        const bodyPayload: Record<string, unknown> = { contents };
        if (systemPrompt) {
          bodyPayload.systemInstruction = { parts: [{ text: systemPrompt }] };
        }
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelInfo.id}:streamGenerateContent?alt=sse&key=${apiKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyPayload) }
        );

        if (!res.ok) {
          console.warn(`[AI ROUTER] Gemini returned HTTP ${res.status}. Silently routing to local Ollama llama3.2.`);
          return fetchStream(targetConversationId, apiMessages, 'llama3.2', systemPrompt);
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
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (data === '[DONE]') continue;
              try {
                const json = JSON.parse(data);
                const chunk = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                if (chunk && !abortedRef.current) {
                  fullText += chunk;
                  setStreamingContent(prev => prev + chunk);
                }
              } catch {}
            }
          }
        }

        if (!abortedRef.current) {
          soundEffects.playSuccess();
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

          if (settings.autoSpeak) {
            speakResponse(fullText, settings.voiceSpeed);
          }
        }
      } catch (err: any) {
        soundEffects.playError();
        dispatch({
          type: 'ADD_MESSAGE',
          conversationId: targetConversationId,
          message: {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `⚠️ Gemini Error: ${err.message || err}`,
            timestamp: Date.now(),
            isError: true,
          },
        });
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
      }
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
          soundEffects.playSuccess();
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

          if (settings.autoSpeak) {
            speakResponse(fullText, settings.voiceSpeed);
          }
        }
      } catch (error: unknown) {
        soundEffects.playError();
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
  }, [state, dispatch, speakResponse]);

  // Generate a concise title for a conversation using a lightweight AI call
  const autoTitleConversation = useCallback(async (
    conversationId: string,
    userMessage: string,
    modelId: string,
    provider: Provider,
  ) => {
    try {
      const { settings } = state;
      const ollamaUrl = settings.ollamaUrl || 'http://localhost:11434';
      const titlePrompt = [
        { role: 'user' as const, content: `Generate a very short title (3-6 words, no quotes, no punctuation) that summarizes this message:\n\n"${userMessage.slice(0, 300)}"` },
      ];

      if (provider === 'ollama') {
        const res = await fetch(`${ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelId, messages: titlePrompt, stream: false }),
        });
        if (res.ok) {
          const data = await res.json() as { message?: { content?: string } };
          const title = data.message?.content?.trim().replace(/^["']|["']$/g, '');
          if (title && title.length > 0 && title.length < 80) {
            dispatch({ type: 'SET_TITLE', conversationId, title });
          }
        }
      }
    } catch {
      // Auto-title is best-effort; silently ignore failures.
    }
  }, [state, dispatch]);

  const sendMessage = useCallback(async (content: string, conversationId?: string) => {
    const { activeConversationId, conversations, settings } = state;
    let targetConversationId = conversationId ?? activeConversationId;
    if (isStreaming) return;

    // If no active conversation exists, create one immediately
    if (!targetConversationId) {
      targetConversationId = crypto.randomUUID();
      dispatch({
        type: 'NEW_CHAT',
        id: targetConversationId,
        model: settings.defaultModel,
        mode: 'general',
      });
    }

    const conversation = conversations.find(c => c.id === targetConversationId);
    const pendingConversation: Pick<Conversation, 'messages' | 'model'> = conversation ?? {
      messages: [],
      model: settings.defaultModel,
    };

    const isFirstMessage = pendingConversation.messages.length === 0;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    dispatch({ type: 'ADD_MESSAGE', conversationId: targetConversationId, message: userMessage });

    // Set a temporary title from the user message immediately
    if (isFirstMessage) {
      const title = content.length > 48 ? content.slice(0, 48) + '…' : content;
      dispatch({ type: 'SET_TITLE', conversationId: targetConversationId, title });
    }

    // 1. Natural Memory Command Handler ("Remember that...", "Show my memories", "Forget...")
    const memoryCheck = await memoryService.handleNaturalMemoryCommand(content);
    if (memoryCheck.handled && memoryCheck.responseMessage) {
      dispatch({
        type: 'ADD_MESSAGE',
        conversationId: targetConversationId,
        message: {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: memoryCheck.responseMessage,
          timestamp: Date.now(),
        },
      });
      return;
    }

    // 2. Structured Desktop Tool Intent Handler ("Open Chrome", "Create folder Nova", "Show system info")
    const toolCallReq = toolRouter.parseNaturalToolIntent(content);
    if (toolCallReq) {
      const execRes = await toolRouter.executeTool(toolCallReq);
      if (execRes.success && execRes.result) {
        const resultText = typeof execRes.result === 'object' ? JSON.stringify(execRes.result, null, 2) : String(execRes.result);
        dispatch({
          type: 'ADD_MESSAGE',
          conversationId: targetConversationId,
          message: {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `🛠️ **Executed Tool [${toolCallReq.tool}]**\n\`\`\`json\n${resultText}\n\`\`\``,
            timestamp: Date.now(),
          },
        });
        return;
      }
    }

    const allHistory = [...pendingConversation.messages, userMessage];
    const compressedMessages = contextCompressor.compressContext(allHistory);

    const modeConfig = ASSISTANT_MODES.find(m => m.id === (conversation?.mode ?? 'general'));
    const baseSystemPrompt =
      conversation?.systemPrompt ||
      modeConfig?.systemPrompt ||
      settings.systemPrompt ||
      '';
    const memoryContext = await memoryService.buildMemoryContext();
    const systemPrompt = `${baseSystemPrompt}${memoryContext}`;

    const modelId = pendingConversation.model || conversation?.model || settings.defaultModel || 'gemini-2.0-flash';

    await fetchStream(targetConversationId, compressedMessages, modelId, systemPrompt);

    // After first response, generate an AI-powered title in the background
    if (isFirstMessage) {
      const staticModel = MODELS.find(m => m.id === modelId);
      const provider: Provider = staticModel?.provider ?? 'ollama';
      void autoTitleConversation(targetConversationId, content, modelId, provider);
    }
  }, [state, dispatch, isStreaming, fetchStream, autoTitleConversation]);

  const regenerate = useCallback(async (assistantMessageId: string) => {
    const { conversations, settings } = state;
    const conv = conversations.find(c => c.messages.some(m => m.id === assistantMessageId));
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
    const modeConfig = ASSISTANT_MODES.find(m => m.id === (conv.mode ?? 'general'));
    const systemPrompt = conv.systemPrompt || modeConfig?.systemPrompt || settings.systemPrompt;
    await fetchStream(conv.id, apiMessages, modelId, systemPrompt);
  }, [state, dispatch, isStreaming, fetchStream]);

  const editAndResend = useCallback(async (userMessageId: string, newContent: string) => {
    const { conversations, settings } = state;
    const conv = conversations.find(c => c.messages.some(m => m.id === userMessageId));
    if (!conv || isStreaming) return;

    dispatch({ type: 'EDIT_MESSAGE', conversationId: conv.id, messageId: userMessageId, newContent });

    const msgIdx = conv.messages.findIndex(m => m.id === userMessageId);
    if (msgIdx === -1) return;

    const updatedHistory = conv.messages.slice(0, msgIdx + 1).map(m => ({
      role: m.role,
      content: m.id === userMessageId ? newContent : m.content,
    }));

    const modelId = conv.model || settings.defaultModel;
    const modeConfig = ASSISTANT_MODES.find(m => m.id === (conv.mode ?? 'general'));
    const systemPrompt = conv.systemPrompt || modeConfig?.systemPrompt || settings.systemPrompt;
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
