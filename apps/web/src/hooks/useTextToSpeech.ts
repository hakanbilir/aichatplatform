import { useState, useCallback, useEffect } from 'react';

export type TtsState = 'idle' | 'playing' | 'paused';

export interface SpeakOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useTextToSpeech() {
  const [state, setState] = useState<TtsState>('idle');
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupported(true);

      const updateVoices = () => {
        setVoices(window.speechSynthesis.getVoices());
      };

      updateVoices();

      // Chrome loads voices asynchronously
      window.speechSynthesis.onvoiceschanged = updateVoices;

      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      if (!supported) return;

      // Cancel existing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      if (options.voice) utterance.voice = options.voice;
      if (options.rate !== undefined) utterance.rate = options.rate;
      if (options.pitch !== undefined) utterance.pitch = options.pitch;
      if (options.volume !== undefined) utterance.volume = options.volume;

      utterance.onstart = () => setState('playing');
      utterance.onend = () => setState('idle');
      utterance.onerror = () => setState('idle');
      utterance.onpause = () => setState('paused');
      utterance.onresume = () => setState('playing');

      window.speechSynthesis.speak(utterance);
    },
    [supported],
  );

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
    supported,
    voices,
  };
}
