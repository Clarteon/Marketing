import { useCallback, useEffect, useRef, useState } from "react";

const englishVoices = [
  "aria",
  "jenny",
  "zira",
  "ava",
  "samantha",
  "allison",
  "hazel",
  "susan",
  "catherine",
  "linda",
  "heera",
];

function voiceName(voice: SpeechSynthesisVoice) {
  return voice.name
    .trim()
    .toLowerCase()
    .replace(/^microsoft\s+/, "")
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s+(?:desktop|\((?:natural|enhanced|premium)\))$/, "");
}

export function useReadAloud(enabled: boolean) {
  const [speakingId, setSpeakingId] = useState<string>();
  const [error, setError] = useState("");
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  const voices = useRef<SpeechSynthesisVoice[]>([]);

  const supported =
    enabled &&
    typeof window !== "undefined" &&
    typeof SpeechSynthesisUtterance === "function" &&
    Boolean(window.speechSynthesis);

  const cancel = useCallback(() => {
    if (!current.current) return;
    current.current = null;
    window.speechSynthesis.cancel();
  }, []);

  const stop = useCallback(() => {
    cancel();
    setSpeakingId(undefined);
    setError("");
  }, [cancel]);

  useEffect(() => {
    if (!supported) return;
    const synthesis = window.speechSynthesis;
    const updateVoices = () => {
      voices.current = synthesis.getVoices().filter((voice) => voice.localService);
    };
    updateVoices();
    synthesis.addEventListener("voiceschanged", updateVoices);
    return () => {
      synthesis.removeEventListener("voiceschanged", updateVoices);
      cancel();
    };
  }, [cancel, supported]);

  function speak(id: string, text: string) {
    stop();
    const plainText = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\b(?:https?:\/\/|mailto:)\S+/gi, "")
      .trim();
    if (!plainText) return;
    const matches = englishVoices.flatMap((name) =>
      voices.current.filter((voice) => /^en(-|$)/i.test(voice.lang) && voiceName(voice) === name),
    );
    const voice = matches.find((option) => option.lang === navigator.language) ?? matches[0];
    if (!voice) {
      setError("This device has no supported feminine English voice.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = 0.95;
    const finish = (error = "") => {
      if (current.current !== utterance) return;
      current.current = null;
      setSpeakingId(undefined);
      setError(error);
    };
    utterance.onend = () => finish();
    utterance.onerror = () => finish("This device couldn’t read the reply aloud.");
    current.current = utterance;
    setSpeakingId(id);
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      finish("This device couldn’t read the reply aloud.");
    }
  }

  return { supported, speakingId, error, speak, stop };
}
