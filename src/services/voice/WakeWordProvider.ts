export interface WakeWordProvider {
  id: string;
  name: string;
  keyword: string;
  isSupported(): boolean;
  isEnabled(): boolean;
  enable(): Promise<boolean>;
  disable(): void;
}

export class SidecarWakeWordProvider implements WakeWordProvider {
  public id = 'sidecar-wakeword';
  public name = 'Local Wake Word ("Hey Nova")';
  public keyword = 'Nova';
  private active = false;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.nova?.voiceCommand);
  }

  public isEnabled(): boolean {
    return this.active;
  }

  public async enable(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      window.nova?.voiceCommand({ action: 'set_wake_word', enabled: true });
      this.active = true;
      return true;
    } catch {
      this.active = false;
      return false;
    }
  }

  public disable(): void {
    if (!this.isSupported()) return;
    try {
      window.nova?.voiceCommand({ action: 'set_wake_word', enabled: false });
    } catch {}
    this.active = false;
  }
}
