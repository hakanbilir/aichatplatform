import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSpeechToTextOptions {
  continuous?: boolean;
  silenceTimeoutMs?: number;
  lang?: string;
  interimResults?: boolean;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}) {
  const {
    continuous = true,
    silenceTimeoutMs = 2000,
    lang = 'en-US',
    interimResults = true,
  } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors if already stopped
      }
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start speech recognition:', e);
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.lang = lang;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimTranscript('');
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };

        recognition.onresult = (event: any) => {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          if (continuous && silenceTimeoutMs > 0) {
            silenceTimerRef.current = setTimeout(() => {
              stopListening();
            }, silenceTimeoutMs);
          }

          let finalChunk = '';
          let currentInterim = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalChunk += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          if (interimResults) {
            setInterimTranscript(currentInterim);
          }

          if (finalChunk) {
            setTranscript((prev) => {
              const cleaned = finalChunk.trim();
              if (!cleaned) return prev;
              return prev ? `${prev} ${cleaned}` : cleaned;
            });
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, [continuous, silenceTimeoutMs, lang, interimResults, stopListening]);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    supported:
      typeof window !== 'undefined' &&
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
  };
}
