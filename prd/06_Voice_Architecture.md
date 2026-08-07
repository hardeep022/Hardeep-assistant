# Voice Architecture

## Overview

Nova supports full voice interaction as a first-class input/output method alongside text. The voice system is designed for **low-latency, multilingual operation** with strong offline capability.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Electron (Renderer)                    │
│                                                          │
│  ┌─────────────┐    ┌──────────────┐   ┌──────────────┐ │
│  │ Microphone   │    │  Web Audio   │   │   Speaker    │ │
│  │ Input        │───▶│  API /VAD    │   │   Output     │ │
│  └─────────────┘    └──────┬───────┘   └──────▲───────┘ │
│                            │                   │         │
│                     IPC Bridge            IPC Bridge      │
│                            │                   │         │
└────────────────────────────┼───────────────────┼─────────┘
                             │                   │
┌────────────────────────────▼───────────────────┼─────────┐
│                    FastAPI Backend                        │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐│
│  │  Porcupine  │  │   Whisper    │  │  Coqui TTS /     ││
│  │  Wake Word  │  │   STT        │  │  pyttsx3         ││
│  │  Detection  │  │   Engine     │  │  TTS Engine      ││
│  └──────┬──────┘  └──────┬───────┘  └──────────────────┘│
│         │                │                               │
│         ▼                ▼                               │
│  ┌─────────────────────────────┐                         │
│  │      AI Router Service      │                         │
│  │   (processes transcribed    │                         │
│  │    text, generates reply)   │                         │
│  └─────────────────────────────┘                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## Speech-to-Text (STT)

### Engine Selection

| Engine | Mode | Languages | Latency | Quality | Cost |
|---|---|---|---|---|---|
| **Whisper (via faster-whisper)** | Local (default) | English ★★★★★, Hindi ★★★★☆, Punjabi ★★★☆☆ | 1-3s | Very Good | Free |
| **Azure Speech Service** | Cloud (optional) | English ★★★★★, Hindi ★★★★★, Punjabi ★★★★☆ | 0.5-1.5s | Excellent | $1/audio hour |
| **Google Cloud STT** | Cloud (optional) | English ★★★★★, Hindi ★★★★★, Punjabi ★★★★☆ | 0.5-1.5s | Excellent | $0.006/15s |

### Default: Whisper (Local)

- **Model:** `whisper-small` (244M parameters, ~500 MB disk) for balanced speed/accuracy
- **Runtime:** `faster-whisper` (CTranslate2-based, 4x faster than original Whisper)
- **Upgrade Path:** Users can switch to `whisper-medium` or `whisper-large-v3` for better accuracy at the cost of speed/memory
- **GPU Acceleration:** Automatically uses CUDA if NVIDIA GPU is available; falls back to CPU

### Configuration

```python
# Default STT config
stt_config = {
    "engine": "whisper",           # "whisper" | "azure" | "google"
    "model_size": "small",         # "tiny" | "base" | "small" | "medium" | "large-v3"
    "language": "auto",            # "auto" | "en" | "hi" | "pa"
    "compute_type": "float16",     # "float16" (GPU) | "int8" (CPU)
    "beam_size": 5,
    "vad_filter": True,            # Voice Activity Detection to skip silence
    "silence_threshold_ms": 500    # Silence duration to trigger end-of-speech
}
```

---

## Text-to-Speech (TTS)

### Engine Selection

| Engine | Mode | Languages | Naturalness | Latency | Cost |
|---|---|---|---|---|---|
| **pyttsx3 (SAPI5)** | Local (default) | English ★★★★☆, Hindi ★★★☆☆, Punjabi ★★☆☆☆ | Robotic | <100ms | Free |
| **Coqui TTS** | Local (enhanced) | English ★★★★★, Hindi ★★★★☆, Punjabi ★★★☆☆ | Natural | 500ms-2s | Free |
| **ElevenLabs** | Cloud (premium) | English ★★★★★, Hindi ★★★★★, Punjabi ★★★★☆ | Very Natural | 300ms-1s | $5/mo+ |
| **Azure TTS** | Cloud (optional) | English ★★★★★, Hindi ★★★★★, Punjabi ★★★★★ | Very Natural | 200ms-800ms | $4/1M chars |

### Default: pyttsx3 (Instant, Offline)

- **Why:** Zero latency, zero cost, works offline, uses Windows SAPI5 voices
- **Limitation:** Sounds robotic, limited Hindi/Punjabi voice quality
- **Upgrade Path:** Users install Coqui TTS models for natural-sounding local voices, or configure ElevenLabs/Azure for premium quality

### Coqui TTS (Recommended Local Upgrade)

- **Model:** XTTS v2 (multilingual, supports voice cloning)
- **Disk:** ~1.5 GB for model files
- **RAM:** ~2 GB during synthesis
- **Streaming:** Supports audio streaming for lower perceived latency (start playing before full synthesis completes)

### Configuration

```python
# Default TTS config
tts_config = {
    "engine": "pyttsx3",           # "pyttsx3" | "coqui" | "elevenlabs" | "azure"
    "voice_id": "default",         # OS-specific voice or custom model
    "speed": 1.0,                  # 0.5 (slow) to 2.0 (fast)
    "language": "auto",            # Match response language
    "stream": True,                # Stream audio for lower latency
    "volume": 0.8                  # 0.0 to 1.0
}
```

