import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSpeechToTextOptions {
  continuous?: boolean;
  silenceTimeoutMs?: number;
  lang?: string;
}

export function useSpeechToText(options: UseSpeechToTextOptions = {}) {
  const { continuous = true, silenceTimeoutMs = 2000, lang } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
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
        // Default to provided lang, or navigator language, or fallback to 'en-US'
        recognition.lang = lang || navigator.language || 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onend = () => {
          setIsListening(false);
          setInterimTranscript(''); // Clear interim on end
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

          let finalChunk = '';
          let currentInterim = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalChunk += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          setInterimTranscript(currentInterim);

          if (finalChunk) {
              setTranscript(prev => {
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
       }
    };
  }, [continuous, silenceTimeoutMs, stopListening, lang]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error(e);
        }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    supported: !!recognitionRef.current
  };
}
