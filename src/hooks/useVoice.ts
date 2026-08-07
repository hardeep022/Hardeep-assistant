import { useCallback, useEffect, useState } from 'react';
import type { VoiceEvent } from '../types';

export type VoiceLanguage = 'en-US' | 'hi-IN' | 'pa-IN';

export interface LanguageOption {
  code: VoiceLanguage;
  label: string;
  flag: string;
}

export const VOICE_LANGUAGES: LanguageOption[] = [
  { code: 'en-US', label: 'English', flag: '🇺🇸' },
  { code: 'hi-IN', label: 'हिंदी (Hindi)', flag: '🇮🇳' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ (Punjabi)', flag: '🇮🇳' },
];

export function useVoice(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(false);
  const [lang, setLang] = useState<VoiceLanguage>('en-US');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!window.nova?.onVoiceEvent) return;
    return window.nova.onVoiceEvent((event: VoiceEvent) => {
      if (event.event === 'listening') setIsListening(true);
      if (event.event === 'listening_stopped') setIsListening(false);
      if (event.event === 'wake_word_status') setIsWakeWordEnabled(Boolean(event.enabled));
      if (event.event === 'transcript' && event.text) onTranscript(event.text);
      if (event.event === 'error') {
        setError(event.message ?? 'Voice runtime failed.');
        setIsListening(false);
      }
    });
  }, [onTranscript]);

  const startListening = useCallback(() => {
    setError(null);
    if (!window.nova?.voiceCommand) {
      setError('Local voice runtime is available only in the Nova desktop app.');
      return;
    }
    window.nova.voiceCommand({ action: 'stop_speaking' });
    window.nova.voiceCommand({ action: 'start_ptt' });
  }, []);

  const stopListening = useCallback(() => {
    window.nova?.voiceCommand({ action: 'stop_ptt' });
  }, []);

  const toggleWakeWord = useCallback(() => {
    const enabled = !isWakeWordEnabled;
    setError(null);
    window.nova?.voiceCommand({ action: 'set_wake_word', enabled });
  }, [isWakeWordEnabled]);

  return {
    isListening,
    isWakeWordEnabled,
    lang,
    setLang,
    error,
    startListening,
    stopListening,
    toggleWakeWord,
  };
}
