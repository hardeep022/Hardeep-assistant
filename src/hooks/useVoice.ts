import { useCallback, useEffect, useState, useRef } from 'react';
import type { VoiceEvent } from '../types';
import type { VoiceOrbState } from '../components/VoiceOrb';
import { soundEffects } from '../utils/soundEffects';
import { audioManager } from '../services/audio/AudioManager';
import { CompositeSTTProvider } from '../services/voice/SpeechToTextProvider';
import { SidecarWakeWordProvider } from '../services/voice/WakeWordProvider';

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
  const [isContinuous, setIsContinuous] = useState(true); // Hands-Free Continuous Mode
  const [lang, setLang] = useState<VoiceLanguage>('en-US');
  const [error, setError] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceOrbState>('idle');
  const [latestTranscript, setLatestTranscript] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isOrbOpen, setIsOrbOpen] = useState(false);

  const sttProviderRef = useRef<CompositeSTTProvider>(new CompositeSTTProvider());
  const wakeProviderRef = useRef<SidecarWakeWordProvider>(new SidecarWakeWordProvider());
  const lastTranscriptTimeRef = useRef<number>(0);
  const wasUserActivatedRef = useRef<boolean>(false);
  const prevStateRef = useRef<string>('idle');

  // Subscribe to AudioManager audio level updates & handle real-time Voice Barge-In Interrupt
  useEffect(() => {
    const unsubLevel = audioManager.subscribeLevel((level) => {
      setAudioLevel(level);

      // Voice Barge-In: If user starts speaking (level > 0.35) while Nova is speaking, interrupt speech immediately
      if (level > 0.35 && voiceState === 'speaking') {
        console.log('[VOICE] Barge-In Interrupt: User started speaking while Nova was speaking. Interrupting speech...');
        try {
          window.nova?.voiceCommand({ action: 'stop_speaking' });
          window.speechSynthesis?.cancel();
        } catch {}
        setVoiceState('listening');
        audioManager.setState('listening');
      }
    });
    return () => unsubLevel();
  }, [voiceState]);


  const startListeningRef = useRef<() => Promise<void>>();

  const handleFinalTranscript = useCallback((text: string) => {
    let trimmed = text.trim();
    if (!trimmed) return;

    console.log('[STT] RESPONSE RECEIVED');
    console.log(`[STT] TRANSCRIPT: "${trimmed}"`);

    // Check for "Hey Nova", "Ok Nova", "Nova" wake word invocation
    const wakeWordJustCalled = /^(hey\s+nova|ok\s+nova|hello\s+nova|nova)[\s,.!]*$/i.test(trimmed);
    if (wakeWordJustCalled) {
      console.log('[VOICE] Wake Word Detected: "Hey Nova". Activating active listening mode...');
      soundEffects.playStartListening();
      wasUserActivatedRef.current = true;
      setVoiceState('listening');
      audioManager.setState('listening');
      startListeningRef.current?.();
      return;
    }

    // Strip "Hey Nova" prefix if included in command (e.g., "Hey Nova, open my project")
    trimmed = trimmed.replace(/^(hey\s+nova|ok\s+nova|hello\s+nova|nova)[\s,.!]+/i, '').trim();
    if (!trimmed) return;

    // Deduplicate rapid dual-engine submissions within 1.5 seconds
    const now = Date.now();
    if (now - lastTranscriptTimeRef.current < 1500) {
      return;
    }
    lastTranscriptTimeRef.current = now;

    setLatestTranscript(trimmed);
    setVoiceState('transcribing');
    audioManager.setState('processing');
    soundEffects.playSuccess();

    setTimeout(() => {
      setVoiceState('thinking');
      audioManager.setState('thinking');
      onTranscript(trimmed);
      setTimeout(() => {
        if (wasUserActivatedRef.current) {
          setVoiceState('listening');
          audioManager.setState('listening');
          startListeningRef.current?.();
        } else {
          setVoiceState('idle');
          audioManager.setState('idle');
        }
      }, 1000);
    }, 400);
  }, [onTranscript]);



  const startListening = useCallback(async () => {
    setError(null);
    setIsOrbOpen(true);
    wasUserActivatedRef.current = true;

    const startedRecorder = await audioManager.startRecording();
    if (!startedRecorder) {
      setError('Microphone permission is required for voice input.');
      setVoiceState('error');
      return;
    }

    setIsListening(true);
    setVoiceState('listening');
    soundEffects.playListening();

    try {
      window.nova?.voiceCommand({ action: 'stop_speaking' });
    } catch {}

    sttProviderRef.current.start(
      (res) => {
        setLatestTranscript(res.text);
        if (res.isFinal) {
          handleFinalTranscript(res.text);
        }
      },
      (err) => {
        console.warn('[STT] Provider warning:', err);
      },
      lang
    );
  }, [lang, handleFinalTranscript]);

  startListeningRef.current = startListening;


  // Continuous Hands-Free Auto-Listening Subscription
  useEffect(() => {
    const unsubState = audioManager.subscribeState((newState) => {
      const prevState = prevStateRef.current;
      prevStateRef.current = newState;

      if (prevState === 'speaking' && newState === 'idle' && isContinuous && wasUserActivatedRef.current) {
        console.log('[VOICE] Continuous Mode: Auto-restarting microphone for hands-free conversation');
        setTimeout(() => {
          if (wasUserActivatedRef.current) {
            startListening();
          }
        }, 600);
      }
    });
    return () => unsubState();
  }, [isContinuous, startListening]);

  // Desktop sidecar events
  useEffect(() => {
    if (!window.nova?.onVoiceEvent) return;
    return window.nova.onVoiceEvent((event: VoiceEvent) => {
      if (event.event === 'listening') {
        setIsListening(true);
        setVoiceState('listening');
        audioManager.setState('listening');
      }
      if (event.event === 'listening_stopped') {
        setIsListening(false);
      }
      if (event.event === 'transcribing') {
        setVoiceState('transcribing');
        audioManager.setState('processing');
      }
      if (event.event === 'speaking') {
        setVoiceState('speaking');
        audioManager.setState('speaking');
      }
      if (event.event === 'wake_word_status') {
        setIsWakeWordEnabled(Boolean(event.enabled));
      }
      if (event.event === 'wake_word_detected' || event.event === 'wake_word') {
        console.log('[VOICE] Wake Word Detected via sidecar event! Activating microphone...');
        soundEffects.playStartListening();
        wasUserActivatedRef.current = true;
        setVoiceState('listening');
        audioManager.setState('listening');
        startListeningRef.current?.();
      }
      if (event.event === 'transcript' && event.text) {
        handleFinalTranscript(event.text);
      }

      if (event.event === 'error') {
        console.warn('[STT] sidecar notice/error:', event.message);
        if (event.message?.includes('No speech detected')) {
          setVoiceState('idle');
          if (!isContinuous) {
            audioManager.setState('idle');
          }
        }
      }
    });
  }, [handleFinalTranscript, isContinuous]);

  const stopListening = useCallback(async () => {
    soundEffects.playStopListening();
    console.log('[STT] STARTED');
    wasUserActivatedRef.current = false;
    sttProviderRef.current.stop();
    const result = await audioManager.stopRecording();

    if (result?.pcmBase64) {
      console.log(`[VOICE] SENDING PCM AUDIO TO LOCAL FASTER-WHISPER STT (lang: ${lang})`);
      try {
        window.nova?.voiceCommand({
          action: 'transcribe_pcm',
          pcmBase64: result.pcmBase64,
          sampleRate: result.sampleRate,
          lang,
        });
      } catch (err: any) {
        console.error('[STT] Failed to send PCM over IPC:', err);
      }
    } else if (result?.audioBase64) {
      console.log(`[VOICE] SENDING AUDIO BLOB TO LOCAL FASTER-WHISPER STT (lang: ${lang})`);
      try {
        window.nova?.voiceCommand({
          action: 'transcribe_audio_blob',
          audioBase64: result.audioBase64,
          mimeType: result.mimeType,
          lang,
        });
      } catch (err: any) {
        console.error('[STT] Failed to send Audio Blob over IPC:', err);
      }
    } else {
      console.warn('[STT] No microphone audio to send');
    }

    setIsListening(false);
    setVoiceState('transcribing');
  }, [lang]);

  const cancelListening = useCallback(() => {
    wasUserActivatedRef.current = false;
    sttProviderRef.current.cancel();
    audioManager.cancelRecording();
    setIsListening(false);
    setVoiceState('idle');
    setLatestTranscript('');
  }, []);

  const toggleWakeWord = useCallback(async () => {
    const enabled = !isWakeWordEnabled;
    setError(null);
    if (enabled) {
      const ok = await wakeProviderRef.current.enable();
      setIsWakeWordEnabled(ok);
    } else {
      wakeProviderRef.current.disable();
      setIsWakeWordEnabled(false);
    }
  }, [isWakeWordEnabled]);

  const toggleContinuous = useCallback(() => {
    setIsContinuous(p => !p);
  }, []);

  const toggleOrb = useCallback(() => {
    setIsOrbOpen(p => {
      const next = !p;
      if (!next) {
        wasUserActivatedRef.current = false;
        sttProviderRef.current.cancel();
        audioManager.cancelRecording();
        setIsListening(false);
        setVoiceState('idle');
      }
      return next;
    });
  }, []);

  const startHumanVoiceCall = useCallback(async () => {
    setIsOrbOpen(true);
    setIsContinuous(true);
    await startListening();
  }, [startListening]);

  const endHumanVoiceCall = useCallback(() => {
    wasUserActivatedRef.current = false;
    setIsOrbOpen(false);
    cancelListening();
  }, [cancelListening]);


  return {
    isListening,
    isWakeWordEnabled,
    isContinuous,
    setIsContinuous,
    lang,
    setLang,
    error,
    voiceState,
    latestTranscript,
    audioLevel,
    isOrbOpen,
    setIsOrbOpen,
    startListening,
    stopListening,
    cancelListening,
    toggleWakeWord,
    toggleContinuous,
    toggleOrb,
    startHumanVoiceCall,
    endHumanVoiceCall,
  };
}
