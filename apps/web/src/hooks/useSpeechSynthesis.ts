import { useState, useEffect, useCallback } from 'react';

export interface UseSpeechSynthesisResult {
  speak: (text: string) => void;
  speaking: boolean;
  supported: boolean;
  cancel: () => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesisResult {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSupported(true);
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!supported) return;

    window.speechSynthesis.cancel(); // Cancel any current speaking

    const utterance = new SpeechSynthesisUtterance(text);
    // Use stored language or default to en-US/tr-TR
    utterance.lang = localStorage.getItem('i18nextLng') || 'en-US';

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [supported]);

  const cancel = useCallback(() => {
    if (supported) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, [supported]);

  return {
    speak,
    speaking,
    supported,
    cancel
  };
}
