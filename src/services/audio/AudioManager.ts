export type AudioState = 'idle' | 'listening' | 'processing' | 'thinking' | 'speaking' | 'error';

export interface PermissionStatus {
  granted: boolean;
  error?: string;
}

export type AudioLevelCallback = (level: number) => void;
export type AudioStateCallback = (state: AudioState, error?: string) => void;

export interface MicTestResult {
  connected: boolean;
  tracksCount: number;
  trackState: string;
  trackEnabled: boolean;
  trackMuted: boolean;
  error?: string;
}

export interface RecordingResult {
  pcmBase64?: string;
  audioBase64?: string;
  sampleRate?: number;
  mimeType?: string;
}

class AudioManager {
  private static instance: AudioManager;
  private state: AudioState = 'idle';
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private pcmData: Float32Array[] = [];
  private analyser: AnalyserNode | null = null;
  private levelInterval: number | null = null;
  private levelCallbacks: Set<AudioLevelCallback> = new Set();
  private stateCallbacks: Set<AudioStateCallback> = new Set();
  private currentVolume: number = 1.0;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public getState(): AudioState {
    return this.state;
  }

  public setState(newState: AudioState, errorMsg?: string) {
    this.state = newState;
    this.stateCallbacks.forEach(cb => cb(newState, errorMsg));
  }

  public subscribeState(callback: AudioStateCallback): () => void {
    this.stateCallbacks.add(callback);
    callback(this.state);
    return () => this.stateCallbacks.delete(callback);
  }

  public subscribeLevel(callback: AudioLevelCallback): () => void {
    this.levelCallbacks.add(callback);
    return () => this.levelCallbacks.delete(callback);
  }

