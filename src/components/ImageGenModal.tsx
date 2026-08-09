import { useState } from 'react';
import { generateImage, type GeneratedImage } from '../services/imageGenService';

interface ImageGenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImageGenModal({ isOpen, onClose }: ImageGenModalProps) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<'photorealistic' | 'anime' | 'digital_art' | 'ui_mockup' | 'concept_art'>('digital_art');
  const [isGenerating, setIsGenerating] = useState(false);
  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const img = await generateImage({ prompt: prompt.trim(), style });
      setCurrentImage(img);
      setGallery(prev => [img, ...prev]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="image-gen-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="icon">🎨</span>
            <span>IMAGE GENERATION & CREATIVE STUDIO</span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Image Prompt</label>
            <div className="prompt-input-row">
              <input
                type="text"
                className="text-input"
                placeholder="Describe the image you want to generate (e.g. Futuristic cybernetic city at night)..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              />
              <button
                className="primary-modal-btn"
                disabled={!prompt.trim() || isGenerating}
                onClick={handleGenerate}
              >
                {isGenerating ? 'Generating…' : '🎨 Generate'}
              </button>
            </div>
          </div>

          <div className="style-selector-row">
            {(['digital_art', 'photorealistic', 'anime', 'ui_mockup', 'concept_art'] as const).map(st => (
              <button
                type="button"
                key={st}
                className={`style-chip ${style === st ? 'active' : ''}`}
                onClick={() => setStyle(st)}
              >
                {st.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          {currentImage ? (
            <div className="preview-image-container">
              <img src={currentImage.imageUrl} alt={currentImage.prompt} className="generated-preview-img" />
              <div className="preview-caption">
                <span>"{currentImage.prompt}"</span>
                <a href={currentImage.imageUrl} download={`generated-${currentImage.id}.png`} className="sec-action-btn">
                  📥 Download Image
                </a>
              </div>
            </div>
          ) : (
            <div className="image-placeholder-box">
              <span className="placeholder-icon">🖼️</span>
              <p>Enter a creative prompt above to generate images.</p>
            </div>
          )}

          {gallery.length > 1 && (
            <div className="gallery-section">
              <h4>GENERATION HISTORY GALLERY ({gallery.length})</h4>
              <div className="gallery-grid">
                {gallery.map(img => (
                  <img
                    key={img.id}
                    src={img.imageUrl}
                    alt={img.prompt}
                    className={`gallery-thumb ${currentImage?.id === img.id ? 'selected' : ''}`}
                    onClick={() => setCurrentImage(img)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="primary-modal-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
