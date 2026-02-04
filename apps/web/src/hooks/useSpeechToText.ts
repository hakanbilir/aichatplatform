import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSpeechToTextOptions {
  continuous?: boolean;
  silenceTimeoutMs?: number;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}) {
  const { continuous = true, silenceTimeoutMs = 2000 } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = continuous;
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Should ideally be configurable or detected

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onend = () => {
          setIsListening(false);
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        };

        recognition.onresult = (event: any) => {
          // Reset silence timer on any activity
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          if (continuous && silenceTimeoutMs > 0) {
            silenceTimerRef.current = setTimeout(() => {
               stopListening();
            }, silenceTimeoutMs);
          }

          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
              setTranscript(prev => {
                  const cleaned = finalTranscript.trim();
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
    };
  }, [continuous, silenceTimeoutMs, stopListening]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
        try {
            // Reset transcript on start? Usually yes for a new session, or manual reset.
            // Existing behavior didn't reset automatically on start, so we keep it.
            recognitionRef.current.start();
        } catch (e) {
            console.error(e);
        }
    }
  }, []);

  const resetTranscript = useCallback(() => setTranscript(''), []);

  return { isListening, transcript, startListening, stopListening, resetTranscript, supported: !!recognitionRef.current };
}
