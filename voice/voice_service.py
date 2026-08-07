"""Local voice runtime for Nova.

Protocol: newline-delimited JSON on stdin/stdout.  Status and failures are emitted
as events; all diagnostic output goes to stderr so it never corrupts the protocol.
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

import numpy as np
import sounddevice as sd
from faster_whisper import WhisperModel
from kokoro import KPipeline

SAMPLE_RATE = 16_000
WAKE_WORD = "nova"
SILENCE_RMS = 0.012
SILENCE_SECONDS = 1.1


class VoiceService:
    def __init__(self) -> None:
        self.commands: queue.Queue[dict[str, Any]] = queue.Queue()
        self.wake_enabled = False
        self.ptt_active = False
        self.auto_capture = False
        self.recording: list[np.ndarray] = []
        self.wake_buffer: deque[np.ndarray] = deque(maxlen=160)
        self.last_voice_at = 0.0
        self.last_wake_check = 0.0
        self.transcribing = False
        self.speaking = False
        self.speech_stop = threading.Event()
        self.lock = threading.Lock()
        self.whisper = WhisperModel("base", device="cpu", compute_type="int8")
        self.kokoro = KPipeline(lang_code="a")
        self.stream = sd.InputStream(
            samplerate=SAMPLE_RATE,
            channels=1,
            dtype="float32",
            blocksize=1_600,
            callback=self._on_audio,
        )

    def emit(self, event: str, **payload: Any) -> None:
        print(json.dumps({"event": event, **payload}), flush=True)

    def _on_audio(self, data: np.ndarray, _frames: int, _time: Any, status: Any) -> None:
        if status:
            print(f"audio status: {status}", file=sys.stderr)
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
            except Exception as error:  # surfaced to the Electron UI
                self.emit("error", message=f"Speech recognition failed: {error}")
            finally:
                self.transcribing = False

        threading.Thread(target=run, daemon=True).start()

    def transcribe(self, audio: np.ndarray) -> str:
        if len(audio) < SAMPLE_RATE // 4:
            return ""
        segments, _ = self.whisper.transcribe(
            audio,
            beam_size=1,
            vad_filter=True,
            condition_on_previous_text=False,
        )
        return " ".join(segment.text.strip() for segment in segments).strip()

    def _handle_wake_text(self, text: str) -> None:
        match = re.search(rf"\b{WAKE_WORD}\b", text, flags=re.IGNORECASE)
        if not match:
            return
        remainder = text[match.end():].strip(" ,.!?:;-")
        self.emit("wake_word", phrase=WAKE_WORD)
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
            audio = np.concatenate(self.recording) if self.recording else np.array([], dtype=np.float32)
            self.recording = []
        if was_recording:
            self.emit("listening_stopped")
            self._transcribe_async(audio)

    def stop_speaking(self) -> None:
        self.speech_stop.set()
        sd.stop()
        if self.speaking:
            self.speaking = False
            self.emit("speaking_stopped")

    def speak(self, text: str) -> None:
        self.stop_speaking()
        self.speech_stop.clear()

        def run() -> None:
            try:
                self.speaking = True
                self.emit("speaking")
                for _, _, audio in self.kokoro(text, voice="af_heart"):
                    if self.speech_stop.is_set():
                        break
                    sd.play(audio, 24_000, blocking=True)
            except Exception as error:
                self.emit("error", message=f"Speech synthesis failed: {error}")
            finally:
                self.speaking = False
                self.emit("speaking_stopped")

        threading.Thread(target=run, daemon=True).start()

    def handle(self, command: dict[str, Any]) -> None:
        action = command.get("action")
        if action == "start_ptt":
            self.start_ptt()
        elif action == "stop_ptt":
            self.stop_ptt()
        elif action == "set_wake_word":
            self.wake_enabled = bool(command.get("enabled"))
            self.emit("wake_word_status", enabled=self.wake_enabled)
        elif action == "speak" and isinstance(command.get("text"), str):
            self.speak(command["text"][:20_000])
        elif action == "stop_speaking":
            self.stop_speaking()
        else:
            self.emit("error", message="Invalid voice command")

    def run(self) -> None:
        self.stream.start()
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
            self.stream.close()


def read_commands(service: VoiceService) -> None:
    for line in sys.stdin:
        try:
            command = json.loads(line)
            if isinstance(command, dict):
                service.commands.put(command)
        except json.JSONDecodeError:
            service.emit("error", message="Invalid voice command")


if __name__ == "__main__":
    runtime = VoiceService()
    threading.Thread(target=read_commands, args=(runtime,), daemon=True).start()
    runtime.run()
