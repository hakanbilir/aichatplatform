import { useState, useEffect, useCallback, useRef } from 'react';

export function useSpeechToText() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false; // Stop after silence
        recognition.interimResults = true;
        recognition.lang = 'en-US'; // Or detected language

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
               // interim
            }
          }
          if (finalTranscript) {
              setTranscript(prev => prev ? prev + ' ' + finalTranscript : finalTranscript);
          }
        };
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error(e);
        }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const resetTranscript = useCallback(() => setTranscript(''), []);

  return { isListening, transcript, startListening, stopListening, resetTranscript, supported };
}
