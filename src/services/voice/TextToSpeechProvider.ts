import { detectLanguage } from '../../utils/languageDetector';

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
  lang?: string;
}

export interface TextToSpeechProvider {
  id: string;
  name: string;
  isSupported(): boolean;
  speak(text: string, options?: TTSOptions): Promise<void>;
  stop(): void;
  isSpeaking(): boolean;
}

/**
 * Web Speech Synthesis Provider (Browser / Electron)
 */
export class WebSpeechTTSProvider implements TextToSpeechProvider {
  public id = 'web-tts';
  public name = 'System Web Speech Synthesis';
  private currentlySpeaking = false;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public isSpeaking(): boolean {
    return this.currentlySpeaking || (typeof window !== 'undefined' && Boolean(window.speechSynthesis?.speaking));
  }

  public stop(): void {
    if (this.isSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    this.currentlySpeaking = false;
  }

  public async speak(text: string, options?: TTSOptions): Promise<void> {
    if (!this.isSupported()) return;

    this.stop();

    // Clean Markdown code blocks, symbols, urls for clean speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_#~>|]/g, '')
      .replace(/[-*+]\s+/g, '')
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) return;

    const detected = options?.lang
      ? { code: options.lang, name: options.lang, shortCode: options.lang.slice(0, 2) }
      : detectLanguage(cleanText);

    return new Promise((resolve, reject) => {
      try {
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = options?.rate ?? 1.0;
        utterance.pitch = options?.pitch ?? 1.0;
        utterance.volume = options?.volume ?? 1.0;
        utterance.lang = detected.code;

        const voices = synth.getVoices();
        let selectedVoice: SpeechSynthesisVoice | undefined;

        if (options?.voiceName) {
          selectedVoice = voices.find(v => v.name === options.voiceName);
        }

        if (!selectedVoice) {
          const shortLang = detected.shortCode.toLowerCase();
          const fullLang = detected.code.toLowerCase();
          selectedVoice = voices.find(v => v.lang.toLowerCase() === fullLang)
            || voices.find(v => v.lang.toLowerCase().startsWith(shortLang))
            || voices.find(v => v.name.toLowerCase().includes(detected.name.toLowerCase()));

          if (!selectedVoice && shortLang === 'pa') {
            selectedVoice = voices.find(v => v.lang.startsWith('hi')) || voices.find(v => v.lang.startsWith('en-IN'));
          }
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
          this.currentlySpeaking = true;
        };

        utterance.onend = () => {
          this.currentlySpeaking = false;
          resolve();
        };

        utterance.onerror = (e) => {
          console.warn('[TTS] WebSpeech TTS Notice/Error:', e);
          this.currentlySpeaking = false;
          reject(e);
        };

        synth.speak(utterance);
      } catch (err) {
        console.warn('[TTS] WebSpeech Exception:', err);
        this.currentlySpeaking = false;
        reject(err);
      }
    });
  }
}

/**
 * Desktop Sidecar TTS Provider (Kokoro / pyttsx3 Python Backend)
 */
export class SidecarTTSProvider implements TextToSpeechProvider {
  public id = 'sidecar-tts';
  public name = 'Local Neural TTS (Kokoro / SAPI5)';
  private speaking = false;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.nova?.voiceCommand);
  }

  public isSpeaking(): boolean {
    return this.speaking;
  }

  public stop(): void {
    try {
      window.nova?.voiceCommand({ action: 'stop_speaking' });
    } catch {}
    this.speaking = false;
  }

  public async speak(text: string, _options?: TTSOptions): Promise<void> {
    if (!this.isSupported()) return;

    this.stop();
    this.speaking = true;

    try {
      window.nova?.voiceCommand({ action: 'speak', text });
    } catch {
      this.speaking = false;
    }
  }
}

/**
 * Composite TTS Provider with Fail-Safe Fallback Chain
 */
export class CompositeTTSProvider implements TextToSpeechProvider {
  public id = 'composite-tts';
  public name = 'Automatic Neural + Web TTS';
  private webTTS = new WebSpeechTTSProvider();
  private sidecarTTS = new SidecarTTSProvider();

  public isSupported(): boolean {
    return this.sidecarTTS.isSupported() || this.webTTS.isSupported();
  }

  public isSpeaking(): boolean {
    return this.sidecarTTS.isSpeaking() || this.webTTS.isSpeaking();
  }

  public stop(): void {
    this.sidecarTTS.stop();
    this.webTTS.stop();
  }

  public async speak(text: string, options?: TTSOptions): Promise<void> {
    this.stop();
    if (this.webTTS.isSupported()) {
      try {
        await this.webTTS.speak(text, options);
        return;
      } catch {
        console.log('[TTS] WebSpeech TTS failed, attempting Python sidecar TTS fallback...');
      }
    }
    if (this.sidecarTTS.isSupported()) {
      await this.sidecarTTS.speak(text, options);
    }
  }
}
