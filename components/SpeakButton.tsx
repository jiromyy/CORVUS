"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Reads an answer aloud with the browser's speech synthesis. Recaps use stored Gemini TTS audio instead;
 * this is for quick, on-demand listening to a single answer.
 */
export function SpeakButton({ text, language = "en" }: { text: string; language?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability, known only after mount
    setSupported("speechSynthesis" in window);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  // A new answer stops reading the previous one.
  useEffect(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the text changes
    setSpeaking(false);
  }, [text]);

  if (!supported) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    synth.cancel();
    if (speaking) return setSpeaking(false);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "fil" || language === "tl" ? "fil-PH" : "en-US";
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(utterance.lang.slice(0, 2).toLowerCase()));
    if (voice) utterance.voice = voice;
    utterance.rate = 0.98;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utterance);
  }

  return (
    <button className={`speak-button ${speaking ? "speaking" : ""}`} onClick={toggle} aria-pressed={speaking} aria-label={speaking ? "Stop reading the answer" : "Read the answer aloud"}>
      {speaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
      <span>{speaking ? "Stop" : "Listen"}</span>
      {speaking && (
        <i className="eq" aria-hidden>
          <b />
          <b />
          <b />
        </i>
      )}
    </button>
  );
}
