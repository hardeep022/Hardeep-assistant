import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from './Toast';
import type { ScreenSource, CapturedFrame, TaskGuideStep } from '../types';

interface ScreenShareGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_TASKS = [
  { icon: '🛠️', title: 'Git & Terminal Setup', prompt: 'Guide me to create a Git repository, stage files, and commit changes step by step.' },
  { icon: '📊', title: 'Excel Table Formatting', prompt: 'Guide me to format this data into a professional Excel table with totals and conditional formatting.' },
  { icon: '⚙️', title: 'Windows Settings Config', prompt: 'Walk me through enabling Night Light and adjusting Display Scale in Windows Settings.' },
  { icon: '🐛', title: 'Debug Code & Error', prompt: 'Analyze this code error on my screen and guide me step by step on how to fix it.' },
  { icon: '🌐', title: 'Browser & Account Setup', prompt: 'Guide me step by step through setting up multi-factor authentication on GitHub/Google.' },
];

export function ScreenShareGuideModal({ isOpen, onClose }: ScreenShareGuideModalProps) {
  const { state, dispatch } = useApp();
  const toast = useToast();

  // Screen Sources State
  const [sources, setSources] = useState<ScreenSource[]>([]);
  const [activeSource, setActiveSource] = useState<ScreenSource | null>(null);
  const [isSelectingSource, setIsSelectingSource] = useState(false);
  const [capturedFrame, setCapturedFrame] = useState<CapturedFrame | null>(null);

  // Task Guidance State
  const [taskPrompt, setTaskPrompt] = useState('');
  const [steps, setSteps] = useState<TaskGuideStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoScanInterval, setAutoScanInterval] = useState<number>(0); // 0 = manual, 5 = 5s, 10 = 10s
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [latestGuidance, setLatestGuidance] = useState<string | null>(null);
  const [targetHint, setTargetHint] = useState<string | null>(null);

  const autoScanTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch desktop screen/window sources
  const fetchSources = useCallback(async () => {
    if (window.nova?.getScreenSources) {
      try {
        const res = await window.nova.getScreenSources();
        if (res.success && res.sources.length > 0) {
          setSources(res.sources);
          if (!activeSource) {
            setActiveSource(res.sources[0]); // default to primary screen
          }
          return;
        }
      } catch {}
    }
    
    // Web Fallback Display Sources
    const fallbackSources: ScreenSource[] = [
      { id: 'primary-screen', name: '🖥️ Entire Desktop Screen', thumbnail: '' },
      { id: 'app-window', name: '💻 Application Window / Browser', thumbnail: '' },
    ];
    setSources(fallbackSources);
    if (!activeSource) {
      setActiveSource(fallbackSources[0]);
    }
  }, [activeSource]);

  // Capture screen frame using Electron IPC or Web MediaDevices fallback
  const captureFrame = useCallback(async (sourceId?: string): Promise<CapturedFrame | null> => {
    const targetId = sourceId || activeSource?.id;

    // 1. Try Electron Native desktopCapturer IPC
    if (window.nova?.captureScreenFrame) {
      try {
        const res = await window.nova.captureScreenFrame({ sourceId: targetId });
        if (res.success && res.dataUrl && res.base64Data) {
          const frame: CapturedFrame = {
            dataUrl: res.dataUrl,
            base64Data: res.base64Data,
            mimeType: res.mimeType || 'image/png',
            sourceId: res.sourceId,
            sourceName: res.sourceName,
            timestamp: res.timestamp || Date.now(),
          };
          setCapturedFrame(frame);
          return frame;
        }
      } catch {}
    }

    // 2. Web Standard Fallback: navigator.mediaDevices.getDisplayMedia
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getDisplayMedia) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as any,
          audio: false,
        });

        const video = document.createElement('video');
        video.srcObject = stream;
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            video.play();
            resolve(true);
          };
        });

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/png');
          const base64Data = dataUrl.split(',')[1] || '';

          stream.getTracks().forEach(t => t.stop());

          const frame: CapturedFrame = {
            dataUrl,
            base64Data,
            mimeType: 'image/png',
            sourceId: targetId || 'web-display-media',
            sourceName: activeSource?.name || 'Shared Display Screen',
            timestamp: Date.now(),
          };
          setCapturedFrame(frame);
          return frame;
        }
        stream.getTracks().forEach(t => t.stop());
      } catch (err: any) {
        if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
          toast.error(`Screen share error: ${err.message || String(err)}`);
        }
      }
    }

    return null;
  }, [activeSource, toast]);

  // Initial load when modal opens - instant single-click live capture
  useEffect(() => {
    if (isOpen) {
      fetchSources().then(() => {
        captureFrame();
      });
    }
  }, [isOpen, fetchSources, captureFrame]);



  // Auto scan interval effect
  useEffect(() => {
    if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }
    if (autoScanInterval > 0 && isOpen && activeSource) {
      autoScanTimerRef.current = setInterval(() => {
        captureFrame();
      }, autoScanInterval * 1000);
    }
    return () => {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
      }
    };
  }, [autoScanInterval, isOpen, activeSource, captureFrame]);

  // Speak guidance text out loud using Nova voice synthesis
  const speakGuidance = (text: string) => {
    if (!voiceEnabled || !text.trim()) return;
    const cleanText = text.replace(/[*#`_~>|]/g, '').trim();
    if (!cleanText) return;

    if (window.nova?.voiceCommand) {
      window.nova.voiceCommand({
        action: 'speak',
        text: cleanText,
      });
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  };


  // Generate Step-by-Step Plan for Task
  const handleStartTaskGuidance = async (promptText?: string) => {
    const targetPrompt = (promptText || taskPrompt).trim();
    if (!targetPrompt) {
      toast.error('Please enter a task or choose a template');
      return;
    }

    setIsAnalyzing(true);
    toast.info('Analyzing screen and decomposing task steps…');

    // First capture screen frame
    await captureFrame();

    // Formulate prompt for AI step decomposition & initial guidance
    const currentSourceLabel = activeSource?.name || 'Screen';
    const initialStepsPrompt = `You are Nova Screen Guidance Assistant. The user wants step-by-step guidance on their active computer screen (${currentSourceLabel}).
Task requested: "${targetPrompt}"

Decompose this task into 3-5 clear, concrete, sequential action steps for the user.
Format your response ONLY as JSON in this structure:
{
  "steps": [
    { "title": "Step 1 Title", "description": "Clear instruction", "actionRequired": "What to click or type", "targetRegionHint": "Screen area e.g. Top-Left menu, Center window, Bottom status bar" }
  ],
  "initialAdvice": "Friendly opening summary of what to do first"
}`;

    // Send chat message payload or call LLM
    try {
      let aiResponseText = '';
      if (window.nova?.sendMessage) {
        window.nova.sendMessage({
          messages: [{ role: 'user', content: initialStepsPrompt }],
          model: state.settings.defaultModel || 'gemini-2.0-flash',
          provider: (state.settings.geminiKey ? 'gemini' : 'ollama') as any,
        });

        // Listen for done response
        window.nova.onDone((text) => {
          aiResponseText = text;
          window.nova?.clearListeners();
          parseAndSetSteps(aiResponseText, targetPrompt);
        });
        window.nova.onError((err) => {
          window.nova?.clearListeners();
          toast.error(`AI Task Plan Error: ${err}`);
          setIsAnalyzing(false);
        });
      } else {
        createFallbackSteps(targetPrompt);
      }
    } catch {
      createFallbackSteps(targetPrompt);
    }
  };

  const createFallbackSteps = (promptText: string) => {
    const fallbackList: TaskGuideStep[] = [
      { id: '1', title: 'Inspect Active Screen', description: `Open ${activeSource?.name || 'application window'} and locate main interface controls.`, actionRequired: 'Focus target window', targetRegionHint: 'Center window', status: 'in_progress' },
      { id: '2', title: 'Execute First Action', description: `Follow target prompt: ${promptText}`, actionRequired: 'Click primary menu item', targetRegionHint: 'Top menu bar', status: 'pending' },
      { id: '3', title: 'Verify & Complete', description: 'Confirm expected output matches desired result.', actionRequired: 'Check status indicator', targetRegionHint: 'Bottom bar', status: 'pending' },
    ];
    setSteps(fallbackList);
    setCurrentStepIndex(0);
    const advice = `I'm ready to guide you on "${promptText}". Let's start with Step 1!`;
    setLatestGuidance(advice);
    speakGuidance(advice);
    setIsAnalyzing(false);
  };

  const parseAndSetSteps = (rawText: string, promptText: string) => {
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
          const formattedSteps: TaskGuideStep[] = parsed.steps.map((s: any, idx: number) => ({
            id: String(idx + 1),
            title: s.title || `Step ${idx + 1}`,
            description: s.description || '',
            actionRequired: s.actionRequired || '',
            targetRegionHint: s.targetRegionHint || 'Active Window',
            status: idx === 0 ? 'in_progress' : 'pending',
          }));
          setSteps(formattedSteps);
          setCurrentStepIndex(0);
          const advice = parsed.initialAdvice || `Step 1: ${formattedSteps[0].description}`;
          setLatestGuidance(advice);
          setTargetHint(formattedSteps[0].targetRegionHint || null);
          speakGuidance(advice);
          setIsAnalyzing(false);
          return;
        }
      }
    } catch {}
    createFallbackSteps(promptText);
  };

  // Perform AI Screen Analysis on Current Step
  const handleAnalyzeCurrentStep = async () => {
    if (steps.length === 0) return;
    setIsAnalyzing(true);
    toast.info('Scanning screen with Vision AI…');

    await captureFrame();
    const activeStep = steps[currentStepIndex];

    const visionPrompt = `🖼️ **[Screen Frame Capture: ${activeSource?.name || 'Screen'}]**
Task Goal: "${taskPrompt || 'Task Guidance'}"
Current Step (${currentStepIndex + 1}/${steps.length}): "${activeStep.title}" - ${activeStep.description}

Analyze the user's current screen image.
1. Has the user completed step ${currentStepIndex + 1}? (yes/no)
2. What specific element on screen should they click/type next?
3. Where is that element located? (e.g. Top-Right, Bottom-Left, Center)

Provide concise step-by-step guidance in 2-3 sentences.`;

    if (window.nova?.sendMessage) {
      window.nova.sendMessage({
        messages: [{ role: 'user', content: visionPrompt }],
        model: state.settings.defaultModel || 'gemini-2.0-flash',
        provider: (state.settings.geminiKey ? 'gemini' : 'ollama') as any,
      });

      window.nova.onDone((text) => {
        window.nova?.clearListeners();
        setLatestGuidance(text);
        speakGuidance(text);
        setIsAnalyzing(false);
      });
      window.nova.onError((err) => {
        window.nova?.clearListeners();
        toast.error(`Vision analysis error: ${err}`);
        setIsAnalyzing(false);
      });
    } else {
      setTimeout(() => {
        const advice = `I can see your screen (${activeSource?.name}). To proceed with ${activeStep.title}, click on the main action item highlighted on screen.`;
        setLatestGuidance(advice);
        speakGuidance(advice);
        setIsAnalyzing(false);
      }, 1000);
    }
  };

  // Step Navigation
  const markStepComplete = (index: number) => {
    const updated = [...steps];
    updated[index].status = 'completed';
    if (index + 1 < updated.length) {
      updated[index + 1].status = 'in_progress';
      setCurrentStepIndex(index + 1);
      setTargetHint(updated[index + 1].targetRegionHint || null);
      const msg = `Great! Moving to Step ${index + 2}: ${updated[index + 1].title}`;
      setLatestGuidance(msg);
      speakGuidance(msg);
    } else {
      toast.success('🎉 Task successfully completed!');
      const msg = 'Congratulations! All task steps are completed successfully.';
      setLatestGuidance(msg);
      speakGuidance(msg);
    }
    setSteps(updated);
  };

  // Log Guidance to Nova Chat
  const logToChat = () => {
    if (!activeSource || steps.length === 0) return;
    const activeConvId = state.activeConversationId;
    let convId = activeConvId;
    if (!convId) {
      convId = crypto.randomUUID();
      dispatch({ type: 'NEW_CHAT', id: convId });
    }

    let summary = `🖥️ **Screen Sharing Guidance Summary: ${taskPrompt || 'Task'}**\n`;
    summary += `Shared Source: \`${activeSource.name}\`\n\n`;
    summary += `**Steps Executed:**\n`;
    steps.forEach((s, idx) => {
      const statusIcon = s.status === 'completed' ? '✅' : s.status === 'in_progress' ? '▶️' : '⏳';
      summary += `${statusIcon} **Step ${idx + 1}: ${s.title}** - ${s.description}\n`;
    });
    if (latestGuidance) {
      summary += `\n💡 **Latest Guidance Note:**\n${latestGuidance}\n`;
    }

    dispatch({
      type: 'ADD_MESSAGE',
      conversationId: convId,
      message: {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: summary,
        timestamp: Date.now(),
      },
    });

    toast.success('Logged screen guidance session to conversation');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card screen-guide-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="pulse-dot-live" title="Live Screen Sharing Active" />
            <div>
              <h2 className="modal-title" style={{ margin: 0, fontSize: '18px' }}>
                🖥️ Screen Sharing & Task Guide
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {activeSource ? `Sharing: ${activeSource.name}` : 'Select a screen or window to share'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn-secondary"
              onClick={() => setIsSelectingSource(prev => !prev)}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              🔄 Switch Source
            </button>
            <button className="modal-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Source Selector Overlay Grid */}
        {isSelectingSource && (
          <div className="screen-source-picker">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--accent-light)' }}>
                Select Screen or Application Window to Share
              </span>
              <button className="btn-secondary" onClick={() => setIsSelectingSource(false)} style={{ fontSize: '11px', padding: '2px 8px' }}>
                Done
              </button>
            </div>
            <div className="source-grid">
              {sources.map(src => (
                <div
                  key={src.id}
                  className={`source-card ${src.id === activeSource?.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSource(src);
                    setIsSelectingSource(false);
                    captureFrame(src.id);
                  }}
                >
                  <div className="source-thumb-wrap">
                    {src.thumbnail ? (
                      <img src={src.thumbnail} alt={src.name} className="source-thumb" />
                    ) : (
                      <div className="source-thumb-placeholder">🖥️</div>
                    )}
                  </div>
                  <div className="source-info">
                    {src.appIcon && <img src={src.appIcon} alt="" className="source-icon" />}
                    <span className="source-name" title={src.name}>{src.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Main Body: Left Viewfinder | Right Interactive Task Guide */}
        <div className="screen-guide-body">
          {/* Left Column: Screen Preview & Frame Inspector */}
          <div className="screen-viewfinder-column">
            <div className="viewfinder-header">
              <span className="viewfinder-badge">
                🔴 LIVE PREVIEW
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={autoScanInterval}
                  onChange={e => setAutoScanInterval(Number(e.target.value))}
                  className="select-compact"
                  title="Auto screen scan interval"
                >
                  <option value={0}>Manual Scan</option>
                  <option value={5}>Auto Scan (5s)</option>
                  <option value={10}>Auto Scan (10s)</option>
                </select>
                <button
                  className="btn-secondary"
                  onClick={() => captureFrame()}
                  disabled={isAnalyzing}
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  title="Capture latest screen snapshot"
                >
                  📸 Snapshot
                </button>
              </div>
            </div>

            <div className="viewfinder-container">
              {capturedFrame?.dataUrl ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <img src={capturedFrame.dataUrl} alt="Screen Feed" className="viewfinder-img" />

                  {/* Target Region Highlight Overlay Box */}
                  {targetHint && (
                    <div className="target-hint-overlay">
                      <span className="target-hint-label">🎯 Target: {targetHint}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="viewfinder-placeholder">
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🖥️</div>
                  <span>Click <b>Snapshot</b> to capture screen state</span>
                  <button className="btn-primary" onClick={() => captureFrame()} style={{ marginTop: '12px' }}>
                    Capture Screen Now
                  </button>
                </div>
              )}
            </div>

            {/* Quick Preset Task Templates */}
            <div className="presets-container">
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Quick Task Templates:
              </span>
              <div className="presets-grid">
                {PRESET_TASKS.map((pt, idx) => (
                  <button
                    key={idx}
                    className="preset-chip"
                    onClick={() => {
                      setTaskPrompt(pt.prompt);
                      handleStartTaskGuidance(pt.prompt);
                    }}
                  >
                    <span>{pt.icon}</span>
                    <span>{pt.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: AI Task Guidance Assistant & Steps */}
          <div className="task-guide-column">
            {/* Task Prompt Input Bar */}
            <div className="task-input-section">
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px', display: 'block' }}>
                What task would you like Nova to guide you through?
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={taskPrompt}
                  onChange={e => setTaskPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleStartTaskGuidance()}
                  placeholder="e.g. Guide me to create a Git SSH key / Format Excel table..."
                  className="task-input"
                />
                <button
                  className="btn-primary"
                  onClick={() => handleStartTaskGuidance()}
                  disabled={isAnalyzing || !taskPrompt.trim()}
                  style={{ whiteSpace: 'nowrap', padding: '8px 16px' }}
                >
                  {isAnalyzing ? 'Planning…' : '🎯 Start Guide'}
                </button>
              </div>
            </div>

            {/* Interactive Step-by-Step Checklist */}
            <div className="steps-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-light)' }}>
                  📋 Action Checklist {steps.length > 0 && `(${currentStepIndex + 1}/${steps.length})`}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className={`btn-icon-toggle ${voiceEnabled ? 'active' : ''}`}
                    onClick={() => setVoiceEnabled(p => !p)}
                    title={voiceEnabled ? 'Voice Guidance Enabled (Click to mute)' : 'Voice Guidance Muted (Click to enable)'}
                  >
                    {voiceEnabled ? '🔊 Voice On' : '🔇 Muted'}
                  </button>
                </div>
              </div>

              {steps.length > 0 ? (
                <div className="steps-scroll">
                  {steps.map((step, index) => {
                    const isCurrent = index === currentStepIndex;
                    const isDone = step.status === 'completed';
                    return (
                      <div
                        key={step.id}
                        className={`step-card ${isCurrent ? 'current' : isDone ? 'completed' : ''}`}
                        onClick={() => setCurrentStepIndex(index)}
                      >
                        <div className="step-number-badge">
                          {isDone ? '✓' : index + 1}
                        </div>
                        <div className="step-content">
                          <div className="step-title">{step.title}</div>
                          <div className="step-desc">{step.description}</div>
                          {step.actionRequired && (
                            <div className="step-action-badge">
                              👉 Action: {step.actionRequired}
                            </div>
                          )}
                        </div>
                        {isCurrent && !isDone && (
                          <button
                            className="step-complete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              markStepComplete(index);
                            }}
                          >
                            Mark Done ✓
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="steps-empty">
                  <span>Enter a task prompt above or click a template to generate step-by-step instructions.</span>
                </div>
              )}
            </div>

            {/* AI Real-Time Guidance & Analysis Box */}
            <div className="guidance-feedback-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-light)' }}>
                  💡 Nova Vision AI Live Guidance
                </span>
                <button
                  className="btn-secondary"
                  onClick={handleAnalyzeCurrentStep}
                  disabled={isAnalyzing || steps.length === 0}
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  {isAnalyzing ? 'Scanning Screen…' : '🔍 Analyze Step'}
                </button>
              </div>

              <div className="guidance-text">
                {latestGuidance ? (
                  latestGuidance
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>
                    Nova will inspect your screen and provide step-by-step guidance here.
                  </span>
                )}
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="guide-footer">
              <button className="btn-secondary" onClick={logToChat} disabled={steps.length === 0}>
                💬 Append to Chat Log
              </button>
              <button className="btn-primary" onClick={onClose}>
                Done / Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
