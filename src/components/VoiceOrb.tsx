import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/I18nContext';

export type VoiceOrbState = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error';

interface Props {
  state: VoiceOrbState;
  onClick?: () => void;
  langCode?: string;
  transcript?: string;
  onClose?: () => void;
}

const STATE_CONFIG: Record<
  VoiceOrbState,
  { labelKey: string; defaultLabel: string; color1: string; color2: string; glow: string; icon: string }
> = {
  idle: {
    labelKey: 'ready',
    defaultLabel: 'Voice Active',
    color1: '#06b6d4',
    color2: '#3b82f6',
    glow: 'rgba(6, 182, 212, 0.4)',
    icon: '✦',
  },

  listening: {
    labelKey: 'listening',
    defaultLabel: 'Listening…',
    color1: '#8b5cf6',
    color2: '#ec4899',
    glow: 'rgba(139, 92, 246, 0.6)',
    icon: '🎙️',
  },
  transcribing: {
    labelKey: 'transcribing',
    defaultLabel: 'Transcribing speech…',
    color1: '#f59e0b',
    color2: '#fbbf24',
    glow: 'rgba(245, 158, 11, 0.5)',
    icon: '⚡',
  },
  thinking: {
    labelKey: 'thinking',
    defaultLabel: 'Nova is thinking…',
    color1: '#6366f1',
    color2: '#a855f7',
    glow: 'rgba(99, 102, 241, 0.5)',
    icon: '🧠',
  },
  speaking: {
    labelKey: 'speaking',
    defaultLabel: 'Speaking…',
    color1: '#10b981',
    color2: '#06b6d4',
    glow: 'rgba(16, 185, 129, 0.5)',
    icon: '🔊',
  },
  error: {
    labelKey: 'error',
    defaultLabel: 'Voice Error',
    color1: '#ef4444',
    color2: '#f43f5e',
    glow: 'rgba(239, 68, 68, 0.5)',
    icon: '⚠️',
  },
};

export function VoiceOrb({ state, onClick, langCode = 'en-US', transcript, onClose }: Props) {
  const { t } = useTranslation();
  const config = STATE_CONFIG[state] || STATE_CONFIG.idle;
  const [waveHeights, setWaveHeights] = useState<number[]>([40, 65, 30, 80, 50, 70, 35]);

  // Dynamic wave simulation during listening or speaking
  useEffect(() => {
    if (state === 'listening' || state === 'speaking') {
      const interval = setInterval(() => {
        setWaveHeights([
          Math.floor(20 + Math.random() * 80),
          Math.floor(30 + Math.random() * 70),
          Math.floor(15 + Math.random() * 85),
          Math.floor(40 + Math.random() * 60),
          Math.floor(25 + Math.random() * 75),
          Math.floor(35 + Math.random() * 65),
          Math.floor(20 + Math.random() * 80),
        ]);
      }, 120);
      return () => clearInterval(interval);
    } else {
      setWaveHeights([25, 35, 20, 45, 30, 40, 25]);
    }
  }, [state]);

  const langLabel = langCode.startsWith('hi') ? 'हिन्दी' : langCode.startsWith('pa') ? 'ਪੰਜਾਬੀ' : 'English';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 20px',
        background: 'var(--bg-card)',
        borderRadius: 'var(--r-lg)',
        border: `1px solid ${config.color1}40`,
        boxShadow: `0 8px 32px ${config.glow}`,
        backdropFilter: 'blur(16px)',
        position: 'relative',
        userSelect: 'none',
        minWidth: '260px',
        transition: 'all 0.3s ease',
      }}
    >
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '14px',
          }}
          aria-label="Close voice orb"
        >
          ✕
        </button>
      )}

      {/* Pulsing Glowing Orb Center */}
      <div
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={`Nova Voice Orb: ${state}`}
        style={{
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${config.color1}, ${config.color2})`,
          boxShadow: `0 0 24px ${config.glow}, inset 0 0 12px rgba(255,255,255,0.4)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
          transform: state === 'listening' ? 'scale(1.1)' : 'scale(1)',
          animation: state === 'thinking' ? 'spinSlow 6s linear infinite' : undefined,
        }}
      >
        <span style={{ fontSize: '26px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}>
          {config.icon}
        </span>
      </div>

      {/* Audio Wave Visualizer Bars */}
      {(state === 'listening' || state === 'speaking') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '24px', marginTop: '12px' }}>
          {waveHeights.map((h, i) => (
            <div
              key={i}
              style={{
                width: '3px',
                height: `${h}%`,
                background: config.color1,
                borderRadius: '2px',
                transition: 'height 0.12s ease',
                boxShadow: `0 0 6px ${config.color1}`,
              }}
            />
          ))}
        </div>
      )}

      {/* State & Language Label */}
      <div style={{ marginTop: '10px', textAlign: 'center' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {(t as (key: string) => string)(config.labelKey) || config.defaultLabel}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <span style={{ background: 'var(--bg-input)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            {langLabel}
          </span>
        </div>

      </div>

      {/* Live Transcript / Feedback */}
      {transcript && (
        <div
          style={{
            marginTop: '8px',
            padding: '6px 10px',
            background: 'var(--bg-input)',
            borderRadius: 'var(--r-xs)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
            maxWidth: '240px',
            textAlign: 'center',
            wordBreak: 'break-word',
          }}
        >
          "{transcript}"
        </div>
      )}
    </div>
  );
}
