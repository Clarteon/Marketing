import { useCallback, useEffect, useRef, useState } from "react";
import {
  createVoiceWav,
  VOICE_MAX_SECONDS,
  VOICE_SAMPLE_RATE,
  VOICE_WAV_HEADER_BYTES,
} from "@/lib/chat/voice";

type Phase = "idle" | "requesting" | "recording" | "transcribing";

interface Recording {
  controller: AbortController;
  stream?: MediaStream;
  recorder?: MediaRecorder;
  timer?: number;
  clock?: number;
}

function releaseMicrophone(recording: Recording) {
  window.clearTimeout(recording.timer);
  window.clearInterval(recording.clock);
  if (recording.recorder && recording.recorder.state !== "inactive") recording.recorder.stop();
  recording.stream?.getTracks().forEach((track) => track.stop());
}

async function encodeRecording(blob: Blob): Promise<Blob | null> {
  if (!blob.size) return null;
  const context = new OfflineAudioContext(1, 1, VOICE_SAMPLE_RATE);
  const audio = await context.decodeAudioData(await blob.arrayBuffer());
  const samples = Math.min(audio.length, VOICE_MAX_SECONDS * VOICE_SAMPLE_RATE);
  if (samples < VOICE_SAMPLE_RATE / 4) return null;

  const channels = Array.from({ length: audio.numberOfChannels }, (_, i) =>
    audio.getChannelData(i),
  );
  const wav = createVoiceWav(samples);
  let peak = 0;
  for (let i = 0; i < samples; i++) {
    let sample = 0;
    for (const channel of channels) sample += channel[i];
    sample = Math.min(1, Math.max(-1, sample / channels.length));
    peak = Math.max(peak, Math.abs(sample));
    wav.setInt16(VOICE_WAV_HEADER_BYTES + i * 2, sample * 32767, true);
  }

  return peak < 0.004 ? null : new Blob([wav.buffer], { type: "audio/wav" });
}

export function useDictation() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const current = useRef<Recording | null>(null);

  const discard = useCallback(() => {
    const recording = current.current;
    if (!recording) return;
    current.current = null;
    recording.controller.abort();
    releaseMicrophone(recording);
  }, []);

  useEffect(() => discard, [discard]);

  const cancel = useCallback(() => {
    discard();
    setError("");
    setPhase("idle");
  }, [discard]);

  function stop() {
    if (!current.current?.recorder || current.current.recorder.state === "inactive") return;
    releaseMicrophone(current.current);
    setPhase("transcribing");
  }

  async function record(transcribe: (audio: Blob, signal: AbortSignal) => Promise<string | void>) {
    if (current.current) return;
    const recording: Recording = { controller: new AbortController() };
    current.current = recording;
    const { signal } = recording.controller;
    setError("");
    setSeconds(0);
    setPhase("requesting");

    const finish = (message = "") => {
      if (signal.aborted) return;
      discard();
      setError(message);
      setPhase("idle");
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recording.stream = stream;
      if (signal.aborted) {
        releaseMicrophone(recording);
        return;
      }

      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recording.recorder = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = ({ data }) => {
        if (!signal.aborted && data.size > 0) chunks.push(data);
      };
      recorder.onerror = () => finish("Recording stopped unexpectedly. You can still type.");
      recorder.onstop = async () => {
        releaseMicrophone(recording);
        if (signal.aborted) return;
        setPhase("transcribing");
        try {
          const audio = await encodeRecording(new Blob(chunks, { type: recorder.mimeType }));
          if (signal.aborted) return;
          if (!audio) {
            finish("I didn’t hear anything. Try recording again or type your message.");
            return;
          }
          finish((await transcribe(audio, signal)) ?? "");
        } catch {
          finish("I couldn’t read that recording. You can still type.");
        }
      };

      recorder.start();
      setPhase("recording");
      const start = performance.now();
      recording.clock = window.setInterval(() => {
        setSeconds(Math.min(VOICE_MAX_SECONDS, Math.floor((performance.now() - start) / 1000)));
      }, 250);
      recording.timer = window.setTimeout(stop, VOICE_MAX_SECONDS * 1000);
    } catch (cause) {
      finish(
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser or type your message."
          : "I couldn’t start the microphone. You can still type.",
      );
    }
  }

  return { phase, seconds, error, record, stop, cancel, active: () => current.current !== null };
}
