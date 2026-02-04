import { useState, useCallback, useEffect } from 'react';

export type TtsState = 'idle' | 'playing' | 'paused';

export function useTextToSpeech() {
  const [state, setState] = useState<TtsState>('idle');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!supported) return;

    // Cancel existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setState('playing');
    utterance.onend = () => setState('idle');
    utterance.onerror = () => setState('idle');
    utterance.onpause = () => setState('paused');
    utterance.onresume = () => setState('playing');

    window.speechSynthesis.speak(utterance);
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setState('idle');
  }, [supported]);

  const pause = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.pause();
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
  }, [supported]);

  return {
    speak,
    stop,
    pause,
    resume,
    state,
    speaking: state === 'playing',
    supported
  };
}
