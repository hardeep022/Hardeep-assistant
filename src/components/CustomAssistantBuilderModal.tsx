import { useState } from 'react';
import { MODELS } from '../types';

interface CustomAssistant {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  modelId: string;
  icon: string;
}

interface CustomAssistantBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAssistant: (assistant: CustomAssistant) => void;
}

export function CustomAssistantBuilderModal({
  isOpen,
  onClose,
  onSaveAssistant,
}: CustomAssistantBuilderModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [modelId, setModelId] = useState(MODELS[0]?.id || 'llama3.2');
  const [icon, setIcon] = useState('🤖');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    const assistant: CustomAssistant = {
      id: `assistant-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      systemPrompt: systemPrompt.trim(),
      modelId,
      icon,
    };
    onSaveAssistant(assistant);
    onClose();
  };

  const handleExportJSON = () => {
    const assistant = {
      name: name || 'Custom Assistant',
      description,
      systemPrompt,
      modelId,
      icon,
    };
    const blob = new Blob([JSON.stringify(assistant, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-assistant.json`;
    a.click();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="assistant-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="icon">🛠️</span>
            <span>BUILD CUSTOM AI ASSISTANT</span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Assistant Icon & Name</label>
            <div className="icon-name-row">
              <input
                type="text"
                className="icon-input"
                value={icon}
                maxLength={2}
                onChange={e => setIcon(e.target.value)}
              />
              <input
                type="text"
                className="text-input"
                placeholder="e.g. Cybersecurity Specialist, DevOps Agent..."
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <input
              type="text"
              className="text-input"
              placeholder="Short description of what this assistant specializes in..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Preferred Model</label>
            <select
              className="select-input"
              value={modelId}
              onChange={e => setModelId(e.target.value)}
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>System Prompt / Behavioral Instructions</label>
            <textarea
              className="textarea-input"
              rows={5}
              placeholder="Specify personality, domain expertise, response formatting rules, and strict instructions..."
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="sec-action-btn" onClick={handleExportJSON}>
            📤 Export Preset (.json)
          </button>
          <button
            className="primary-modal-btn"
            disabled={!name.trim()}
            onClick={handleSave}
          >
            Save Assistant
          </button>
        </div>
      </div>
    </div>
  );
}
