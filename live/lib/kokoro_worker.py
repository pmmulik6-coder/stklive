"""Small persistent Kokoro worker used by the Node live commentary queue.

Voice direction ("soft" style, default): a young female streamer talking softly into a close mic, late at night.
 - each sentence is synthesised separately with a slightly different, slow pace (questions lift a little,
   "..." slows down, exclamations stay calm), joined with natural pauses
 - close-mic warmth (gentle low boost), softened top end, comfortable low loudness; no echo or reverb
"""

import contextlib
import json
import re
import sys
import wave

import numpy as np

SR = 24000


def load_pipeline():
    # Kokoro prints a model warning during construction. Keep stdout reserved
    # for the one-JSON-result-per-job protocol.
    with contextlib.redirect_stdout(sys.stderr):
        from kokoro import KPipeline
        return KPipeline(lang_code="h")


def sentences(text):
    parts = re.findall(r"[^।.!?…]+(?:\.\.\.|…|[।.!?]+)?", text)
    return [p.strip() for p in parts if re.search(r"\w", p)]


def pace(sentence, i, base):
    """Per-sentence speed and the pause that follows it (seconds)."""
    if sentence.endswith("?"):
        return base * 1.02, 0.42
    if sentence.endswith(("...", "…")):
        return base * 0.9, 0.55
    if sentence.endswith("!"):
        return base * 1.04, 0.36
    return base * (1.0 if i % 2 == 0 else 0.96), 0.32


def one_pole_lowpass(x, cutoff):
    a = np.exp(-2.0 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for n in range(len(x)):
        acc = (1.0 - a) * x[n] + a * acc
        y[n] = acc
    return y


def soften(audio):
    """Close-mic, low-volume finish: warmth, gentle top end, quiet but clear, no reverb."""
    if audio.size == 0:
        return audio
    audio = audio - float(np.mean(audio))
    audio = 0.8 * one_pole_lowpass(audio, 7000.0) + 0.2 * audio   # take the hiss/edge off the top
    audio = audio + 0.22 * one_pole_lowpass(audio, 220.0)          # proximity warmth
    rms = float(np.sqrt(np.mean(audio ** 2))) or 1e-9
    audio = audio * (10 ** (-16.0 / 20.0) / rms)                   # soft delivery but clearly audible over the game (~-16 dBFS RMS)
    peak = float(np.max(np.abs(audio))) or 1e-9
    if peak > 0.85:                                                # soft ceiling, never harsh
        audio = np.tanh(audio / 0.85) * 0.85
    fade = int(0.015 * SR)
    if audio.size > 2 * fade:
        ramp = np.linspace(0.0, 1.0, fade)
        audio[:fade] *= ramp
        audio[-fade:] *= ramp[::-1]
    return audio


def synth(pipeline, text, voice, speed):
    chunks = []
    for result in pipeline(text, voice=voice, speed=speed):
        if result.audio is not None:
            chunks.append(np.asarray(result.audio.numpy(), dtype=np.float32))
    return np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.float32)


def write_wav(pipeline, text, voice, speed, output_file, style="soft"):
    if style == "soft":
        pieces = [np.zeros(int(0.12 * SR), dtype=np.float32)]
        for i, s in enumerate(sentences(text) or [text]):
            s_speed, pause = pace(s, i, speed)
            pieces.append(synth(pipeline, s, voice, s_speed))
            pieces.append(np.zeros(int(pause * SR), dtype=np.float32))
        audio = soften(np.concatenate(pieces))
    else:
        audio = synth(pipeline, text, voice, speed)
    with wave.open(output_file, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SR)
        wav_file.writeframes(np.clip(audio * 32767, -32768, 32767).astype(np.int16).tobytes())


def main():
    pipeline = load_pipeline()
    for raw in sys.stdin:
        job = {}
        try:
            job = json.loads(raw)
            write_wav(pipeline, job["text"], job["voice"], float(job["speed"]), job["output"], job.get("style", "soft"))
            result = {"id": job["id"], "ok": True}
        except Exception as exc:
            result = {"id": job.get("id"), "ok": False, "error": str(exc)}
        print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
