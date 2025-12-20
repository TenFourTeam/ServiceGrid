import { useState, useEffect, useCallback, useRef } from 'react';

interface UseVoiceInputOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  silenceTimeout?: number;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

// Extend Window interface for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const {
    language = 'en-US',
    continuous = true,
    interimResults = true,
    silenceTimeout = 3000,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check browser support
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    const recognition = recognitionRef.current;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }

      // Reset silence timer on speech
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      
      if (isListening) {
        silenceTimerRef.current = setTimeout(() => {
          recognition.stop();
        }, silenceTimeout);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      
      switch (event.error) {
        case 'not-allowed':
          setError('Microphone access denied. Please allow microphone permissions.');
          break;
        case 'no-speech':
          setError('No speech detected. Please try again.');
          break;
        case 'network':
          setError('Network error. Please check your connection.');
          break;
        case 'aborted':
          // User stopped, not an error
          break;
        default:
          setError(`Voice recognition error: ${event.error}`);
      }
    };

    return () => {
      if (recognition) {
        recognition.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [isSupported, language, continuous, interimResults, silenceTimeout, isListening]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');

    try {
      recognitionRef.current.start();
    } catch (e) {
      // Recognition might already be running
      recognitionRef.current.stop();
      setTimeout(() => {
        recognitionRef.current.start();
      }, 100);
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
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
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
