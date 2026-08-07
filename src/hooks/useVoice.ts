import { useState, useRef, useCallback } from 'react';

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

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

// Declare Web Speech API types
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [lang, setLang] = useState<VoiceLanguage>('en-US');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const startListening = useCallback((onResult: (text: string) => void) => {
    setError(null);
    const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechClass) {
      setError('Speech recognition is not supported in this environment.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      let finalTranscript = '';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        const text = (finalTranscript + interim).trim();
        if (text) {
          onResult(text);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setError(`Voice error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error: unknown) {
      setError(`Failed to start mic: ${error instanceof Error ? error.message : String(error)}`);
      setIsListening(false);
    }
  }, [lang]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // The browser may already have stopped recognition.
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback((onResult: (text: string) => void) => {
    if (isListening) {
      stopListening();
    } else {
      startListening(onResult);
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    lang,
    setLang,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
}
