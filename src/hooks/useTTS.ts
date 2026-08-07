import { useCallback, useEffect, useState } from 'react';
import type { VoiceEvent } from '../types';

export function useTTS() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    if (!window.nova?.onVoiceEvent) return;
    return window.nova.onVoiceEvent((event: VoiceEvent) => {
      if (event.event === 'speaking_stopped') setSpeakingId(null);
    });
  }, []);

  const stop = useCallback(() => {
    window.nova?.voiceCommand({ action: 'stop_speaking' });
    setSpeakingId(null);
  }, []);

  const speak = useCallback((id: string, text: string) => {
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#~]/g, '')
      .trim();
    if (!cleanText) return;
    if (speakingId === id) {
      stop();
      return;
    }
    setSpeakingId(id);
    window.nova?.voiceCommand({ action: 'speak', text: cleanText });
  }, [speakingId, stop]);

  return { speakingId, speak, stop };
}
