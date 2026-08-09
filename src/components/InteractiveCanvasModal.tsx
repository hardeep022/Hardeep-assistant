import { useState } from 'react';

interface InteractiveCanvasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InteractiveCanvasModal({ isOpen, onClose }: InteractiveCanvasModalProps) {
  const [content, setContent] = useState(
    `// Nova Interactive Co-Editing Canvas\nfunction calculateMetrics(data: number[]): { sum: number; average: number } {\n  const sum = data.reduce((acc, val) => acc + val, 0);\n  const average = data.length > 0 ? sum / data.length : 0;\n  return { sum, average };\n}`
  );
  const [status, setStatus] = useState('');

  if (!isOpen) return null;

  const handleRewrite = (mode: 'refactor' | 'explain' | 'expand' | 'shorten') => {
    if (mode === 'refactor') {
      setContent(prev => `${prev}\n\n// AI Refactored Version (Modern ESNext / FP style):\nconst calculateMetricsFP = (data: number[]) => ({\n  sum: data.reduce((a, b) => a + b, 0),\n  average: data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0\n});`);
      setStatus('✓ Refactored code appended.');
    } else if (mode === 'explain') {
      setStatus('💡 Function computes array summation and mathematical mean safely.');
    } else if (mode === 'expand') {
      setContent(prev => `${prev}\n\n/**\n * Detailed documentation added by Nova Canvas:\n * @param data Array of numbers to evaluate\n * @returns Object with total sum and calculated arithmetic mean\n */`);
      setStatus('✓ JSDoc documentation expanded.');
    } else if (mode === 'shorten') {
      setContent(prev => prev.slice(0, Math.round(prev.length * 0.7)));
      setStatus('✓ Condensed content.');
    }
    setTimeout(() => setStatus(''), 3000);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="canvas-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="icon">✍️</span>
            <span>INTERACTIVE CANVAS WORKSPACE</span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="canvas-toolbar">
          <button type="button" className="sec-action-btn" onClick={() => handleRewrite('refactor')}>
            🛠️ Refactor
          </button>
          <button type="button" className="sec-action-btn" onClick={() => handleRewrite('explain')}>
            💡 Explain
          </button>
          <button type="button" className="sec-action-btn" onClick={() => handleRewrite('expand')}>
            📝 Expand
          </button>
          <button type="button" className="sec-action-btn" onClick={() => handleRewrite('shorten')}>
            ✂️ Shorten
          </button>
          {status && <span className="canvas-status-text">{status}</span>}
        </div>

        <div className="canvas-editor-body">
          <textarea
            className="canvas-textarea"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Work interactively on code, markdown, or notes alongside Nova..."
          />
        </div>

        <div className="modal-footer">
          <button className="sec-action-btn" onClick={() => navigator.clipboard.writeText(content)}>
            📋 Copy Canvas Content
          </button>
          <button className="primary-modal-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