---

## Wake Word Detection

### Engine: Porcupine (by Picovoice)

| Property | Detail |
|---|---|
| **SDK** | pvporcupine Python SDK |
| **Wake Words** | "Hey Nova" (custom trained), "Nova" (custom trained) |
| **Accuracy** | >95% detection rate in quiet environments |
| **False Positive Rate** | <1 per 24 hours |
| **Latency** | <100ms from utterance to detection |
| **CPU Usage** | <2% continuous background processing |
| **Offline** | Fully offline — no cloud dependency |
| **License** | Free tier available (limited custom wake words) |

### Wake Word Flow

```
1. App starts → Porcupine begins listening (always-on, low CPU)
2. User says "Hey Nova"
3. Porcupine triggers detection callback
4. Nova plays a soft chime / visual indicator (orb animation)
5. STT engine activates and begins recording
6. User speaks their query
7. Silence detected (VAD) → recording stops
8. Audio sent to Whisper for transcription
9. Transcribed text sent to AI Router
10. Response generated → TTS speaks it back
11. Return to step 1 (listening for wake word)
```

### Configuration

```python
wake_word_config = {
    "enabled": True,
    "keywords": ["hey_nova", "nova"],
    "sensitivity": 0.6,           # 0.0 (least sensitive) to 1.0 (most sensitive)
    "audio_device_index": -1,     # -1 = default microphone
    "chime_on_detect": True
}
```

---

## Audio Pipeline

### Electron → Backend Communication

1. **Microphone Access:** Electron renderer uses `navigator.mediaDevices.getUserMedia()` via Web Audio API
2. **Audio Format:** 16-bit PCM, 16kHz mono (Whisper's expected format)
3. **Transport:** Audio chunks sent via WebSocket from Electron to FastAPI backend
4. **Buffering:** 100ms audio chunks for streaming; full recording for batch processing

### WebSocket Audio Protocol

```
Client → Server:
{
    "type": "audio_chunk",
    "data": "<base64 encoded PCM audio>",
    "sample_rate": 16000,
    "sequence": 42
}

{
    "type": "audio_end",
    "total_chunks": 42
}

Server → Client:
{
    "type": "transcription",
    "text": "Open my projects folder",
    "language": "en",
    "confidence": 0.94
}

{
    "type": "tts_audio",
    "data": "<base64 encoded audio>",
    "format": "wav",
    "stream_index": 1,
    "is_final": false
}
```

### Audio Processing Pipeline

```
Microphone → Web Audio API → AudioWorklet (gain, noise gate)
    → PCM 16kHz Mono → WebSocket → FastAPI
    → VAD (silence detection) → Whisper STT → Text
    → AI Router → Response Text
    → TTS Engine → Audio Chunks → WebSocket → Electron
    → AudioContext → Speaker Output
```

---

## Latency Targets

| Stage | Target | Maximum Acceptable |
|---|---|---|
| **Wake Word Detection** | < 100ms | 200ms |
| **Recording Start** (after wake word) | < 50ms | 100ms |
| **STT Processing** (Whisper small, GPU) | < 1.5s | 3s |
| **STT Processing** (Whisper small, CPU) | < 3s | 5s |
| **AI Response Generation** (local) | < 2s for first token | 5s |
| **AI Response Generation** (cloud) | < 1s for first token | 3s |
| **TTS Synthesis Start** (pyttsx3) | < 100ms | 200ms |
| **TTS Synthesis Start** (Coqui, streaming) | < 500ms | 1.5s |
| **End-to-End** (wake word → first spoken word of reply) | < 4s (GPU local) | 8s (CPU local) |

---

## Offline / Online Modes

### Fully Offline (No Internet)

| Component | Offline Capability |
|---|---|
| Wake Word (Porcupine) | ✅ Fully offline |
| STT (Whisper) | ✅ Fully offline |
| TTS (pyttsx3) | ✅ Fully offline |
| TTS (Coqui) | ✅ Fully offline (after model download) |
| AI (Ollama/Llama) | ✅ Fully offline (after model download) |
| AI (Cloud APIs) | ❌ Requires internet |
| TTS (ElevenLabs/Azure) | ❌ Requires internet |
| STT (Azure/Google) | ❌ Requires internet |

### Online (Enhanced Quality)

- Cloud STT/TTS for higher accuracy and natural voice
- Cloud LLMs for complex reasoning tasks
- Automatic quality upgrade when internet is available (if user opts in)

---

## Voice UI/UX

### Visual Indicators

| State | Visual | Audio |
|---|---|---|
| **Idle** (listening for wake word) | Subtle pulsing mic icon in system tray | None |
| **Activated** (wake word detected) | Orb animation glows blue | Soft chime |
| **Listening** (recording speech) | Orb animation with audio waveform | None |
| **Processing** (STT + AI) | Orb animation with loading dots | None |
| **Speaking** (TTS playing) | Orb animation pulses with speech | TTS audio |
| **Error** | Orb flashes red briefly | Error tone |

### Voice Interaction Settings

- **Push-to-Talk Mode:** Alternative to wake word; hold spacebar to speak
- **Continuous Conversation:** After Nova responds, mic stays active for follow-up (configurable timeout: 5s default)
- **Mute:** Global mute button to disable microphone entirely
- **Voice-Only Mode:** Hide the chat UI, interact purely via voice (fullscreen orb animation)
