import { useEffect, useState } from 'react';
import type { AgentPermissionLevel, HardwareMetrics, AIModel } from '../types';


interface ModelStatusFooterProps {
  currentModel: string;
  provider: string;
  permissionLevel: AgentPermissionLevel;
  tokensPerSec: number;
  availableModels: AIModel[];
  onSelectModel: (modelId: string) => void;
  onChangePermissionLevel: (level: AgentPermissionLevel) => void;
  onOpenSettings: () => void;
}

export function ModelStatusFooter({
  currentModel,
  provider,
  permissionLevel,
  tokensPerSec,
  availableModels,
  onSelectModel,
  onChangePermissionLevel,
  onOpenSettings,
}: ModelStatusFooterProps) {
  const [metrics, setMetrics] = useState<HardwareMetrics | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (window.nova?.getHardwareMetrics) {
        try {
          const res = await window.nova.getHardwareMetrics();
          setMetrics(res);
        } catch {}
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="model-status-footer">
      {/* Left: Model Selector & Status */}
      <div className="footer-section model-section">
        <span className="status-indicator online" title="Ollama Service Connected" />
        <span className="provider-label">{provider.toUpperCase()}</span>
        
        <select
          className="model-dropdown"
          value={currentModel}
          onChange={e => onSelectModel(e.target.value)}
        >
          {availableModels.map(m => (
            <option key={m.id} value={m.id}>
              {m.name} {m.free ? '(Local)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Center: Hardware Metrics & Speed Telemetry */}
      <div className="footer-section metrics-section">
        {metrics && (
          <>
            <span className="metric-chip" title="System RAM Utilization">
              🧠 RAM {metrics.usedMemGB}/{metrics.totalMemGB}GB ({metrics.memUsagePercent}%)
            </span>
            <span className="metric-chip" title="CPU Cores">
              ⚡ CPU {metrics.cpuCount} Cores
            </span>
            {metrics.vramTotalGB && (
              <span className="metric-chip gpu" title="VRAM Usage">
                🎮 VRAM {metrics.vramUsedGB}/{metrics.vramTotalGB}GB
              </span>
            )}
          </>
        )}
        <span className="metric-chip speed" title="Tokens per second">
          🚀 {tokensPerSec > 0 ? `${tokensPerSec.toFixed(1)} t/s` : '0 t/s'}
        </span>
      </div>

      {/* Right: Permission Tiers & Settings */}
      <div className="footer-section permissions-section">
        <span className="perm-label">PERMISSIONS:</span>
        <select
          className="permission-dropdown"
          value={permissionLevel}
          onChange={e => onChangePermissionLevel(e.target.value as AgentPermissionLevel)}
        >
          <option value="ask_every_time">🛡️ Ask Every Time</option>
          <option value="trusted">⚡ Trusted Commands</option>
          <option value="full_agent">🤖 Full Agent Mode</option>
        </select>

        <button className="settings-trigger-btn" onClick={onOpenSettings} title="Model Manager & Settings">
          ⚙️
        </button>
      </div>
    </footer>
  );
}
