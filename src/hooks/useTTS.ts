import { useCallback, useEffect, useState, useRef } from 'react';
import type { VoiceEvent } from '../types';
import { CompositeTTSProvider, type TTSOptions } from '../services/voice/TextToSpeechProvider';
import { audioManager } from '../services/audio/AudioManager';

export function useTTS() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const ttsProviderRef = useRef<CompositeTTSProvider>(new CompositeTTSProvider());

  useEffect(() => {
    setIsSupported(ttsProviderRef.current.isSupported());

    if (window.nova?.onVoiceEvent) {
      const unsub = window.nova.onVoiceEvent((event: VoiceEvent) => {
        if (event.event === 'speaking_stopped') {
          setSpeakingId(null);
          audioManager.setState('idle');
        }
      });
      return () => unsub?.();
    }
  }, []);

  const stop = useCallback(() => {
    ttsProviderRef.current.stop();
    setSpeakingId(null);
    audioManager.setState('idle');
  }, []);

  const speak = useCallback(async (id: string, text: string, options?: TTSOptions) => {
    if (speakingId === id) {
      stop();
      return;
    }

    stop();
    setSpeakingId(id);
    audioManager.setState('speaking');

    const effectiveVolume = options?.volume ?? audioManager.getVolume();
    await ttsProviderRef.current.speak(text, { ...options, volume: effectiveVolume });

    setSpeakingId(null);
    audioManager.setState('idle');
  }, [speakingId, stop]);

  return {
    speakingId,
    isSpeaking: speakingId !== null,
    speak,
    stop,
    isSupported,
  };
}
