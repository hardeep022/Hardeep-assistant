import { useState, useEffect } from 'react';
import { audioManager, type MicTestResult } from '../services/audio/AudioManager';

interface AudioDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AudioDeviceModal({ isOpen, onClose }: AudioDeviceModalProps) {
  const [micTest, setMicTest] = useState<MicTestResult | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechVolume, setSpeechVolume] = useState(1.0);
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      audioManager.runMicTest().then(res => setMicTest(res));
      const unsub = audioManager.subscribeLevel(level => setAudioLevel(level));
      return () => unsub();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestSpeaker = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance('Audio speaker test. Nova voice system is operational.');
      utt.rate = speechRate;
      utt.volume = speechVolume;
      utt.onstart = () => setIsTestingSpeaker(true);
      utt.onend = () => setIsTestingSpeaker(false);
      window.speechSynthesis.speak(utt);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="device-modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="icon">🎙️</span>
            <span>AUDIO & MICROPHONE SETTINGS</span>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Microphone Test Section */}
          <div className="device-section">
            <h4>MICROPHONE HARDWARE TEST</h4>
            <div className="mic-status-card">
              <div className="mic-info-row">
                <span>Microphone Status:</span>
                <span className={`status-badge ${micTest?.connected ? 'connected' : 'error'}`}>
                  {micTest?.connected ? ' Connected & Active' : ' Microphone Unavailable'}
                </span>
              </div>

              {micTest?.connected && (
                <div className="mic-level-meter-container">
                  <div className="meter-label">Live Input Level Meter:</div>
                  <div className="meter-bar-bg">
                    <div
                      className="meter-bar-fill"
                      style={{ width: `${Math.round(audioLevel * 100)}%` }}
                    />
                  </div>
                  <span className="meter-percent">{Math.round(audioLevel * 100)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Speaker & Speech Output Test Section */}
          <div className="device-section">
            <h4>SPEAKER & VOICE OUTPUT TEST</h4>
            
            <div className="slider-group">
              <div className="slider-label-row">
                <span>Speaking Rate ({speechRate}x)</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speechRate}
                onChange={e => setSpeechRate(parseFloat(e.target.value))}
              />
            </div>

            <div className="slider-group">
              <div className="slider-label-row">
                <span>Volume ({Math.round(speechVolume * 100)}%)</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={speechVolume}
                onChange={e => setSpeechVolume(parseFloat(e.target.value))}
              />
            </div>

            <button
              type="button"
              className="sec-action-btn"
              onClick={handleTestSpeaker}
              disabled={isTestingSpeaker}
              style={{ marginTop: '8px' }}
            >
              🔊 Test Speaker Audio Tone
            </button>
          </div>
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
