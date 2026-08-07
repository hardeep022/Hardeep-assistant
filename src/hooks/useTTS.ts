import { useState, useCallback, useEffect } from 'react';

export function useTTS() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((id: string, text: string, lang = 'en-US') => {
    if (!window.speechSynthesis) return;

    // Clean markdown formatting symbols for natural speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#~]/g, '')
      .trim();

    if (!cleanText) return;

    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;

    // Detect Hindi / Punjabi script automatically if contained
    if (/[\u0900-\u097F]/.test(cleanText)) {
      utterance.lang = 'hi-IN';
    } else if (/[\u0A00-\u0A7F]/.test(cleanText)) {
      utterance.lang = 'pa-IN';
    }

    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  }, [speakingId]);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
  }, []);

  return { speakingId, speak, stop };
}
