"""Local voice runtime for Nova AI OS.

Protocol: newline-delimited JSON on stdin/stdout.
Status and failures are emitted as events; all diagnostic output goes to stderr.
"""

from __future__ import annotations

import json
import queue
import re
import sys
import threading
import time
from collections import deque
from typing import Any

# Optional import checks with graceful fallbacks
missing_deps = []

try:
    import numpy as np
except ImportError:
    missing_deps.append("numpy")
    np = None

try:
    import sounddevice as sd
except ImportError:
    missing_deps.append("sounddevice")
    sd = None

try:
    from faster_whisper import WhisperModel
except ImportError:
    missing_deps.append("faster-whisper")
    WhisperModel = None

# Kokoro Neural TTS
try:
    from kokoro import KPipeline
except ImportError:
    KPipeline = None

# SAPI5 Local Fallback TTS
try:
    import pyttsx3
except ImportError:
    pyttsx3 = None

# Secondary ASR Fallback
try:
    import speech_recognition as sr
except ImportError:
    sr = None

SAMPLE_RATE = 16_000
DEFAULT_WAKE_WORD = "nova"
SILENCE_RMS = 0.012
SILENCE_SECONDS = 1.1


class VoiceService:
    def __init__(self) -> None:
        self.commands: queue.Queue[dict[str, Any]] = queue.Queue()
        self.wake_enabled = False
        self.wake_phrase = DEFAULT_WAKE_WORD
        self.ptt_active = False
        self.auto_capture = False
        self.recording: list[Any] = []
        self.wake_buffer: deque[Any] = deque(maxlen=160)
        self.last_voice_at = 0.0
        self.last_wake_check = 0.0
        self.transcribing = False
        self.speaking = False
        self.speech_stop = threading.Event()
        self.lock = threading.Lock()

        # Engine initialization
        self.whisper = None
        self.kokoro = None
        self.sapi_engine = None
        self.stream = None

        if not missing_deps:
            # 1. Initialize microphone audio input stream immediately
            try:
                self.stream = sd.InputStream(
                    samplerate=SAMPLE_RATE,
                    channels=1,
                    dtype="float32",
                    blocksize=1_600,
                    callback=self._on_audio,
                )
                self.stream.start()
            except Exception as e:
                print(f"Audio device initialization note: {e}", file=sys.stderr)
                self.stream = None

            # 2. Load models asynchronously in background thread to prevent audio buffer overflow
            threading.Thread(target=self._load_engines, daemon=True).start()

    def _load_engines(self) -> None:
        try:
            self.whisper = WhisperModel("base", device="cpu", compute_type="int8")
        except Exception as e:
            print(f"Whisper initialization note: {e}", file=sys.stderr)

        if KPipeline is not None:
            try:
                self.kokoro = KPipeline(lang_code="a")
            except Exception as e:
                print(f"Kokoro initialization note: {e}", file=sys.stderr)
                self.kokoro = None

        if self.kokoro is None and pyttsx3 is not None:
            try:
                self.sapi_engine = pyttsx3.init()
            except Exception as e:
                print(f"pyttsx3 initialization note: {e}", file=sys.stderr)

    def emit(self, event: str, **payload: Any) -> None:
        print(json.dumps({"event": event, **payload}), flush=True)

    def _on_audio(self, data: np.ndarray, _frames: int, _time: Any, status: Any) -> None:
        if status and "overflow" not in str(status).lower():
            print(f"audio status: {status}", file=sys.stderr)
        if data is None or data.size == 0:
            return

        chunk = data[:, 0].copy()
        rms = float(np.sqrt(np.mean(np.square(chunk))))
        now = time.monotonic()

        with self.lock:
            listening = self.ptt_active or self.auto_capture
            if listening:
                self.recording.append(chunk)
                if rms > SILENCE_RMS:
                    self.last_voice_at = now

            if self.wake_enabled and not self.ptt_active and not self.auto_capture:
                self.wake_buffer.append(chunk)
                if not self.transcribing and now - self.last_wake_check > 2.0 and len(self.wake_buffer) >= 30:
                    self.last_wake_check = now
                    audio = np.concatenate(tuple(self.wake_buffer))
                    self._transcribe_async(audio, wake_check=True)

    def _transcribe_async(self, audio: np.ndarray, wake_check: bool = False) -> None:
        self.transcribing = True

        def run() -> None:
            try:
                text = self.transcribe(audio)
                if wake_check:
                    self._handle_wake_text(text)
                elif text:
                    self.emit("transcript", text=text)
                else:
                    self.emit("error", message="No speech detected in audio recording.")
            except Exception as error:
                self.emit("error", message=f"Speech recognition failed: {error}")
            finally:
                self.transcribing = False

        threading.Thread(target=run, daemon=True).start()

    def transcribe(self, audio: np.ndarray, lang: str | None = None) -> str:
        if audio is None or len(audio) < SAMPLE_RATE // 4:
            return ""

        whisper_lang = None
        sr_lang = "en-US"
        if lang:
            l = str(lang).lower()
            if "pa" in l:
                whisper_lang = "pa"
                sr_lang = "pa-IN"
            elif "hi" in l:
                whisper_lang = "hi"
                sr_lang = "hi-IN"
            elif "en" in l:
                whisper_lang = "en"
                sr_lang = "en-US"

        if self.whisper is not None:
            try:
                kwargs: dict[str, Any] = {
                    "beam_size": 1,
                    "vad_filter": True,
                    "condition_on_previous_text": False,
                }
                if whisper_lang:
                    kwargs["language"] = whisper_lang

                segments, _ = self.whisper.transcribe(audio, **kwargs)
                text = " ".join(segment.text.strip() for segment in segments).strip()
                if text:
                    return text
            except Exception as e:
                print(f"Whisper transcribe error: {e}", file=sys.stderr)

        if sr is not None and np is not None:
            try:
                import io
                import wave
                audio_int16 = (audio * 32767).astype(np.int16)
                wav_io = io.BytesIO()
                with wave.open(wav_io, 'wb') as wf:
                    wf.setnchannels(1)
                    wf.setsampwidth(2)
                    wf.setframerate(SAMPLE_RATE)
                    wf.writeframes(audio_int16.tobytes())
                wav_io.seek(0)
                r = sr.Recognizer()
                with sr.AudioFile(wav_io) as source:
                    audio_data = r.record(source)
                    return r.recognize_google(audio_data, language=sr_lang)
            except Exception as e:
                print(f"SR fallback error: {e}", file=sys.stderr)

        return ""

    def _handle_wake_text(self, text: str) -> None:
        phrase = self.wake_phrase.lower()
        match = re.search(rf"\b{re.escape(phrase)}\b", text, flags=re.IGNORECASE)
        if not match:
            # Also test simple "nova" fallback
            match = re.search(r"\bnova\b", text, flags=re.IGNORECASE)
            if not match:
                return

        remainder = text[match.end():].strip(" ,.!?:;-")
        self.emit("wake_word", phrase=self.wake_phrase)
        if remainder:
            self.emit("transcript", text=remainder)
            return

        with self.lock:
            self.auto_capture = True
            self.recording = []
            self.last_voice_at = time.monotonic()
        self.emit("listening", mode="wake")

    def start_ptt(self) -> None:
        self.stop_speaking()
        with self.lock:
            self.ptt_active = True
            self.auto_capture = False
            self.recording = []
            self.last_voice_at = time.monotonic()
        self.emit("listening", mode="ptt")

    def stop_ptt(self) -> None:
        with self.lock:
            was_recording = self.ptt_active or self.auto_capture
            self.ptt_active = False
            self.auto_capture = False
            audio = np.concatenate(self.recording) if self.recording and np is not None else (np.array([], dtype=np.float32) if np is not None else None)
            self.recording = []

        if was_recording and audio is not None and len(audio) > 0:
            self.emit("listening_stopped")
            self._transcribe_async(audio)

    def stop_speaking(self) -> None:
        self.speech_stop.set()
        if sd is not None:
            try:
                sd.stop()
            except Exception:
                pass
        if self.sapi_engine is not None:
            try:
                self.sapi_engine.stop()
            except Exception:
                pass
        if self.speaking:
            self.speaking = False
            self.emit("speaking_stopped")

    def _detect_lang(self, text: str) -> str:
        if re.search(r"[\u0900-\u097F]", text):
            return "hi"
        if re.search(r"[\u0A00-\u0A7F]", text):
            return "pa"
        return "en"

    def speak(self, text: str, voice_id: str = "af_heart") -> None:
        self.stop_speaking()
        self.speech_stop.clear()

        def run() -> None:
            try:
                self.speaking = True
                self.emit("speaking")

                lang = self._detect_lang(text)

                if self.kokoro is not None and sd is not None:
                    # Kokoro Neural Voice Synthesis
                    selected_voice = "hf_beta" if lang == "hi" else voice_id
                    for _, _, audio in self.kokoro(text, voice=selected_voice):
                        if self.speech_stop.is_set():
                            break
                        sd.play(audio, 24_000, blocking=True)
                elif self.sapi_engine is not None:
                    # Windows SAPI5 Fallback Synthesis with voice selection
                    try:
                        voices = self.sapi_engine.getProperty("voices")
                        matching = None
                        if lang == "hi":
                            matching = next((v.id for v in voices if "hindi" in v.name.lower() or "kalpana" in v.name.lower() or "swara" in v.name.lower()), None)
                        elif lang == "pa":
                            matching = next((v.id for v in voices if "punjabi" in v.name.lower() or "hindi" in v.name.lower() or "india" in v.name.lower()), None)
                        
                        if matching:
                            self.sapi_engine.setProperty("voice", matching)
                    except Exception:
                        pass

                    self.sapi_engine.say(text)
                    self.sapi_engine.runAndWait()
                else:
                    self.emit("error", message="No speech synthesis engine available")

            except Exception as error:
                self.emit("error", message=f"Speech synthesis failed: {error}")
            finally:
                self.speaking = False
                self.emit("speaking_stopped")

        threading.Thread(target=run, daemon=True).start()

    def handle(self, command: dict[str, Any]) -> None:
        action = command.get("action")
        if action == "ping":
            self.emit("pong", status="healthy", uptime=time.monotonic())
        elif action == "start_ptt":
            self.start_ptt()
        elif action == "stop_ptt":
            self.stop_ptt()
        elif action == "set_wake_word":
            self.wake_enabled = bool(command.get("enabled"))
            if command.get("phrase"):
                self.wake_phrase = str(command["phrase"])
            self.emit("wake_word_status", enabled=self.wake_enabled, phrase=self.wake_phrase)
        elif action == "speak" and isinstance(command.get("text"), str):
            voice_id = command.get("voice", "af_heart")
            self.speak(command["text"][:20_000], voice_id=voice_id)
        elif action == "transcribe_pcm" and isinstance(command.get("pcmBase64"), str):
            try:
                import base64
                raw_bytes = base64.b64decode(command["pcmBase64"])
                audio_np = np.frombuffer(raw_bytes, dtype=np.float32)
                lang = command.get("lang")
                self._transcribe_async(audio_np, lang=lang)
            except Exception as e:
                self.emit("error", message=f"PCM decoding failed: {e}")
        elif action == "transcribe_audio_blob" and isinstance(command.get("audioBase64"), str):
            def run_file_transcribe():
                import base64, tempfile, os
                temp_path = None
                try:
                    audio_bytes = base64.b64decode(command["audioBase64"])
                    ext = ".webm"
                    mime = str(command.get("mimeType", ""))
                    if "wav" in mime:
                        ext = ".wav"
                    elif "mp4" in mime:
                        ext = ".mp4"
                    
                    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tf:
                        tf.write(audio_bytes)
                        temp_path = tf.name

                    whisper_lang = None
                    sr_lang = "en-US"
                    lang = command.get("lang")
                    if lang:
                        l = str(lang).lower()
                        if "pa" in l:
                            whisper_lang = "pa"
                            sr_lang = "pa-IN"
                        elif "hi" in l:
                            whisper_lang = "hi"
                            sr_lang = "hi-IN"
                        elif "en" in l:
                            whisper_lang = "en"
                            sr_lang = "en-US"

                    text = ""
                    if self.whisper is not None:
                        kwargs: dict[str, Any] = {"beam_size": 1}
                        if whisper_lang:
                            kwargs["language"] = whisper_lang
                        segments, _ = self.whisper.transcribe(temp_path, **kwargs)
                        text = " ".join(seg.text.strip() for seg in segments).strip()

                    if not text and sr is not None:
                        try:
                            r = sr.Recognizer()
                            with sr.AudioFile(temp_path) as source:
                                audio_data = r.record(source)
                                text = r.recognize_google(audio_data, language=sr_lang)
                        except Exception as e:
                            print(f"SR file fallback error: {e}", file=sys.stderr)

                    if text:
                        self.emit("transcript", text=text)
                    else:
                        self.emit("error", message="No speech detected in recorded audio.")
                except Exception as err:
                    self.emit("error", message=f"Audio blob transcription failed: {err}")
                finally:
                    if temp_path and os.path.exists(temp_path):
                        try:
                            os.remove(temp_path)
                        except Exception:
                            pass

            threading.Thread(target=run_file_transcribe, daemon=True).start()
        elif action == "stop_speaking":
            self.stop_speaking()
        else:
            self.emit("error", message=f"Unknown or invalid voice action: {action}")

    def run(self) -> None:
        if missing_deps:
            self.emit(
                "error",
                message=f"Voice runtime missing dependencies ({', '.join(missing_deps)}). Install via: pip install -r voice/requirements.txt",
            )
            while True:
                command = self.commands.get()
                if command.get("action") == "shutdown":
                    break
                elif command.get("action") == "ping":
                    self.emit("pong", status="degraded", missing=missing_deps)
                else:
                    self.emit("error", message=f"Voice runtime disabled: missing {', '.join(missing_deps)}")
            return

        if self.stream is not None:
            try:
                self.stream.start()
            except Exception as e:
                print(f"Stream start error: {e}", file=sys.stderr)

        self.emit("ready")

        try:
            while True:
                try:
                    command = self.commands.get(timeout=0.1)
                    if command.get("action") == "shutdown":
                        break
                    self.handle(command)
                except queue.Empty:
                    with self.lock:
                        should_finish = self.auto_capture and time.monotonic() - self.last_voice_at > SILENCE_SECONDS
                    if should_finish:
                        self.stop_ptt()
        finally:
            self.stop_speaking()
            if self.stream is not None:
                try:
                    self.stream.close()
                except Exception:
                    pass


def read_commands(service: VoiceService) -> None:
    for line in sys.stdin:
        line_str = line.strip()
        if not line_str:
            continue
        try:
            command = json.loads(line_str)
            if isinstance(command, dict):
                service.commands.put(command)
        except json.JSONDecodeError:
            service.emit("error", message="Invalid voice command JSON")


def main() -> None:
    service = VoiceService()
    input_thread = threading.Thread(target=read_commands, args=(service,), daemon=True)
    input_thread.start()
    service.run()


if __name__ == "__main__":
    main()
