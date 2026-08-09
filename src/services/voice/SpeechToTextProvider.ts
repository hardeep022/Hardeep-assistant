export interface STTResult {
  text: string;
  isFinal: boolean;
  confidence?: number;
  lang?: string;
}

export type STTResultCallback = (result: STTResult) => void;
export type STTErrorCallback = (error: string) => void;

export interface SpeechToTextProvider {
  id: string;
  name: string;
  isSupported(): boolean;
  start(onResult: STTResultCallback, onError: STTErrorCallback, lang?: string): Promise<boolean>;
  stop(): void;
  cancel(): void;
}

/**
 * Web Speech API Implementation (Chrome/Electron Engine)
 */
export class WebSpeechSTTProvider implements SpeechToTextProvider {
  public id = 'web-speech';
  public name = 'Web Speech API (Browser)';
  private recognition: any = null;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public async start(onResult: STTResultCallback, onError: STTErrorCallback, lang: string = 'en-US'): Promise<boolean> {
    if (!this.isSupported()) {
      const err = 'Web Speech API is not supported in this environment.';
      console.error('STT: error =', err);
      onError(err);
      return false;
    }

    try {
      this.cancel();
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.lang = lang;
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      console.log('VOICE: sending audio to STT');
      console.log('STT: request started');

      rec.onresult = (e: any) => {
        const current = e.resultIndex;
        const transcript = e.results[current][0].transcript;
        const isFinal = Boolean(e.results[current].isFinal);
        const confidence = e.results[current][0].confidence;
        
        console.log('STT: response received');
        console.log(`STT: transcript = "${transcript}"`);
        
        onResult({ text: transcript, isFinal, confidence, lang });
      };

      rec.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          const errMessage = `WebSpeech error (${e.error})`;
          console.error('STT: error =', errMessage);
          onError(errMessage);
        }
      };

      this.recognition = rec;
      rec.start();
      return true;
    } catch (err: any) {
      console.error('STT: error =', err.message);
      onError(err.message || 'Failed to start Web Speech STT.');
      return false;
    }
  }

  public stop(): void {
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
    }
  }

  public cancel(): void {
    if (this.recognition) {
      try { this.recognition.abort(); } catch {}
      this.recognition = null;
    }
  }
}

/**
 * Local Desktop Python Sidecar Provider (Faster-Whisper)
 */
export class SidecarSTTProvider implements SpeechToTextProvider {
  public id = 'sidecar-whisper';
  public name = 'Local Faster-Whisper (Python Sidecar)';
  private unsub: (() => void) | null = null;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.nova?.voiceCommand);
  }

  public async start(onResult: STTResultCallback, onError: STTErrorCallback): Promise<boolean> {
    if (!this.isSupported()) {
      const err = 'Desktop voice sidecar IPC is unavailable.';
      console.error('STT: error =', err);
      onError(err);
      return false;
    }

    try {
      if (this.unsub) {
        this.unsub();
      }

      console.log('VOICE: sending audio to STT');
      console.log('STT: request started');

      this.unsub = window.nova!.onVoiceEvent((event: any) => {
        if (event.event === 'transcript' && event.text) {
          console.log('STT: response received');
          console.log(`STT: transcript = "${event.text}"`);
          onResult({ text: event.text, isFinal: true });
        }
        if (event.event === 'error' && event.message) {
          console.error('STT: error =', event.message);
          onError(event.message);
        }
      });

      window.nova!.voiceCommand({ action: 'start_ptt' });
      return true;
    } catch (err: any) {
      console.error('STT: error =', err.message);
      onError(err.message || 'Failed to start Sidecar STT.');
      return false;
    }
  }

  public stop(): void {
    try {
      window.nova?.voiceCommand({ action: 'stop_ptt' });
    } catch {}
    if (this.unsub) {
      this.unsub();
      this.unsub = null;
    }
  }

  public cancel(): void {
    this.stop();
  }
}

/**
 * Composite Provider: Auto-selects best STT provider (Sidecar -> WebSpeech Fallback)
 */
export class CompositeSTTProvider implements SpeechToTextProvider {
  public id = 'composite-auto';
  public name = 'Automatic STT (Local Whisper + Web Fallback)';
  private webProvider = new WebSpeechSTTProvider();
  private sidecarProvider = new SidecarSTTProvider();
  private activeProvider: SpeechToTextProvider | null = null;

  public getActiveProvider(): SpeechToTextProvider | null {
    return this.activeProvider;
  }

  public isSupported(): boolean {
    return this.sidecarProvider.isSupported() || this.webProvider.isSupported();
  }

  public async start(onResult: STTResultCallback, onError: STTErrorCallback, lang?: string): Promise<boolean> {
    if (this.sidecarProvider.isSupported()) {
      this.activeProvider = this.sidecarProvider;
      this.sidecarProvider.start(onResult, onError);
      if (this.webProvider.isSupported()) {
        this.webProvider.start(onResult, onError, lang);
      }
      return true;
    }

    if (this.webProvider.isSupported()) {
      this.activeProvider = this.webProvider;
      return this.webProvider.start(onResult, onError, lang);
    }

    const err = 'No supported Speech-to-Text provider found.';
    console.error('STT: error =', err);
    onError(err);
    return false;
  }

  public stop(): void {
    this.sidecarProvider.stop();
    this.webProvider.stop();
    this.activeProvider = null;
  }

  public cancel(): void {
    this.sidecarProvider.cancel();
    this.webProvider.cancel();
    this.activeProvider = null;
  }
}