  public setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
  }

  public getVolume(): number {
    return this.currentVolume;
  }

  public async runMicTest(): Promise<MicTestResult> {
    console.log('[VOICE] START CLICK');
    console.log('[VOICE] requesting microphone permission');

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      const err = 'Microphone API not supported on this device/browser.';
      console.error('[VOICE] permission result: DENIED -', err);
      return { connected: false, tracksCount: 0, trackState: 'none', trackEnabled: false, trackMuted: false, error: err };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getAudioTracks();
      const firstTrack = tracks[0];

      console.log('[VOICE] permission result: GRANTED');
      console.log('[VOICE] microphone stream obtained: YES');
      console.log(`[VOICE] audio tracks: ${tracks.length}`);
      console.log(`[VOICE] track state: ${firstTrack?.readyState}`);
      console.log(`[VOICE] track enabled: ${firstTrack?.enabled}`);
      console.log(`[VOICE] track muted: ${firstTrack?.muted}`);

      const result: MicTestResult = {
        connected: true,
        tracksCount: tracks.length,
        trackState: firstTrack?.readyState || 'unknown',
        trackEnabled: firstTrack?.enabled ?? false,
        trackMuted: firstTrack?.muted ?? false,
      };

      // Clean up test stream tracks immediately
      tracks.forEach(track => track.stop());
      return result;
    } catch (err: any) {
      console.error('[VOICE] permission result: DENIED -', err.name, err.message);
      return {
        connected: false,
        tracksCount: 0,
        trackState: 'error',
        trackEnabled: false,
        trackMuted: false,
        error: `${err.name}: ${err.message}`,
      };
    }
  }

  public async requestMicrophonePermission(): Promise<PermissionStatus> {
    const test = await this.runMicTest();
    if (test.connected) {
      return { granted: true };
    }
    return { granted: false, error: test.error };
  }

  public async startRecording(): Promise<boolean> {
    const perm = await this.requestMicrophonePermission();
    if (!perm.granted) {
      this.setState('error', perm.error);
      return false;
    }

    try {
      this.stopRecording();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      this.mediaStream = stream;
      this.pcmData = [];
      this.audioChunks = [];

      // 1. Setup MediaRecorder
      if (typeof MediaRecorder !== 'undefined') {
        try {
          this.mediaRecorder = new MediaRecorder(stream);
          this.mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              this.audioChunks.push(e.data);
            }
          };
          this.mediaRecorder.start(100);
        } catch (e) {
          console.warn('[VOICE] MediaRecorder init note:', e);
        }
      }

      // 2. Setup AudioContext for 16kHz Float32 PCM sampling & Level Analyzer
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          this.audioContext = new AudioCtx({ sampleRate: 16000 });
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
          }

          const source = this.audioContext.createMediaStreamSource(stream);

          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 64;
          source.connect(this.analyser);

          const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
          this.levelInterval = window.setInterval(() => {
            if (this.analyser && this.levelCallbacks.size > 0) {
              this.analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              const normalized = Math.min(1, avg / 128);
              this.levelCallbacks.forEach(cb => cb(normalized));
            }
          }, 50);

          this.scriptProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
          this.scriptProcessor.onaudioprocess = (e) => {
            const inputBuffer = e.inputBuffer.getChannelData(0);
            const copy = new Float32Array(inputBuffer.length);
            copy.set(inputBuffer);
            this.pcmData.push(copy);
            console.log('[VOICE] AUDIO DATA RECEIVED');
            console.log(`[VOICE] AUDIO SIZE: ${copy.byteLength} bytes`);
          };

          source.connect(this.scriptProcessor);
          const muteGain = this.audioContext.createGain();
          muteGain.gain.value = 0;
          this.scriptProcessor.connect(muteGain);
          muteGain.connect(this.audioContext.destination);
        } catch (e) {
          console.warn('[VOICE] AudioContext PCM note:', e);
        }
      }

      console.log('[VOICE] RECORDING STARTED');
      this.setState('listening');
      return true;
    } catch (err: any) {
      console.error('[VOICE] start error:', err.message);
      this.setState('error', err.message || 'Failed to start audio recording.');
      return false;
    }
  }

  public async stopRecording(): Promise<RecordingResult | null> {
    console.log('[VOICE] RECORDING STOPPED');

    if (this.levelInterval !== null) {
      clearInterval(this.levelInterval);
      this.levelInterval = null;
    }

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        if (!this.mediaRecorder) return resolve();
        this.mediaRecorder.onstop = () => resolve();
        try {
          this.mediaRecorder.stop();
        } catch {
          resolve();
        }
      });
      this.mediaRecorder = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Process Float32 PCM if available
    let pcmBase64 = '';
    if (this.pcmData.length > 0) {
      let totalSamples = 0;
      for (const chunk of this.pcmData) totalSamples += chunk.length;

      const merged = new Float32Array(totalSamples);
      let offset = 0;
      for (const chunk of this.pcmData) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      const bytes = new Uint8Array(merged.buffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode.apply(null, Array.from(sub));
      }
      pcmBase64 = btoa(binary);
      console.log(`[VOICE] TOTAL CAPTURED PCM: ${totalSamples} samples (${bytes.byteLength} bytes)`);
    }

    // Process MediaRecorder WebM audio chunks if PCM is empty
    let audioBase64 = '';
    let mimeType = 'audio/webm';
    if (this.audioChunks.length > 0) {
      const blob = new Blob(this.audioChunks, { type: this.audioChunks[0].type || 'audio/webm' });
      mimeType = blob.type;
      const arrayBuf = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuf);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode.apply(null, Array.from(sub));
      }
      audioBase64 = btoa(binary);
      console.log(`[VOICE] TOTAL CAPTURED AUDIO BLOB: ${blob.size} bytes (${mimeType})`);
    }

    this.pcmData = [];
    this.audioChunks = [];

    if (this.state === 'listening') {
      this.setState('idle');
    }

    if (pcmBase64) {
      return { pcmBase64, sampleRate: 16000 };
    } else if (audioBase64) {
      return { audioBase64, mimeType };
    }

    return null;
  }

  public cancelRecording() {
    this.stopRecording();
    this.pcmData = [];
    this.audioChunks = [];
    this.setState('idle');
  }
}

export const audioManager = AudioManager.getInstance();
